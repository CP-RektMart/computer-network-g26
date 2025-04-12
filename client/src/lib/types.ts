export interface User {
  id: number
  username: string
  email?: string
  avatar?: string
  isOnline?: boolean
}

export interface Chat {
  id: string
  name: string
  isGroup: boolean
  avatar?: string
  participants: User[]
  lastMessage?: string
  timestamp?: string
  unread?: number
}

export interface Message {
  id: string
  conversationId: string
  senderId: number
  receiverId: number
  content: string
  sentAt: Date
  sender?: User
}

export interface DirectConversation {
  id: string
  otherUser: User
  lastMessage?: Message
  createdAt: Date
}
