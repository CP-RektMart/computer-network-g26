import { useState } from 'react'
import {
  Edit2,
  LogOut,
  Menu,
  Plus,
  Search,
  UserPlus,
  Users,
  X,
} from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { formatDistanceToNow } from 'date-fns'
import type { User } from '@/lib/types'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useUser } from '@/context/user-context'
import { useChat, useOnlineUsers } from '@/context/chat-context'

interface ChatSidebarProps {
  isMobileMenuOpen: boolean
  setIsMobileMenuOpen: (open: boolean) => void
}

export default function ChatSidebar({
  isMobileMenuOpen,
  setIsMobileMenuOpen,
}: ChatSidebarProps) {
  const { user: currentUser, updateUsername, logout } = useUser()
  const {
    chats,
    selectedChat,
    selectChat,
    createDirect,
    createGroup,
    joinGroup,
  } = useChat()
  const onlineUserIds = useOnlineUsers()

  const [searchQuery, setSearchQuery] = useState('')
  const [newGroupName, setNewGroupName] = useState('')
  const [groupIdToJoin, setGroupIdToJoin] = useState('')
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false)
  const [editedName, setEditedName] = useState(currentUser?.username || '')
  const [chatTypeFilter, setChatTypeFilter] = useState('all')
  const [openContactsDialog, setOpenContactsDialog] = useState(false)

  const fetchUsers = async (): Promise<User[]> => {
    const response = await fetch(`${import.meta.env.VITE_API_URL}/api/users`, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('auth_token')}`,
      },
    })
    const data = await response.json()
    if (!response.ok) {
      throw new Error('Failed to fetch users')
    }
    return data
  }

  const { data: users } = useQuery({
    queryKey: ['users'],
    queryFn: fetchUsers,
  })

  const [selectedUsers, setSelectedUsers] = useState<User[]>([])

  const handleCreateGroup = () => {
    if (newGroupName.trim() && selectedUsers.length > 0) {
      createGroup(newGroupName, selectedUsers)
      setNewGroupName('')
      setSelectedUsers([])
      setIsMobileMenuOpen(false)
    }
  }

  const handleJoinGroup = () => {
    if (groupIdToJoin.trim()) {
      joinGroup(groupIdToJoin)
      setGroupIdToJoin('')
      setIsMobileMenuOpen(false)
    }
  }

  const toggleUserSelection = (user: User) => {
    if (selectedUsers.some((u) => u.id === user.id)) {
      setSelectedUsers(selectedUsers.filter((u) => u.id !== user.id))
    } else {
      setSelectedUsers([...selectedUsers, user])
    }
  }

  const handleUpdateUsername = async () => {
    if (editedName.trim() && editedName !== currentUser?.username) {
      await updateUsername(editedName)
      setIsEditProfileOpen(false)
    }
  }

  const handleLogout = async () => {
    await logout()
  }

  const filteredChats = chats.filter((chat) => {
    const resolvedName = chat.isGroup
      ? (chat.name ?? '')
      : (chat.participants?.find((p) => currentUser && p.id !== currentUser.id)
          ?.username ?? '')

    const matchesSearch = resolvedName
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
        className={`${
          isMobileMenuOpen ? 'translate-x-0 pt-14' : '-translate-x-full'
        } fixed inset-y-0 left-0 z-40 w-80 transform md:border md:border-input bg-white md:rounded-2xl transition-transform duration-300 ease-in-out md:relative md:translate-x-0`}
      >
        <div className="flex h-full flex-col">
          {/* User profile */}
          <div className="flex items-center justify-between border-b p-4">
            <div className="flex items-center space-x-3">
              <div className="relative">
                <Avatar className="h-8 w-8">
                  <AvatarFallback>
                    {currentUser?.username
                      ? currentUser.username.charAt(0)
                      : '?'}
                  </AvatarFallback>
                </Avatar>
                <div className="absolute inset-0 rounded-full border-2 border-green-500" />
              </div>
              <div>
                <h3 className="font-medium">{currentUser?.username}</h3>
                <p className="text-xs text-gray-500">{currentUser?.email}</p>
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
                      onClick={handleUpdateUsername}
                      disabled={
                        !editedName.trim() ||
                        editedName === currentUser?.username
                      }
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
                onClick={handleLogout}
              >
                <LogOut className="h-5 w-5" />
              </Button>
            </div>
          </div>

          {/* Search and actions */}
          <div className="border-b p-4">
            <div className="flex items-center justify-between gap-2 mb-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search conversations..."
                  className="pl-9"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              <Dialog
                open={openContactsDialog}
                onOpenChange={setOpenContactsDialog}
              >
                <DialogTrigger asChild>
                  <Button variant="outline" size="icon">
                    <Plus className="h-4 w-4" />
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Contacts</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="max-h-96 space-y-2 overflow-y-auto rounded-md border p-2">
                      {/* Add current user as the first item */}
                      {currentUser && (
                        <div
                          key={currentUser.id}
                          className="flex items-center justify-between rounded-md p-2 hover:bg-gray-100"
                          onClick={() => {
                            createDirect(currentUser.id)
                            setIsMobileMenuOpen(false)
                            setOpenContactsDialog(false)
                          }}
                        >
                          <div className="flex items-center space-x-3">
                            <div className="relative">
                              <Avatar className="h-8 w-8">
                                <AvatarFallback>
                                  {currentUser.username.charAt(0)}
                                </AvatarFallback>
                              </Avatar>
                              {onlineUserIds.some(
                                (onlineUser) =>
                                  onlineUser.id === currentUser.id,
                              ) && (
                                <div className="absolute inset-0 rounded-full border-2 border-green-500" />
                              )}
                            </div>
                            <div>
                              <p className="text-sm font-medium">
                                {currentUser.username}{' '}
                                <span className="text-xs text-gray-400">
                                  (You)
                                </span>
                              </p>
                              <p className="text-xs text-gray-500">
                                {currentUser.email}
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                      {users
                        ?.filter(
                          (user) => currentUser && user.id !== currentUser.id,
                        )
                        .sort((a, b) => {
                          const aOnline = onlineUserIds.some(
                            (u) => u.id === a.id,
                          )
                          const bOnline = onlineUserIds.some(
                            (u) => u.id === b.id,
                          )
                          if (aOnline !== bOnline) {
                            return aOnline ? -1 : 1 // online first
                          }
                          return a.username.localeCompare(b.username)
                        })
                        .map((user) => (
                          <div
                            key={user.id}
                            className="flex items-center justify-between rounded-md p-2 hover:bg-gray-100"
                            onClick={() => {
                              createDirect(user.id)
                              setIsMobileMenuOpen(false)
                              setOpenContactsDialog(false)
                            }}
                          >
                            <div className="flex items-center space-x-3">
                              <div className="relative">
                                <Avatar className="h-8 w-8">
                                  <AvatarFallback>
                                    {user.username.charAt(0)}
                                  </AvatarFallback>
                                </Avatar>
                                {onlineUserIds.some(
                                  (onlineUser) => onlineUser.id === user.id,
                                ) && (
                                  <div className="absolute inset-0 rounded-full border-2 border-green-500" />
                                )}
                              </div>
                              <div>
                                <p className="text-sm font-medium">
                                  {user.username}
                                </p>
                                <p className="text-xs text-gray-500">
                                  {user.email}
                                </p>
                              </div>
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
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
                        {users
                          ?.filter(
                            (user) => currentUser && user.id !== currentUser.id,
                          )
                          .map((user) => (
                            <div
                              key={user.id}
                              className={`flex cursor-pointer items-center justify-between rounded-md p-2 ${
                                selectedUsers.some((u) => u.id === user.id)
                                  ? 'bg-gray-100'
                                  : ''
                              }`}
                              onClick={() => toggleUserSelection(user)}
                            >
                              <div className="flex items-center space-x-3">
                                <div className="relative">
                                  <Avatar className="h-8 w-8">
                                    <AvatarFallback>
                                      {user.username.charAt(0)}
                                    </AvatarFallback>
                                  </Avatar>
                                  {/* Green ring for online status */}
                                  {onlineUserIds.some(
                                    (onlineUser) => onlineUser.id === user.id,
                                  ) && (
                                    <div className="absolute inset-0 rounded-full border-2 border-green-500" />
                                  )}
                                </div>
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
                    <DialogClose asChild>
                      <Button
                        className="w-full"
                        onClick={handleCreateGroup}
                        disabled={
                          !newGroupName.trim() || selectedUsers.length === 0
                        }
                      >
                        Create Group
                      </Button>
                    </DialogClose>
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
                    <DialogClose
                      className="w-full bg-blue-700 text-white rounded-md p-2 text-center hover:bg-blue-600 transition-colors duration-200 ease-in-out"
                      onClick={handleJoinGroup}
                      disabled={!groupIdToJoin.trim()}
                    >
                      Join Group
                    </DialogClose>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            <Tabs defaultValue="all" onValueChange={setChatTypeFilter}>
              <TabsList className="w-full h-full p-2 rounded-full *:rounded-full *:h-9 *:data-[state=active]:text-primary">
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="direct">Direct</TabsTrigger>
                <TabsTrigger value="group">Group</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {/* Chat list */}
          <ScrollArea className="flex-1 overflow-auto">
            <div className="space-y-1 p-2">
              {filteredChats.length > 0 ? (
                filteredChats.map((chat) => {
                  const otherParticipant = !chat.isGroup
                    ? chat.participants?.find(
                        (p) => currentUser && p.id !== currentUser.id,
                      )
                    : null

                  const isDirectOnline = otherParticipant
                    ? onlineUserIds.some((u) => u.id === otherParticipant.id)
                    : false

                  const isGroupOnline = chat.isGroup
                    ? chat.participants?.some(
                        (p) =>
                          p.id !== currentUser?.id &&
                          onlineUserIds.some(
                            (onlineUser) => onlineUser.id === p.id,
                          ),
                      )
                    : false

                  return (
                    <div
                      key={chat.id}
                      className={`flex cursor-pointer items-center justify-between rounded-md p-3 ${
                        selectedChat?.id === chat.id
                          ? 'bg-gray-100'
                          : 'hover:bg-gray-50'
                      }`}
                      onClick={() => {
                        selectChat(chat)
                        setIsMobileMenuOpen(false)
                      }}
                    >
                      <div className="flex items-center space-x-3">
                        <div className="relative">
                          <div className="relative">
                            <Avatar
                              className={
                                isDirectOnline || isGroupOnline
                                  ? 'border-2 border-transparent'
                                  : ''
                              }
                            >
                              <AvatarFallback>
                                {chat.name ? chat.name.charAt(0) : '?'}
                              </AvatarFallback>
                            </Avatar>
                            {(isDirectOnline || isGroupOnline) && (
                              <div className="absolute inset-0 rounded-full border-2 border-green-500" />
                            )}
                          </div>
                        </div>
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
                          {chat.lastSentAt
                            ? formatDistanceToNow(chat.lastSentAt)
                            : ''}
                        </span>
                        {chat.unread > 0 && (
                          <Badge className="h-5 w-5 rounded-full p-0 flex items-center justify-center bg-red-500">
                            {chat.unread}
                          </Badge>
                        )}
                      </div>
                    </div>
                  )
                })
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
