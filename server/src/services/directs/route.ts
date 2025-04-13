import { AuthenticateJWT } from '@/jwt';
import { Request, Response, Router } from 'express';
import { createDirect } from './controller';
import { channelName, getUserSockets, io } from '@/socket';
import { socketResponse } from '@/type';
import { protect } from '@/middleware/auth';

const router = Router();

// Apply auth middleware to all routes
router.use(protect);

// TODO: Add Swagger documentation for this endpoint
router.post('/:receiverId', AuthenticateJWT, async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.userId) {
      res.status(401).json({ message: 'Unauthorized: Missing user ID' });
      return;
    }
    const receiverId = parseInt(req.params.receiverId);
    const userId = parseInt(req.userId);

    const [senderChat, receiverChat] = await createDirect(userId, receiverId);
    if (!senderChat || !receiverChat) {
      res.status(400).json({ message: 'Chat already exists' });
      return;
    }
    res.status(200).json(senderChat);

    // Send socket-direct-open event to the receiver
    const socketIds = getUserSockets(receiverId);
    socketIds.forEach((id) => {
      const socket = io.sockets.sockets.get(id);
      if (socket) {
        socket.join(senderChat.id);
        socket.emit(channelName.directOpen, socketResponse('ok').withBody(receiverChat));
      }
    });
  } catch (error) {
    console.error('Error while joining room:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

export default router;
