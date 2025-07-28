import { useEffect, useRef, useState, useCallback } from 'react'
import { SSEManager, SSENotification, SSEManagerConfig } from '../services/sseService'

export interface UseSSEOptions {
  userId: string | null
  apiBaseUrl?: string
  maxReconnectAttempts?: number
  onNotification?: (notification: SSENotification) => void
  onAuthRequired?: () => void
  onConnectionOpen?: () => void
  onConnectionError?: (error: Event) => void
  onTokenRefresh?: () => Promise<string | null>
  autoConnect?: boolean
  disabled?: boolean  // SSE 연결을 완전히 비활성화
}

export interface UseSSEReturn {
  isConnected: boolean
  reconnectAttempts: number
  connect: () => void
  disconnect: () => void
  reconnect: () => void
  forceReconnect: () => void
}

export const useSSE = (options: UseSSEOptions): UseSSEReturn => {
  const {
    userId,
    apiBaseUrl = 'http://localhost:8080',
    maxReconnectAttempts = 5,
    onNotification,
    onAuthRequired,
    onConnectionOpen,
    onConnectionError,
    onTokenRefresh,
    autoConnect = true,
    disabled = false
  } = options

  const sseManagerRef = useRef<SSEManager | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [reconnectAttempts, setReconnectAttempts] = useState(0)

  const callbacksRef = useRef({
    onNotification,
    onAuthRequired,
    onConnectionOpen,
    onConnectionError,
    onTokenRefresh
  })

  useEffect(() => {
    callbacksRef.current = {
      onNotification,
      onAuthRequired,
      onConnectionOpen,
      onConnectionError,
      onTokenRefresh
    }
  })

  const handleConnectionOpen = useCallback(() => {
    setIsConnected(true)
    setReconnectAttempts(0)
    callbacksRef.current.onConnectionOpen?.()
  }, [])

  const handleConnectionError = useCallback((error: Event) => {
    setIsConnected(false)
    callbacksRef.current.onConnectionError?.(error)
  }, [])

  const handleNotification = useCallback((notification: SSENotification) => {
    callbacksRef.current.onNotification?.(notification)
  }, [])

  const handleAuthRequired = useCallback(() => {
    setIsConnected(false)
    callbacksRef.current.onAuthRequired?.()
  }, [])

  const connect = useCallback(() => {
    if (sseManagerRef.current && userId && !disabled) {
      sseManagerRef.current.connect()
    }
  }, [userId, disabled])

  const disconnect = useCallback(() => {
    if (sseManagerRef.current) {
      sseManagerRef.current.disconnect()
      setIsConnected(false)
      setReconnectAttempts(0)
    }
  }, [])

  const reconnect = useCallback(() => {
    if (sseManagerRef.current) {
      sseManagerRef.current.reconnect()
    }
  }, [])

  const forceReconnect = useCallback(() => {
    if (sseManagerRef.current) {
      sseManagerRef.current.forceReconnect()
    }
  }, [])

  useEffect(() => {
    if (userId && !disabled) {
      const config: SSEManagerConfig = {
        userId,
        apiBaseUrl,
        maxReconnectAttempts,
        onNotification: handleNotification,
        onAuthRequired: handleAuthRequired,
        onConnectionOpen: handleConnectionOpen,
        onConnectionError: handleConnectionError,
        onTokenRefresh: callbacksRef.current.onTokenRefresh,
      }

      sseManagerRef.current = new SSEManager(config)

      if (autoConnect) {
        // 즉시 연결하지 말고 약간의 지연 후 연결
        setTimeout(() => {
          sseManagerRef.current?.connect()
        }, 1000) // 2초에서 1초로 단축
      }

      // 연결 상태 체크 간격 단축
      const checkConnectionStatus = () => {
        if (sseManagerRef.current) {
          setIsConnected(sseManagerRef.current.isConnected())
          setReconnectAttempts(sseManagerRef.current.getReconnectAttempts())
        }
      }

      const statusInterval = setInterval(checkConnectionStatus, 2000) // 1초에서 2초로 변경

      return () => {
        clearInterval(statusInterval)
        sseManagerRef.current?.disconnect()
        sseManagerRef.current = null
      }
    } else {
      // disabled이거나 userId가 없는 경우 연결 해제
      if (sseManagerRef.current) {
        sseManagerRef.current.disconnect()
        sseManagerRef.current = null
      }
      setIsConnected(false)
      setReconnectAttempts(0)
    }
  }, [
    userId,
    disabled,
    apiBaseUrl,
    maxReconnectAttempts,
    autoConnect,
    handleNotification,
    handleAuthRequired,
    handleConnectionOpen,
    handleConnectionError
  ])

  useEffect(() => {
    if (sseManagerRef.current && userId) {
      sseManagerRef.current.updateUserId(userId)
    }
  }, [userId])

  return {
    isConnected,
    reconnectAttempts,
    connect,
    disconnect,
    reconnect,
    forceReconnect
  }
}