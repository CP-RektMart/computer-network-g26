import type { UseNavigateResult } from '@tanstack/react-router'

export function isTokenExpired(token: string): boolean {
  if (!token) return true

  try {
    // Token format: header.payload.signature
    const payload = token.split('.')[1]
    if (!payload) return true

    // Decode the base64 payload
    const decodedPayload = JSON.parse(atob(payload))
    const expirationTime = decodedPayload.exp * 1000 // Convert to milliseconds

    return Date.now() >= expirationTime
  } catch (error) {
    // If there's any error parsing the token, consider it expired
    console.error('Error checking token expiration:', error)
    return true
  }
}

export function handleAuthRedirect(
  isLoginPage = false,
  navigate?: UseNavigateResult<string>,
): boolean {
  const token = localStorage.getItem('auth_token')

  if (token) {
    if (isTokenExpired(token)) {
      // Token expired, remove it
      localStorage.removeItem('auth_token')

      // If we're not on login page, redirect to login
      if (!isLoginPage && navigate) {
        navigate({ to: '/login' })
        return true
      }
    } else if (isLoginPage && navigate) {
      // Valid token on login page, redirect to home
      navigate({ to: '/' })
      return true
    }
  } else if (!isLoginPage && navigate) {
    // No token and not on login page, redirect to login
    navigate({ to: '/login' })
    return true
  }

  return false
}
