import { LOG_LEVEL } from '@/env';
import { channelName, io, logConnection } from '@/socket';
import { ChatSocket, socketErrorResponse, socketResponse } from '@/type';
import { isRoomExist, saveMessage, updateLastSeenInRoom, updateMessage, unsendMessage } from './controller';
import { MessageDto } from './type';

// onSocketRoomConnect handles the connection of a user to a specific room
// It checks if the room exists and if the user is a participant of that room
// If the user is not a participant, it emits an error response
// If the room exists, it joins the user to the room and emits a success response
// It emits a response back to the socket indicating the status of the operation
// It handles any errors that may occur during the process
export const onSocketRoomConnect = (socket: ChatSocket) => async (req: any) => {
  const { destination }: { destination: string } = req;

  if (!destination) {
    socket.emit(channelName.connectRoom, socketErrorResponse('Destination is missing'));
    return;
  }

  logConnection(socket, channelName.connectRoom, destination);

  try {
    if (!(await isRoomExist(destination))) {
      socket.emit(channelName.connectRoom, socketErrorResponse('Room not found'));
      return;
    }

    socket.join(`${destination}`);
    socket.emit(channelName.connectRoom, socketResponse('ok', `Connected to Room ${destination}`));
    logGroupActivity(socket, 'user-connect-room', destination);
  } catch (error) {
    console.error('Error in handleRoomConnect:', error);
    socket.emit(channelName.connectRoom, socketErrorResponse('Failed to connect to room'));
  }
};

// onSocketRoomOpening handles the opening of a room for a user
// and updates the last seen timestamp for the user in that room
// and the active chat room if it exists
// It also emits a response back to the socket indicating the status of the operation
export const onSocketRoomOpening = (socket: ChatSocket) => async (req: any) => {
  const { destination }: { destination: string } = req;

  if (!destination) {
    socket.emit(channelName.openingRoom, socketErrorResponse('Destination is missing'));
    return;
  }

  logConnection(socket, channelName.openingRoom, destination);

  try {
    await updateLastSeenInRoom(socket.userId!, destination);
    if (socket.activeChatId) {
      await updateLastSeenInRoom(socket.userId!, socket.activeChatId);
    }
    socket.activeChatId = destination;
    socket.emit(channelName.openingRoom, socketResponse('ok', `Group ${destination} is currently open`));
  } catch (error) {
    console.error('Error in handleRoomOpening:', error);
    socket.emit(channelName.openingRoom, socketErrorResponse('Failed to open room'));
  }
};

// onSocketRoomMessage handles incoming messages from the socket and saves them to the database
// It validates the request, checks if the room exists, and emits the message to the room
// and handles any errors that may occur during the process
// It emits a response back to the socket indicating the status of the operation
export const onSocketRoomMessage = (socket: ChatSocket) => async (req: any) => {
  const { destination, body }: { destination: string; body: MessageDto } = req;

  if (!destination) {
    socket.emit(channelName.message, socketErrorResponse('Destination is missing'));
    return;
  }

  if (!body) {
    socket.emit(channelName.message, socketErrorResponse('Invalid request: body is missing'));
    return;
  }

  if (!body.content || !body.sentAt || !body.senderId) {
    socket.emit(channelName.message, socketErrorResponse('Invalid request: message is invalid (content, sentAt, senderId)'));
    return;
  }

  logConnection(socket, channelName.message, destination);

  try {
    const savedMessage = await saveMessage(destination, 'user', body.senderId, new Date(body.sentAt), body.content);

    const res = socketResponse('ok').destination(destination).withBody(savedMessage);
    io.to(`${destination}`).emit(channelName.message, res);
  } catch (error) {
    console.error('Error in handleMessage:', error);
    socket.emit(channelName.message, socketErrorResponse('Failed to send message'));
  }
};

// Log group activity
const logGroupActivity = (socket: ChatSocket, type: string, groupId: string) => {
  if (!LOG_LEVEL) return;
  console.log(`Activity User: ${socket.userId}, Group: ${groupId}, Type: ${type}`);
};


// onSocketRoomEditMessage handles the editing of a message in a room
// It validates the request, checks if the room exists, and emits the edited message to the room
// It handles any errors that may occur during the process
// It emits a response back to the socket indicating the status of the operation
export const onSocketRoomEditMessage = (socket: ChatSocket) => async (req: any) => {
  const { destination, body }: { destination: string; body: MessageDto } = req;

  if (!destination) {
    socket.emit(channelName.editMessage, socketErrorResponse('Destination is missing'));
    return;
  }

  if (!body) {
    socket.emit(channelName.editMessage, socketErrorResponse('Invalid request: body is missing'));
    return;
  }

  if (!body.content || !body.id || !body.senderId) {
    console.log(body);
    socket.emit(channelName.editMessage, socketErrorResponse(`Invalid request: message is invalid (content, sentAt, senderId)`));
    return;
  }

  logConnection(socket, channelName.editMessage, destination);

  try {
    const savedMessage = await updateMessage(body.id, body.content);

    const res = socketResponse('ok').destination(destination).withBody(savedMessage);
    io.to(`${destination}`).emit(channelName.editMessage, res);
  } catch (error) {
    console.error('Error in handleEditMessage:', error);
    socket.emit(channelName.editMessage, socketErrorResponse('Failed to edit message'));
  }
}

// onSocketRoomUnsendMessage handles the unsending of a message in a room
  // It validates the request, checks if the room exists, and emits the unsent message to the room
  // It handles any errors that may occur during the process
  // It emits a response back to the socket indicating the status of the operation
  export const onSocketRoomUnsendMessage = (socket: ChatSocket) => async (req: any) => {
    const { destination, body }: { destination: string; body: MessageDto } = req;

    if (!destination) {
      socket.emit(channelName.editMessage, socketErrorResponse('Destination is missing'));
      return;
    }

    if (!body) {
      socket.emit(channelName.editMessage, socketErrorResponse('Invalid request: body is missing'));
      return;
    }

    if (!body.id || !body.senderId) {
      console.log(body);
      socket.emit(channelName.editMessage, socketErrorResponse(`Invalid request: message is invalid (content, senderId)`));
      return;
    }

    logConnection(socket, channelName.editMessage, destination);

    try {
      const savedMessage = await unsendMessage(body.id);

      const res = socketResponse('ok').destination(destination).withBody(savedMessage);
      io.to(`${destination}`).emit(channelName.editMessage, res);
    } catch (error) {
      console.error('Error in handleEditMessage:', error);
      socket.emit(channelName.editMessage, socketErrorResponse('Failed to edit message'));
    }
  }