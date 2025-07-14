import React, { useState, useRef, useEffect } from 'react'
import { ArrowLeft, Send, Image, Smile, X } from 'lucide-react'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar'
import { ScrollArea } from './ui/scroll-area'
import { DmDto } from '../services/dmService'
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
  getDmMessages: (roomId: string, pagingDto?: { cursor?: string; size?: number }) => Promise<any>
}


export function ChatRoom({ isOpen, onClose, onBack, user, currentUserId, getDmMessages }: ChatRoomProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [isTyping] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  
  
  // WebSocket connection
  const { isConnected, sendMessage } = useDmWebSocket({
    roomId: user?.roomId || null,
    userId: currentUserId,
    onMessageReceived: (dmMessage: DmDto) => {
      const message: Message = {
        id: dmMessage.id,
        senderId: dmMessage.senderId,
        senderName: dmMessage.senderId === currentUserId ? '나' : user?.name || 'Unknown',
        content: dmMessage.content,
        timestamp: formatTimestamp(dmMessage.createdAt),
        type: 'text',
        isOwnMessage: dmMessage.senderId === currentUserId
      }
      setMessages(prev => [...prev, message])
    }
  })

  // Auto scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Focus input when chat opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isOpen])

  // Load messages when room changes
  useEffect(() => {
    if (user?.roomId) {
      loadMessages()
    }
  }, [user?.roomId])

  const formatTimestamp = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleTimeString('ko-KR', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    })
  }

  const loadMessages = async () => {
    if (!user?.roomId) return
    
    try {
      setLoading(true)
      setError(null)
      const response = await getDmMessages(user.roomId)
      
      const messageList: Message[] = response.data.map((dm: any) => ({
        id: dm.id,
        senderId: dm.senderId,
        senderName: dm.senderId === currentUserId ? '나' : user?.name || 'Unknown',
        content: dm.content,
        timestamp: formatTimestamp(dm.createdAt),
        type: 'text',
        isOwnMessage: dm.senderId === currentUserId
      }))
      
      setMessages(messageList)
    } catch (error) {
      console.error('Error loading messages:', error)
      setError('메시지를 불러올 수 없습니다.')
    } finally {
      setLoading(false)
    }
  }

  const handleSendMessage = () => {
    if (!newMessage.trim() || !user || !isConnected) return

    console.log('Sending message via WebSocket:', newMessage.trim())
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
                  {user.isOnline ? '온라인' : '오프라인'}
                </p>
              </div>
            </div>
          </div>

          {/* Only X button */}
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
          <ScrollArea className="h-full">
            <div className="p-4 space-y-4">
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
              {!loading && !error && messages.length === 0 && (
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
              disabled={!newMessage.trim()}
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