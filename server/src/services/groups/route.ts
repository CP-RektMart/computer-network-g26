import { createGroup, joinGroup, leaveGroup } from './controller';
import { AuthenticateJWT } from '@/jwt';
import { body, validationResult } from 'express-validator';
import { NextFunction, Request, Response, Router } from 'express';
import { getRoomType } from '@/services/rooms/controller';
import { getChatsId } from '@/services/users/controller';
import { channelName, getUserSockets, io } from '@/socket';
import { socketResponse } from '@/type';
import { GroupJoinActivityDto, GroupLeaveActivityDto, GroupUpdateActivityDto } from './type';
import { protect } from '@/middleware/auth';

const router = Router();

// Apply auth middleware to all routes
router.use(protect);

export const validateCreateGroup = [
  body('groupName').isString().notEmpty().withMessage('Group name is required'),
  body('description').optional().isString().withMessage('Description must be a string'),
  body('participantIds').optional().isArray({ min: 1 }).withMessage('participantIds must be a non-empty array'),
  body('participantIds.*').optional().isInt().withMessage('Each participantIds must be an integer'),

  (req: Request, res: Response, next: NextFunction) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }
    next();
  },
];

// TODO: Add Swagger documentation for this endpoint
router.post('/', AuthenticateJWT, validateCreateGroup, async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.userId) {
      res.status(401).json({ message: 'Unauthorized: Missing user ID' });
      return;
    }

    const userId = parseInt(req.userId, 10);
    let { groupName, description, participantIds } = req.body;
    if (!participantIds) {
      participantIds = [];
    }
    if (!participantIds.includes(userId)) {
      participantIds.push(userId);
    }

    const newGroup = await createGroup(groupName, description, userId, participantIds);

    res.status(201).json(newGroup);
  } catch (error) {
    console.error('Error creating group:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// TODO: Add Swagger documentation for this endpoint
router.post('/:groupId/join', AuthenticateJWT, async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.userId) {
      res.status(401).json({ message: 'Unauthorized: Missing user ID' });
      return;
    }
    const groupId = req.params.groupId;
    const userId = parseInt(req.userId);

    const type = await getRoomType(groupId);
    if (type === 'direct') {
      res.status(400).json({ message: 'Invalid room type' });
      return;
    }
    const [participant, userChat] = await joinGroup(userId, groupId);

    // If it is old participant return No content
    if (!participant || !userChat) {
      res.status(204);
      return;
    }

    // If it is a new participant, return the user chat
    // Broadcast the join activity to all participants in the room
    res.status(200).json(userChat);

    // Broadcast the join activity to all participants in the room
    if (participant) {
      const chatIds = await getChatsId(userId);
      chatIds.forEach((id) => {
        io.to(id).emit(
          channelName.groupUpdate,
          socketResponse('ok')
            .destination(groupId)
            .withBody({ activity: 'join', participant: participant } as GroupJoinActivityDto)
            .build()
        );
      });
    }
  } catch (error) {
    console.error('Error while joining room:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// TODO: Add Swagger documentation for this endpoint
router.post('/:roomId/leave', AuthenticateJWT, async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.userId) {
      res.status(401).json({ message: 'Unauthorized: Missing user ID' });
      return;
    }
    const roomId = req.params.roomId;
    const userId = parseInt(req.userId);

    const type = await getRoomType(roomId);
    if (type === 'direct') {
      res.status(400).json({ message: 'Invalid room type' });
      return;
    }
    const newAdmin = await leaveGroup(userId, roomId);
    res.status(200).json({ message: 'Leaved room successfully' });

    // Remove the socket from the room
    const socketIds = getUserSockets(userId);
    if (socketIds) {
      socketIds.forEach((id) => {
        const socket = io.sockets.sockets.get(id);
        if (socket) {
          socket.leave(roomId);
        }
      });
    }

    // Broadcast the leave activity to all participants in the room
    io.to(roomId).emit(
      channelName.groupUpdate,
      socketResponse('ok')
        .destination(roomId)
        .withBody({ activity: 'leave', userId } as GroupLeaveActivityDto)
        .build()
    );

    // Broadcast the new admin activity to all participants in the room
    if (newAdmin) {
      io.to(roomId).emit(
        channelName.groupUpdate,
        socketResponse('ok')
          .destination(roomId)
          .withBody({ activity: 'update', participant: newAdmin } as GroupUpdateActivityDto)
          .build()
      );
    }
  } catch (error) {
    console.error('Error while leaving room:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// TODO: PATCH route for updating group info and broadcast to all participants (socket-group-update GroupActivityDto)
// TODO: PATCH route for adding/removing participants and broadcast to all participants (socket-group-update GroupActivityDto)
// TODO: DELETE route for deleting group and broadcast to all participants (socket-group-update GroupActivityDto)

export default router;
