import { ChatDetailDto } from '../rooms/type';

// UserDto interface represents a user with properties such as ID, name, email, avatar, registration date, and last login date.
export interface UserDto {
  id: number;
  username: string;
  email: string;
  registeredAt: Date | undefined;
  lastLoginAt: Date | undefined;
  isOnline: boolean;
}

// ParticipantDto interface extends UserDto and adds additional properties related to chat participation
export interface UserChatDetailDto extends ChatDetailDto {
  unread: Number;
}
