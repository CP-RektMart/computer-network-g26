export interface User {
  id: string
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
  senderId: string
  text: string
  timestamp: string
  isEdited: boolean
}
