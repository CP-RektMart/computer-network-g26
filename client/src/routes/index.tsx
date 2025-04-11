import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import type { Chat, Message, User } from '@/lib/types'
import ChatSidebar from '@/components/chat/chat-sidebar'
import ChatArea from '@/components/chat/chat-area'
import { initialChats, initialMessages } from '@/data/mock'
import { useUser } from '@/context/user-context'

export const Route = createFileRoute('/')({
  component: RouteComponent,
})

function RouteComponent() {
  const { user, loading, logout, updateUsername } = useUser()
  const [chats, setChats] = useState<Chat[]>(initialChats)
  const [messages, setMessages] =
    useState<Record<string, Message[]>>(initialMessages)
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  // Redirect if not logged in
  useEffect(() => {
    if (!loading && !user) {
      window.location.href = '/login'
    }
  }, [user, loading])

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return null // Will redirect via the useEffect
  }

  // Create a current user object from the authenticated user data
  const currentUser: User = {
    id: user.id,
    username: user.username,
    email: user.email,
  }

  const handleSelectChat = (chat: Chat) => {
    setSelectedChat(chat)
    // Mark messages as read
    setChats(chats.map((c) => (c.id === chat.id ? { ...c, unread: 0 } : c)))
    setIsMobileMenuOpen(false)
  }

  const handleSendMessage = (text: string) => {
    if (!selectedChat || !text.trim()) return

    const newMessage: Message = {
      id: `msg${Date.now()}`,
      chatId: selectedChat.id,
      senderId: currentUser.id,
      text,
      timestamp: new Date().toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      }),
      isEdited: false,
    }

    // Update messages
    setMessages({
      ...messages,
      [selectedChat.id]: [...messages[selectedChat.id], newMessage],
    })

    // Update chat preview
    setChats(
      chats.map((chat) =>
        chat.id === selectedChat.id
          ? {
              ...chat,
              lastMessage: text,
              timestamp: 'Just now',
            }
          : chat,
      ),
    )
  }

  const handleEditMessage = (messageId: string, newText: string) => {
    if (!selectedChat) return

    setMessages({
      ...messages,
      [selectedChat.id]: messages[selectedChat.id].map((msg) =>
        msg.id === messageId ? { ...msg, text: newText, isEdited: true } : msg,
      ),
    })
  }

  const handleDeleteMessage = (messageId: string) => {
    if (!selectedChat) return

    setMessages({
      ...messages,
      [selectedChat.id]: messages[selectedChat.id].filter(
        (msg) => msg.id !== messageId,
      ),
    })
  }

  const handleCreateGroup = (name: string, participants: User[]) => {
    const newChat: Chat = {
      id: `chat${Date.now()}`,
      name,
      isGroup: true,
      lastMessage: 'Group created',
      timestamp: 'Just now',
      avatar: '/placeholder.svg?height=40&width=40',
      unread: 0,
      participants: [currentUser, ...participants],
    }

    setChats([newChat, ...chats])
    setSelectedChat(newChat)
    setMessages({
      ...messages,
      [newChat.id]: [],
    })
  }

  const handleJoinGroup = (groupId: string) => {
    // In a real app, this would verify the group exists and add the user
    alert(`Joined group with ID: ${groupId}`)
  }

  const handleUpdateName = async (name: string) => {
    try {
      await updateUsername(name)

      // Update chat participants with the new username
      if (selectedChat) {
        setChats(
          chats.map((chat) => {
            // Update chat name if it's a direct chat with this user
            const isUserChat =
              !chat.isGroup &&
              chat.participants.some((p) => p.id === currentUser.id)

            // Update the user in the participants list
            const updatedParticipants = chat.participants.map((p) =>
              p.id === currentUser.id ? { ...p, name } : p,
            )

            return {
              ...chat,
              name: isUserChat ? name : chat.name,
              participants: updatedParticipants,
            }
          }),
        )
      }
    } catch (error) {
      console.error('Failed to update username:', error)
      alert('Failed to update username. Please try again.')
    }
  }

  const handleLogout = async () => {
    await logout()
  }

  return (
    <div className="flex h-dvh bg-gray-50 md:gap-5 md:p-6">
      <ChatSidebar
        chats={chats}
        selectedChat={selectedChat}
        onSelectChat={handleSelectChat}
        onCreateGroup={handleCreateGroup}
        onJoinGroup={handleJoinGroup}
        currentUser={currentUser}
        onUpdateName={handleUpdateName}
        onLogout={handleLogout}
        isMobileMenuOpen={isMobileMenuOpen}
        setIsMobileMenuOpen={setIsMobileMenuOpen}
      />
      <ChatArea
        chat={selectedChat}
        messages={selectedChat ? messages[selectedChat.id] : []}
        currentUser={currentUser}
        onSendMessage={handleSendMessage}
        onEditMessage={handleEditMessage}
        onDeleteMessage={handleDeleteMessage}
        setIsMobileMenuOpen={setIsMobileMenuOpen}
      />
    </div>
  )
}
