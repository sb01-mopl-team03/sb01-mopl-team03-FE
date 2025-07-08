import React, { useState } from 'react'
import { X, Camera, Check } from 'lucide-react'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar'

interface ProfileModalProps {
  isOpen: boolean
  onClose: () => void
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

export function ProfileModal({ isOpen, onClose }: ProfileModalProps) {
  const [selectedAvatar, setSelectedAvatar] = useState(0)
  const [name, setName] = useState('김모플')
  const [email] = useState('user@moplay.kr')
  const [showAvatarPicker, setShowAvatarPicker] = useState(false)

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
            <Label htmlFor="password" className="text-sm">새 비밀번호</Label>
            <Input
              id="password"
              type="password"
              placeholder="변경하려면 입력하세요"
              className="mt-1 h-12 px-4 text-base bg-white/5 border-white/20 focus:border-[#4ecdc4]"
            />
          </div>
        </div>
        
        {/* Actions */}
        <div className="flex space-x-3 mt-8">
          <Button
            variant="outline"
            className="flex-1 border-white/20 hover:bg-white/5"
            onClick={onClose}
          >
            취소
          </Button>
          <Button
            className="flex-1 teal-gradient hover:opacity-80 text-black"
            onClick={onClose}
          >
            저장
          </Button>
        </div>
      </div>
    </div>
  )
}