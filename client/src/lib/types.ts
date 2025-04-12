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
  joinedAt: Date | undefined
}

export interface Chat {
  id: string
  name: string
  isGroup: boolean
  lastMessage: string
  timestamp: string
  unread: number
  messageCount: number
  participants: Participant[]
}

export interface Message {
  id: string
  chatId: string
  senderId: number
  text: string
  timestamp: string
  isEdited: boolean
}
