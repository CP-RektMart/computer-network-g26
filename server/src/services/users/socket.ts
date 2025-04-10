import { getUserById, getUserChatGroupIds, updateUserOffline, updateUserOnline } from './controller';
import { ChatSocket, groupFormat, UserStatusResDto } from '@/socket-type';
import { Server } from 'socket.io';

// Function to handle user online status when they connect
export const handleUserOnlineStatus = async (socket: ChatSocket, io: Server) => {
  const user = await getUserById(socket.userId!);
  socket.username = user?.username;

  await updateUserOnline(socket.userId!);

  const groupIds = await getUserChatGroupIds(socket.userId!);
  groupIds.forEach((groupId) => {
    io.to(groupFormat(groupId)).emit('socket-user-status', {
      status: 'ok',
      userId: socket.userId,
      groupId: groupId,
      isOnline: true,
    } as UserStatusResDto);
  });
};

// Function to handle user offline status when they disconnect
export const handleUserOfflineStatus = async (socket: ChatSocket, io: Server) => {
  await updateUserOffline(socket.userId!);

  const groupIds = await getUserChatGroupIds(socket.userId!);
  groupIds.forEach((groupId) => {
    io.to(groupFormat(groupId)).emit('socket-user-status', {
      status: 'ok',
      userId: socket.userId,
      groupId: groupId,
      isOnline: false,
    } as UserStatusResDto);
  });
};
