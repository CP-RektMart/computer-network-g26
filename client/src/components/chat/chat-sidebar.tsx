import { useState } from 'react'
import { Edit2, LogOut, Menu, Search, UserPlus, Users, X } from 'lucide-react'
import type { Chat, User } from '@/lib/types'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'

export function formatTimestamp(timestamp: string) {
  if (!timestamp) {
    return ''
  }
  const now = new Date();
  const messageDate = new Date(timestamp);

  // Time difference in milliseconds
  const timeDifference = now.getTime() - messageDate.getTime();

  // 1 hour in milliseconds
  const oneHour = 1000 * 60 * 60;
  // 1 day in milliseconds
  const oneDay = 1000 * 60 * 60 * 24;
  // 1 month in milliseconds (approximately)
  const oneMonth = 1000 * 60 * 60 * 24 * 30;

  // If it's less than 12 hours ago
  if (timeDifference < oneDay) {
    const hours = String(messageDate.getHours()).padStart(2, '0');
    const minutes = String(messageDate.getMinutes()).padStart(2, '0');
    const ampm = messageDate.getHours() < 12 ? 'AM' : 'PM';
    return `${hours}:${minutes} ${ampm}`;
  }

  // If it's less than 1 month ago, show in hours/days
  if (timeDifference < oneMonth) {
    const hoursAgo = Math.floor(timeDifference / oneHour);
    if (hoursAgo < 24) {
      return `${hoursAgo} hour${hoursAgo > 1 ? 's' : ''} ago`;
    }
    const daysAgo = Math.floor(timeDifference / oneDay);
    return `${daysAgo} day${daysAgo > 1 ? 's' : ''} ago`;
  }

  // If it's more than 1 month ago, show in months
  const monthsAgo = Math.floor(timeDifference / oneMonth);
  return `${monthsAgo} month${monthsAgo > 1 ? 's' : ''} ago`;
};

interface ChatSidebarProps {
  chats: Chat[]
  selectedChat: Chat | null
  onSelectChat: (chat: Chat) => void
  onCreateGroup: (name: string, participants: User[]) => void
  onJoinGroup: (groupId: string) => void
  currentUser: User
  onUpdateName: (newName: string) => void
  onLogout: () => Promise<void>
  isMobileMenuOpen: boolean
  setIsMobileMenuOpen: (open: boolean) => void
}

export default function ChatSidebar({
  chats,
  selectedChat,
  onSelectChat,
  onCreateGroup,
  onJoinGroup,
  currentUser,
  onUpdateName,
  onLogout,
  isMobileMenuOpen,
  setIsMobileMenuOpen,
}: ChatSidebarProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [newGroupName, setNewGroupName] = useState('')
  const [groupIdToJoin, setGroupIdToJoin] = useState('')
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false)
  const [editedName, setEditedName] = useState(currentUser.username)
  const [chatTypeFilter, setChatTypeFilter] = useState('all')

  // Mock users for group creation
  const mockUsers: User[] = [
    {
      id: 2,
      username: 'Jane Smith',
      email: 'jane@example.com',
    },
    {
      id: 3,
      username: 'Mike Johnson',
      email: 'mike@example.com',
    },
    {
      id: 4,
      username: 'Sarah Williams',
      email: 'sarah@example.com',
    },
  ]

  const [selectedUsers, setSelectedUsers] = useState<User[]>([])

  const handleCreateGroup = () => {
    if (newGroupName.trim() && selectedUsers.length > 0) {
      onCreateGroup(newGroupName, selectedUsers)
      setNewGroupName('')
      setSelectedUsers([])
    }
  }

  const handleJoinGroup = () => {
    if (groupIdToJoin.trim()) {
      onJoinGroup(groupIdToJoin)
      setGroupIdToJoin('')
    }
  }

  const toggleUserSelection = (user: User) => {
    if (selectedUsers.some((u) => u.id === user.id)) {
      setSelectedUsers(selectedUsers.filter((u) => u.id !== user.id))
    } else {
      setSelectedUsers([...selectedUsers, user])
    }
  }

  const filteredChats = chats.filter((chat) => {
    const matchesSearch = chat.name
      .toLowerCase()
      .includes(searchQuery.toLowerCase())
    let matchesType = true
    if (chatTypeFilter !== 'all') {
      matchesType = chatTypeFilter === 'group' ? chat.isGroup : !chat.isGroup
    }
    return matchesSearch && matchesType
  })

  return (
    <>
      {/* Mobile menu button */}
      <button
        className="fixed left-4 top-4 z-50 rounded-md bg-gray-100 p-2 md:hidden"
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
      >
        {isMobileMenuOpen ? <X /> : <Menu />}
      </button>

      {/* Sidebar */}
      <div
        className={`${isMobileMenuOpen ? 'translate-x-0 pt-14' : '-translate-x-full'
          } fixed inset-y-0 left-0 z-40 w-80 transform md:border md:border-input bg-white md:rounded-2xl transition-transform duration-300 ease-in-out md:relative md:translate-x-0`}
      >
        <div className="flex h-full flex-col">
          {/* User profile */}
          <div className="flex items-center justify-between border-b p-4">
            <div className="flex items-center space-x-3">
              <Avatar>
                <AvatarFallback>
                  {currentUser.username.charAt(0)}
                </AvatarFallback>
              </Avatar>
              <div>
                <h3 className="font-medium">{currentUser.username}</h3>
                <p className="text-xs text-gray-500">{currentUser.email}</p>
              </div>
            </div>
            <div className="flex items-center">
              {/* Edit profile button */}
              <Dialog
                open={isEditProfileOpen}
                onOpenChange={setIsEditProfileOpen}
              >
                <DialogTrigger asChild>
                  <Button variant="ghost" size="icon" title="Edit Profile">
                    <Edit2 className="h-5 w-5" />
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Edit Profile</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="profile-name">Name</Label>
                      <Input
                        id="profile-name"
                        value={editedName}
                        onChange={(e) => setEditedName(e.target.value)}
                      />
                    </div>
                    <Button
                      className="w-full"
                      onClick={() => {
                        onUpdateName(editedName)
                        setIsEditProfileOpen(false)
                      }}
                      disabled={!editedName.trim()}
                    >
                      Save
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
              <Button
                variant="ghost"
                size="icon"
                title="Logout"
                onClick={onLogout}
              >
                <LogOut className="h-5 w-5" />
              </Button>
            </div>
          </div>

          {/* Search and actions */}
          <div className="border-b p-4">
            <div className="relative mb-4">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search conversations..."
                className="pl-9"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <div className="flex space-x-2 mb-4">
              <Dialog>
                <DialogTrigger asChild>
                  <Button className="flex-1">
                    <Users className="mr-2 h-4 w-4" />
                    New Group
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create a New Group</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="group-name">Group Name</Label>
                      <Input
                        id="group-name"
                        placeholder="Enter group name"
                        value={newGroupName}
                        onChange={(e) => setNewGroupName(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Select Participants</Label>
                      <div className="max-h-60 space-y-2 overflow-y-auto rounded-md border p-2">
                        {mockUsers.map((user) => (
                          <div
                            key={user.id}
                            className={`flex cursor-pointer items-center justify-between rounded-md p-2 ${selectedUsers.some((u) => u.id === user.id)
                              ? 'bg-gray-100'
                              : ''
                              }`}
                            onClick={() => toggleUserSelection(user)}
                          >
                            <div className="flex items-center space-x-3">
                              <Avatar className="h-8 w-8">
                                <AvatarFallback>
                                  {user.username.charAt(0)}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="text-sm font-medium">
                                  {user.username}
                                </p>
                                <p className="text-xs text-gray-500">
                                  {user.email}
                                </p>
                              </div>
                            </div>
                            {selectedUsers.some((u) => u.id === user.id) && (
                              <div className="h-4 w-4 rounded-full bg-primary"></div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                    <Button
                      className="w-full"
                      onClick={handleCreateGroup}
                      disabled={
                        !newGroupName.trim() || selectedUsers.length === 0
                      }
                    >
                      Create Group
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>

              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="outline" className="flex-1">
                    <UserPlus className="mr-2 h-4 w-4" />
                    Join Group
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Join a Group</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="group-id">Group ID</Label>
                      <Input
                        id="group-id"
                        placeholder="Enter group ID"
                        value={groupIdToJoin}
                        onChange={(e) => setGroupIdToJoin(e.target.value)}
                      />
                    </div>
                    <Button
                      className="w-full"
                      onClick={handleJoinGroup}
                      disabled={!groupIdToJoin.trim()}
                    >
                      Join Group
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            <Tabs defaultValue="all" onValueChange={setChatTypeFilter}>
              <TabsList className="w-full h-full p-2 rounded-full *:rounded-full *:h-9 *:data-[state=active]:text-primary">
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="person">Person</TabsTrigger>
                <TabsTrigger value="group">Group</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {/* Chat list */}
          <ScrollArea className="flex-1">
            <div className="space-y-1 p-2">
              {filteredChats.length > 0 ? (
                filteredChats.map((chat) => (
                  <div
                    key={chat.id}
                    className={`flex cursor-pointer items-center justify-between rounded-md p-3 ${selectedChat?.id === chat.id
                      ? 'bg-gray-100'
                      : 'hover:bg-gray-50'
                      }`}
                    onClick={() => onSelectChat(chat)}
                  >
                    <div className="flex items-center space-x-3">
                      <Avatar>
                        {/* <AvatarImage src={chat.avatar} alt={chat.name} /> */}
                        <AvatarFallback>{chat.name.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="flex items-center">
                          <h3 className="font-medium">{chat.name}</h3>
                          {chat.isGroup && (
                            <Badge className="ml-2 bg-blue-100 text-blue-700 text-xs">
                              Group
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-gray-500 line-clamp-1">
                          {chat.lastMessage}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-col self-start items-end space-y-1">
                      <span className="text-xs text-gray-500">
                        {formatTimestamp(chat.timestamp)}
                      </span>
                      {chat.unread > 0 && (
                        <Badge className="h-5 w-5 rounded-full p-0 flex items-center justify-center bg-red-500">
                          {chat.unread}
                        </Badge>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-4 text-center text-gray-500">
                  No conversations found
                </div>
              )}
            </div>
          </ScrollArea>
        </div>
      </div>
    </>
  )
}
