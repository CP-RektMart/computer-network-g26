import { ChatInfoDto, ParticipantDto } from '@/services/rooms/type';

// GroupActivityDto is used to represent the activity of a group chat, such as joining, leaving, updating, or deleting a group.
export interface GroupActivityDto {
  activity: string;
}
export interface GroupJoinActivityDto {
  activity: 'join';
  participant: ParticipantDto;
}

export interface GroupLeaveActivityDto {
  activity: 'leave';
  userId: number;
}

export interface GroupUpdateActivityDto extends ChatInfoDto {
  activity: 'update-admin';
  participant: ParticipantDto;
}

export interface GroupDeleteActivityDto {
  activity: 'delete';
  userId: number;
}
