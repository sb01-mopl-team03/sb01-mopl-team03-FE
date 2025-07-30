// ChatRoom.tsx
import React, { useState, useRef, useEffect, useCallback } from 'react'
import { ArrowLeft, Send, Image, Smile, X } from 'lucide-react'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar'
import { ScrollArea } from './ui/scroll-area'
import { DmDto, CursorPageResponseDto, DmPagingDto } from '../services/dmService'
import { useDmWebSocket } from '../hooks/useDmWebSocket'

interface Message {
  id: string
  senderId: string
  senderName: string
  content: string
  timestamp: string
  type: 'text' | 'image'
  isOwnMessage: boolean
}

interface ChatUser {
  id: string
  name: string
  avatar: string
  isOnline: boolean
  roomId: string
}

interface ChatRoomProps {
  isOpen: boolean
  onClose: () => void
  onBack: () => void
  user: ChatUser | null
  currentUserId: string | null
  getDmMessages: (roomId: string, pagingDto?: DmPagingDto) => Promise<CursorPageResponseDto<DmDto>>
  refreshTrigger?: number
}

export function ChatRoom({ isOpen, onClose, onBack, user, currentUserId, getDmMessages, refreshTrigger }: ChatRoomProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [isTyping] = useState(false)
  const [loading, setLoading] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [authError, setAuthError] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(true)
  const [nextCursor, setNextCursor] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const scrollAreaRef = useRef<HTMLDivElement>(null)
  const previousScrollHeight = useRef<number>(0)
  
  // WebSocket connection  
  const { isConnected, sendMessage } = useDmWebSocket({
    roomId: user?.roomId || null,
    userId: currentUserId,
    onMessageReceived: (dmMessage: DmDto) => {
      console.log('📥 ChatRoom에서 메시지 수신:', dmMessage);
      const message: Message = {
        id: dmMessage.id,
        senderId: dmMessage.senderId,
        senderName: dmMessage.senderId === currentUserId ? '나' : user?.name || 'Unknown',
        content: dmMessage.content,
        timestamp: formatTimestamp(dmMessage.createdAt),
        type: 'text',
        isOwnMessage: dmMessage.senderId === currentUserId
      }
      
      setMessages(prev => {
        // 중복 메시지 검사
        const existingMessage = prev.find(msg => msg.id === dmMessage.id);
        if (existingMessage) {
          console.log('📥 중복 메시지 무시:', dmMessage.id);
          return prev; // 중복이면 추가하지 않음
        }
        return [...prev, message]; // 새 메시지만 추가
      })
    },
    onError: (error: string) => {
      console.error('❌ DM WebSocket 에러:', error);
      
      // 인증 관련 에러와 일반 에러 구분
      if (error.includes('로그인') || error.includes('인증') || error.includes('Authentication')) {
        setAuthError(error);
        setError(null); // 일반 에러는 초기화
      } else {
        setError(error);
        setAuthError(null); // 인증 에러는 초기화
      }
    }
  })

  // Auto scroll to bottom when new messages arrive (only for new messages, not loaded ones)
  useEffect(() => {
    if (!loadingMore) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages.length, loadingMore])

  // Focus input when chat opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isOpen])

  const formatTimestamp = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleTimeString('ko-KR', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    })
  }

  const loadMessages = useCallback(async (isInitial = false) => {
    if (!user?.roomId) return
    
    try {
      if (isInitial) {
        setLoading(true)
      } else {
        setLoadingMore(true)
      }
      setError(null)
      
      // 초기 로딩시에는 50개, 추가 로딩시에도 50개씩
      const pagingDto: DmPagingDto = { 
        size: 20,
        ...(nextCursor && !isInitial && { cursor: nextCursor })
      }
      
      console.log('📊 메시지 로딩 요청:', { 
        roomId: user.roomId, 
        isInitial, 
        cursor: nextCursor,
        size: pagingDto.size 
      })
      
      const response = await getDmMessages(user.roomId, pagingDto)
      
      console.log('📊 메시지 로딩 응답:', { 
        dataLength: response.data.length,
        hasNext: response.hasNext,
        nextCursor: response.nextCursor
      })
      
      const newMessages: Message[] = response.data
        .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
        .map((dm: DmDto) => ({
          id: dm.id,
          senderId: dm.senderId,
          senderName: dm.senderId === currentUserId ? '나' : user?.name || 'Unknown',
          content: dm.content,
          timestamp: formatTimestamp(dm.createdAt),
          type: 'text',
          isOwnMessage: dm.senderId === currentUserId
        }))
      
      if (isInitial) {
        setMessages(newMessages)
      } else {
        // 이전 메시지들을 앞에 추가 (중복 체크)
        setMessages(prev => {
          const existingIds = new Set(prev.map(msg => msg.id))
          const uniqueNewMessages = newMessages.filter(msg => !existingIds.has(msg.id))
          return [...uniqueNewMessages, ...prev]
        })
      }
      
      // 페이지네이션 정보 업데이트
      setHasMore(response.hasNext)
      setNextCursor(response.nextCursor)
      
    } catch (error) {
      console.error('Error loading messages:', error)
      setError('메시지를 불러올 수 없습니다.')
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }, [user?.roomId, user?.name, nextCursor, currentUserId, getDmMessages])

  const resetAndLoadMessages = useCallback(async () => {
    setMessages([])
    setNextCursor(null)
    setHasMore(true)
    await loadMessages(true)
  }, [loadMessages])

  // Load messages when room changes
  useEffect(() => {
    if (user?.roomId) {
      resetAndLoadMessages()
    }
  }, [user?.roomId, resetAndLoadMessages])

  // refreshTrigger로 메시지 갱신
  useEffect(() => {
    if (isOpen && user && refreshTrigger && refreshTrigger > 0) {
      console.log('🔄 채팅방 메시지 갱신 트리거 감지:', refreshTrigger)
      resetAndLoadMessages()
    }
  }, [refreshTrigger, isOpen, user, resetAndLoadMessages])

  // 스크롤 이벤트 핸들러 - 디바운스 추가
  const handleScroll = useCallback((event: React.UIEvent<HTMLDivElement>) => {
    const scrollElement = event.currentTarget
    const { scrollTop, scrollHeight } = scrollElement
    
    // 스크롤이 최상단 근처에 도달했고, 더 불러올 메시지가 있으며, 현재 로딩 중이 아닐 때
    // scrollTop <= 10으로 약간의 여유를 둠
    if (scrollTop <= 10 && hasMore && !loadingMore && !loading && messages.length > 0) {
      console.log('📜 스크롤 최상단 도달, 이전 메시지 로드', {
        scrollTop,
        hasMore,
        loadingMore,
        loading,
        messagesCount: messages.length,
        nextCursor
      })
      previousScrollHeight.current = scrollHeight
      loadMessages(false)
    }
  }, [hasMore, loadingMore, loading, messages.length, nextCursor, loadMessages])

  // 이전 메시지 로드 후 스크롤 위치 유지
  useEffect(() => {
    if (loadingMore && scrollAreaRef.current) {
      const scrollElement = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]')
      if (scrollElement && previousScrollHeight.current > 0) {
        const newScrollHeight = scrollElement.scrollHeight
        const scrollDiff = newScrollHeight - previousScrollHeight.current
        scrollElement.scrollTop = scrollDiff
        previousScrollHeight.current = 0
      }
    }
  }, [messages, loadingMore])

  const handleSendMessage = () => {
    if (!newMessage.trim() || !user || !isConnected) {
      console.warn('⚠️ 메시지 전송 실패:', {
        hasMessage: !!newMessage.trim(),
        hasUser: !!user,
        isConnected,
        roomId: user?.roomId,
        userId: currentUserId
      });
      return;
    }

    console.log('📤 ChatRoom에서 메시지 전송:', {
      content: newMessage.trim(),
      roomId: user.roomId,
      userId: currentUserId,
      isConnected
    });
    sendMessage(newMessage.trim())
    setNewMessage('')
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const formatMessageTime = (timestamp: string) => {
    return timestamp
  }

  if (!isOpen || !user) return null

  return (
    <div className="fixed bottom-20 right-6 w-96 h-[520px] z-50 animate-in slide-in-from-right-5 fade-in duration-200">
      <div className="rounded-2xl border border-white/20 h-full flex flex-col" style={{
        backdropFilter: 'blur(12px)',
        background: 'rgba(26, 26, 26, 0.95)'
      }}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/10 flex-shrink-0">
          <div className="flex items-center space-x-3">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={onBack}
              className="p-1 hover:bg-white/10"
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            
            <div className="flex items-center space-x-3">
              <div className="relative">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={user.avatar} />
                  <AvatarFallback className="bg-[#4ecdc4] text-black text-sm">
                    {user.name.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                {user.isOnline && (
                  <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-background"></div>
                )}
              </div>
              
              <div>
                <p className="font-medium text-sm">{user.name}</p>
                <p className="text-xs text-white/60">
                  {/* {user.isOnline ? '온라인' : ''}
                  {' • '}
                  <span className={`${isConnected ? 'text-green-400' : 'text-red-400'}`}>
                    {isConnected ? '연결됨' : '연결 안됨'}
                  </span> */}
                </p>
              </div>
            </div>
          </div>

          <Button 
            variant="ghost" 
            size="sm" 
            onClick={onClose} 
            className="p-2 hover:bg-white/10"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Messages - Fixed height with proper scrolling */}
        <div className="flex-1 overflow-hidden">
          <ScrollArea 
            ref={scrollAreaRef}
            className="h-full" 
            onScrollCapture={handleScroll}
          >
            <div className="p-4 space-y-4">
              {/* 이전 메시지 로딩 인디케이터 */}
              {loadingMore && (
                <div className="flex items-center justify-center py-2 text-white/60">
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 border-2 border-white/20 border-t-white/60 rounded-full animate-spin"></div>
                    <span className="text-sm">이전 메시지 불러오는 중...</span>
                  </div>
                </div>
              )}

              {/* 더 이상 불러올 메시지가 없을 때 */}
              {!hasMore && messages.length > 0 && !loading && (
                <div className="flex items-center justify-center py-2 text-white/40">
                  <span className="text-sm">대화의 시작입니다</span>
                </div>
              )}

              {loading && (
                <div className="flex items-center justify-center h-32 text-white/60">
                  메시지를 불러오는 중...
                </div>
              )}
              {error && (
                <div className="flex items-center justify-center h-32 text-red-400">
                  {error}
                </div>
              )}
              {authError && (
                <div className="flex items-center justify-center h-32 text-orange-400">
                  <div className="text-center">
                    <p className="mb-3">{authError}</p>
                    <Button 
                      onClick={() => {
                        setAuthError(null);
                      }}
                      size="sm"
                      className="bg-orange-500 hover:bg-orange-600 text-white"
                    >
                      다시 시도
                    </Button>
                  </div>
                </div>
              )}
              {!loading && !error && !authError && messages.length === 0 && !loadingMore && (
                <div className="flex items-center justify-center h-32 text-white/60">
                  아직 메시지가 없습니다.
                </div>
              )}
              
              {messages.map((message, index) => {
                const showTime = index === 0 || 
                  messages[index - 1].timestamp !== message.timestamp ||
                  messages[index - 1].isOwnMessage !== message.isOwnMessage

                return (
                  <div key={message.id} className={`flex ${message.isOwnMessage ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[80%] ${message.isOwnMessage ? 'order-2' : 'order-1'}`}>
                      {!message.isOwnMessage && (
                        <div className="flex items-center space-x-2 mb-1">
                          <Avatar className="h-6 w-6">
                            <AvatarImage src={user.avatar} />
                            <AvatarFallback className="bg-[#4ecdc4] text-black text-xs">
                              {user.name.charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-xs text-white/60">{message.senderName}</span>
                        </div>
                      )}
                      
                      <div className={`rounded-2xl px-4 py-2 break-words ${
                        message.isOwnMessage 
                          ? 'bg-[#4ecdc4] text-black' 
                          : 'bg-white/10 text-white'
                      }`}>
                        <p className="text-sm leading-relaxed">{message.content}</p>
                      </div>
                      
                      {showTime && (
                        <p className={`text-xs text-white/40 mt-1 ${
                          message.isOwnMessage ? 'text-right' : 'text-left'
                        }`}>
                          {formatMessageTime(message.timestamp)}
                        </p>
                      )}
                    </div>
                  </div>
                )
              })}
              
              {isTyping && (
                <div className="flex justify-start">
                  <div className="flex items-center space-x-2">
                    <Avatar className="h-6 w-6">
                      <AvatarImage src={user.avatar} />
                      <AvatarFallback className="bg-[#4ecdc4] text-black text-xs">
                        {user.name.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="bg-white/10 rounded-2xl px-4 py-2">
                      <div className="flex space-x-1">
                        <div className="w-2 h-2 bg-white/60 rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-white/60 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                        <div className="w-2 h-2 bg-white/60 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>
        </div>

        {/* Input - Fixed at bottom */}
        <div className="p-4 border-t border-white/10 flex-shrink-0">
          <div className="flex items-center space-x-2">
            <Button variant="ghost" size="sm" className="p-2 hover:bg-white/10 flex-shrink-0">
              <Image className="w-5 h-5" />
            </Button>
            
            <div className="flex-1 relative">
              <Input
                ref={inputRef}
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="메시지를 입력하세요..."
                className="pr-12 h-12 px-4 text-base bg-white/5 border-white/20 focus:border-[#4ecdc4] rounded-full"
              />
              
              <Button 
                variant="ghost" 
                size="sm" 
                className="absolute right-1 top-1/2 transform -translate-y-1/2 p-2 hover:bg-white/10"
              >
                <Smile className="w-4 h-4" />
              </Button>
            </div>
            
            <Button 
              onClick={handleSendMessage}
              disabled={!newMessage.trim() || !isConnected}
              size="sm"
              className="p-2 bg-[#4ecdc4] hover:bg-[#26a69a] text-black disabled:opacity-50 disabled:hover:bg-[#4ecdc4] rounded-full flex-shrink-0"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}