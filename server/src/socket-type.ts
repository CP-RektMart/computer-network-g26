import { Group } from '@prisma/client';
import { JsonObject } from '@prisma/client/runtime/library';
import { Socket } from 'socket.io';

export interface ChatSocket extends Socket {
  userId?: number;
  username?: string;
}

export type StatusSocket = 'ok' | 'error';

export interface ErrorSocket {
  status: StatusSocket;
  message?: string;
  error?: string;
}

export function errorWrapper(status: StatusSocket, message: string): ErrorSocket {
  return { status, error: message };
}

export interface ConnectedResDto extends ErrorSocket {
  user: any;
}

export interface MessageReqDto extends JsonObject, ErrorSocket {
  destination: DestinationDto;
  timestamp: string;
  content: MessageDto;
}

export interface MessageResDto extends ErrorSocket {
  senderId?: number;
  destination?: DestinationDto;
  content?: MessageDto[];
  timestamp?: string;
}

// Base destination type
export interface DestinationDto extends JsonObject {
  type: 'group' | 'direct';
}

// Group destination type
export interface GroupDestinationDto extends DestinationDto {
  type: 'group';
  groupId: number;
}

// Group destination type
export interface DirectDestinationDto extends DestinationDto {
  type: 'direct';
  receiverId: number;
}

// Base message type
export interface MessageDto extends JsonObject {
  type: 'text' | 'image' | 'file';
}

// Text message
export interface TextMessageDto extends MessageDto {
  type: 'text';
  text: string;
}

export interface GroupJoinReqDto {
  destination: GroupDestinationDto;
}

export interface GroupJoinResDto extends ErrorSocket {
  group?: any;
}

export interface GroupLeaveReqDto {
  destination: GroupDestinationDto;
}

export interface GroupLeaveResDto extends ErrorSocket {}

export interface GroupBroadcastActivityDto {
  type: string;
  userId: number;
  username: string;
}

export interface UserStatusResDto extends ErrorSocket {
  userId?: number;
  groupId?: number;
  isOnline?: boolean;
}

export interface GroupOpenReqDto {
  groupId: number;
}

export const groupFormat = (groupId: number): string => `group-${groupId}`;
export const directFormat = (id1: number, id2: number): string => {
  const [lower, greater] = id1 < id2 ? [id1, id2] : [id2, id1];
  return `direct-${lower}-${greater}`;
};
