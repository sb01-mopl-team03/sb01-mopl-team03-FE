import { Users, Eye, MessageCircle } from 'lucide-react'
import { Button } from './ui/button'
import { Badge } from './ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar'
import { ImageWithFallback } from './figma/ImageWithFallback'

interface LiveRoomCardProps {
  roomName: string
  contentTitle: string
  hostName: string
  hostAvatar?: string
  viewers: number
  messages: number
  thumbnail: string
  category: string
}

export function LiveRoomCard({
  roomName,
  contentTitle,
  hostName,
  hostAvatar,
  viewers,
  messages,
  thumbnail,
  category
}: LiveRoomCardProps) {
  return (
    <div className="group relative bg-card rounded-xl overflow-hidden glass-effect border border-white/10 transition-all duration-300 hover:scale-105 hover:border-[#4ecdc4]/50">
      {/* Thumbnail */}
      <div className="relative aspect-video overflow-hidden">
        <ImageWithFallback
          src={thumbnail}
          alt={contentTitle}
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
        />
        
        {/* Live Badge */}
        <Badge className="absolute top-2 left-2 bg-red-500 text-white animate-pulse">
          LIVE
        </Badge>
        
        {/* Viewer Count */}
        <div className="absolute top-2 right-2 flex items-center space-x-1 bg-black/60 rounded-full px-2 py-1">
          <Eye className="w-3 h-3 text-white" />
          <span className="text-xs text-white">{viewers}</span>
        </div>
        
        {/* Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
      </div>
      
      {/* Content */}
      <div className="p-4">
        {/* Category */}
        <Badge variant="secondary" className="mb-2 text-xs">
          {category}
        </Badge>
        
        {/* Room Name */}
        <h3 className="mb-1">{roomName}</h3>
        
        {/* Content Title */}
        <p className="text-sm text-white/60 mb-3">{contentTitle}</p>
        
        {/* Host Info */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <Avatar className="h-6 w-6">
              <AvatarImage src={hostAvatar} />
              <AvatarFallback className="bg-[#4ecdc4] text-black text-xs">
                {hostName.charAt(0)}
              </AvatarFallback>
            </Avatar>
            <span className="text-sm text-white/80">{hostName}</span>
          </div>
          
          <div className="flex items-center space-x-1">
            <MessageCircle className="w-4 h-4 text-white/60" />
            <span className="text-xs text-white/60">{messages}</span>
          </div>
        </div>
        
        {/* Stats */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-1 text-sm text-white/60">
            <Users className="w-4 h-4" />
            <span>{viewers}명 시청 중</span>
          </div>
          
          <Button size="sm" className="teal-gradient hover:opacity-80 text-black">
            참여하기
          </Button>
        </div>
      </div>
    </div>
  )
}