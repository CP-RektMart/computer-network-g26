import { useEffect } from 'react'
import type { Chat, Message } from '@/lib/types'

export const useRoomMessageHandler = (
  socketRef: React.RefObject<any>,
  userId: string | undefined,
  selectedChatId: string | undefined,
  setMessages: React.Dispatch<
    React.SetStateAction<{ [key: string]: Message[] }>
  >,
  setChats: React.Dispatch<React.SetStateAction<Chat[]>>,
  setChatAreaScrollDown: React.Dispatch<React.SetStateAction<boolean>>,
) => {
  useEffect(() => {
    const socket = socketRef.current
    if (!socket) return

    const handleRoomMessage = (res: any) => {
      console.log('Socket Room Message:', res)
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
                  chat.id === selectedChatId ? chat.unread : chat.unread + 1,
                messageCount: chat.messageCount + 1,
              }
            : chat,
        ),
      )
    }

    socket.on('socket-room-message', handleRoomMessage)

    return () => {
      socket.off('socket-room-message', handleRoomMessage)
    }
  }, [
    socketRef,
    userId,
    selectedChatId,
    setMessages,
    setChats,
    setChatAreaScrollDown,
  ])
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
