import { DestinationDto, ErrorSocket, MessageDto } from '@/socket-type';
import { JsonObject, JsonValue } from '@prisma/client/runtime/library';

export interface GroupDestinationDto extends DestinationDto {
  type: 'group';
  groupId: number;
}

export interface GroupJoinReqDto {
  destination: GroupDestinationDto;
}

export interface GroupJoinResDto extends ErrorSocket {
  group?: any;
}

export interface GroupOpenReqDto {
  groupId: number;
}

export interface GroupOpenResDto extends ErrorSocket {}

export interface GroupLeaveReqDto {
  destination: GroupDestinationDto;
}

export interface GroupLeaveResDto extends ErrorSocket {}

export interface GroupBroadcastActivityDto {
  type: string;
  userId: number;
  username: string;
}

export interface GroupMessageReqDto extends JsonObject, ErrorSocket {
  destination: GroupDestinationDto;
  timestamp: string;
  content: MessageDto;
}

export interface GroupMessageResDto extends ErrorSocket {
  destination?: GroupDestinationDto;
  messages?: { userId: number; groupId: number; content: JsonValue; sentAt: Date }[];
  timestamp?: string;
}
