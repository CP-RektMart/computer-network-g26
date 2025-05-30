import { AuthenticateJWT } from '@/jwt';
import { Request, Response, Router } from 'express';
import { createDirect, directFormat } from './controller';
import { channelName, getUserSockets, io } from '@/socket';
import { socketResponse } from '@/type';
import { protect } from '@/middleware/auth';
import * as crypto from 'crypto';

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
      const base = directFormat(userId, receiverId);
      const uniqueId = crypto.createHash('md5').update(base).digest('hex').slice(0, 16);
      res.status(200).json({ message: 'Chat already exists', isExist: true, id: uniqueId });
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
