import { useState, useEffect } from 'react'
import { Users, Play, Globe, Lock } from 'lucide-react'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Switch } from './ui/switch'
import { Label } from './ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog'

interface WatchPartyConfirmationProps {
  isOpen: boolean
  onClose: () => void
  onCreateWatchParty: (config: WatchPartyConfig) => void
  onWatchAlone: () => void
  content: {
    id: number
    title: string
    thumbnail: string
    type: 'movie' | 'drama' | 'sports'
    duration: string
    description: string
  } | null
}

interface WatchPartyConfig {
  isPublic: boolean
  roomName: string
}

export function WatchPartyConfirmation({ 
  isOpen, 
  onClose, 
  onCreateWatchParty, 
  onWatchAlone,
  content 
}: WatchPartyConfirmationProps) {
  const [isPublic, setIsPublic] = useState(false)
  const [roomName, setRoomName] = useState('')

  useEffect(() => {
    if (content && isOpen) {
      setRoomName(`${content.title} 시청방`)
    }
  }, [content, isOpen])

  const handleCreateWatchParty = () => {
    const config: WatchPartyConfig = {
      isPublic,
      roomName: roomName || `${content?.title} 시청방`
    }
    onCreateWatchParty(config)
  }

  if (!content) return null

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-sm-compact bg-[#1a1a1a] border-white/20">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Users className="w-5 h-5 text-[#4ecdc4]" />
            <span>시청 방식을 선택해주세요</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Content Info */}
          <div className="p-4 bg-white/5 rounded-lg">
            <div className="flex items-center space-x-3">
              <div className="w-16 h-16 rounded-lg overflow-hidden bg-[#4ecdc4]/20 flex items-center justify-center">
                <img 
                  src={content.thumbnail} 
                  alt={content.title}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement
                    target.style.display = 'none'
                    target.parentElement!.innerHTML = `
                      <div class="w-full h-full flex items-center justify-center text-[#4ecdc4]">
                        <svg class="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                          <path fill-rule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clip-rule="evenodd" />
                        </svg>
                      </div>
                    `
                  }}
                />
              </div>
              <div className="flex-1">
                <h3 className="font-medium mb-1">{content.title}</h3>
                <p className="text-sm text-white/60">{content.duration}</p>
                <p className="text-xs text-white/40 line-clamp-2">{content.description}</p>
              </div>
            </div>
          </div>

          {/* Watch Options */}
          <div className="space-y-4">
            {/* Watch Alone */}
            <Button
              onClick={onWatchAlone}
              variant="outline"
              className="w-full justify-start border-white/20 hover:bg-white/5 h-auto p-4"
            >
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
                  <Play className="w-5 h-5" />
                </div>
                <div className="text-left">
                  <div className="font-medium">혼자 시청하기</div>
                  <div className="text-xs text-white/60">바로 재생을 시작합니다</div>
                </div>
              </div>
            </Button>

            {/* Create Watch Party */}
            <div className="space-y-4">
              <div className="flex items-center space-x-3 p-4 border border-[#4ecdc4]/30 rounded-lg bg-[#4ecdc4]/5">
                <div className="w-10 h-10 rounded-full bg-[#4ecdc4]/20 flex items-center justify-center">
                  <Users className="w-5 h-5 text-[#4ecdc4]" />
                </div>
                <div className="flex-1">
                  <div className="font-medium text-[#4ecdc4]">같이 시청하기</div>
                  <div className="text-xs text-white/60">친구들과 실시간으로 시청하며 채팅하세요</div>
                </div>
              </div>

              {/* Watch Party Settings - balanced padding */}
              <div className="space-y-5 px-4">
                {/* Room Name */}
                <div className="space-y-2">
                  <Label htmlFor="roomName" className="text-sm">방 이름</Label>
                  <Input
                    id="roomName"
                    value={roomName}
                    onChange={(e) => setRoomName(e.target.value)}
                    placeholder="시청방 이름을 입력하세요"
                    className="h-11 px-3 text-sm bg-white/5 border-white/20 focus:border-[#4ecdc4]"
                  />
                </div>

                {/* Settings Grid */}
                <div className="grid grid-cols-1 gap-5">
                  {/* Public/Private - fixed toggle alignment */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      {isPublic ? 
                        <Globe className="w-4 h-4 text-green-400" /> : 
                        <Lock className="w-4 h-4 text-gray-400" />
                      }
                      <div>
                        <Label htmlFor="isPublic" className="text-sm">
                          {isPublic ? '공개방' : '비공개방'}
                        </Label>
                        <p className="text-xs text-white/60">
                          {isPublic ? '누구나 참여 가능' : '초대받은 사람만 참여'}
                        </p>
                      </div>
                    </div>
                    <div className="scale-105 flex-shrink-0">
                      <Switch
                        id="isPublic"
                        checked={isPublic}
                        onCheckedChange={setIsPublic}
                      />
                    </div>
                  </div>
                </div>

                {/* Create Button - reduced size */}
                <Button
                  onClick={handleCreateWatchParty}
                  className="w-full teal-gradient hover:opacity-80 text-black h-12 text-sm"
                  disabled={!roomName.trim()}
                >
                  <Users className="w-4 h-4 mr-2" />
                  시청방 만들기
                </Button>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}