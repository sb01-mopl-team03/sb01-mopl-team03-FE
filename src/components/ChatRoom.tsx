import React, { useState, useRef, useEffect } from 'react'
import { ArrowLeft, Send, Image, Smile, X } from 'lucide-react'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar'
import { ScrollArea } from './ui/scroll-area'

interface Message {
  id: number
  senderId: number
  senderName: string
  content: string
  timestamp: string
  type: 'text' | 'image'
  isOwnMessage: boolean
}

interface ChatUser {
  id: number
  name: string
  avatar: string
  isOnline: boolean
}

interface ChatRoomProps {
  isOpen: boolean
  onClose: () => void
  onBack: () => void
  user: ChatUser | null
}

// ========== TEMPORARY MOCK DATA - START ==========
const mockMessages: Message[] = [
  {
    id: 1,
    senderId: 2,
    senderName: '김민수',
    content: '안녕하세요! 오늘 저녁에 영화 볼까요?',
    timestamp: '오후 2:30',
    type: 'text',
    isOwnMessage: false
  },
  {
    id: 2,
    senderId: 1,
    senderName: '나',
    content: '좋아요! 어떤 영화 보실 생각이에요?',
    timestamp: '오후 2:32',
    type: 'text',
    isOwnMessage: true
  },
  {
    id: 3,
    senderId: 2,
    senderName: '김민수',
    content: '듄: 파트 투 어떠세요? 평점도 좋고 액션도 괜찮더라고요',
    timestamp: '오후 2:33',
    type: 'text',
    isOwnMessage: false
  },
  {
    id: 4,
    senderId: 1,
    senderName: '나',
    content: '완벽해요! 몇 시에 시작할까요?',
    timestamp: '오후 2:35',
    type: 'text',
    isOwnMessage: true
  },
  {
    id: 5,
    senderId: 2,
    senderName: '김민수',
    content: '8시 정도가 어떠세요? 저녁도 먹고 여유롭게',
    timestamp: '오후 2:36',
    type: 'text',
    isOwnMessage: false
  },
  {
    id: 6,
    senderId: 1,
    senderName: '나',
    content: '좋습니다! 그럼 오늘 8시에 만나요 🎬',
    timestamp: '오후 2:37',
    type: 'text',
    isOwnMessage: true
  }
]

const currentUser = {
  id: 1,
  name: '사용자',
  avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150'
}
// ========== TEMPORARY MOCK DATA - END ==========

export function ChatRoom({ isOpen, onClose, onBack, user }: ChatRoomProps) {
  const [messages, setMessages] = useState<Message[]>(mockMessages)
  const [newMessage, setNewMessage] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

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

  const handleSendMessage = () => {
    if (!newMessage.trim() || !user) return

    const message: Message = {
      id: messages.length + 1,
      senderId: currentUser.id,
      senderName: currentUser.name,
      content: newMessage.trim(),
      timestamp: new Date().toLocaleTimeString('ko-KR', { 
        hour: 'numeric', 
        minute: '2-digit',
        hour12: true 
      }),
      type: 'text',
      isOwnMessage: true
    }

    // ========== API INTEGRATION POINT - START ==========
    // TODO: Replace with actual API call to send message
    // Example: await sendMessage({
    //   recipientId: user.id,
    //   content: newMessage.trim(),
    //   type: 'text'
    // })
    console.log('Sending message:', message)
    // ========== API INTEGRATION POINT - END ==========

    setMessages(prev => [...prev, message])
    setNewMessage('')

    // Simulate typing indicator and response (for demo)
    setIsTyping(true)
    setTimeout(() => {
      setIsTyping(false)
      const response: Message = {
        id: messages.length + 2,
        senderId: user.id,
        senderName: user.name,
        content: '메시지를 받았습니다! 👍',
        timestamp: new Date().toLocaleTimeString('ko-KR', { 
          hour: 'numeric', 
          minute: '2-digit',
          hour12: true 
        }),
        type: 'text',
        isOwnMessage: false
      }
      setMessages(prev => [...prev, response])
    }, 2000)
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