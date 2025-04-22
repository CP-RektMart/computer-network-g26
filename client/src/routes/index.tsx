import { Navigate, createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import ChatArea from '@/components/chat/chat-area'
import ChatSidebar from '@/components/chat/chat-sidebar'
import { useUser } from '@/context/user-context'

export const Route = createFileRoute('/')({
  component: RouteComponent,
})

function RouteComponent() {
  const { user, loading } = useUser()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  // If loading, show a loading spinner
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

  // If not logged in, redirect to login page
  if (!user) {
    return <Navigate to="/login" />
  }

  return (
    <div className="flex h-dvh bg-gray-50 md:gap-5 md:p-6">
      <ChatSidebar
        isMobileMenuOpen={isMobileMenuOpen}
        setIsMobileMenuOpen={setIsMobileMenuOpen}
      />
      <ChatArea setIsMobileMenuOpen={setIsMobileMenuOpen} />
    </div>
  )
}
