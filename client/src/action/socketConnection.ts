import { useEffect } from 'react'
import { io } from 'socket.io-client'

export const useSocketConnection = (
  getToken: () => string | null,
  socketRef: React.RefObject<any>,
) => {
  useEffect(() => {
    if (!socketRef.current) {
      console.log('Connecting to socket...')
      socketRef.current = io(import.meta.env.VITE_API_URL, {
        auth: {
          token: getToken(),
        },
      })

      const socket = socketRef.current

      socket.on('connect_error', (err: { message: any }) => {
        console.error('Socket connection error:', err.message)
      })

      socket.on('connect', () => {
        console.log('Socket connected:', socketRef.current?.id)
      })

      socket.on('socket-room-connect', (res: any) => {
        console.log('Socket Room Connect:', res)
      })

      // Cleanup socket on unmount
      return () => {
        if (socketRef.current) {
          socketRef.current.disconnect()
          console.log('Socket disconnected')
          socketRef.current = null
        }
      }
    }
  }, [getToken, socketRef]) // Dependency array includes getToken and socketRef
}
