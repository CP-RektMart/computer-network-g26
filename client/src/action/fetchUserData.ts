import { useEffect } from 'react'
import type { Chat, Participant } from '@/lib/types'

export const useFetchUserData = (
  getToken: () => string | null,
  setChats: React.Dispatch<React.SetStateAction<Chat[]>>,
  setMessages: React.Dispatch<React.SetStateAction<{ [key: string]: any }>>,
  socketRef: React.RefObject<any>,
) => {
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

        const chats: Chat[] = data.map((chat: any) => {
          const participants: Participant[] = chat.participants.map(
            (p: any) => ({
              id: p.id,
              username: p.name,
              role: p.role,
              email: p.email,
              lastLoginAt: p.lastLoginAt,
              registeredAt: p.registeredAt,
              isOnline: p.isOnline,
              joinedAt: p.joinedAt,
            }),
          )

          return {
            id: chat.id,
            name: chat.name,
            isGroup: chat.type === 'group',
            lastMessage: chat.lastMessage?.content?.text,
            timestamp: chat.lastMessage?.timestamp,
            unread: chat.unread,
            participants,
            messageCount: chat.messageCount,
          }
        })

        setChats(chats)

        // Connect to each chat room socket
        for (const chat of chats) {
          if (socketRef.current) {
            socketRef.current.emit('socket-room-connect', {
              destination: chat.id,
            })
          }
          setMessages((prevMessages) => ({
            ...prevMessages,
            [chat.id]: [],
          }))
        }
      } catch (error) {
        console.error('Error fetching chat data:', error)
      }
    }

    fetchUserData()
  }, [getToken, setChats, setMessages, socketRef])
}
