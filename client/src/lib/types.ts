export interface User {
  id: number
  username: string
  email: string
}

export interface Chat {
  id: string
  name: string
  isGroup: boolean
  lastMessage: string
  timestamp: string
  avatar: string
  unread: number
  participants: User[]
}

export interface Message {
  id: string
  chatId: string
  senderId: number
  text: string
  timestamp: string
  isEdited: boolean
}
