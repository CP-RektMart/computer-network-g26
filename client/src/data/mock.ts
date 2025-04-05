import type { Chat, Message, User } from '@/lib/types'

// Mock data
export const currentUser: User = {
  id: 'user1',
  name: 'John Doe',
  email: 'john@example.com',
  avatar: '/placeholder.svg?height=40&width=40',
}

export const initialChats: Chat[] = [
  {
    id: 'chat1',
    name: 'Jane Smith',
    isGroup: false,
    lastMessage: 'Hey, how are you?',
    timestamp: '10:30 AM',
    avatar: '/placeholder.svg?height=40&width=40',
    unread: 2,
    participants: [
      {
        id: 'user1',
        name: 'John Doe',
        avatar: '/placeholder.svg?height=40&width=40',
      },
      {
        id: 'user2',
        name: 'Jane Smith',
        avatar: '/placeholder.svg?height=40&width=40',
      },
    ],
  },
  {
    id: 'chat2',
    name: 'Project Team',
    isGroup: true,
    lastMessage: 'Meeting at 2 PM',
    timestamp: 'Yesterday',
    avatar: '/placeholder.svg?height=40&width=40',
    unread: 0,
    participants: [
      {
        id: 'user1',
        name: 'John Doe',
        avatar: '/placeholder.svg?height=40&width=40',
      },
      {
        id: 'user3',
        name: 'Mike Johnson',
        avatar: '/placeholder.svg?height=40&width=40',
      },
      {
        id: 'user4',
        name: 'Sarah Williams',
        avatar: '/placeholder.svg?height=40&width=40',
      },
    ],
  },
  {
    id: 'chat3',
    name: 'Mike Johnson',
    isGroup: false,
    lastMessage: 'Can you send me the files?',
    timestamp: 'Yesterday',
    avatar: '/placeholder.svg?height=40&width=40',
    unread: 0,
    participants: [
      {
        id: 'user1',
        name: 'John Doe',
        avatar: '/placeholder.svg?height=40&width=40',
      },
      {
        id: 'user3',
        name: 'Mike Johnson',
        avatar: '/placeholder.svg?height=40&width=40',
      },
    ],
  },
  {
    id: 'chat4',
    name: 'Design Team',
    isGroup: true,
    lastMessage: 'New mockups are ready',
    timestamp: 'Monday',
    avatar: '/placeholder.svg?height=40&width=40',
    unread: 5,
    participants: [
      {
        id: 'user1',
        name: 'John Doe',
        avatar: '/placeholder.svg?height=40&width=40',
      },
      {
        id: 'user5',
        name: 'Emily Davis',
        avatar: '/placeholder.svg?height=40&width=40',
      },
      {
        id: 'user6',
        name: 'Alex Turner',
        avatar: '/placeholder.svg?height=40&width=40',
      },
    ],
  },
]

export const initialMessages: Record<string, Message[]> = {
  chat1: [
    {
      id: 'msg1',
      chatId: 'chat1',
      senderId: 'user2',
      text: 'Hey, how are you?',
      timestamp: '10:30 AM',
      isEdited: false,
    },
    {
      id: 'msg2',
      chatId: 'chat1',
      senderId: 'user1',
      text: "I'm good, thanks! How about you?",
      timestamp: '10:32 AM',
      isEdited: false,
    },
    {
      id: 'msg3',
      chatId: 'chat1',
      senderId: 'user2',
      text: 'Doing well! Are you free to discuss the project later today?',
      timestamp: '10:33 AM',
      isEdited: false,
    },
  ],
  chat2: [
    {
      id: 'msg4',
      chatId: 'chat2',
      senderId: 'user3',
      text: 'Meeting at 2 PM today, everyone',
      timestamp: '9:00 AM',
      isEdited: false,
    },
    {
      id: 'msg5',
      chatId: 'chat2',
      senderId: 'user4',
      text: "I'll be there!",
      timestamp: '9:05 AM',
      isEdited: false,
    },
    {
      id: 'msg6',
      chatId: 'chat2',
      senderId: 'user1',
      text: 'See you all then',
      timestamp: '9:10 AM',
      isEdited: false,
    },
  ],
  chat3: [
    {
      id: 'msg7',
      chatId: 'chat3',
      senderId: 'user3',
      text: 'Can you send me the files?',
      timestamp: 'Yesterday',
      isEdited: false,
    },
    {
      id: 'msg8',
      chatId: 'chat3',
      senderId: 'user1',
      text: 'Sure, I will send them over shortly.',
      timestamp: 'Yesterday',
      isEdited: false,
    },
  ],
  chat4: [
    {
      id: 'msg9',
      chatId: 'chat4',
      senderId: 'user5',
      text: 'New mockups are ready for review.',
      timestamp: 'Monday',
      isEdited: false,
    },
    {
      id: 'msg10',
      chatId: 'chat4',
      senderId: 'user1',
      text: 'Great! I will check them out.',
      timestamp: 'Monday',
      isEdited: false,
    },
  ],
}
