import { getMessageBefore, getRoomType, isParticipantOfRoom, isRoomExist } from './controller';
import { AuthenticateJWT } from '@/jwt';
import { protect } from '@/middleware/auth';
import { Request, Response, Router } from 'express';

const router = Router();

// Apply auth middleware to all routes
router.use(protect);

// TODO: Add Swagger documentation for this endpoint
router.get('/:roomId/messages', AuthenticateJWT, async (req: Request, res: Response): Promise<void> => {
  try {
    const roomId = req.params.roomId;
    const limit = parseInt(req.query.limit as string) || 20;
    const before = req.query.before ? new Date(req.query.before as string) : new Date();

    const userId = (req as any).userId;

    if (!userId) {
      res.status(401).json({ message: 'Unauthorized: Missing or invalid user ID' });
      return;
    }

    const exist = await isRoomExist(roomId);
    if (!exist) {
      res.status(404).json({ error: 'Group not found' });
      return;
    }

    const isMember = await isParticipantOfRoom(userId, roomId);
    if (!isMember) {
      res.status(403).json({ message: 'Not a member of this group' });
      return;
    }

    const messages = await getMessageBefore(roomId, limit, before);
    res.json(messages);
  } catch (error) {
    console.error('Error while fetching messages:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

export default router;
