import React, { createContext, useContext, useEffect, useState } from 'react'
import { io } from 'socket.io-client'
import { formatDistanceToNow } from 'date-fns'
import { useUser } from './user-context'
import type { Socket } from 'socket.io-client'
import type { Chat, DirectConversation, Message, User } from '@/lib/types'

interface ChatContextType {
  socket: Socket | null
  connected: boolean
  chats: Chat[]
  selectedChat: Chat | null
  messages: Record<string, Message[]>
  loadingChats: boolean
  loadingMessages: boolean
  selectChat: (chat: Chat) => void
  sendMessage: (text: string) => void
  joinDirectChat: (userId: number) => Promise<void>
  leaveDirectChat: () => void
  createGroup: (name: string, participants: User[]) => Promise<void>
  joinGroup: (groupId: string) => Promise<void>
  joinDirectConversation: (conversationId: string) => void
  leaveDirectConversation: (conversationId: string) => void
  openDirectConversation: (conversationId: string) => void
  sendDirectMessage: (conversationId: string, content: string) => void
}

const ChatContext = createContext<ChatContextType | undefined>(undefined)

export const ChatProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { user } = useUser()
  const [socket, setSocket] = useState<Socket | null>(null)
  const [connected, setConnected] = useState(false)
  const [chats, setChats] = useState<Chat[]>([])
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null)
  const [messages, setMessages] = useState<Record<string, Message[]>>({})
  const [loadingChats, setLoadingChats] = useState(false)
  const [loadingMessages, setLoadingMessages] = useState(false)

  // Connect to socket when user logs in
  useEffect(() => {
    if (user && !connected) {
      // If socket is already connected, disconnect it
      if (socket) {
        socket.disconnect()
      }

      const token = localStorage.getItem('auth_token')

      // Initialize socket connection
      const newSocket = io(import.meta.env.VITE_API_URL, {
        auth: { token },
      })

      newSocket.on('connect', () => {
        console.log('Socket connected')
        setConnected(true)
        fetchChats() // Load chats when connected
      })

      newSocket.on('disconnect', () => {
        console.log('Socket disconnected')
        setConnected(false)
      })

      // Listen for direct message events
      newSocket.on('socket-direct-message', (data) => {
        console.log('Direct message received:', data)
        if (data.status === 'ok') {
          const message = data.data
          addMessageToChat(message.conversationId, message)
          updateChatLastMessage(message.conversationId, message)
        }
      })

      // Listen for direct notifications
      newSocket.on('socket-direct-notification', (data) => {
        console.log('Direct notification received:', data)
        if (data.status === 'ok') {
          const { conversationId, message } = data.data
          addMessageToChat(conversationId, message)
          updateChatLastMessage(conversationId, message)
        }
      })

      // Handle direct conversation joined
      newSocket.on('socket-direct-join', (data) => {
        console.log('Direct conversation joined:', data)
        if (data.status === 'ok') {
          const { conversation, otherUser, messages: chatMessages } = data.data

          // Create a chat entry for this conversation
          const chat: Chat = {
            id: conversation.id,
            name: otherUser.username,
            isGroup: false,
            avatar: otherUser.avatar,
            participants: [conversation.sender, conversation.receiver],
            lastMessage:
              chatMessages.length > 0
                ? chatMessages[chatMessages.length - 1].content
                : '',
            timestamp:
              chatMessages.length > 0
                ? formatDistanceToNow(
                    new Date(chatMessages[chatMessages.length - 1].sentAt),
                  )
                : '',
            unread: 0,
          }

          // Add chat to list if not already there
          setChats((prev) => {
            if (!prev.some((c) => c.id === chat.id)) {
              return [...prev, chat]
            }
            return prev
          })

          // Store messages
          setMessages((prev) => ({
            ...prev,
            [conversation.id]: chatMessages,
          }))
        }
      })

      setSocket(newSocket)

      return () => {
        newSocket.disconnect()
      }
    }
  }, [user])

  // Fetch all chats
  const fetchChats = async () => {
    console.log({ user, socket })

    if (!user) return

    setLoadingChats(true)

    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/api/directs/conversations`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('auth_token')}`,
          },
        },
      )
      if (!response.ok) throw new Error('Failed to fetch chats')
      const data = await response.json()
      const conversations: DirectConversation[] = data.data
      const chats: Chat[] = conversations.map(
        (conversation: DirectConversation) => {
          return {
            id: conversation.id,
            name: conversation.otherUser.username,
            isGroup: false,
            avatar: conversation.otherUser.avatar,
            participants: [user, conversation.otherUser],
            lastMessage: conversation.lastMessage?.content || '',
            timestamp: conversation.lastMessage
              ? formatDistanceToNow(new Date(conversation.lastMessage.sentAt), {
                  addSuffix: true,
                })
              : '',
            unread: 0,
          }
        },
      )
      setChats(chats)
      setLoadingChats(false)
    } catch (error) {
      console.error('Error fetching chats:', error)
      setLoadingChats(false)
    }
  }

  // Add a message to chat history
  const addMessageToChat = (chatId: string, message: Message) => {
    setMessages((prev) => {
      const chatMessages = prev[chatId]
      return {
        ...prev,
        [chatId]: [...chatMessages, message],
      }
    })
  }

  // Update chat's last message
  const updateChatLastMessage = (chatId: string, message: Message) => {
    setChats((prev) =>
      prev.map((chat) => {
        if (chat.id === chatId) {
          return {
            ...chat,
            lastMessage: message.content,
            timestamp: formatDistanceToNow(new Date(message.sentAt)),
            unread: selectedChat?.id === chatId ? 0 : (chat.unread || 0) + 1,
          }
        }
        return chat
      }),
    )
  }

  // Select a chat
  const selectChat = async (chat: Chat) => {
    setSelectedChat(chat)

    // Reset unread count
    setChats((prev) =>
      prev.map((c) => (c.id === chat.id ? { ...c, unread: 0 } : c)),
    )

    // Fetch messages for the selected chat
    setLoadingMessages(true)
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/api/directs/conversations/${chat.id}`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('auth_token')}`,
          },
        },
      )
      if (!response.ok) throw new Error('Failed to fetch messages')

      const data = await response.json()
      const chatMessages: Message[] = data.data

      setMessages((prev) => ({
        ...prev,
        [chat.id]: chatMessages,
      }))
    } catch (error) {
      console.error('Error fetching messages:', error)
    } finally {
      setLoadingMessages(false)
    }

    // For direct chats, join and open the room
    if (!chat.isGroup) {
      joinDirectConversation(chat.id)
      openDirectConversation(chat.id)
    }
  }

  // Send a message in the currently selected chat
  const sendMessage = (text: string) => {
    if (!selectedChat || !socket) return

    if (selectedChat.isGroup) {
      // Handle group messages
      socket.emit('socket-group-message', {
        groupId: selectedChat.id,
        content: text,
      })
    } else {
      // Handle direct messages
      sendDirectMessage(selectedChat.id, text)
    }
  }

  // Start a direct chat with a user
  const joinDirectChat = async (userId: number) => {
    if (!socket || !user) return

    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/api/directs/conversations`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${localStorage.getItem('auth_token')}`,
          },
          body: JSON.stringify({ receiverId: userId }),
        },
      )

      if (!response.ok) throw new Error('Failed to create conversation')

      const conversation = await response.json()

      selectChat({
        id: conversation.data.id,
        name: conversation.data.otherUser.username,
        isGroup: false,
        avatar: conversation.data.otherUser.avatar,
        participants: [user, conversation.data.otherUser],
        lastMessage: '',
        timestamp: '',
        unread: 0,
      })
    } catch (error) {
      console.error('Error joining direct chat:', error)
    }
  }

  // Leave the current direct chat
  const leaveDirectChat = () => {
    if (!selectedChat || !socket) return

    if (!selectedChat.isGroup) {
      leaveDirectConversation(selectedChat.id)
    }

    setSelectedChat(null)
  }

  // Create a new group
  const createGroup = async (name: string, participants: User[]) => {
    if (!socket || !user) return

    try {
      const participantIds = participants.map((p) => p.id)

      // Call your API to create a group
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/api/groups`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${localStorage.getItem('auth_token')}`,
          },
          body: JSON.stringify({
            name,
            participants: participantIds,
          }),
        },
      )

      if (!response.ok) throw new Error('Failed to create group')

      // Refresh chats
      fetchChats()
    } catch (error) {
      console.error('Error creating group:', error)
    }
  }

  // Join an existing group
  const joinGroup = async (groupId: string) => {
    if (!socket) return

    socket.emit('socket-group-join', { groupId })
  }

  // Direct conversation methods
  const joinDirectConversation = (conversationId: string) => {
    if (!socket) return

    socket.emit('socket-direct-join', { conversationId })
  }

  const leaveDirectConversation = (conversationId: string) => {
    if (!socket) return

    socket.emit('socket-direct-leave', { conversationId })
  }

  const openDirectConversation = (conversationId: string) => {
    if (!socket) return

    socket.emit('socket-direct-open', { conversationId })
  }

  const sendDirectMessage = (conversationId: string, content: string) => {
    if (!socket) return

    socket.emit('socket-direct-message', { conversationId, content })
  }

  return (
    <ChatContext.Provider
      value={{
        socket,
        connected,
        chats,
        selectedChat,
        messages,
        loadingChats,
        loadingMessages,
        selectChat,
        sendMessage,
        joinDirectChat,
        leaveDirectChat,
        createGroup,
        joinGroup,
        joinDirectConversation,
        leaveDirectConversation,
        openDirectConversation,
        sendDirectMessage,
      }}
    >
      {children}
    </ChatContext.Provider>
  )
}

export const useChat = () => {
  const context = useContext(ChatContext)
  if (context === undefined) {
    throw new Error('useChat must be used within a ChatProvider')
  }
  return context
}
