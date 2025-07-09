import { useState } from 'react'
import { Search, X, Circle, ArrowLeft, Users } from 'lucide-react'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar'

interface Conversation {
  id: string
  name: string
  avatar: string
  lastMessage: string
  timestamp: string
  unreadCount: number
  isOnline: boolean
}

interface Friend {
  id: string
  name: string
  avatar: string
  isOnline: boolean
  mutualFriends: number
}

interface DMListProps {
  isOpen: boolean
  onClose: () => void
  onOpenChat: (user: { id: string; name: string; avatar: string; isOnline: boolean }) => void
}


export function DMList({ isOpen, onClose, onOpenChat }: DMListProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [showFriendSelection, setShowFriendSelection] = useState(false)

  const filteredConversations: Conversation[] = []

  const filteredFriends: Friend[] = []

  const handleConversationClick = (conversation: Conversation) => {
    // ========== API INTEGRATION POINT - START ==========
    // TODO: Replace with actual API call to open conversation
    // Example: await openConversation(conversation.id)
    console.log(`Opening conversation with ${conversation.name}`)
    // ========== API INTEGRATION POINT - END ==========
    
    onOpenChat({
      id: conversation.id,
      name: conversation.name,
      avatar: conversation.avatar,
      isOnline: conversation.isOnline
    })
  }

  const handleNewMessageClick = () => {
    setShowFriendSelection(true)
    setSearchQuery('')
  }

  const handleBackToConversations = () => {
    setShowFriendSelection(false)
    setSearchQuery('')
  }

  const handleStartConversation = (friend: Friend) => {
    // ========== API INTEGRATION POINT - START ==========
    // TODO: Replace with actual API call to start new conversation
    // Example: await startNewConversation(friend.id)
    console.log(`Starting new conversation with ${friend.name}`)
    // ========== API INTEGRATION POINT - END ==========
    
    onOpenChat({
      id: friend.id,
      name: friend.name,
      avatar: friend.avatar,
      isOnline: friend.isOnline
    })
    
    // Return to conversations view after starting
    setShowFriendSelection(false)
    setSearchQuery('')
  }

  if (!isOpen) return null

  return (
    <div className="fixed bottom-20 right-6 w-96 h-[520px] z-50 animate-in slide-in-from-bottom-5 fade-in duration-200">
      <div className="rounded-2xl border border-white/20 h-full flex flex-col" style={{
        backdropFilter: 'blur(12px)',
        background: 'rgba(26, 26, 26, 0.85)'
      }}>
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-white/10">
          <div className="flex items-center space-x-3">
            {showFriendSelection && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={handleBackToConversations}
                className="p-1 hover:bg-white/10"
              >
                <ArrowLeft className="w-4 h-4" />
              </Button>
            )}
            <h3 className="text-lg gradient-text">
              {showFriendSelection ? '친구 선택' : '메시지'}
            </h3>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose} className="p-2 hover:bg-white/10">
            <X className="w-5 h-5" />
          </Button>
        </div>
        
        {/* Search */}
        <div className="p-5 border-b border-white/10">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/40 w-5 h-5" />
            <Input
              placeholder={showFriendSelection ? "친구 검색..." : "대화상대 검색..."}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-12 px-4 text-base bg-white/5 border-white/20 focus:border-[#4ecdc4]"
            />
          </div>
        </div>
        
        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {showFriendSelection ? (
            // Friend Selection View
            <>
              {filteredFriends.length === 0 ? (
                <div className="flex items-center justify-center h-full text-white/60">
                  {searchQuery ? '검색 결과가 없습니다' : '친구가 없습니다'}
                </div>
              ) : (
                <div className="space-y-1 p-2">
                  {filteredFriends.map((friend) => (
                    <div
                      key={friend.id}
                      onClick={() => handleStartConversation(friend)}
                      className="flex items-center space-x-3 p-3 rounded-lg hover:bg-white/5 cursor-pointer transition-colors"
                    >
                      {/* Avatar with Online Status */}
                      <div className="relative flex-shrink-0">
                        <Avatar className="h-14 w-14">
                          <AvatarImage src={friend.avatar} />
                          <AvatarFallback className="bg-[#4ecdc4] text-black">
                            {friend.name.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        {friend.isOnline && (
                          <Circle className="absolute -bottom-0.5 -right-0.5 w-5 h-5 text-green-500 fill-current bg-background rounded-full" />
                        )}
                      </div>
                      
                      {/* Friend Info */}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{friend.name}</p>
                        <p className="text-sm text-white/60">
                          공통 친구 {friend.mutualFriends}명
                        </p>
                      </div>
                      
                      {/* Online Status Text */}
                      <div className="text-xs text-white/60 flex-shrink-0">
                        {friend.isOnline ? '온라인' : '오프라인'}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : (
            // Conversations List View
            <>
              {filteredConversations.length === 0 ? (
                <div className="flex items-center justify-center h-full text-white/60">
                  {searchQuery ? '검색 결과가 없습니다' : '대화가 없습니다'}
                </div>
              ) : (
                <div className="space-y-1 p-2">
                  {filteredConversations.map((conversation) => (
                    <div
                      key={conversation.id}
                      onClick={() => handleConversationClick(conversation)}
                      className="flex items-start space-x-3 p-3 rounded-lg hover:bg-white/5 cursor-pointer transition-colors"
                    >
                      {/* Avatar with Online Status */}
                      <div className="relative flex-shrink-0">
                        <Avatar className="h-14 w-14">
                          <AvatarImage src={conversation.avatar} />
                          <AvatarFallback className="bg-[#4ecdc4] text-black">
                            {conversation.name.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        {conversation.isOnline && (
                          <Circle className="absolute -bottom-0.5 -right-0.5 w-5 h-5 text-green-500 fill-current bg-background rounded-full" />
                        )}
                      </div>
                      
                      {/* Conversation Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <p className="truncate font-medium">{conversation.name}</p>
                          <span className="text-xs text-white/60 flex-shrink-0 ml-2">{conversation.timestamp}</span>
                        </div>
                        
                        {/* Message content and unread badge on same line */}
                        <div className="flex items-center justify-between">
                          <p className="text-sm text-white/60 truncate flex-1 mr-2">{conversation.lastMessage}</p>
                          
                          {/* Unread Badge - Moved to same line as message */}
                          {conversation.unreadCount > 0 && (
                            <div className="bg-[#4ecdc4] text-black text-xs font-medium rounded-full w-5 h-5 flex items-center justify-center flex-shrink-0">
                              {conversation.unreadCount > 9 ? '9+' : conversation.unreadCount}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
        
        {/* Footer */}
        {!showFriendSelection && (
          <div className="p-5 border-t border-white/10">
            <Button 
              onClick={handleNewMessageClick}
              className="w-full h-10 teal-gradient hover:opacity-80 text-black"
            >
              <Users className="w-5 h-5 mr-2" />
              새 메시지
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}