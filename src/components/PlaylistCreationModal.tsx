import { useState } from 'react'
import { X, Lock, Globe, Image as ImageIcon, Check, Palette } from 'lucide-react'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { Textarea } from './ui/textarea'

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

// Cover image options - null represents no image (gradient)
const coverImageOptions: (string | null)[] = [
  null, // No image - use gradient
  'https://images.unsplash.com/photo-1489599856621-6c0e9b89c2e4?w=400&h=225&fit=crop',
  'https://images.unsplash.com/photo-1605728515502-13b52fd77e03?w=400&h=225&fit=crop',
  'https://images.unsplash.com/photo-1551698618-1dfe5d97d256?w=400&h=225&fit=crop',
  'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=400&h=225&fit=crop',
  'https://images.unsplash.com/photo-1440404653325-ab127d49abc1?w=400&h=225&fit=crop',
  'https://images.unsplash.com/photo-1509347528160-9a9e33742cdb?w=400&h=225&fit=crop',
  'https://images.unsplash.com/photo-1518676590629-3dcbd9c5a5c9?w=400&h=225&fit=crop'
]

export function PlaylistCreationModal({ isOpen, onClose, onCreatePlaylist }: PlaylistCreationModalProps) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [isPublic, setIsPublic] = useState(true)
  const [selectedCoverImage, setSelectedCoverImage] = useState(0)
  const [showCoverPicker, setShowCoverPicker] = useState(false)
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
      coverImage: coverImageOptions[selectedCoverImage]
    })
    // ========== API INTEGRATION POINT - END ==========

    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 1000))

    onCreatePlaylist({
      title: title.trim(),
      description: description.trim(),
      isPublic,
      coverImage: coverImageOptions[selectedCoverImage]
    })

    // Reset form
    setTitle('')
    setDescription('')
    setIsPublic(true)
    setSelectedCoverImage(0)
    setShowCoverPicker(false)
    setIsSubmitting(false)
    
    onClose()
  }

  const handleClose = () => {
    if (isSubmitting) return
    
    // Reset form when closing
    setTitle('')
    setDescription('')
    setIsPublic(true)
    setSelectedCoverImage(0)
    setShowCoverPicker(false)
    onClose()
  }

  const renderCoverPreview = () => {
    const selectedCover = coverImageOptions[selectedCoverImage]
    
    if (selectedCover === null) {
      // Show gradient when no image is selected
      return (
        <div className="w-full h-full teal-gradient flex items-center justify-center">
          <div className="text-center text-black/80">
            <Palette className="w-8 h-8 mx-auto mb-2" />
            <p className="text-sm font-medium">테마 색상</p>
          </div>
        </div>
      )
    }
    
    return (
      <img
        src={selectedCover}
        alt="플레이리스트 커버"
        className="w-full h-full object-cover"
      />
    )
  }

  const renderCoverOption = (cover: string | null, index: number) => {
    if (cover === null) {
      // Gradient option
      return (
        <div className="w-full h-full teal-gradient flex items-center justify-center">
          <Palette className="w-3 h-3 text-black/80" />
        </div>
      )
    }
    
    return (
      <img
        src={cover}
        alt={`커버 옵션 ${index + 1}`}
        className="w-full h-full object-cover"
      />
    )
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
          {/* Cover Image Section */}
          <div>
            <Label className="text-sm mb-3 block">커버 이미지</Label>
            
            {/* Selected Cover Preview - Reduced size */}
            <div className="relative w-full h-32 rounded-lg overflow-hidden mb-3 bg-white/5 border border-white/10">
              {renderCoverPreview()}
              
              {/* Upload Button Overlay */}
              <div className="absolute inset-0 bg-black/50 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setShowCoverPicker(!showCoverPicker)}
                  className="bg-white/20 hover:bg-white/30 backdrop-blur-sm"
                >
                  <ImageIcon className="w-4 h-4 mr-2" />
                  {coverImageOptions[selectedCoverImage] === null ? '이미지 선택' : '이미지 변경'}
                </Button>
              </div>
            </div>
            
            {/* Cover Image Picker */}
            {showCoverPicker && (
              <div className="grid grid-cols-4 gap-2 p-3 bg-black/20 rounded-lg border border-white/10">
                {coverImageOptions.map((cover, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => {
                      setSelectedCoverImage(index)
                      setShowCoverPicker(false)
                    }}
                    className={`relative w-full h-16 rounded overflow-hidden transition-all duration-200 ${
                      selectedCoverImage === index 
                        ? 'ring-2 ring-[#4ecdc4] scale-105' 
                        : 'hover:scale-105'
                    }`}
                  >
                    {renderCoverOption(cover, index)}
                    {selectedCoverImage === index && (
                      <div className="absolute inset-0 bg-[#4ecdc4]/20 flex items-center justify-center">
                        <Check className="w-3 h-3 text-[#4ecdc4]" />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

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
          
          {/* Description */}
          <div>
            <Label htmlFor="description" className="text-sm">설명</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="플레이리스트에 대한 설명을 입력해주세요..."
              className="mt-1 bg-white/5 border-white/20 focus:border-[#4ecdc4] resize-none"
              rows={3}
              maxLength={200}
            />
            <div className="text-xs text-white/60 mt-1">
              {description.length}/200자
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