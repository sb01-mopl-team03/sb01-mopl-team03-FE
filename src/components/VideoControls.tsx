import { useState, useEffect, useRef } from 'react'
import { 
  Play, 
  Pause, 
  Volume2, 
  VolumeX, 
  Volume1,
  Maximize, 
  Minimize,
  Settings,
  Crown,
  SkipBack,
  SkipForward
} from 'lucide-react'
import { Button } from './ui/button'
import { Slider } from './ui/slider'
import { YouTubePlayerController } from '../types/youtube'

interface VideoControlsProps {
  playerController: YouTubePlayerController
  isHost: boolean
  isPlaying: boolean
  currentTime: number
  totalDuration: number
  onPlayPause: () => void
  onSeek: (seconds: number) => void
  onVolumeChange: (volume: number) => void
  onFullscreenToggle: () => void
  isFullscreen: boolean
  disabled?: boolean
  onPermissionDenied?: () => void
}

export function VideoControls({
  playerController,
  isHost,
  isPlaying,
  currentTime,
  totalDuration,
  onPlayPause,
  onSeek,
  onVolumeChange,
  onFullscreenToggle,
  isFullscreen,
  disabled = false,
  onPermissionDenied
}: VideoControlsProps) {
  const [volume, setVolume] = useState([80])
  const [isMuted, setIsMuted] = useState(false)
  const [showVolumeSlider, setShowVolumeSlider] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [dragTime, setDragTime] = useState(0)
  const volumeTimeoutRef = useRef<NodeJS.Timeout>()

  // 볼륨 초기화
  useEffect(() => {
    if (playerController.isReady) {
      const currentVolume = playerController.getVolume()
      setVolume([currentVolume])
      setIsMuted(currentVolume === 0)
    }
  }, [playerController.isReady])

  // 볼륨 슬라이더 자동 숨김
  useEffect(() => {
    if (showVolumeSlider) {
      if (volumeTimeoutRef.current) {
        clearTimeout(volumeTimeoutRef.current)
      }
      volumeTimeoutRef.current = setTimeout(() => {
        setShowVolumeSlider(false)
      }, 3000)
    }
    return () => {
      if (volumeTimeoutRef.current) {
        clearTimeout(volumeTimeoutRef.current)
      }
    }
  }, [showVolumeSlider, volume])

  const handleVolumeClick = () => {
    if (showVolumeSlider) {
      setIsMuted(!isMuted)
      const newVolume = isMuted ? volume[0] : 0
      playerController.setVolume(newVolume)
      onVolumeChange(newVolume)
    } else {
      setShowVolumeSlider(true)
    }
  }

  const handleVolumeChange = (newVolume: number[]) => {
    setVolume(newVolume)
    const volumeValue = newVolume[0]
    setIsMuted(volumeValue === 0)
    playerController.setVolume(volumeValue)
    onVolumeChange(volumeValue)
  }

  const handleSeekStart = () => {
    setIsDragging(true)
    setDragTime(currentTime)
  }

  const handleSeekChange = (value: number[]) => {
    if (isDragging) {
      setDragTime(value[0])
    }
  }

  const handleSeekEnd = () => {
    if (isDragging && isHost) {
      onSeek(dragTime)
      setIsDragging(false)
    }
  }

  const handleSkipBack = () => {
    if (isHost) {
      const newTime = Math.max(0, currentTime - 10)
      onSeek(newTime)
    } else {
      onPermissionDenied?.()
    }
  }

  const handleSkipForward = () => {
    if (isHost) {
      const newTime = Math.min(totalDuration, currentTime + 10)
      onSeek(newTime)
    } else {
      onPermissionDenied?.()
    }
  }

  const handlePlayPauseClick = () => {
    if (isHost) {
      onPlayPause()
    } else {
      onPermissionDenied?.()
    }
  }

  const getVolumeIcon = () => {
    if (isMuted || volume[0] === 0) {
      return <VolumeX className="w-5 h-5" />
    } else if (volume[0] < 50) {
      return <Volume1 className="w-5 h-5" />
    } else {
      return <Volume2 className="w-5 h-5" />
    }
  }

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`
  }


  return (
    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-6">
      {/* Progress Bar */}
      <div className="mb-4">
        <div className="w-full mb-2 relative">
          <Slider
            value={[isDragging ? dragTime : currentTime]}
            onValueChange={handleSeekChange}
            onPointerDown={handleSeekStart}
            onPointerUp={handleSeekEnd}
            max={totalDuration}
            step={1}
            disabled={disabled || !isHost}
            className="w-full h-2 cursor-pointer"
          />
          {!isHost && (
            <div className="absolute inset-0 cursor-not-allowed" />
          )}
        </div>
        <div className="flex items-center justify-between text-sm text-white/80">
          <span>{formatTime(isDragging ? dragTime : currentTime)}</span>
          <span>{formatTime(totalDuration)}</span>
        </div>
      </div>

      {/* Control Buttons */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          {/* Skip Back Button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSkipBack}
            disabled={disabled || !isHost}
            className="hover:bg-white/10 disabled:opacity-50"
            title="10초 뒤로"
          >
            <SkipBack className="w-5 h-5" />
          </Button>

          {/* Play/Pause Button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              console.log('🚨 하단 재생 버튼 클릭됨!', { isHost, disabled: disabled || !isHost })
              handlePlayPauseClick()
            }}
            onMouseDown={() => console.log('🚨 하단 버튼 마우스 다운 감지')}
            onMouseUp={() => console.log('🚨 하단 버튼 마우스 업 감지')}
            disabled={disabled || !isHost}
            className="hover:bg-white/10 disabled:opacity-50"
            title={isHost ? (isPlaying ? '일시정지' : '재생') : '호스트만 제어 가능'}
          >
            {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
          </Button>

          {/* Skip Forward Button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSkipForward}
            disabled={disabled || !isHost}
            className="hover:bg-white/10 disabled:opacity-50"
            title="10초 앞으로"
          >
            <SkipForward className="w-5 h-5" />
          </Button>
          
          {/* Volume Control */}
          <div className="relative flex items-center">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleVolumeClick}
              className="hover:bg-white/10"
              title="볼륨 조절"
            >
              {getVolumeIcon()}
            </Button>
            
            {/* Volume Slider */}
            {showVolumeSlider && (
              <div className="absolute left-12 bottom-0 bg-black/70 backdrop-blur-sm rounded-lg px-3 py-2 flex items-center">
                <Slider
                  value={volume}
                  onValueChange={handleVolumeChange}
                  max={100}
                  step={1}
                  className="w-20"
                />
                <span className="ml-2 text-xs text-white/80 min-w-[2rem]">
                  {volume[0]}%
                </span>
              </div>
            )}
          </div>

          {/* Host Indicator */}
          {!isHost && (
            <div className="flex items-center text-xs text-white/60">
              <Crown className="w-4 h-4 mr-1" />
              호스트만 제어 가능
            </div>
          )}
        </div>

        <div className="flex items-center space-x-2">
          <Button
            variant="ghost"
            size="sm"
            className="hover:bg-white/10"
            title="설정"
          >
            <Settings className="w-5 h-5" />
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={onFullscreenToggle}
            className="hover:bg-white/10"
            title={isFullscreen ? '전체화면 해제' : '전체화면'}
          >
            {isFullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
          </Button>
        </div>
      </div>
    </div>
  )
}