import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useEffect } from 'react'
import { SignupForm } from '@/components/signup-form'
import { handleAuthRedirect } from '@/lib/auth'

export const Route = createFileRoute('/signup')({
  component: RouteComponent,
})

function RouteComponent() {
  const navigate = useNavigate()

  useEffect(() => {
    const isLoginPage = true
    handleAuthRedirect(isLoginPage, navigate)
  }, [navigate])

  return (
    <div className="grid min-h-svh lg:grid-cols-2">
      <div className="flex items-center justify-center">
        <div className="w-full max-w-xs">
          <SignupForm />
        </div>
      </div>
      <div className="hidden bg-gray-50 lg:flex lg:items-center lg:justify-center">
        <img
          src="/cover.svg"
          alt="Image"
          className="h-96 dark:brightness-[0.2] dark:grayscale"
        />
      </div>
    </div>
  )
}
