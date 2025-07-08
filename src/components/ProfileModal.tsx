import React, { useState, useEffect } from 'react'
import { X, Camera, Check } from 'lucide-react'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar'

interface UserData {
  email: string
  name: string
  role?: string
  isLocked?: boolean
  profileImage?: string
}

interface ProfileModalProps {
  isOpen: boolean
  onClose: () => void
  userId?: string | null // 사용자 ID 추가
}

const avatarOptions = [
  'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop&crop=face',
  'https://images.unsplash.com/photo-1494790108755-2616b612b3be?w=100&h=100&fit=crop&crop=face',
  'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&crop=face',
  'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop&crop=face',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=face',
  'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=100&h=100&fit=crop&crop=face',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop&crop=face',
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop&crop=face'
]

export function ProfileModal({ isOpen, onClose, userId }: ProfileModalProps) {
  const [selectedAvatar, setSelectedAvatar] = useState(0)
  const [name, setName] = useState('김모플')
  const [email, setEmail] = useState('user@moplay.kr')
  const [showAvatarPicker, setShowAvatarPicker] = useState(false)
  const [password, setPassword] = useState('') // 비밀번호 상태 추가
  const [isLoading, setIsLoading] = useState(false) // 로딩 상태 추가
  const [error, setError] = useState<string | null>(null) // 오류 상태 추가
  const [userData, setUserData] = useState<UserData | null>(null) // 사용자 데이터 상태 추가

  // 사용자 정보 가져오기
  useEffect(() => {
    if (isOpen) {
      setError(null) // 모달 열 때 에러 상태 초기화
      if (userId) {
        fetchUserData()
      } else {
        setError('사용자 정보가 없습니다. 다시 로그인해주세요.')
      }
    }
  }, [isOpen, userId])

  const fetchUserData = async () => {
    try {
      //실제 구현에서는 사용자 정보를 가져오는 API 호출
      const response = await fetch(`/api/users/${userId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        }
      })
      if (!response.ok) throw new Error('사용자 정보를 가져오는데 실패했습니다.')
      const data = await response.json()
      setUserData(data)
      setName(data.name)
      setEmail(data.email)
      
      // // 임시 데이터 로딩 (API 연동 전까지)
      // setName('김모플')
      // setEmail('user@moplay.kr')
    } catch (error) {
      console.error('사용자 정보 로딩 오류:', error)
      setError('사용자 정보를 가져오는데 실패했습니다.')
    }
  }

  const handleSaveProfile = async () => {
    setIsLoading(true)
    setError(null)
    
    try {
      // API에서 newPassword는 필수이므로 비밀번호가 비어있는 경우 에러 표시
      if (!password) {
        setError('새 비밀번호를 입력해주세요.')
        setIsLoading(false)
        return
      }
      
      // 사용자 ID가 없는 경우 에러 표시
      if (!userId) {
        setError('사용자 정보가 없습니다. 다시 로그인해주세요.')
        setIsLoading(false)
        return
      }
      
      // 요청 본문 생성
      const requestBody = {
        newName: name,
        newPassword: password,
      }
      
      // 회원정보 수정 API 호출
      const response = await fetch(`/api/users/${userId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        },
        body: JSON.stringify(requestBody)
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || '프로필 업데이트에 실패했습니다.')
      }
      
      // 성공적으로 업데이트 완료
      const updatedUserData = await response.json()
      setUserData(updatedUserData)
      setName(updatedUserData.name)
      setEmail(updatedUserData.email)
      
      // 비밀번호 필드 초기화
      setPassword('')
      
      // 모달 닫기
      onClose()
    } catch (error) {
      console.error('프로필 업데이트 오류:', error)
      setError(error instanceof Error ? error.message : '프로필 업데이트 중 오류가 발생했습니다.')
    } finally {
      setIsLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative w-full max-w-md bg-card rounded-2xl glass-effect border border-white/20 p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl gradient-text">프로필 관리</h2>
          <Button variant="ghost" size="sm" onClick={onClose} className="p-2 hover:bg-white/10">
            <X className="w-5 h-5" />
          </Button>
        </div>
        
        {/* 에러 메시지 */}
        {error && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
            {error}
          </div>
        )}
        
        {/* Avatar Section */}
        <div className="flex flex-col items-center mb-6">
          <div className="relative">
            <Avatar className="h-20 w-20 mb-4">
              <AvatarImage src={avatarOptions[selectedAvatar]} />
              <AvatarFallback className="bg-[#4ecdc4] text-black text-xl">
                {name.charAt(0)}
              </AvatarFallback>
            </Avatar>
            
            <Button
              variant="ghost"
              size="sm"
              className="absolute -bottom-2 -right-2 p-2 bg-[#4ecdc4] hover:bg-[#26a69a] text-black rounded-full"
              onClick={() => setShowAvatarPicker(!showAvatarPicker)}
            >
              <Camera className="w-4 h-4" />
            </Button>
          </div>
          
          {/* Avatar Picker */}
          {showAvatarPicker && (
            <div className="w-full p-4 bg-black/20 rounded-lg border border-white/10 mb-4">
              <p className="text-sm text-white/80 mb-3">프로필 사진 선택</p>
              <div className="grid grid-cols-4 gap-2">
                {avatarOptions.map((avatar, index) => (
                  <button
                    key={index}
                    onClick={() => {
                      setSelectedAvatar(index)
                      setShowAvatarPicker(false)
                    }}
                    className={`relative rounded-full overflow-hidden transition-all duration-200 w-12 h-12 flex-shrink-0 ${
                      selectedAvatar === index 
                        ? 'ring-2 ring-[#4ecdc4] scale-110' 
                        : 'hover:scale-105'
                    }`}
                  >
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={avatar} />
                      <AvatarFallback>U</AvatarFallback>
                    </Avatar>
                    {selectedAvatar === index && (
                      <div className="absolute inset-0 bg-[#4ecdc4]/20 flex items-center justify-center">
                        <Check className="w-4 h-4 text-[#4ecdc4]" />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
        
        {/* Form Fields */}
        <div className="space-y-4">
          <div>
            <Label htmlFor="name" className="text-sm">이름</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 h-12 px-4 text-base bg-white/5 border-white/20 focus:border-[#4ecdc4]"
            />
          </div>
          
          <div>
            <Label htmlFor="email" className="text-sm">이메일</Label>
            <Input
              id="email"
              value={email}
              disabled
              className="mt-1 h-12 px-4 text-base bg-white/5 border-white/20 text-white/60"
            />
          </div>
          
          <div>
            <Label htmlFor="password" className="text-sm flex items-center">
              새 비밀번호
              <span className="text-red-400 ml-1">*</span>
            </Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="변경하려면 입력하세요"
              className="mt-1 h-12 px-4 text-base bg-white/5 border-white/20 focus:border-[#4ecdc4]"
              required
            />
            <p className="text-xs text-white/60 mt-1">API 요구사항에 따라 비밀번호 입력은 필수입니다.</p>
          </div>
        </div>
        
        {/* Actions */}
        <div className="flex space-x-3 mt-8">
          <Button
            variant="outline"
            className="flex-1 border-white/20 hover:bg-white/5"
            onClick={onClose}
            disabled={isLoading}
          >
            취소
          </Button>
          <Button
            className="flex-1 teal-gradient hover:opacity-80 text-black"
            onClick={handleSaveProfile}
            disabled={isLoading || !userId}
          >
            {isLoading ? '저장 중...' : '저장'}
          </Button>
        </div>
      </div>
    </div>
  )
}