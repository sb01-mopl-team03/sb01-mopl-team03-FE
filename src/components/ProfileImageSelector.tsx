import React, { useState } from 'react'
import { Upload, X } from 'lucide-react'
import { Button } from './ui/button'
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar'
import { Input } from './ui/input'

interface ProfileImageSelectorProps {
  selectedImage: File | null
  onImageSelect: (image: File | null) => void
  onClose?: () => void
  userName?: string
}

export function ProfileImageSelector({ selectedImage, onImageSelect, onClose, userName }: ProfileImageSelectorProps) {
  const [error, setError] = useState<string | null>(null)

  // 파일 선택 핸들러
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    
    if (file) {
      // 이미지 파일인지 확인
      if (!file.type.startsWith('image/')) {
        setError('이미지 파일만 선택할 수 있습니다.')
        return
      }

      // 파일 크기 제한 (5MB)
      if (file.size > 5 * 1024 * 1024) {
        setError('파일 크기는 5MB 이하여야 합니다.')
        return
      }

      setError(null)
      onImageSelect(file)
    }
  }

  // 이미지 제거 핸들러
  const handleRemoveImage = () => {
    onImageSelect(null)
    setError(null)
  }

  return (
    <div className="w-full p-4 bg-black/20 rounded-lg border border-white/10">
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-white/80">프로필 사진 업로드</p>
        {onClose && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="p-1 hover:bg-white/10"
          >
            <X className="w-4 h-4" />
          </Button>
        )}
      </div>
      
      {error && (
        <div className="mb-4 p-2 bg-red-500/10 border border-red-500/30 rounded text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* 미리보기 */}
      {selectedImage && (
        <div className="flex justify-center mb-4">
          <div className="relative">
            <Avatar className="h-20 w-20">
              <AvatarImage src={URL.createObjectURL(selectedImage)} />
              <AvatarFallback className="bg-[#4ecdc4] text-black">
                {userName?.charAt(0) || 'U'}
              </AvatarFallback>
            </Avatar>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={handleRemoveImage}
              className="absolute -top-2 -right-2 p-1 h-6 w-6 rounded-full"
            >
              <X className="w-3 h-3" />
            </Button>
          </div>
        </div>
      )}

      {/* 파일 업로드 */}
      <div className="mb-4">
        <Input
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          className="hidden"
          id="profile-upload"
        />
        <label 
          htmlFor="profile-upload"
          className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-white/20 rounded-lg hover:border-[#4ecdc4]/50 cursor-pointer transition-colors"
        >
          <Upload className="w-8 h-8 text-white/40 mb-2" />
          <p className="text-sm text-white/60 text-center">
            {selectedImage ? '다른 이미지를 선택하려면 클릭하세요' : '이미지 파일을 선택하세요'}
          </p>
          <p className="text-xs text-white/40 mt-1">JPG, PNG, GIF (최대 5MB)</p>
        </label>
      </div>

      {/* 선택한 파일 정보 */}
      {selectedImage && (
        <div className="text-center">
          <p className="text-sm text-white/80">선택된 파일: {selectedImage.name}</p>
          <p className="text-xs text-white/60">크기: {(selectedImage.size / 1024 / 1024).toFixed(2)}MB</p>
        </div>
      )}
    </div>
  )
}