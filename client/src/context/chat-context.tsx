import React, { createContext, useContext, useEffect, useRef, useState } from 'react'
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
    joinGroup: (groupId: string) => Promise<void>
    // leaveDirectChat: () => void
    createDirect: (receiverId: number) => Promise<void>
    createGroup: (name: string, participants: User[]) => Promise<void>
    chatAreaScrollDown: boolean
    setChatAreaScrollDown: React.Dispatch<React.SetStateAction<boolean>>
    fetchMessageToChat: (chatId: string, limit?: number, before?: string) => void
}

const ChatContext = createContext<ChatContextType | undefined>(undefined)

export const ChatProvider: React.FC<{ children: React.ReactNode }> = ({
    children,
}) => {
    const { user } = useUser()
    const [chats, setChats] = useState<Chat[]>([])
    const { addChat, updateChat, findChat, addOrUpdateChat, addParticipantOrUpdate } = useChatHelper(chats, setChats)
    const [messages, setMessages] = useState<Record<string, Message[]>>({})
    const { initChatMessages, addOrUpdateMessageAtFirst, addOrUpdateMessageAtLast } = useChatMessagesHelper(messages, setMessages);

    const socketRef = useRef<Socket | null>(null);
    const [selectedChat, setSelectedChat] = useState<Chat | null>(null)
    const [loadingChats, setLoadingChats] = useState(false)
    const [loadingMessages, setLoadingMessages] = useState(false)
    const [chatAreaScrollDown, setChatAreaScrollDown] = useState(false)

    const messageMinimum = 20;
    const fetchMessageLimit = 20;

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
                        } as Participant),
                    )

                    const otherParticipants = participants.filter(
                        (p) => p.id !== user?.id,
                    )

                    return {
                        id: chat.id,
                        name: chat.type === 'group' ? chat.name : otherParticipants[0]?.username,
                        isGroup: chat.type === 'group',
                        lastMessage: chat.lastMessage?.content?.text,
                        timestamp: chat.lastMessage?.timestamp,
                        unread: chat.unread,
                        participants,
                        messageCount: chat.messageCount,
                    } as Chat
                })

                setChats(chats)

                // Connect to each chat room socket
                for (const chat of chats) {
                    connectToChatRoom(chat.id)
                    initChatMessages(chat.id, [])
                }
            } catch (error) {
                console.error('Error fetching chat data:', error)
            }
        }

        fetchUserData()
    }, [user])

    useEffect(() => {
        if (!socketRef.current) {
            console.log('Connecting to socket...')
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
    }, [getToken, socketRef])

    useEffect(() => {
        // Listen for direct message events
        if (!socketRef.current) return;

        socketRef.current.on('socket-room-message', (res) => {
            console.log('Message received:', res)
            if (res.status === 'ok') {
                const { destination: chatId, body: message } = res

                const newMessage: Message = {
                    id: message.id,
                    chatId,
                    senderId: message.senderId,
                    text: message.content.text,
                    timestamp: message.timestamp,
                    isEdited: false,
                }

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
                addParticipantOrUpdate(chatId, mappedParticipant)
            }
        })

        socketRef.current.on('socket-direct-open', (res: any) => {
            console.log('Socket Direct Open:', res)
            if (res.status !== 'ok') {
                console.error('Error in direct open:', res.error)
                return
            }
            const { body: newChat } = res

            const participants: Participant[] = newChat.participants.map((p: any) => ({
                id: p.id,
                username: p.name,
                role: p.role,
                email: p.email,
                lastLoginAt: p.lastLoginAt,
                registeredAt: p.registeredAt,
                isOnline: p.isOnline,
                joinedAt: p.joinedAt,
            } as Participant))

            const otherUser = participants.find((p) => p.id !== user?.id)

            const mappedChat: Chat = {
                id: newChat.id,
                name: otherUser?.username ?? 'Unknown',
                isGroup: false,
                lastMessage: newChat.lastMessage?.context?.text,
                timestamp: newChat.timestamp,
                unread: newChat.unread,
                participants,
                // avatar: newGroup.name.charAt(0).toUpperCase() + newGroup.name.slice(1),
                messageCount: newChat.messageCount,
            };

            if (socketRef.current) {
                socketRef.current.emit("socket-room-connect", { destination: newChat.id });
            }


            addOrUpdateChat(mappedChat)
            initChatMessages(mappedChat.id, [])
        })


        socketRef.current.on('socket-group-open', (res: any) => {
            console.log('Socket Group Open:', res)
            if (res.status !== 'ok') {
                console.error('Error in group open:', res.error)
                return
            }
            const { body: newChat } = res

            const participants: Participant[] = newChat.participants.map((p: any) => ({
                id: p.id,
                username: p.name,
                role: p.role,
                email: p.email,
                lastLoginAt: p.lastLoginAt,
                registeredAt: p.registeredAt,
                isOnline: p.isOnline,
                joinedAt: p.joinedAt,
            }))

            const mappedChat: Chat = {
                id: newChat.id,
                name: newChat.name,
                isGroup: true,
                lastMessage: newChat.lastMessage?.context?.text,
                timestamp: newChat.timestamp,
                unread: newChat.unread,
                participants,
                // avatar: newGroup.name.charAt(0).toUpperCase() + newGroup.name.slice(1),
                messageCount: newChat.messageCount,
            };

            if (socketRef.current) {
                socketRef.current.emit("socket-room-connect", { destination: newChat.id });
            }

            addOrUpdateChat(mappedChat)
            initChatMessages(mappedChat.id, [])
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
        console.log(socketRef.current)
        if (!socketRef.current) return
        socketRef.current.emit('socket-room-connect', {
            destination: chatId,
        })
    }

    // Update chat's last message
    const updateChatLastMessage = (chatId: string, message: Message) => {
        const chat = findChat(chatId);
        if (!chat) return
        updateChat({
            id: chatId,
            lastMessage: message.text,
            timestamp: message.timestamp,
            unread: selectedChat?.id === chatId ? 0 : (chat.unread || 0) + 1,
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

            if (socketRef.current) {
                socketRef.current.emit('socket-room-opening', { destination: chat.id });
            }
            if (messages[chat.id]?.length < messageMinimum) {
                await fetchMessageToChat(chat.id, fetchMessageLimit, messages[chat.id]?.[0]?.timestamp || undefined);
            }
            setChatAreaScrollDown(true);

        } catch (error) {
            console.error('Error fetching messages:', error)
        } finally {
            setLoadingMessages(false)
        }
    }

    // Send a message in the currently selected chat
    const sendMessage = (text: string) => {
        if (!user || !selectedChat || !text.trim()) return;

        socketRef.current?.emit('socket-room-message', {
            destination: selectedChat.id,
            body: {
                senderId: user.id,
                content: {
                    type: "text",
                    text,
                },
                timestamp: new Date()
            },
        });
    }

    const createDirect = async (receiverId: number) => {
        try {
            const response = await fetch(`${import.meta.env.VITE_API_URL}/api/directs/${receiverId}`, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${getToken()}`,
                    'Content-Type': 'application/json',
                },
            });


            if (!response.ok) {
                throw new Error('Failed to create group');
            }

            const newDirectChat = await response.json();
            if (newDirectChat.isExist) {
                const chat = findChat(newDirectChat.id)
                if (chat) {
                    setSelectedChat(chat);
                }
                return;
            }

            console.log('New direct created:', newDirectChat);

            const participants: Participant[] = newDirectChat.participants.map((p: any) => ({
                id: p.id,
                username: p.name,
                role: p.role,
                email: p.email,
                lastLoginAt: p.lastLoginAt,
                registeredAt: p.registeredAt,
                isOnline: p.isOnline,
                joinedAt: p.joinedAt,
            }))

            const otherUser = participants.find((p) => p.id !== user?.id)

            const newChat: Chat = {
                id: newDirectChat.id,
                name: otherUser?.username ?? 'Unknown',
                isGroup: false,
                lastMessage: newDirectChat.lastMessage?.context?.text,
                timestamp: newDirectChat.timestamp,
                unread: newDirectChat.unread,
                participants,
                // avatar: newGroup.name.charAt(0).toUpperCase() + newGroup.name.slice(1),
                messageCount: newDirectChat.messageCount,
            };

            if (socketRef.current) {
                socketRef.current.emit("socket-room-connect", { destination: newChat.id });
            }

            addChat(newChat)
            setSelectedChat(newChat);
            initChatMessages(newChat.id, [])
        } catch (error) {
            console.error('Error creating direct chat:', error);
        }
    }

    const createGroup = async (name: string, participants: User[]) => {
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

            const mappedParticipants: Participant[] = newGroup.participants.map((p: any) => ({
                id: p.id,
                username: p.name,
                role: p.role,
                email: p.email,
                lastLoginAt: p.lastLoginAt,
                registeredAt: p.registeredAt,
                isOnline: p.isOnline,
                joinedAt: p.joinedAt,
            }))


            const newChat: Chat = {
                id: newGroup.id,
                name: newGroup.name,
                isGroup: true,
                lastMessage: newGroup.lastMessage?.context?.text,
                timestamp: newGroup.timestamp,
                unread: newGroup.unread,
                participants: mappedParticipants,
                // avatar: newGroup.name.charAt(0).toUpperCase() + newGroup.name.slice(1),
                messageCount: newGroup.messageCount,
            };

            if (socketRef.current) {
                socketRef.current.emit("socket-room-connect", { destination: newChat.id });
            }

            addChat(newChat)
            setSelectedChat(newChat);
            initChatMessages(newChat.id, [])
        } catch (error) {
            console.error('Error creating group:', error);
        }
    };

    const joinGroup = async (groupId: string) => {
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

            const participants: Participant[] = chat.participants.map((p: any) => ({
                id: p.id,
                username: p.name,
                role: p.role,
                email: p.email,
                lastLoginAt: p.lastLoginAt,
                registeredAt: p.registeredAt,
                isOnline: p.isOnline,
                joinedAt: p.joinedAt,
            }))

            const mappedChat: Chat = {
                id: chat.id,
                name: chat.name,
                isGroup: chat.type === 'group',
                lastMessage: chat.lastMessage?.content?.text,
                timestamp: chat.lastMessage?.timestamp,
                // avatar: chat.avatar,
                unread: chat.unread,
                participants: participants,
                messageCount: chat.messageCount,
            }

            if (socketRef.current) {
                socketRef.current.emit("socket-room-connect", { destination: mappedChat.id });
            }

            addOrUpdateChat(mappedChat)
            initChatMessages(mappedChat.id, [])
        } catch (error) {
            console.error('Error join group:', error);
        }
    };

    const fetchMessageToChat = async (chatId: string, limit?: number, before?: string) => {
        const token = getToken();
        if (!token) return;

        try {
            setLoadingChats(true)

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
                addOrUpdateMessageAtFirst(chatId, mappedMessage)
            });
            setLoadingChats(false)
        } catch (error) {
            console.error('Error fetching chats:', error)
            setLoadingChats(false)
        }
    };

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
                createDirect,
                createGroup,
                joinGroup,
                fetchMessageToChat
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