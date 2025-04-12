import { useEffect, useRef, useState } from 'react'
import { Edit, Menu, MoreVertical, Send, Trash2 } from 'lucide-react'
import type { Message } from '@/lib/types'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { DotPattern } from '@/components/ui/dot-pattern'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { useChat } from '@/context/chat-context'
import { useUser } from '@/context/user-context'

interface ChatAreaProps {
  setIsMobileMenuOpen: (open: boolean) => void
}

export default function ChatArea({ setIsMobileMenuOpen }: ChatAreaProps) {
  const { user } = useUser()
  const { selectedChat, messages, sendMessage, loadingMessages } = useChat()
  const [messageText, setMessageText] = useState('')
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null)
  const [editText, setEditText] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const currentChatMessages = selectedChat ? messages[selectedChat.id] : []

  useEffect(() => {
    scrollToBottom()
  }, [currentChatMessages])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault()
    if (messageText.trim()) {
      sendMessage(messageText)
      setMessageText('')
    }
  }

  const startEditMessage = (message: Message) => {
    setEditingMessageId(message.id)
    setEditText(message.content)
  }

  const saveEditMessage = () => {
    if (editingMessageId && editText.trim()) {
      // This would call the API to edit the message
      // For now, just update the local state
      console.log('Edit message:', editingMessageId, editText)
      setEditingMessageId(null)
      setEditText('')
    }
  }

  const cancelEditMessage = () => {
    setEditingMessageId(null)
    setEditText('')
  }

  const handleDeleteMessage = (messageId: string) => {
    // This would call the API to delete the message
    // For now, just log it
    console.log('Delete message:', messageId)
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

  if (!selectedChat) {
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
            <AvatarImage src={selectedChat.avatar} alt={selectedChat.name} />
            <AvatarFallback>{selectedChat.name.charAt(0)}</AvatarFallback>
          </Avatar>
          <div>
            <div className="flex items-center">
              <h3 className="font-medium">{selectedChat.name}</h3>
              {selectedChat.isGroup && (
                <Badge variant="outline" className="ml-2 bg-gray-100 text-xs">
                  Group • {selectedChat.participants.length} members
                </Badge>
              )}
            </div>
            <p className="text-xs text-gray-500">
              {selectedChat.isGroup
                ? `${selectedChat.participants.length} participants`
                : 'Direct message'}
            </p>
          </div>
        </div>
      </div>

      {/* Messages area */}
      <ScrollArea className="flex-1 p-4 h-96">
        <DotPattern
          cr={1.5}
          className={cn(
            '[mask-image:radial-gradient(300px_circle_at_center,transparent,white)]',
            'md:[mask-image:radial-gradient(900px_circle_at_center,transparent,white)]',
            'opacity-50',
          )}
        />
        <div className="relative space-y-4">
          {!loadingMessages && currentChatMessages.length > 0 ? (
            currentChatMessages.map((message) => {
              const isCurrentUser = message.senderId === user?.id
              const sender = selectedChat.participants.find(
                (p) => p.id === message.senderId,
              )

              return (
                <div
                  key={message.id}
                  className={`flex ${isCurrentUser ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[70%] ${
                      isCurrentUser
                        ? 'rounded-lg bg-primary text-white'
                        : 'rounded-lg bg-gray-100 text-gray-900'
                    } overflow-hidden`}
                  >
                    {!isCurrentUser && selectedChat.isGroup && (
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
                              variant="outline"
                              size="sm"
                              onClick={cancelEditMessage}
                            >
                              Cancel
                            </Button>
                            <Button
                              size="sm"
                              onClick={saveEditMessage}
                              disabled={!editText.trim()}
                            >
                              Save
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div>
                          <p className="whitespace-pre-wrap break-words">
                            {message.content}
                          </p>
                          <div className="mt-1 flex items-center justify-end space-x-2">
                            <span
                              className={`text-xs ${isCurrentUser ? 'text-gray-300' : 'text-gray-500'}`}
                            >
                              {new Date(message.sentAt).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                            {message.isEdited && (
                              <span
                                className={`text-xs ${isCurrentUser ? 'text-gray-300' : 'text-gray-500'}`}
                              >
                                (edited)
                              </span>
                            )}
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
                          onClick={() => handleDeleteMessage(message.id)}
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
        <form
          onSubmit={handleSendMessage}
          className="flex space-x-2 items-center"
        >
          <Input
            placeholder="Type a message..."
            value={messageText}
            onChange={(e) => setMessageText(e.target.value)}
            className="flex-1 h-10 py-2 px-4 bg-gray-100 rounded-full border-none text-sm md:text-base"
          />
          <Button
            type="submit"
            disabled={!messageText.trim()}
            className="rounded-full"
            size="icon"
          >
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </div>
    </div>
  )
}
