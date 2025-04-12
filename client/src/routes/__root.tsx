import { Outlet, createRootRouteWithContext } from '@tanstack/react-router'
// import { TanStackRouterDevtools } from '@tanstack/react-router-devtools'
import type { QueryClient } from '@tanstack/react-query'
// import TanstackQueryLayout from '@/integrations/tanstack-query/layout'
import { UserProvider } from '@/context/user-context'
import { ChatProvider } from '@/context/chat-context'

interface MyRouterContext {
  queryClient: QueryClient
}

export const Route = createRootRouteWithContext<MyRouterContext>()({
  component: () => (
    <UserProvider>
      <ChatProvider>
        <Outlet />
        {/* <TanStackRouterDevtools /> */}
        {/* <TanstackQueryLayout /> */}
      </ChatProvider>
    </UserProvider>
  ),
})
