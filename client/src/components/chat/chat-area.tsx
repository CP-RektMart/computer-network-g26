import { useEffect, useRef, useState } from 'react'
import { Edit, Menu, MoreVertical, Send, Trash2, LogOut } from 'lucide-react'
import type { Message } from '@/lib/types'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
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
import { formatDistanceToNow } from 'date-fns'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose
} from '@/components/ui/dialog'

interface ChatAreaProps {
  setIsMobileMenuOpen: (open: boolean) => void
}

export default function ChatArea({ setIsMobileMenuOpen }: ChatAreaProps) {
  const { user } = useUser()
  const { selectedChat, messages, sendMessage, loadingMessages,
    chatAreaScrollDown, setChatAreaScrollDown, fetchMessageToChat, leaveGroup, createDirect } = useChat()
  const [messageText, setMessageText] = useState('')
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null)
  const [editText, setEditText] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const [isNearBottom, setIsNearBottom] = useState(true)
  const fetchMessageLimit = 20

  const currentChatMessages = selectedChat ? messages[selectedChat.id] : []

  useEffect(() => {
    if (chatAreaScrollDown) {
      scrollToBottom()
      setChatAreaScrollDown(false)
    }
  }, [chatAreaScrollDown])

  useEffect(() => {
    if (isNearBottom) {
      scrollToBottom()
    }
  }, [messages, selectedChat])

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
    setEditText(message.text)
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

  const handleScroll = async (event: React.UIEvent) => {
    const target = event.currentTarget as HTMLElement
    const { scrollTop, scrollHeight, clientHeight } = target

    if (scrollTop == 0 && selectedChat && currentChatMessages.length < selectedChat.messageCount) {
      const prevScrollHeight = target.scrollHeight
      const firstTimestamp = currentChatMessages[0]?.sentAt

      await fetchMessageToChat(selectedChat.id, fetchMessageLimit, firstTimestamp)

      requestAnimationFrame(() => {
        const newScrollHeight = target.scrollHeight
        target.scrollTop = newScrollHeight - prevScrollHeight
      })
    }

    const isNearBottom = scrollTop + clientHeight >= scrollHeight - 300;

    if (isNearBottom) {
      setIsNearBottom(true)
    } else {
      setIsNearBottom(false)
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
      {/* Mobile menu toggle */}
      <Button
        variant="ghost"
        size="icon"
        className="md:hidden"
        onClick={() => setIsMobileMenuOpen(true)}
      >
        <Menu className="h-5 w-5" />
      </Button>


      <div className="flex gap-5 p-4">
        {/* Avatar */}
        <Avatar>
          {/* Uncomment if you have avatar URLs */}
          {/* <AvatarImage src={selectedChat.isGroup ? selectedChat.avatar : otherUser?.avatar} alt="avatar" /> */}
          <AvatarFallback>
            {selectedChat.name ? selectedChat.name.charAt(0) : '?'}
          </AvatarFallback>
        </Avatar>

        {/* Chat Info */}
        <div className="flex items-center justify-between w-full">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-center md:gap-5">
            <div>
              <div className="flex items-center">
                <h3 className="font-medium">{selectedChat.name}</h3>
                {selectedChat.isGroup && (
                  <>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Badge variant="outline" className="ml-2 bg-gray-100 text-xs cursor-pointer hover:bg-gray-200">
                          Group • {selectedChat.participants.filter((p) => !p.isLeaved).length} members
                        </Badge>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="center" className="max-h-60 overflow-y-auto w-64">
                        {selectedChat.participants.filter((p) => !p.isLeaved)
                          .sort((a, b) => {
                            if (a.role === 'admin' && b.role !== 'admin') return -1;
                            if (a.role !== 'admin' && b.role === 'admin') return 1;
                            return 0;
                          })
                          .map((participant) => (
                            <DropdownMenuItem
                              key={participant.id}
                              className="text-gray-900 focus:text-gray-900 flex items-center justify-between"
                              onClick={() => {
                                if (participant.id !== user?.id) {
                                  createDirect(participant.id)
                                }
                              }}
                            >
                              <div className="flex items-center gap-2">
                                <Avatar>
                                  <AvatarFallback>
                                    {participant.username ? participant.username.charAt(0) : '?'}
                                  </AvatarFallback>
                                </Avatar>
                                {participant.username.length > 10
                                  ? `${participant.username.slice(0, 10)}...`
                                  : participant.username}
                              </div>

                              <Badge
                                variant="outline"
                                className={cn(
                                  "ml-2 text-xs",
                                  participant.role === "admin" && "bg-red-100 text-red-700",
                                  participant.role === "member" && "bg-blue-100 text-blue-700"
                                )}
                              >
                                {participant.role}
                              </Badge>
                            </DropdownMenuItem>
                          ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </>
                )}
              </div>
            </div>
            {selectedChat.isGroup &&
              <p className="text-xs text-gray-500">
                {selectedChat.id}
              </p>
            }
          </div>
          <div>
            {selectedChat.isGroup && (
              <Dialog>
                <DialogTrigger asChild>
                  <LogOut className="w-5 h-5 text-gray-900 cursor-pointer" />
                </DialogTrigger>
                <DialogContent >
                  <DialogHeader>
                    <DialogTitle className="text-lg font-semibold mb-4">Leave Group</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <p>Are you sure you want to leave this group? This action cannot be undone.</p>
                  </div>
                  <div className="flex justify-end gap-4">
                    <DialogClose className="bg-gray-300 text-white px-4 py-2 rounded cursor-pointer hover:bg-gray-400">
                      Cancel
                    </DialogClose>
                    <DialogClose className="bg-red-500 text-white px-4 py-2 rounded cursor-pointer hover:bg-red-600" onClick={() => leaveGroup(selectedChat.id)}>
                      Leave Group
                    </DialogClose>
                  </div>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </div>
      </div>


      {/* Messages area */}
      <ScrollArea className="flex-1 p-4 h-96" onScroll={handleScroll}>
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
                    className={`max-w-[70%] ${isCurrentUser
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
                            {message.text}
                          </p>
                          <div className="mt-1 flex items-center justify-end space-x-2">
                            <span
                              className={`text-xs ${isCurrentUser ? 'text-gray-300' : 'text-gray-500'}`}
                            >
                              {formatDistanceToNow(new Date(message.sentAt))}
                            </span>
                            {/* {message.isEdited && (
                              <span
                                className={`text-xs ${isCurrentUser ? 'text-gray-300' : 'text-gray-500'}`}
                              >
                                (edited)
                              </span>
                            )} */}
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
    </div >
  )
}