import { useState, useEffect } from 'react'
import { Search, X, Circle, ArrowLeft, Users, Trash2 } from 'lucide-react'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar'
import { DmService } from '../services/dmService'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from './ui/alert_dialog'

interface Conversation {
  id: string
  name: string
  avatar: string
  lastMessage: string
  timestamp: string
  unreadCount: number
  isOnline: boolean
  userId: string
}

interface ChatPartner {
  id: string
  name: string
  avatar: string
  isOnline: boolean
  mutualFriends: number
}

interface DMListProps {
  isOpen: boolean
  onClose: () => void
  onOpenChat: (user: { id: string; name: string; avatar: string; isOnline: boolean; roomId: string }) => void
  authenticatedFetch: (url: string, options?: RequestInit) => Promise<Response>
  currentUserId: string | null
  getDmRooms: () => Promise<any>
  getOrCreateDmRoom: (userBId: string) => Promise<string>
  refreshTrigger?: number
}


export function DMList({ isOpen, onClose, onOpenChat, authenticatedFetch, currentUserId, getDmRooms, getOrCreateDmRoom, refreshTrigger }: DMListProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [showChatPartnerSelection, setShowChatPartnerSelection] = useState(false)
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [chatPartners, setChatPartners] = useState<ChatPartner[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [roomToDelete, setRoomToDelete] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const dmService = new DmService(authenticatedFetch)

  const filteredConversations = conversations.filter(conv => 
    conv.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const filteredChatPartners = chatPartners.filter(partner => 
    partner.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleConversationClick = (conversation: Conversation) => {
    console.log(`Opening conversation with ${conversation.name}`)
    
    onOpenChat({
      id: conversation.userId,
      name: conversation.name,
      avatar: conversation.avatar,
      isOnline: conversation.isOnline,
      roomId: conversation.id
    })
  }

  const handleNewMessageClick = () => {
    setShowChatPartnerSelection(true)
    setSearchQuery('')
  }

  const handleBackToConversations = () => {
    setShowChatPartnerSelection(false)
    setSearchQuery('')
  }

  const handleStartConversation = async (partner: ChatPartner) => {
    try {
      setLoading(true)
      const roomId = await getOrCreateDmRoom(partner.id)
      console.log(`Starting new conversation with ${partner.name}, room: ${roomId}`)
      
      onOpenChat({
        id: partner.id,
        name: partner.name,
        avatar: partner.avatar,
        isOnline: partner.isOnline,
        roomId: roomId
      })
      
      // Return to conversations view after starting
      setShowChatPartnerSelection(false)
      setSearchQuery('')
    } catch (error) {
      console.error('Error starting conversation:', error)
      setError('대화를 시작할 수 없습니다.')
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteDmRoom = (e: React.MouseEvent, roomId: string) => {
    e.stopPropagation()
    setRoomToDelete(roomId)
    setShowDeleteDialog(true)
  }

  const deleteDmRoom = async () => {
    if (!roomToDelete) return
    
    try {
      setIsDeleting(true)
      const response = await authenticatedFetch(
        `${import.meta.env.VITE_BACKEND_URL || 'http://localhost:8080'}/api/dmRooms/${roomToDelete}`,
        {
          method: 'DELETE'
        }
      )
      
      if (!response.ok) {
        throw new Error('DM 방 삭제 실패')
      }
      
      // Refresh the DM rooms list
      await loadDMRooms()
      
      // Close dialog and reset state
      setShowDeleteDialog(false)
      setRoomToDelete(null)
    } catch (error) {
      console.error('Error deleting DM room:', error)
      setError('채팅방을 삭제할 수 없습니다.')
    } finally {
      setIsDeleting(false)
    }
  }

  const cancelDelete = () => {
    setShowDeleteDialog(false)
    setRoomToDelete(null)
  }

  // Load DM rooms when component opens
  useEffect(() => {
    if (isOpen && currentUserId) {
      loadDMRooms()
      loadChatPartners()
    }
  }, [isOpen, currentUserId])

  // Refresh DM rooms when refreshTrigger changes
  useEffect(() => {
    console.log('DMList - refreshTrigger 변경 감지:', refreshTrigger);
    
    if (isOpen && currentUserId && refreshTrigger !== undefined && refreshTrigger > 0) {
      console.log('DMList - DM 방 목록 갱신 시작 - 트리거:', refreshTrigger);
      
      // 갱신 중 상태 표시 (UI에 로딩 상태 반영)
      setLoading(true);
      setError(null);
      
      // DM 방 목록 즉시 갱신
      loadDMRooms()
        .then(() => {
          console.log('✅ DM 방 목록 갱신 완료');
        })
        .catch(error => {
          console.error('❌ DM 방 목록 갱신 실패:', error);
        });
    }
  }, [refreshTrigger, isOpen, currentUserId]);

  const loadDMRooms = async () => {
    try {
      setLoading(true)
      setError(null)
      const rooms = await getDmRooms()
      
      // Convert DM rooms to conversations
      const conversationList: Conversation[] = rooms.map((room: any) => {
        const otherUser = room.senderId === currentUserId ? 
          { id: room.receiverId, name: room.receiverName, avatar: '', isOnline: false } : 
          { id: room.senderId, name: room.senderName, avatar: '', isOnline: false }
        const formatTimestamp = (dateString: string) => {
          const date = new Date(dateString)
          const now = new Date()
          const diff = now.getTime() - date.getTime()
          const minutes = Math.floor(diff / (1000 * 60))
          const hours = Math.floor(diff / (1000 * 60 * 60))
          const days = Math.floor(diff / (1000 * 60 * 60 * 24))
        
          if (minutes < 1) return '방금 전'
          if (minutes < 60) return `${minutes}분 전`
          if (hours < 24) return `${hours}시간 전`
          if (days === 1) return '어제'
          return `${days}일 전`
        }
        
        return {
          id: room.id,
          userId: otherUser?.id || '',
          name: otherUser?.name || '알 수 없는 사용자',
          avatar: otherUser?.avatar || '',
          lastMessage: room.lastMessage || '아직 메시지가 없습니다',
          timestamp: room.lastMessage ? formatTimestamp(room.createdAt) : formatTimestamp(room.createdAt),
          unreadCount: room.newMessageCount || 0,
          isOnline: otherUser?.isOnline || false
        }
      })
      
      setConversations(conversationList)
    } catch (error) {
      console.error('Error loading DM rooms:', error)
      setError('대화 목록을 불러올 수 없습니다.')
    } finally {
      setLoading(false)
    }
  }

  const loadChatPartners = async () => {
    if (!currentUserId) return
    
    try {
      const followList = await dmService.getFollowing(currentUserId)
      
      // Convert follow list to chat partners
      const partnerList: ChatPartner[] = followList.map(follow => ({
        id: follow.id,
        name: follow.name || '알 수 없는 사용자',
        avatar: follow.profileImage || '',
        isOnline: false, // TODO: Get online status from backend
        mutualFriends: 0 // TODO: Calculate mutual follows if needed
      }))
      
      setChatPartners(partnerList)
    } catch (error) {
      console.error('Error loading chat partners:', error)
      // Don't set error for chat partners loading failure to avoid interference with DM list
    }
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
            {showChatPartnerSelection && (
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
              {showChatPartnerSelection ? '대화상대 선택' : '메시지'}
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
              placeholder={showChatPartnerSelection ? "대화상대 검색..." : "대화상대 검색..."}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-12 px-4 text-base bg-white/5 border-white/20 focus:border-[#4ecdc4]"
            />
          </div>
        </div>
        
        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {showChatPartnerSelection ? (
            // Chat Partner Selection View
            <>
              {filteredChatPartners.length === 0 ? (
                <div className="flex items-center justify-center h-full text-white/60">
                  {searchQuery ? '검색 결과가 없습니다' : '대화상대가 없습니다'}
                </div>
              ) : (
                <div className="space-y-1 p-2">
                  {filteredChatPartners.map((partner) => (
                    <div
                      key={partner.id}
                      onClick={() => handleStartConversation(partner)}
                      className="flex items-center space-x-3 p-3 rounded-lg hover:bg-white/5 cursor-pointer transition-colors"
                    >
                      {/* Avatar with Online Status */}
                      <div className="relative flex-shrink-0">
                        <Avatar className="h-14 w-14">
                          <AvatarImage src={partner.avatar} />
                          <AvatarFallback className="bg-[#4ecdc4] text-black">
                            {partner.name.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        {partner.isOnline && (
                          <Circle className="absolute -bottom-0.5 -right-0.5 w-5 h-5 text-green-500 fill-current bg-background rounded-full" />
                        )}
                      </div>
                      
                      {/* Partner Info */}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{partner.name}</p>
                        <p className="text-sm text-white/60">
                          공통 팔로우 {partner.mutualFriends}명
                        </p>
                      </div>
                      
                      {/* Online Status Text */}
                      <div className="text-xs text-white/60 flex-shrink-0">
                        {partner.isOnline ? '온라인' : '오프라인'}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : (
            // Conversations List View
            <>
              {loading && (
                <div className="flex items-center justify-center h-full text-white/60">
                  대화 목록을 불러오는 중...
                </div>
              )}
              {error && (
                <div className="flex items-center justify-center h-full text-red-400">
                  {error}
                </div>
              )}
              {!loading && !error && filteredConversations.length === 0 && (
                <div className="flex items-center justify-center h-full text-white/60">
                  {searchQuery ? '검색 결과가 없습니다' : '대화가 없습니다'}
                </div>
              )}
              {!loading && !error && filteredConversations.length > 0 && (
                <div className="space-y-1 p-2">
                  {filteredConversations.map((conversation) => (
                    <div
                      key={conversation.id}
                      onClick={() => handleConversationClick(conversation)}
                      className="group flex items-start space-x-3 p-3 rounded-lg hover:bg-white/5 cursor-pointer transition-colors relative"
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
                      
                      {/* Delete Button - Only visible on hover */}
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => handleDeleteDmRoom(e, conversation.id)}
                          className="p-2 hover:bg-red-500/20 text-white/60 hover:text-red-400"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
        
        {/* Footer */}
        {!showChatPartnerSelection && (
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
      
      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent className="bg-[#1a1a1a] border-white/20">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">채팅방 나가기</AlertDialogTitle>
            <AlertDialogDescription className="text-white/70">
              채팅방을 나가시겠습니까? 나가면 다시 볼 수 없습니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel 
              onClick={cancelDelete}
              className="bg-white/10 border-white/20 text-white hover:bg-white/20"
            >
              취소
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={deleteDmRoom}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {isDeleting ? '삭제 중...' : '나가기'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}