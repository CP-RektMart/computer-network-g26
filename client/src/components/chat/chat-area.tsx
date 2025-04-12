import { useEffect, useRef, useState } from 'react'
import { Edit, Menu, MoreVertical, Send, Trash2 } from 'lucide-react'
import type React from 'react'

import type { Chat, Message, User } from '@/lib/types'
import { DotPattern } from '@/components/ui/dot-pattern'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { formatTimestamp } from './chat-sidebar'

interface ChatAreaProps {
  chat: Chat | null
  messages: Message[]
  currentUser: User
  messageCount: number,
  fetchMessageLimit: number,
  chatAreaScrollDown: boolean,
  setChatAreaScrollDown: (scrollDown: boolean) => void,
  fetchMessages: (chatId: string, limit?: number, before?: string) => void
  onSendMessage: (text: string) => void
  onEditMessage: (messageId: string, newText: string) => void
  onDeleteMessage: (messageId: string) => void
  setIsMobileMenuOpen: (open: boolean) => void
}

export default function ChatArea({
  chat,
  messages,
  currentUser,
  messageCount,
  fetchMessageLimit,
  chatAreaScrollDown,
  setChatAreaScrollDown,
  fetchMessages,
  onSendMessage,
  onEditMessage,
  onDeleteMessage,
  setIsMobileMenuOpen,
}: ChatAreaProps) {
  const [messageText, setMessageText] = useState('')
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null)
  const [editText, setEditText] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const [isNearBottom, setIsNearBottom] = useState(true)

  useEffect(() => {
    if (chatAreaScrollDown) {
      scrollToBottom()
      setChatAreaScrollDown(false)
    }
  }, [chatAreaScrollDown])

  useEffect(() => {
    console.log(chat)
    if (isNearBottom) {
      scrollToBottom()
    }
  }, [messages, chat])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault()
    if (messageText.trim()) {
      onSendMessage(messageText)
      setMessageText('')
    }
  }

  const startEditMessage = (message: Message) => {
    setEditingMessageId(message.id)
    setEditText(message.text)
  }

  const saveEditMessage = () => {
    if (editingMessageId && editText.trim()) {
      onEditMessage(editingMessageId, editText)
      setEditingMessageId(null)
      setEditText('')
    }
  }

  const cancelEditMessage = () => {
    setEditingMessageId(null)
    setEditText('')
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      if (editingMessageId) {
        saveEditMessage()
      } else {
        handleSendMessage(e)
      }
    } else if (e.key === 'Escape' && editingMessageId) {
      cancelEditMessage()
    }
  }

  if (!chat) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center bg-gray-50 p-4">
        <div className="text-center">
          <h2 className="mb-2 text-xl font-semibold text-gray-700">
            Select a conversation
          </h2>
          <p className="text-gray-500">
            Choose a chat from the sidebar to start messaging
          </p>
          <Button
            className="mt-4 md:hidden"
            onClick={() => setIsMobileMenuOpen(true)}
          >
            <Menu className="mr-2 h-4 w-4" />
            Open Chats
          </Button>
        </div>
      </div>
    )
  }

  const handleScroll = async (event: React.UIEvent) => {
    const target = event.currentTarget as HTMLElement
    const { scrollTop, scrollHeight, clientHeight } = target

    if (scrollTop == 0 && chat && messages.length < messageCount) {
      console.log('Scrolled to the top!')
      const prevScrollHeight = target.scrollHeight
      const firstTimestamp = messages[0]?.timestamp

      await fetchMessages(chat.id, fetchMessageLimit, firstTimestamp)

      requestAnimationFrame(() => {
        const newScrollHeight = target.scrollHeight
        target.scrollTop = newScrollHeight - prevScrollHeight
      })
    }

    const isNearBottom = scrollTop + clientHeight >= scrollHeight - 300;

    if (isNearBottom) {
      setIsNearBottom(true)
      console.log('User is near the bottom!');
    } else {
      setIsNearBottom(false)
    }
  }

  return (
    <div className="flex flex-1 flex-col bg-white md:border md:border-input md:rounded-2xl">
      {/* Chat header */}
      <div className="flex items-center justify-between border-b border-b-input p-4">
        <div className="flex items-center space-x-3">
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setIsMobileMenuOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </Button>
          <Avatar>
            {/* <AvatarImage src={chat.avatar} alt={chat.name} /> */}
            <AvatarFallback>{chat.name.charAt(0)}</AvatarFallback>
          </Avatar>
          <div>
            <div className="flex items-center">
              <h3 className="font-medium">{chat.name}</h3>
              {chat.isGroup && (
                <Badge variant="outline" className="ml-2 bg-gray-100 text-xs">
                  Group • {chat.participants.length} members
                </Badge>
              )}
            </div>
            <p className="text-xs text-gray-500">
              {chat.isGroup
                ? `${chat.participants.length} participants`
                : 'Online'}
            </p>
          </div>
        </div>
      </div>


      {/* Messages area */}
      <ScrollArea className="flex-1 overflow-y-auto p-4" onScroll={handleScroll} >
        <DotPattern
          cr={1.5}
          className={cn(
            '[mask-image:radial-gradient(300px_circle_at_center,transparent,white)]',
            'md:[mask-image:radial-gradient(900px_circle_at_center,transparent,white)]',
            'opacity-50',
          )}

        />
        <div className="relative z-10  space-y-4">
          {messages.length > 0 ? (
            messages.map((message) => {
              const isCurrentUser = message.senderId === currentUser.id
              const sender = chat.participants.find(
                (p) => p.id === message.senderId,
              )

              return (
                <div
                  key={message.id}
                  className={`flex ${isCurrentUser ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[70%] ${isCurrentUser
                      ? 'rounded-lg bg-primary text-white'
                      : 'rounded-lg bg-gray-100 text-gray-900'
                      } overflow-hidden`}
                  >
                    {!isCurrentUser && chat.isGroup && (
                      <div className="border-b border-gray-200 px-4 py-2 text-xs font-medium">
                        {sender?.username || 'Unknown user'}
                      </div>
                    )}

                    <div className="p-4">
                      {editingMessageId === message.id ? (
                        <div className="space-y-2">
                          <Textarea
                            value={editText}
                            onChange={(e) => setEditText(e.target.value)}
                            onKeyDown={handleKeyDown}
                            autoFocus
                            className="bg-white text-gray-900 min-h-[100px] resize-y"
                            placeholder="Edit your message..."
                          />
                          <div className="flex justify-end space-x-2">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={cancelEditMessage}
                            >
                              Cancel
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={saveEditMessage}
                            >
                              Save
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div>
                          <p className="whitespace-pre-wrap break-words">
                            {message.text}
                          </p>
                          <div
                            className={`mt-1 flex items-center justify-between text-xs ${isCurrentUser ? 'text-gray-300' : 'text-gray-500'
                              }`}
                          >
                            <span>{formatTimestamp(message.timestamp)}</span>
                            {message.isEdited && <span>(edited)</span>}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {isCurrentUser && !editingMessageId && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 shrink-0"
                        >
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => startEditMessage(message)}
                          className="text-gray-900 focus:text-gray-900"
                        >
                          <Edit className="mr-2 h-4 w-4" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => onDeleteMessage(message.id)}
                          className="text-red-500 focus:text-red-500"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Unsend
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
              )
            })
          ) : (
            <div className="py-8 text-center text-gray-500">
              No messages yet. Start the conversation!
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {/* Message input */}
      <div className="border-t border-t-input p-4">
        <form onSubmit={handleSendMessage} className="flex space-x-2">
          <Textarea
            placeholder="Type a message... (Shift+Enter for new line)"
            value={messageText}
            onChange={(e) => setMessageText(e.target.value)}
            onKeyDown={handleKeyDown}
            className="flex-1 min-h-10 max-h-52 resize-y py-2 text-sm md:text-base"
            rows={1}
          />
          <Button
            type="submit"
            disabled={!messageText.trim()}
            className="self-end"
            size="lg"
          >
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </div>
    </div>
  )
}
