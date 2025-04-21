export interface User {
  id: number
  username: string
  email: string
  lastLoginAt?: Date
  registeredAt?: Date
  isOnline?: boolean
}

export interface Participant extends User {
  role: string
  joinedAt?: Date
  isLeaved: boolean
}

export interface GroupInfo {
  id: string
  name: string
  participantCount: number
  havePassword: boolean
}

export interface Chat {
  id: string
  name: string
  isGroup: boolean
  lastMessage: string
  lastSentAt: string
  unread: number
  messageCount: number
  participants: Participant[]
}

export interface Message {
  id: string
  chatId: string
  senderType: string
  senderId: number | null
  text?: string

  action?: 'group-join' | 'group-leave'
  targetUserId?: number

  sentAt: string
  isEdited: boolean
}
