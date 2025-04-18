import { io, userSocketMap } from '@/socket';
import { channelName } from '@/socket';
import { updateUserOnline, updateUserOffline } from '@/services/users/controller';

// TODO: handlerSocketUserOnlineStatus
export const handlerSocketUserOnlineStatus = async (userId: number) => {
  // Mark user as online in DB
  await updateUserOnline(userId);

  // Broadcast user's online status to all other sockets
  io.emit(channelName.onlineStatus, {
    status: 'ok',
    msg: 'User is online',
    body: { userId, isOnline: true },
  });
};

// TODO: onSocketUserOfflineStatus
export const onSocketUserOfflineStatus = async (userId: number) => {
  // Mark user as offline in DB
  await updateUserOffline(userId);

  // Notify all clients that this user is offline
  io.emit(channelName.onlineStatus, {
    status: 'ok',
    msg: 'User went offline',
    body: { userId, isOnline: false },
  });
};
