import { useEffect } from 'react'
import type { Chat, Message, Participant } from '@/lib/types'

export const useRoomMessageHandler = (
  socketRef: React.RefObject<any>,
  userId: string | undefined,
  selectedChat: Chat | null,
  setSelectedChat: React.Dispatch<React.SetStateAction<Chat | null>>,
  chats: Chat[],
  messages: Record<string, Message[]>,
  setMessages: React.Dispatch<React.SetStateAction<Record<string, Message[]>>>,

  setChats: React.Dispatch<React.SetStateAction<Chat[]>>,
  setChatAreaScrollDown: React.Dispatch<React.SetStateAction<boolean>>,
) => {
  useEffect(() => {
    const socket = socketRef.current
    if (!socket) return

    const handleRoomMessage = (res: any) => {
      console.log('Socket Room Message:', res)
      if (res.status !== 'ok') {
        console.error('Error in room message:', res.error)
        return
      }
      const { destination: chatId, body: message } = res

      const newMessage: Message = {
        id: message.id,
        chatId,
        senderId: message.senderId,
        text: message.content.text,
        timestamp: message.timestamp,
        isEdited: false,
      }

      setMessages((prevMessages) => ({
        ...prevMessages,
        [chatId]: [...(prevMessages[chatId] || []), newMessage],
      }))

      if (String(newMessage.senderId) === userId) {
        setChatAreaScrollDown(true)
      }

      setChats((prevChats) =>
        prevChats.map((chat) =>
          chat.id === chatId
            ? {
                ...chat,
                lastMessage: newMessage.text,
                timestamp: newMessage.timestamp,
                unread:
                  chat.id === selectedChat?.id ? chat.unread : chat.unread + 1,
                messageCount: chat.messageCount + 1,
              }
            : chat,
        ),
      )
    }
    socket.on('socket-group-update', (res: any) => {
      console.log('Socket Group Update:', res)
      if (res.status !== 'ok') {
        console.error('Error in group update:', res.error)
        return
      }

      const { destination: chatId, body: updateActivity } = res

      if (updateActivity.activity === 'join') {
        const participant = updateActivity.participant
        const mappedParticipant: Participant = {
          id: participant.id,
          username: participant.name,
          isOnline: participant.isOnline,
          email: participant.email,
          joinedAt: participant.joinAt,
          role: participant.role,
          lastLoginAt: participant.lastLoginAt,
          registeredAt: participant.registeredAt,
        }


        setChats((prevChats) =>
          prevChats.map((chat) => {
            if (chat.id !== chatId) return chat

            const existingParticipant = chat.participants.find(
              (p) => p.id === mappedParticipant.id,
            )
            let updatedParticipants: Participant[]

            if (existingParticipant) {
              // Update existing participant
              updatedParticipants = chat.participants.map((p) =>
                p.id === mappedParticipant.id ? mappedParticipant : p,
              )
            } else {
              // Add new participant
              updatedParticipants = [...chat.participants, mappedParticipant]
            }
            if (selectedChat?.id === chatId) {
              setSelectedChat(chat)
            }

            return {
              ...chat,
              participants: updatedParticipants,
            }
          }),
        )
      }
    })

    socket.on('socket-room-message', handleRoomMessage)

    return () => {
      socket.off('socket-room-message', handleRoomMessage)
      socket.off('socket-group-update', handleRoomMessage)
    }
  }, [chats, socketRef, userId, selectedChat, messages])

  useEffect(() => {
  }, [chats])
}

export const fetchRoomMessages = async (
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
