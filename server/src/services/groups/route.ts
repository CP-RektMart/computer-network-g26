import { checkPassword, createGroup, getAllGroup, getGroup, joinGroup, leaveGroup, updateGroupPassword } from './controller';
import { AuthenticateJWT } from '@/jwt';
import { body, validationResult } from 'express-validator';
import { NextFunction, Request, Response, Router } from 'express';
import { getParticipant, getRoomType, saveMessage } from '@/services/rooms/controller';
import { channelName, getUserSockets, io } from '@/socket';
import { socketResponse } from '@/type';
import { GroupJoinActivityDto, GroupLeaveActivityDto, GroupUpdateActivityDto } from './type';
import { protect } from '@/middleware/auth';
import { MessageDto } from '../rooms/type';

const router = Router();

// Apply auth middleware to all routes
router.use(protect);

export const validateCreateGroup = [
  body('groupName').isString().notEmpty().withMessage('Group name is required'),
  body('description').optional().isString().withMessage('Description must be a string'),
  body('participantIds').optional().isArray().withMessage('participantIds must be a non-empty array'),
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
    let { groupName, description, participantIds, password } = req.body;
    if (!participantIds) {
      participantIds = [];
    }
    if (!participantIds.includes(userId)) {
      participantIds.push(userId);
    }

    const newGroupChat = await createGroup(groupName, description, userId, participantIds, password);

    await Promise.all(
      participantIds.map(async (participantId: number) => {
        await saveMessage(newGroupChat.id, 'system', null, new Date(), { type: 'group-join', userId: participantId });
      })
    );

    newGroupChat.participants.forEach((participant) => {
      if (participant.id !== userId) {
        const socketIds = getUserSockets(participant.id);
        socketIds.forEach((id) => {
          const socket = io.sockets.sockets.get(id);
          if (socket) {
            socket.join(newGroupChat.id);
            socket.emit(channelName.groupOpen, socketResponse('ok').withBody(newGroupChat));
          }
        });
      }
    });

    res.status(201).json(newGroupChat);
  } catch (error) {
    console.error('Error creating group:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

router.patch('/:groupId/password', AuthenticateJWT, async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.userId) {
      res.status(401).json({ message: 'Unauthorized: Missing user ID' });
      return;
    }
    const groupId = req.params.groupId;
    const userId = parseInt(req.userId);

    const participant = await getParticipant(userId, groupId);
    if (!participant) {
      res.status(401).json({ message: 'Unauthorized: Not Participant for this group' });
      return;
    }
    if (participant.role !== 'admin') {
      res.status(401).json({ message: 'Unauthorized: Not Admin for this group' });
      return;
    }
    let password = req.body.password;
    if (!password) {
      password = null;
    }
    await updateGroupPassword(groupId, password);
  } catch (error) {
    console.error('Error while joining room:', error);
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
    let password = req.body.password;
    if (!password) {
      password = '';
    }
    const isMatch = await checkPassword(groupId, password);
    if (!isMatch) {
      res.status(400).json({ message: 'Invalid password' });
      return;
    }

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

    const message = await saveMessage(groupId, 'system', null, new Date(), { type: 'group-join', userId: userId });

    // Broadcast the join activity to all participants in the room
    io.to(groupId).emit(
      channelName.groupUpdate,
      socketResponse('ok')
        .destination(groupId)
        .withBody({ activity: 'join', participant: participant } as GroupJoinActivityDto)
        .build()
    );
    io.to(groupId).emit(
      channelName.message,
      socketResponse('ok')
        .destination(groupId)
        .withBody(message as MessageDto)
        .build()
    );
  } catch (error) {
    console.error('Error while joining room:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// TODO: Add Swagger documentation for this endpoint
router.post('/:groupId/leave', AuthenticateJWT, async (req: Request, res: Response): Promise<void> => {
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
    const newAdmin = await leaveGroup(userId, groupId);
    res.status(200).json({ message: 'Leaved room successfully' });

    const message = await saveMessage(groupId, 'system', null, new Date(), { type: 'group-leave', userId: userId });

    // Remove the socket from the room
    const socketIds = getUserSockets(userId);
    if (socketIds) {
      socketIds.forEach((id) => {
        const socket = io.sockets.sockets.get(id);
        if (socket) {
          socket.leave(groupId);
        }
      });
    }

    // Broadcast the leave activity to all participants in the room
    io.to(groupId).emit(
      channelName.groupUpdate,
      socketResponse('ok')
        .destination(groupId)
        .withBody({ activity: 'leave', userId } as GroupLeaveActivityDto)
        .build()
    );
    io.to(groupId).emit(
      channelName.message,
      socketResponse('ok')
        .destination(groupId)
        .withBody(message as MessageDto)
        .build()
    );

    // Broadcast the new admin activity to all participants in the room
    if (newAdmin) {
      io.to(groupId).emit(
        channelName.groupUpdate,
        socketResponse('ok')
          .destination(groupId)
          .withBody({ activity: 'update-admin', participant: newAdmin } as GroupUpdateActivityDto)
          .build()
      );
    }
  } catch (error) {
    console.error('Error while leaving room:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const groups = await getAllGroup();
    res.status(200).json(groups);
  } catch (error) {
    console.error('Failed to fetch groups:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// TODO: PATCH route for updating group info and broadcast to all participants (socket-group-update GroupActivityDto)
// TODO: PATCH route for adding/removing participants and broadcast to all participants (socket-group-update GroupActivityDto)
// TODO: DELETE route for deleting group and broadcast to all participants (socket-group-update GroupActivityDto)

export default router;
