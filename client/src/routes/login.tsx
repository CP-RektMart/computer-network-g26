import { createFileRoute } from '@tanstack/react-router'
import { LoginForm } from '@/components/login-form'

export const Route = createFileRoute('/login')({
  component: RouteComponent,
})

function RouteComponent() {
  return (
    <div className="grid min-h-svh lg:grid-cols-2">
      <div className="flex items-center justify-center">
        <div className="w-full max-w-xs">
          <LoginForm />
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
