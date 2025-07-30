import { useState } from 'react'
import { X, Lock, Globe, Check } from 'lucide-react'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Label } from './ui/label'

interface PlaylistCreationModalProps {
  isOpen: boolean
  onClose: () => void
  onCreatePlaylist: (playlistData: {
    title: string
    description: string
    isPublic: boolean
    coverImage: string | null
  }) => void
}

export function PlaylistCreationModal({ isOpen, onClose, onCreatePlaylist }: PlaylistCreationModalProps) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [isPublic, setIsPublic] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!title.trim()) return

    setIsSubmitting(true)

    // ========== API INTEGRATION POINT - START ==========
    // TODO: Replace with actual API call to create playlist
    // Example: await createPlaylist({
    //   title: title.trim(),
    //   description: description.trim(),
    //   isPublic,
    //   coverImage: coverImageOptions[selectedCoverImage]
    // })
    console.log('Creating playlist:', {
      title: title.trim(),
      description: description.trim(),
      isPublic,
      coverImage: null
    })
    // ========== API INTEGRATION POINT - END ==========

    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 1000))

    onCreatePlaylist({
      title: title.trim(),
      description: description.trim(),
      isPublic,
      coverImage: null
    })

    // Reset form
    setTitle('')
    setDescription('')
    setIsPublic(true)
    setIsSubmitting(false)
    
    onClose()
  }

  const handleClose = () => {
    if (isSubmitting) return
    
    // Reset form when closing
    setTitle('')
    setDescription('')
    setIsPublic(true)
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={handleClose}
      />
      
      {/* Modal */}
      <div className="relative w-full max-w-lg bg-card rounded-2xl glass-effect border border-white/20 p-6 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl gradient-text">새 플레이리스트 만들기</h2>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={handleClose} 
            className="p-2 hover:bg-white/10"
            disabled={isSubmitting}
          >
            <X className="w-5 h-5" />
          </Button>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Title */}
          <div>
            <Label htmlFor="title" className="text-sm">플레이리스트 제목 *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="예: 최고의 액션 영화"
              className="mt-1 h-12 px-4 text-base bg-white/5 border-white/20 focus:border-[#4ecdc4]"
              maxLength={50}
              required
            />
            <div className="text-xs text-white/60 mt-1">
              {title.length}/50자
            </div>
          </div>
          
          {/* Privacy Settings */}
          <div className="space-y-3">
            <Label className="text-sm">공개 설정</Label>
            
            <div className="space-y-3">
              {/* Public Option */}
              <div 
                className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors ${
                  isPublic 
                    ? 'border-[#4ecdc4] bg-[#4ecdc4]/5' 
                    : 'border-white/20 hover:bg-white/5'
                }`}
                onClick={() => setIsPublic(true)}
              >
                <div className="flex items-center space-x-3">
                  <div className={`p-2 rounded-full ${isPublic ? 'bg-[#4ecdc4]/20' : 'bg-white/10'}`}>
                    <Globe className={`w-4 h-4 ${isPublic ? 'text-[#4ecdc4]' : 'text-white/60'}`} />
                  </div>
                  <div>
                    <p className="font-medium">공개</p>
                    <p className="text-xs text-white/60">모든 사용자가 볼 수 있습니다</p>
                  </div>
                </div>
                <div className={`w-4 h-4 rounded-full border-2 ${
                  isPublic ? 'bg-[#4ecdc4] border-[#4ecdc4]' : 'border-white/40'
                }`}>
                  {isPublic && <Check className="w-full h-full text-black p-0.5" />}
                </div>
              </div>
              
              {/* Private Option */}
              <div 
                className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors ${
                  !isPublic 
                    ? 'border-[#4ecdc4] bg-[#4ecdc4]/5' 
                    : 'border-white/20 hover:bg-white/5'
                }`}
                onClick={() => setIsPublic(false)}
              >
                <div className="flex items-center space-x-3">
                  <div className={`p-2 rounded-full ${!isPublic ? 'bg-[#4ecdc4]/20' : 'bg-white/10'}`}>
                    <Lock className={`w-4 h-4 ${!isPublic ? 'text-[#4ecdc4]' : 'text-white/60'}`} />
                  </div>
                  <div>
                    <p className="font-medium">비공개</p>
                    <p className="text-xs text-white/60">나만 볼 수 있습니다</p>
                  </div>
                </div>
                <div className={`w-4 h-4 rounded-full border-2 ${
                  !isPublic ? 'bg-[#4ecdc4] border-[#4ecdc4]' : 'border-white/40'
                }`}>
                  {!isPublic && <Check className="w-full h-full text-black p-0.5" />}
                </div>
              </div>
            </div>
          </div>
          
          {/* Actions */}
          <div className="flex space-x-3 pt-4">
            <Button
              type="button"
              variant="outline"
              className="flex-1 border-white/20 hover:bg-white/5"
              onClick={handleClose}
              disabled={isSubmitting}
            >
              취소
            </Button>
            <Button
              type="submit"
              className="flex-1 teal-gradient hover:opacity-80 text-black"
              disabled={!title.trim() || isSubmitting}
            >
              {isSubmitting ? '생성 중...' : '플레이리스트 만들기'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}