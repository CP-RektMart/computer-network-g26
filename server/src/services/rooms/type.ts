import { UserDto } from '@/services/users/type';
import { JsonObject } from '@prisma/client/runtime/library';

// ParticipantDto interface extends UserDto and adds additional properties related to chat participation
export interface ParticipantDto extends UserDto {
  role: string;
  joinAt: Date | undefined;
  isOnline: boolean;
  isLeaved: boolean;
}

// ChatInfoDto interface represents basic information about a chat, including its ID, type, avatar, and name
export interface ChatInfoDto {
  id: string;
  type: 'group' | 'direct';
  avatar: string | undefined;
  name: string | undefined;
}

// UserChatDetailDto interface extends ChatInfoDto and adds additional properties related to user chat details
export interface ChatDetailDto extends ChatInfoDto {
  participants: ParticipantDto[];
  lastSendAt: Date | undefined;
  createAt: Date;
  lastMessage: MessageDto | undefined;
}

// MessageDto interface represents a message in a chat, including its ID, sender ID, timestamp, and content
export interface MessageDto {
  id: string;
  senderId: number;
  timestamp: Date;
  content: MessageContentDto;
}

// MessageContentDto interface represents the content of a message, which can be of different types (text, image, file)
export interface MessageContentDto extends JsonObject {
  type: string;
}

// TextMessageContentDto interface extends MessageContentDto and specifies that the content type is 'text'
export interface TextMessageContentDto extends MessageContentDto {
  type: 'text';
  text: string;
}
