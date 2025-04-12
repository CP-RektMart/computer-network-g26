import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useRef, useState } from 'react'
import type { Chat, Message, Participant, User } from '@/lib/types'
import ChatSidebar from '@/components/chat/chat-sidebar'
import ChatArea from '@/components/chat/chat-area'
import { getToken, useUser } from '@/context/user-context'
import { Socket } from 'socket.io-client'
import { useFetchUserData } from '@/action/fetchUserData'
import { useSocketConnection } from '@/action/socketConnection'
import { fetchRoomMessages, useRoomMessageHandler } from '@/action/messageAction'

// Route setup for the chat component
export const Route = createFileRoute('/')({
  component: RouteComponent,
})

function RouteComponent() {
  const { user, loading, logout, updateUsername } = useUser()
  const [chats, setChats] = useState<Chat[]>([])
  const [messages, setMessages] = useState<Record<string, Message[]>>({})
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const socketRef = useRef<Socket | null>(null);
  const messageMinimum = 20; // If less than this, fetch more messages
  const fetchMessageLimit = 20; // Number of messages to fetch on each request
  const [chatAreaScrollDown, setChatAreaScrollDown] = useState(false);

  // Redirect if not logged in
  useEffect(() => {
    if (loading) return;

    if (!user) {
      window.location.href = '/login';
      return;
    }
  }, [loading, user]);

  useFetchUserData(getToken, setChats, setMessages, socketRef)

  useSocketConnection(getToken, socketRef);

  useRoomMessageHandler(
    socketRef,
    String(user?.id),
    selectedChat?.id,
    setMessages,
    setChats,
    setChatAreaScrollDown
  )

  const fetchMessages = async (chatId: string, limit?: number, before?: string) => {
    const token = getToken();
    if (!token) return;

    try {
      const data = await fetchRoomMessages(chatId, token, limit, before);

      data.forEach((message: any) => {
        const mappedMessage: Message = {
          id: message.id,
          chatId: chatId,
          senderId: message.senderId,
          text: message.content.text,
          timestamp: message.timestamp,
          isEdited: false,
        };
        setMessages((prevMessages) => ({
          ...prevMessages,
          [chatId]: [mappedMessage, ...(prevMessages[chatId] || [])],
        }));
      });
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  };

  // Return a loading spinner while the user is being fetched
  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Redirect if no user is found
  if (!user) {
    return null;  // Will redirect via useEffect
  }

  // Create current user object from authenticated user data
  const currentUser: User = {
    id: user.id,
    username: user.username,
    email: user.email,
  };

  const handleSelectChat = async (chat: Chat) => {
    setSelectedChat(chat);
    // Mark messages as read
    setChats(chats.map((c) => (c.id === chat.id ? { ...c, unread: 0 } : c)));
    setIsMobileMenuOpen(false);

    if (messages[chat.id]?.length < messageMinimum) {
      await fetchMessages(chat.id, fetchMessageLimit, messages[chat.id]?.[0]?.timestamp || undefined);
    }
    setChatAreaScrollDown(true);
  };

  const handleSendMessage = (text: string) => {
    if (!selectedChat || !text.trim()) return;

    socketRef.current?.emit('socket-room-message', {
      destination: selectedChat.id,
      body: {
        senderId: currentUser.id,
        content: {
          type: "text",
          text,
        },
        timestamp: new Date()
      },
    });
  }

  const handleEditMessage = (messageId: string, newText: string) => {
    if (!selectedChat) return;

    setMessages({
      ...messages,
      [selectedChat.id]: messages[selectedChat.id].map((msg) =>
        msg.id === messageId ? { ...msg, text: newText, isEdited: true } : msg
      ),
    });
  };

  const handleDeleteMessage = (messageId: string) => {
    if (!selectedChat) return;

    setMessages({
      ...messages,
      [selectedChat.id]: messages[selectedChat.id].filter(
        (msg) => msg.id !== messageId
      ),
    });
  };

  const handleCreateGroup = async (name: string, participants: User[]) => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/groups`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${getToken()}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          groupName: name,
          participantIds: participants.map((p) => p.id),
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create group');
      }

      const newGroup = await response.json();
      console.log('New group created:', newGroup);

      const newChat: Chat = {
        id: newGroup.id,
        name: newGroup.name,
        isGroup: true,
        lastMessage: newGroup.lastMessage?.context?.text,
        timestamp: newGroup.timestamp,
        unread: newGroup.unread,
        participants: newGroup.participants,
        // avatar: newGroup.name.charAt(0).toUpperCase() + newGroup.name.slice(1),
        messageCount: newGroup.messageCount,
      };

      setChats([newChat, ...chats]);
      setSelectedChat(newChat);
      setMessages({
        ...messages,
        [newChat.id]: [],
      });
    } catch (error) {
      console.error('Error creating group:', error);
    }
  };

  const handleJoinGroup = async (groupId: string) => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/groups/${groupId}/join`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${getToken()}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to join group');
      }


      const chat = await response.json();

      const mappedChat: Chat = {
        id: chat.id,
        name: chat.name,
        isGroup: chat.type === 'group',
        lastMessage: chat.lastMessage?.content?.text,
        timestamp: chat.lastMessage?.timestamp,
        // avatar: chat.avatar,
        unread: chat.unread,
        participants: chat.participants,
        messageCount: chat.messageCount,
      }

      if (socketRef.current) {
        socketRef.current.emit("socket-room-connect", { destination: mappedChat.id });
      }

      setMessages((prevMessages) => ({
        ...prevMessages,
        [mappedChat.id]: [],
      }))

      setChats((prevChats) => {
        const chatExists = prevChats.some((chat) => chat.id === mappedChat.id);

        if (chatExists) {
          return prevChats.map((chat) =>
            chat.id === mappedChat.id
              ? { ...chat, lastMessage: mappedChat.lastMessage, timestamp: mappedChat.timestamp }
              : chat
          );
        } else {
          return [...prevChats, mappedChat];
        }
      });

    } catch (error) {
      console.error('Error join group:', error);
    }
  };

  const handleUpdateName = async (name: string) => {
    try {
      await updateUsername(name);

      if (selectedChat) {
        setChats(
          chats.map((chat) => {
            const isUserChat = !chat.isGroup && chat.participants.some((p) => p.id === currentUser.id);

            const updatedParticipants = chat.participants.map((p) =>
              p.id === currentUser.id ? { ...p, name } : p
            );

            return {
              ...chat,
              name: isUserChat ? name : chat.name,
              participants: updatedParticipants,
            };
          })
        );
      }
    } catch (error) {
      console.error('Failed to update username:', error);
      alert('Failed to update username. Please try again.');
    }
  };

  const handleLogout = async () => {
    await logout();
  };

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
        messageCount={selectedChat ? selectedChat.messageCount : 0}
        fetchMessages={fetchMessages}
        fetchMessageLimit={20}
        chatAreaScrollDown={chatAreaScrollDown}
        setChatAreaScrollDown={setChatAreaScrollDown}
      />
    </div>
  );
}
