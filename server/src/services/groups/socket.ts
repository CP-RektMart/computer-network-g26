import { LOG_LEVEL } from '@/env';
import {
  isGroupExist,
  joinGroup,
  getGroup,
  isMemberOfGroup,
  leaveGroup,
  getGroupMessagesRecently,
  updateLastSeenInGroup,
  saveGroupMessage,
} from '@/services/groups/controller';
import * as gt from '@/services/groups/socket-type';
import * as st from '@/socket-type';
import { ChatSocket } from '@/socket-type';
import { GroupMessage } from '@prisma/client';

export const handleGroupJoin = async (eventName: string, activityName: string, messageName: string, socket: ChatSocket, req: gt.GroupJoinReqDto) => {
  const destination = req.destination;

  // Validate destination
  if (!destination || destination.type !== 'group' || !destination.groupId) {
    socket.emit(eventName, st.errorWrapper('error', 'Invalid request: destination is not a valid group.'));
    return;
  }

  const groupId = parseInt(destination.groupId.toString());

  // Check if group exists
  if (!(await isGroupExist(groupId))) {
    socket.emit(eventName, st.errorWrapper('error', 'Group not found'));
    return;
  }

  // Join the Group (database)
  const isNewMember = await joinGroup(socket.userId!, groupId);

  // Join the group room (socket)
  socket.join(`group-${groupId}`);

  // Send back the joined group
  const group = await getGroup(groupId);

  const res: gt.GroupJoinResDto = {
    status: 'ok',
    message: `Connected to group ${groupId}`,
    group: group,
  };
  socket.emit(eventName, res);

  // Fetch recent messages for the user in the group
  const messages = await getGroupMessagesRecently(groupId, 20);
  const messageRes: gt.GroupMessageResDto = {
    status: 'ok',
    message: 'Recently Messages',
    destination: { type: 'group', groupId },
    messages: messages || undefined,
  };
  socket.emit(messageName, messageRes);

  // Broadcast the join connection to everyone
  if (isNewMember) {
    const broadcastData: gt.GroupBroadcastActivityDto = {
      type: 'group-user-joined',
      userId: socket.userId!,
      username: socket.username!,
    };
    socket.to(`group-${groupId}`).emit(activityName, broadcastData);
  }

  // Log join to server
  logGroupActivity(socket, 'group-user-joined', groupId);
};

export const handleGroupOpen = async (socket: ChatSocket, req: gt.GroupOpenReqDto) => {
  await updateLastSeenInGroup(socket.userId!, req.groupId);
};

export const handleGroupLeave = async (eventName: string, activityName: string, socket: ChatSocket, req: gt.GroupLeaveReqDto) => {
  const destination = req.destination;

  // Validate destination
  if (!destination || destination.type !== 'group' || !destination.groupId) {
    socket.emit(eventName, st.errorWrapper('error', 'Invalid request: destination is not a valid group.'));
    return;
  }

  const groupId = destination.groupId;

  // Check if group exists
  if (!(await isGroupExist(groupId))) {
    socket.emit(eventName, st.errorWrapper('error', 'Group not found'));
    return;
  }

  // Check if the user is a member of the group
  const isMember = await isMemberOfGroup(socket.userId!, groupId);
  if (!isMember) {
    socket.emit(eventName, st.errorWrapper('error', 'User is not a member of the group'));
    return;
  }

  // Leave the group (remove from database)
  await leaveGroup(socket.userId!, groupId);

  // Remove the user from the group room (socket)
  socket.leave(`group-${groupId}`);

  // Send back the leave confirmation
  const res: gt.GroupLeaveResDto = {
    status: 'ok',
  };
  socket.emit(eventName, res);

  // Broadcast the leave event to the group
  const broadcastData: gt.GroupBroadcastActivityDto = {
    type: 'group-user-left',
    userId: socket.userId!,
    username: socket.username!,
  };
  socket.to(`group-${groupId}`).emit(activityName, broadcastData);

  // Log leave to server
  logGroupActivity(socket, 'group-user-left', groupId);
};

export const handleMessage = async (eventName: string, socket: st.ChatSocket, req: gt.GroupMessageReqDto, io: any) => {
  // Validate destination & content
  if (!req.destination || req.destination.type !== 'group' || !req.destination.groupId) {
    socket.emit(eventName, st.errorWrapper('error', 'Invalid request: destination is not a valid group.'));
    return;
  }
  if (!req?.content) {
    socket.emit(eventName, st.errorWrapper('error', 'Invalid request: content is missing'));
    return;
  }

  // Log received messages to server
  if (LOG_LEVEL) {
    console.log(`User ID: ${socket.userId} - Message: ${JSON.stringify(req.content)}: - TimeStamp: ${req.timestamp}`);
  }

  // Group message
  if (req.destination.type === 'group' && (req.destination as gt.GroupDestinationDto).groupId) {
    const destination = req.destination as gt.GroupDestinationDto;
    const message: GroupMessage = {
      userId: socket.userId!,
      groupId: destination.groupId,
      content: req.content,
      sentAt: new Date(req.timestamp),
    };

    // Save the message to the database
    await saveGroupMessage(message);

    // Broadcast to everyone in this group
    const res: gt.GroupMessageResDto = {
      status: 'ok',
      destination: destination,
      messages: [message],
      timestamp: req.timestamp,
    };
    io.to(`group-${destination.groupId}`).emit(eventName, res);
  } else {
    socket.emit(eventName, st.errorWrapper('error', 'Invalid request (type: group, content: json)'));
  }
};

const logGroupActivity = (socket: ChatSocket, type: string, groupId: number) => {
  if (!LOG_LEVEL) return;
  console.log(`User: ${socket.userId}, Group: ${groupId}, Type: ${type}`);
};
