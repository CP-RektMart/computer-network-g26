import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react'
import { io } from 'socket.io-client'
import { getToken, useUser } from './user-context'
import type { Socket } from 'socket.io-client'
import type { Chat, Message, Participant, User } from '@/lib/types'
import { useChatHelper, useChatMessagesHelper } from '@/lib/helpers'

interface ChatContextType {
  socketRef: React.RefObject<Socket | null>
  chats: Chat[]
  selectedChat: Chat | null
  messages: Record<string, Message[]>
  loadingChats: boolean
  loadingMessages: boolean
  selectChat: (chat: Chat) => void
  sendMessage: (text: string) => void
  editMessage: (messageId: string, text: string) => void
  unsendMessage: (messageId: string) => void
  joinGroup: (groupId: string) => Promise<void>
  leaveGroup: (groupId: string) => void
  createDirect: (receiverId: number) => Promise<void>
  createGroup: (name: string, participants: User[]) => Promise<void>
  chatAreaScrollDown: boolean
  setChatAreaScrollDown: React.Dispatch<React.SetStateAction<boolean>>
  fetchMessageToChat: (chatId: string, limit?: number, before?: string) => void
}

const ChatContext = createContext<ChatContextType | undefined>(undefined)
const OnlineUserContext = createContext<number[]>([])

export const ChatProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { user } = useUser()
  const [chats, setChats] = useState<Chat[]>([])
  const {
    updateChat,
    findChat,
    addOrUpdateChat,
    addParticipantOrUpdate,
    sortByLastSentAt,
    removeChat,
    updateParticipant,
  } = useChatHelper(chats, setChats)
  const [messages, setMessages] = useState<Record<string, Message[]>>({})
  const {
    initChatMessages,
    addOrUpdateMessageAtFirst,
    addOrUpdateMessageAtLast,
    removeMessage,
  } = useChatMessagesHelper(messages, setMessages)
  const [onlineUsers, setOnlineUsers] = useState<number[]>([])
  const socketRef = useRef<Socket | null>(null)
  const [loadingChats, setLoadingChats] = useState(false)
  const [loadingMessages, setLoadingMessages] = useState(false)
  const [chatAreaScrollDown, setChatAreaScrollDown] = useState(false)
  const messageMinimum = 20
  const fetchMessageLimit = 20

  const [selectedChat, setSelectedChat] = useState<Chat | null>(null)
  const [waitingSelectedChatId, setWaitingSelectedChat] = useState<
    string | null
  >(null)
  useEffect(() => {
    if (!selectedChat) return
    const chat = findChat(selectedChat.id)
    if (chat !== selectedChat) {
      if (chat) {
        setSelectedChat(chat)
      }
    }
  }, [chats])

  useEffect(() => {
    if (waitingSelectedChatId) {
      const chat = findChat(waitingSelectedChatId)
      if (chat) {
        selectChat(chat)
      }
      setWaitingSelectedChat(null)
    }
  }, [messages])

  // Connect to socket when user logs in
  useEffect(() => {
    const fetchUserData = async () => {
      const token = getToken()

      if (!token) {
        console.warn('No token found.')
        return
      }

      try {
        const response = await fetch(
          `${import.meta.env.VITE_API_URL}/api/users/me/chat`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
        )

        if (!response.ok) {
          console.warn(
            'Failed to fetch user:',
            response.status,
            response.statusText,
          )
          return
        }

        const data = await response.json()
        console.log('Fetched chat data:', data)

        if (!data || !Array.isArray(data)) {
          console.warn('Invalid chat data format')
          return
        }

        data.forEach((chat: any) => {
          const otherParticipants = chat.participants.filter(
            (p: Participant) => p.id !== user?.id,
          )
          const formattedChat: Chat = {
            id: chat.id,
            name:
              chat.type === 'group'
                ? chat.name
                : otherParticipants[0]?.username,
            isGroup: chat.type === 'group',
            lastMessage: chat.lastMessage?.content?.text,
            lastSentAt: chat.lastMessage?.sentAt,
            unread: chat.unread,
            participants: chat.participants,
            messageCount: chat.messageCount,
          }

          addOrUpdateChat(formattedChat)
          connectToChatRoom(chat.id)
          initChatMessages(chat.id, [])
          return formattedChat
        })
        sortByLastSentAt()
      } catch (error) {
        console.error('Error fetching chat data:', error)
      }
    }

    fetchUserData()
  }, [user])

  useEffect(() => {
    if (!socketRef.current) {
      socketRef.current = io(import.meta.env.VITE_API_URL, {
        auth: {
          token: getToken(),
        },
      })

      const socket = socketRef.current

      socket.on('connect_error', (err: { message: any }) => {
        console.error('Socket connection error:', err.message)
      })

      socket.on('connect', () => {
        console.log('Socket connected:', socketRef.current?.id)
      })

      socket.on('socket-room-connect', (res: any) => {
        console.log('Socket Room Connect:', res)
      })

      // Cleanup socket on unmount
      return () => {
        if (socketRef.current) {
          socketRef.current.disconnect()
          console.log('Socket disconnected')
          socketRef.current = null
        }
      }
    }
  }, [user])

  useEffect(() => {
    // Listen for direct message events
    if (!socketRef.current) return

    socketRef.current.on('socket-room-online-status', (res: any) => {
      if (res.status === 'ok') {
        const fetchOnlineUsers = async () => {
          try {
            const response = await fetch(
              `${import.meta.env.VITE_API_URL}/api/users/online`,
            )
            if (!response.ok) {
              throw new Error('Failed to fetch online users')
            }
            const data = await response.json()
            setOnlineUsers(data)
          } catch (error) {
            console.error('Error fetching online users:', error)
          }
        }
        fetchOnlineUsers()
      }
    })

    socketRef.current.on('socket-room-message', (res) => {
      console.log('Message received:', res)
      if (res.status === 'ok') {
        const { destination: chatId, body: message } = res

        const newMessage: Message = {
          id: message.id,
          chatId,
          senderType: message.senderType,
          senderId: message.senderId,
          text: message.content.text,
          action:
            message.senderType === 'system' ? message.content.type : undefined,
          targetUserId:
            message.senderType === 'system'
              ? message.content.userId
              : undefined,

          sentAt: message.sentAt,
          isEdited: message.isEdited,
        }
        console.log(newMessage)
        addOrUpdateMessageAtLast(chatId, newMessage)
        updateChatLastMessage(chatId, newMessage)

        if (newMessage.senderId === user?.id) {
          setChatAreaScrollDown(true)
        }
      }
    })

    socketRef.current.on('socket-group-update', (res: any) => {
      console.log('Socket Group Update:', res)
      if (res.status !== 'ok') {
        console.error('Error in group update:', res.error)
        return
      }
      const { destination: chatId, body: updateActivity } = res
      if (updateActivity.activity === 'join') {
        const participant = updateActivity.participant
        addParticipantOrUpdate(chatId, participant)
      } else if (updateActivity.activity === 'leave') {
        const leavedUserId = updateActivity.userId
        updateParticipant(chatId, { id: leavedUserId, isLeaved: true })
      } else if (updateActivity.activity === 'update-admin') {
        const participant = updateActivity.participant
        addParticipantOrUpdate(chatId, participant)
      }
    })

    socketRef.current.on('socket-direct-open', (res: any) => {
      console.log('Socket Direct Open:', res)
      if (res.status !== 'ok') {
        console.error('Error in direct open:', res.error)
        return
      }
      const { body: newChat } = res

      const otherUser = newChat.participants.find(
        (p: Participant) => p.id !== user?.id,
      )

      const formattedChat: Chat = {
        id: newChat.id,
        name: otherUser?.username ?? 'Unknown',
        isGroup: false,
        lastMessage: newChat.lastMessage?.context?.text,
        lastSentAt: newChat.lastMessage?.sentAt,
        unread: newChat.unread,
        participants: newChat.participants,
        // avatar: newGroup.name.charAt(0).toUpperCase() + newGroup.name.slice(1),
        messageCount: newChat.messageCount,
      }

      if (socketRef.current) {
        socketRef.current.emit('socket-room-connect', {
          destination: newChat.id,
        })
      }

      addOrUpdateChat(formattedChat)
      initChatMessages(formattedChat.id, [])
    })

    socketRef.current.on('socket-group-open', (res: any) => {
      console.log('Socket Group Open:', res)
      if (res.status !== 'ok') {
        console.error('Error in group open:', res.error)
        return
      }
      const { body: newChat } = res

      const formattedChat: Chat = {
        id: newChat.id,
        name: newChat.name,
        isGroup: true,
        lastMessage: newChat.lastMessage?.context?.text,
        lastSentAt: newChat.lastMessage?.sentAt,
        unread: newChat.unread,
        participants: newChat.participants,
        // avatar: newGroup.name.charAt(0).toUpperCase() + newGroup.name.slice(1),
        messageCount: newChat.messageCount,
      }

      if (socketRef.current) {
        socketRef.current.emit('socket-room-connect', {
          destination: formattedChat.id,
        })
      }

      addOrUpdateChat(formattedChat)
      initChatMessages(formattedChat.id, [])
    })

    socketRef.current.on('socket-room-edit-message', (res: any) => {
      console.log('Socket Room Edit Message:', res)
      if (res.status !== 'ok') {
        console.error('Error in edit message:', res.error)
        return
      }
      const { destination: chatId, body: message } = res

      const updatedMessage: Message = {
        id: message.id,
        chatId,
        senderType: message.senderType,
        senderId: message.senderId,
        text: message.content.text,
        sentAt: message.sentAt,
        action:
          message.senderType === 'system' ? message.content.type : undefined,
        targetUserId:
          message.senderType === 'system' ? message.content.userId : undefined,
        isEdited: true,
      }

      addOrUpdateMessageAtLast(chatId, updatedMessage)
      const chatMessages = messages[chatId] ?? []
      if (
        chatMessages.length > 0 &&
        chatMessages[chatMessages.length - 1].id === updatedMessage.id
      ) {
        updateChatLastMessageOnly(chatId, updatedMessage)
      }
    })

    socketRef.current.on('socket-room-unsend-message', (res: any) => {
      console.log('Socket Room Unsend Message:', res)
      if (res.status !== 'ok') {
        console.error('Error in unsend message:', res.error)
        return
      }
      const { destination: chatId, body: message } = res
      const unsentMessageId = message.id

      const chatMessages = messages[chatId] ?? []
      if (
        chatMessages.length > 1 &&
        chatMessages[chatMessages.length - 1].id === unsentMessageId
      ) {
        updateChatLastMessageOnly(chatId, chatMessages[chatMessages.length - 2])
      }

      removeMessage(chatId, unsentMessageId)
    })

    return () => {
      if (socketRef.current) {
        socketRef.current.off('socket-room-message')
      }
      if (socketRef.current) {
        socketRef.current.off('socket-group-update')
      }
    }
  }, [chats, socketRef.current, user, selectedChat, messages])

  const connectToChatRoom = (chatId: string) => {
    if (!socketRef.current) return
    socketRef.current.emit('socket-room-connect', {
      destination: chatId,
    })
  }

  const OpenRoom = (chatId: string) => {
    if (socketRef.current) {
      socketRef.current.emit('socket-room-opening', { destination: chatId })
    }
  }

  // Update chat's last message
  const updateChatLastMessage = (chatId: string, message: Message) => {
    const chat = findChat(chatId)
    if (!chat) return
    updateChat({
      id: chatId,
      lastMessage: message.text,
      lastSentAt: message.sentAt,
      unread: selectedChat?.id === chatId ? 0 : (chat.unread || 0) + 1,
    })
    sortByLastSentAt()
  }

  // Updates last message only, does not affect unread count
  const updateChatLastMessageOnly = (chatId: string, message: Message) => {
    const chat = findChat(chatId)
    if (!chat) return
    updateChat({
      id: chatId,
      lastMessage: message.text,
      lastSentAt: message.sentAt,
    })
  }

  // Select a chat
  const selectChat = async (chat: Chat) => {
    try {
      setSelectedChat(chat)

      // Reset unread count
      setChats((prev) =>
        prev.map((c) => (c.id === chat.id ? { ...c, unread: 0 } : c)),
      )

      // Fetch messages for the selected chat
      setLoadingMessages(true)
      OpenRoom(chat.id)

      if (messages[chat.id].length < messageMinimum) {
        await fetchMessageToChat(
          chat.id,
          fetchMessageLimit,
          messages[chat.id][0]?.sentAt || undefined,
        )
      }
      setChatAreaScrollDown(true)
    } catch (error) {
      console.error('Error fetching messages:', error)
    } finally {
      setLoadingMessages(false)
    }
  }

  // Send a message in the currently selected chat
  const sendMessage = (text: string) => {
    if (!user || !selectedChat || !text.trim()) return

    socketRef.current?.emit('socket-room-message', {
      destination: selectedChat.id,
      body: {
        senderId: user.id,
        content: {
          type: 'text',
          text,
        },
        sentAt: new Date(),
      },
    })
  }

  const editMessage = (messageId: string, text: string) => {
    if (!user || !selectedChat || !text.trim()) return
    socketRef.current?.emit('socket-room-edit-message', {
      destination: selectedChat.id,
      body: {
        id: messageId,
        senderId: user.id,
        content: {
          type: 'text',
          text,
        },
      },
    })
  }

  const unsendMessage = (messageId: string) => {
    if (!user || !selectedChat) return
    socketRef.current?.emit('socket-room-unsend-message', {
      destination: selectedChat.id,
      body: {
        id: messageId,
        senderId: user.id,
      },
    })
  }

  const createDirect = async (receiverId: number) => {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/api/directs/${receiverId}`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${getToken()}`,
            'Content-Type': 'application/json',
          },
        },
      )

      if (!response.ok) {
        throw new Error('Failed to create group')
      }

      const newDirectChat = await response.json()

      console.log('New direct created:', newDirectChat)
      if (newDirectChat.isExist) {
        const chat = findChat(newDirectChat.id)
        if (chat) {
          selectChat(chat)
        }
        return
      }

      const otherUser = newDirectChat.participants.find(
        (p: Participant) => p.id !== user?.id,
      )

      const newChat: Chat = {
        id: newDirectChat.id,
        name: otherUser?.username ?? 'Unknown',
        isGroup: false,
        lastMessage: newDirectChat.lastMessage?.context?.text,
        lastSentAt: newDirectChat.lastMessage?.sentAt,
        unread: newDirectChat.unread,
        participants: newDirectChat.participants,
        // avatar: newGroup.name.charAt(0).toUpperCase() + newGroup.name.slice(1),
        messageCount: newDirectChat.messageCount,
      }

      if (socketRef.current) {
        socketRef.current.emit('socket-room-connect', {
          destination: newChat.id,
        })
      }

      addOrUpdateChat(newChat)
      initChatMessages(newChat.id, [])
      setWaitingSelectedChat(newChat.id)
    } catch (error) {
      console.error('Error creating direct chat:', error)
    }
  }

  const createGroup = async (name: string, participants: User[]) => {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/api/groups`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${getToken()}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            groupName: name,
            participantIds: participants.map((p) => p.id),
          }),
        },
      )

      if (!response.ok) {
        throw new Error('Failed to create group')
      }

      const newGroup = await response.json()
      console.log('New group created:', newGroup)

      const newChat: Chat = {
        id: newGroup.id,
        name: newGroup.name,
        isGroup: true,
        lastMessage: newGroup.lastMessage?.context?.text,
        lastSentAt: newGroup.lastMessage?.sentAt,
        unread: newGroup.unread,
        participants: newGroup.participants,
        // avatar: newGroup.name.charAt(0).toUpperCase() + newGroup.name.slice(1),
        messageCount: newGroup.messageCount,
      }

      if (socketRef.current) {
        socketRef.current.emit('socket-room-connect', {
          destination: newChat.id,
        })
      }

      addOrUpdateChat(newChat)
      initChatMessages(newChat.id, [])
      setWaitingSelectedChat(newChat.id)
    } catch (error) {
      console.error('Error creating group:', error)
    }
  }

  const joinGroup = async (groupId: string) => {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/api/groups/${groupId}/join`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${getToken()}`,
          },
        },
      )

      if (!response.ok) {
        throw new Error('Failed to join group')
      }

      const chat = await response.json()

      const mappedChat: Chat = {
        id: chat.id,
        name: chat.name,
        isGroup: chat.type === 'group',
        lastMessage: chat.lastMessage?.content?.text,
        lastSentAt: chat.lastMessage?.sentAt,
        // avatar: chat.avatar,
        unread: chat.unread,
        participants: chat.participants,
        messageCount: chat.messageCount,
      }

      if (socketRef.current) {
        socketRef.current.emit('socket-room-connect', {
          destination: mappedChat.id,
        })
      }

      addOrUpdateChat(mappedChat)
      initChatMessages(mappedChat.id, [])
      setWaitingSelectedChat(mappedChat.id)
    } catch (error) {
      console.error('Error join group:', error)
    }
  }

  const leaveGroup = async (groupId: string) => {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/api/groups/${groupId}/leave`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${getToken()}`,
          },
        },
      )

      if (!response.ok) {
        throw new Error('Failed to leave group')
      }

      const msg = await response.json()
      console.log('Left group:', msg)

      setSelectedChat(null)
      removeChat(groupId)
    } catch (error) {
      console.error('Error leave group:', error)
    }
  }

  const fetchMessageToChat = async (
    chatId: string,
    limit?: number,
    before?: string,
  ) => {
    const token = getToken()
    if (!token) return

    try {
      setLoadingChats(true)

      const data = await fetchRoomMessages(chatId, token, limit, before)

      data.forEach((message: any) => {
        const mappedMessage: Message = {
          id: message.id,
          chatId: chatId,
          senderType: message.senderType,
          senderId: message.senderId,
          text: message.content.text,
          sentAt: message.sentAt,
          action:
            message.senderType === 'system' ? message.content.type : undefined,
          targetUserId:
            message.senderType === 'system'
              ? message.content.userId
              : undefined,
          isEdited: message.isEdited,
        }
        addOrUpdateMessageAtFirst(chatId, mappedMessage)
      })
      setLoadingChats(false)
    } catch (error) {
      console.error('Error fetching chats:', error)
      setLoadingChats(false)
    }
  }

  const fetchRoomMessages = async (
    chatId: string,
    token: string,
    limit?: number,
    before?: string,
  ): Promise<any[]> => {
    let url = `${import.meta.env.VITE_API_URL}/api/rooms/${chatId}/messages`
    if (limit) url += `?limit=${limit}`
    if (before) url += `&before=${before}`

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })

    if (!response.ok) {
      throw new Error('Failed to fetch messages')
    }

    const data = await response.json()
    console.log('Fetched messages:', data)
    return data
  }

  return (
    <ChatContext.Provider
      value={{
        socketRef,
        chats,
        selectedChat,
        messages,
        chatAreaScrollDown,
        setChatAreaScrollDown,
        loadingChats,
        loadingMessages,
        selectChat,
        sendMessage,
        editMessage,
        unsendMessage,
        createDirect,
        createGroup,
        joinGroup,
        leaveGroup,
        fetchMessageToChat,
      }}
    >
      {children}
      <OnlineUserContext.Provider value={onlineUsers}>
        {children}
      </OnlineUserContext.Provider>
    </ChatContext.Provider>
  )
}

export const useOnlineUsers = () => {
  const context = useContext(OnlineUserContext)
  return context
}

export const useChat = () => {
  const context = useContext(ChatContext)
  if (context === undefined) {
    throw new Error('useChat must be used within a ChatProvider')
  }
  return context
}
