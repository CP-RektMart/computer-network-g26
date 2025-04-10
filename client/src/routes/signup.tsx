import { createFileRoute } from '@tanstack/react-router'
import { SignupForm } from '@/components/signup-form'

export const Route = createFileRoute('/signup')({
  component: RouteComponent,
})

function RouteComponent() {
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
