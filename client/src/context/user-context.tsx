import React, { createContext, useContext, useEffect, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useMutation } from '@tanstack/react-query'
import type { User } from '@/lib/types'

interface UserContextType {
  user?: User | null
  loading: boolean
  login: (username: string, password: string) => Promise<void>
  logout: () => Promise<void>
  updateUsername: (newUsername: string) => Promise<void>
}

const UserContext = createContext<UserContextType | undefined>(undefined)

// Token management functions
const saveToken = (token: string) => {
  localStorage.setItem('auth_token', token)
}

export const getToken = (): string | null => {
  return localStorage.getItem('auth_token')
}

const removeToken = () => {
  localStorage.removeItem('auth_token')
}

// API functions
const fetchCurrentUser = async (): Promise<User | null> => {
  const token = getToken()

  if (!token) return null

  const response = await fetch(`${import.meta.env.VITE_API_URL}/api/users/me`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })

  if (!response.ok) {
    return null
  }
  const user = await response.json()

  return {
    id: user.id,
    username: user.username,
    email: user.email,
    registeredAt: user.registeredAt,
    lastLoginAt: user.lastLoginAt,
    isOnline: user.isOnline,
  } as User
}

const loginUser = async ({
  username,
  password,
}: {
  username: string
  password: string
}) => {
  const response = await fetch(
    `${import.meta.env.VITE_API_URL}/api/users/login`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ username, password }),
    },
  )

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.message || 'Login failed')
  }

  const data = await response.json()
  // Save the JWT token
  if (data.token) {
    saveToken(data.token)
  }
  return data
}

const logoutUser = async () => {
  const token = getToken()

  const result = await fetch(
    `${import.meta.env.VITE_API_URL}/api/users/logout`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  )

  // Remove the token on logout
  removeToken()
  return result
}

const updateUserUsername = async (newUsername: string) => {
  const token = getToken()

  const response = await fetch(
    `${import.meta.env.VITE_API_URL}/api/users/username`,
    {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ username: newUsername }),
    },
  )

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.message || 'Failed to update username')
  }

  return response.json()
}

export const UserProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const navigate = useNavigate()

  const [user, setUser] = useState<User | null | undefined>(undefined)
  const [loading, setLoading] = useState(true)

  // Fetch user on initial load
  useEffect(() => {
    const loadUser = async () => {
      try {
        setLoading(true)
        const userData = await fetchCurrentUser()
        setUser(userData)
      } catch (error) {
        console.error('Error loading user:', error)
        setUser(null)
      } finally {
        setLoading(false)
      }
    }

    loadUser()
  }, [])

  // Login mutation
  const loginMutation = useMutation({
    mutationFn: loginUser,
    onSuccess: async () => {
      // Fetch the user data after successful login
      setLoading(true)
      const userData = await fetchCurrentUser()
      setUser(userData)
      setLoading(false)
      navigate({ to: '/' })
    },
  })

  // Logout mutation
  const logoutMutation = useMutation({
    mutationFn: logoutUser,
    onSuccess: () => {
      setUser(null)
      navigate({ to: '/login' })
    },
  })

  // Update username mutation
  const updateUsernameMutation = useMutation({
    mutationFn: updateUserUsername,
    onSuccess: (data) => {
      setUser((prev) =>
        prev ? { ...prev, username: data.user.username } : null,
      )
    },
  })

  const login = async (username: string, password: string) => {
    try {
      await loginMutation.mutateAsync({ username, password })
    } catch (error) {
      console.error('Login error:', error)
      throw error
    }
  }

  const logout = async () => {
    try {
      await logoutMutation.mutateAsync()
    } catch (error) {
      console.error('Logout error:', error)
    }
  }

  const updateUsername = async (newUsername: string) => {
    try {
      return await updateUsernameMutation.mutateAsync(newUsername)
    } catch (error) {
      console.error('Update username error:', error)
      throw error
    }
  }

  return (
    <UserContext.Provider
      value={{
        user,
        loading,
        login,
        logout,
        updateUsername,
      }}
    >
      {children}
    </UserContext.Provider>
  )
}

export const useUser = () => {
  const context = useContext(UserContext)
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider')
  }
  return context
}
