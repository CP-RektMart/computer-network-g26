import type { Chat, Message, Participant } from './types'

export const useChatMessagesHelper = (
  messages: Record<string, Message[]>,
  setMessages: React.Dispatch<React.SetStateAction<Record<string, Message[]>>>,
) => {
  const initChatMessages = (chatId: string, initialMessages: Message[]) => {
    setMessages((prev) => ({
      ...prev,
      [chatId]: initialMessages,
    }))
  }

  const addMessageAtLast = (chatId: string, message: Message) => {
    setMessages((prev) => {
      const chatMessages = prev[chatId] || []
      return {
        ...prev,
        [chatId]: [...chatMessages, message],
      }
    })
  }

  const addMessageAtFirst = (chatId: string, message: Message) => {
    setMessages((prev) => {
      const chatMessages = prev[chatId] || []
      return {
        ...prev,
        [chatId]: [message, ...chatMessages],
      }
    })
  }

  const addOrUpdateMessageAtLast = (chatId: string, message: Message) => {
    setMessages((prev) => {
      const chatMessages = prev[chatId] || []

      // Check if the message already exists by its ID (or any other unique property)
      const messageIndex = chatMessages.findIndex((m) => m.id === message.id)

      if (messageIndex !== -1) {
        // If the message exists, update it
        const updatedMessages = [...chatMessages]
        updatedMessages[messageIndex] = {
          ...updatedMessages[messageIndex],
          ...message,
        }
        return {
          ...prev,
          [chatId]: updatedMessages,
        }
      } else {
        // If the message does not exist, add it at the last position
        return {
          ...prev,
          [chatId]: [...chatMessages, message],
        }
      }
    })
  }

  const addOrUpdateMessageAtFirst = (chatId: string, message: Message) => {
    setMessages((prev) => {
      const chatMessages = prev[chatId] || []

      // Check if the message already exists by its ID (or any other unique property)
      const messageIndex = chatMessages.findIndex((m) => m.id === message.id)

      if (messageIndex !== -1) {
        // If the message exists, update it
        const updatedMessages = [...chatMessages]
        updatedMessages[messageIndex] = {
          ...updatedMessages[messageIndex],
          ...message,
        }
        return {
          ...prev,
          [chatId]: updatedMessages,
        }
      } else {
        // If the message does not exist, add it at the first position
        return {
          ...prev,
          [chatId]: [message, ...chatMessages],
        }
      }
    })
  }

  const updateMessage = (
    chatId: string,
    updated: Partial<Message> & { id: string },
  ) => {
    setMessages((prev) => {
      const chatMessages = prev[chatId] || []
      return {
        ...prev,
        [chatId]: chatMessages.map((m) =>
          m.id === updated.id ? { ...m, ...updated } : m,
        ),
      }
    })
  }

  const removeMessage = (chatId: string, messageId: string) => {
    setMessages((prev) => {
      const chatMessages = prev[chatId] || []
      return {
        ...prev,
        [chatId]: chatMessages.filter((m) => m.id !== messageId),
      }
    })
  }

  const findMessage = (
    chatId: string,
    messageId: string,
  ): Message | undefined => {
    const chatMessages = messages[chatId] || []
    return chatMessages.find((m) => m.id === messageId)
  }

  return {
    messages,
    setMessages,
    initChatMessages,
    addMessageAtLast,
    addMessageAtFirst,
    addOrUpdateMessageAtFirst,
    addOrUpdateMessageAtLast,
    updateMessage,
    removeMessage,
    findMessage,
  }
}

export const useChatHelper = (
  chats: Chat[],
  setChats: React.Dispatch<React.SetStateAction<Chat[]>>,
) => {
  const addOrUpdateChat = (chat: Chat) => {
    setChats((prev) => {
      // Check if the chat already exists by its ID
      const chatIndex = prev.findIndex(
        (existingChat) => existingChat.id === chat.id,
      )

      let updatedChats
      if (chatIndex !== -1) {
        // If the chat exists, update it
        updatedChats = [...prev]
        updatedChats[chatIndex] = { ...updatedChats[chatIndex], ...chat }
      } else {
        // If the chat doesn't exist, add it to the array
        updatedChats = [...prev, chat]
      }

      return updatedChats
    })
  }

  const updateChat = (updated: Partial<Chat> & { id: string }) => {
    setChats((prevChats) =>
      prevChats.map((chat) =>
        chat.id === updated.id ? { ...chat, ...updated } : chat,
      ),
    )
  }

  const removeChat = (chatId: string) => {
    setChats((prev) => prev.filter((chat) => chat.id !== chatId))
  }

  const findChat = (chatId: string): Chat | undefined => {
    return chats.find((chat) => chat.id === chatId)
  }

  const addParticipant = (chatId: string, participant: Participant) => {
    setChats((prev) =>
      prev.map((chat) =>
        chat.id === chatId
          ? {
              ...chat,
              participants: [...chat.participants, participant],
            }
          : chat,
      ),
    )
  }

  const updateParticipant = (
    chatId: string,
    updated: Partial<Participant> & { id: number },
  ) => {
    setChats((prev) =>
      prev.map((chat) =>
        chat.id === chatId
          ? {
              ...chat,
              participants: chat.participants.map((p) =>
                p.id === updated.id ? { ...p, ...updated } : p,
              ),
            }
          : chat,
      ),
    )
  }

  const addParticipantOrUpdate = (chatId: string, participant: Participant) => {
    setChats((prevChats) =>
      prevChats.map((chat) => {
        if (chat.id !== chatId) return chat

        const existingParticipant = chat.participants.find(
          (p) => p.id === participant.id,
        )
        let updatedParticipants: Participant[]

        if (existingParticipant) {
          // Update existing participant
          updatedParticipants = chat.participants.map((p) =>
            p.id === participant.id ? participant : p,
          )
        } else {
          // Add new participant
          updatedParticipants = [...chat.participants, participant]
        }

        return {
          ...chat,
          participants: updatedParticipants,
        }
      }),
    )
  }

  const removeParticipant = (chatId: string, participantId: number) => {
    setChats((prev) =>
      prev.map((chat) =>
        chat.id === chatId
          ? {
              ...chat,
              participants: chat.participants.filter(
                (p) => p.id !== participantId,
              ),
            }
          : chat,
      ),
    )
  }

  const sortByLastSentAt = () => {
    setChats((prevChats) => {
      return [...prevChats].sort((a, b) => {
        const timeA = new Date(a.lastSentAt || 0).getTime()
        const timeB = new Date(b.lastSentAt || 0).getTime()
        return timeB - timeA // Descending order
      })
    })
  }

  return {
    addOrUpdateChat,
    updateChat,
    removeChat,
    findChat,
    addParticipant,
    updateParticipant,
    removeParticipant,
    addParticipantOrUpdate,
    sortByLastSentAt,
  }
}
