import { DestinationDto, ErrorSocket, MessageDto } from '@/socket-type';
import { JsonObject, JsonValue } from '@prisma/client/runtime/library';

export interface DirectDestinationDto extends DestinationDto {
  type: 'direct';
  receiverId: number;
}

export interface DirectJoinReqDto {
  destination: DirectDestinationDto;
}

export interface DirectJoinResDto extends ErrorSocket {
  conversation?: any;
}

export interface DirectOpenReqDto {
  receiverId: number;
}

export interface DirectOpenResDto extends ErrorSocket {}

export interface DirectLeaveReqDto {
  destination: DirectDestinationDto;
}

export interface DirectLeaveResDto extends ErrorSocket {}

export interface DirectMessageReqDto extends JsonObject, ErrorSocket {
  destination: DirectDestinationDto;
  timestamp: string;
  content: MessageDto;
}

export interface DirectMessageResDto extends ErrorSocket {
  destination?: DirectDestinationDto;
  messages?: { senderId: number; receiverId: number; content: JsonValue; sentAt: Date }[];
  timestamp?: string;
}
