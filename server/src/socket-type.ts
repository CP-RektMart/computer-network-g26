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

// Base destination type
export interface DestinationDto extends JsonObject {
  type: 'group' | 'direct';
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

export interface UserStatusResDto extends ErrorSocket {
  userId?: number;
  groupId?: number;
  isOnline?: boolean;
}

export const groupFormat = (groupId: number): string => `group-${groupId}`;
export const directFormat = (id1: number, id2: number): string => {
  const [lower, greater] = id1 < id2 ? [id1, id2] : [id2, id1];
  return `direct-${lower}-${greater}`;
};
