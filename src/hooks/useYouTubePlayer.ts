import { useState, useEffect, useCallback, useRef } from 'react'
import { YouTubePlayer, YouTubePlayerState, YouTubePlayerController, VideoControlAction } from '../types/youtube'

interface UseYouTubePlayerProps {
  videoId: string
  containerId: string
  isHost: boolean
  onStateChange?: (isPlaying: boolean, currentTime: number, action: VideoControlAction) => void
  onError?: (error: string) => void
}

export function useYouTubePlayer({
  videoId,
  containerId,
  isHost,
  onStateChange,
  onError
}: UseYouTubePlayerProps): YouTubePlayerController {
  const [player, setPlayer] = useState<YouTubePlayer | null>(null)
  const [isReady, setIsReady] = useState(false)
  const playerRef = useRef<YouTubePlayer | null>(null)
  const isHostControlRef = useRef(false)

  // 플레이어 초기화
  const initializePlayer = useCallback(() => {
    if (!window.YT || !window.YT.Player || !videoId) {
      return
    }

    try {
      new window.YT.Player(containerId, {
        height: '100%',
        width: '100%',
        videoId,
        playerVars: {
          autoplay: 0,
          controls: 0, // 컨트롤 숨김 (커스텀 컨트롤 사용)
          disablekb: 1, // 키보드 제어 비활성화
          fs: 0, // 전체화면 버튼 숨김
          modestbranding: 1, // YouTube 로고 최소화
          rel: 0, // 관련 동영상 숨김
          showinfo: 0, // 정보 표시 숨김
          iv_load_policy: 3, // 주석 숨김
          cc_load_policy: 0, // 자막 기본 비활성화
          playsinline: 1, // 인라인 재생 (모바일)
          enablejsapi: 1
        },
        events: {
          onReady: (event) => {
            console.log('YouTube Player Ready')
            setIsReady(true)
            playerRef.current = event.target
            setPlayer(event.target)
          },
          onStateChange: (event) => {
            const state = event.data
            const currentTime = Math.floor(event.target.getCurrentTime())
            
            let action: VideoControlAction
            let isPlaying = false
            
            switch (state) {
              case window.YT.PlayerState.PLAYING:
                action = VideoControlAction.PLAY
                isPlaying = true
                break
              case window.YT.PlayerState.PAUSED:
                action = VideoControlAction.PAUSE
                isPlaying = false
                break
              default:
                return
            }
            
            console.log('YouTube Player State Change:', { state, currentTime, isPlaying, isHost })
            
            // 호스트만 상태 변경을 다른 참가자들에게 전파
            if (isHost && !isHostControlRef.current) {
              onStateChange?.(isPlaying, currentTime, action)
            }
          },
          onError: (event) => {
            console.error('YouTube Player Error:', event.data)
            let errorMessage = 'YouTube 플레이어 오류가 발생했습니다.'
            
            switch (event.data) {
              case 2:
                errorMessage = '잘못된 비디오 ID입니다.'
                break
              case 5:
                errorMessage = 'HTML5 플레이어 오류가 발생했습니다.'
                break
              case 100:
                errorMessage = '비디오를 찾을 수 없습니다.'
                break
              case 101:
              case 150:
                errorMessage = '비디오 재생이 허용되지 않습니다.'
                break
            }
            
            onError?.(errorMessage)
          }
        }
      })
    } catch (error) {
      console.error('YouTube Player 초기화 오류:', error)
      onError?.('YouTube 플레이어를 초기화할 수 없습니다.')
    }
  }, [videoId, containerId, isHost, onStateChange, onError])

  // YouTube API 로드 후 플레이어 초기화
  useEffect(() => {
    if (window.YT && window.YT.Player) {
      initializePlayer()
    } else {
      // YouTube API가 로드될 때까지 대기
      const checkYouTubeApi = setInterval(() => {
        if (window.YT && window.YT.Player) {
          clearInterval(checkYouTubeApi)
          initializePlayer()
        }
      }, 100)
      
      // 타임아웃 설정 (10초)
      setTimeout(() => {
        clearInterval(checkYouTubeApi)
        if (!window.YT || !window.YT.Player) {
          onError?.('YouTube API 로드 타임아웃')
        }
      }, 10000)
    }
  }, [initializePlayer])

  // 플레이어 제어 함수들
  const play = useCallback(() => {
    if (playerRef.current && isReady) {
      isHostControlRef.current = true
      playerRef.current.playVideo()
      setTimeout(() => {
        isHostControlRef.current = false
      }, 100)
    }
  }, [isReady])

  const pause = useCallback(() => {
    if (playerRef.current && isReady) {
      isHostControlRef.current = true
      playerRef.current.pauseVideo()
      setTimeout(() => {
        isHostControlRef.current = false
      }, 100)
    }
  }, [isReady])

  const seekTo = useCallback((seconds: number) => {
    if (playerRef.current && isReady) {
      isHostControlRef.current = true
      playerRef.current.seekTo(seconds, true)
      setTimeout(() => {
        isHostControlRef.current = false
      }, 100)
    }
  }, [isReady])

  const getCurrentTime = useCallback((): number => {
    if (playerRef.current && isReady) {
      return Math.floor(playerRef.current.getCurrentTime())
    }
    return 0
  }, [isReady])

  const getDuration = useCallback((): number => {
    if (playerRef.current && isReady) {
      return Math.floor(playerRef.current.getDuration())
    }
    return 0
  }, [isReady])

  const getPlayerState = useCallback((): YouTubePlayerState => {
    if (playerRef.current && isReady) {
      return playerRef.current.getPlayerState()
    }
    return YouTubePlayerState.UNSTARTED
  }, [isReady])

  const setVolume = useCallback((volume: number) => {
    if (playerRef.current && isReady) {
      playerRef.current.setVolume(volume)
    }
  }, [isReady])

  const getVolume = useCallback((): number => {
    if (playerRef.current && isReady) {
      return playerRef.current.getVolume()
    }
    return 0
  }, [isReady])

  const destroy = useCallback(() => {
    if (playerRef.current) {
      playerRef.current.destroy()
      playerRef.current = null
      setPlayer(null)
      setIsReady(false)
    }
  }, [])

  // 외부에서 비디오 동기화 (호스트가 아닌 경우)
  const syncVideo = useCallback((videoSync: { action: VideoControlAction; currentTime: number; isPlaying: boolean }) => {
    if (!playerRef.current || !isReady || isHost) {
      return
    }

    isHostControlRef.current = true

    try {
      switch (videoSync.action) {
        case VideoControlAction.PLAY:
          playerRef.current.seekTo(videoSync.currentTime, true)
          playerRef.current.playVideo()
          break
        case VideoControlAction.PAUSE:
          playerRef.current.pauseVideo()
          break
        case VideoControlAction.SEEK:
          playerRef.current.seekTo(videoSync.currentTime, true)
          if (videoSync.isPlaying) {
            playerRef.current.playVideo()
          }
          break
      }
    } catch (error) {
      console.error('비디오 동기화 오류:', error)
    }

    setTimeout(() => {
      isHostControlRef.current = false
    }, 100)
  }, [isReady, isHost])

  // 컴포넌트 언마운트 시 플레이어 정리
  useEffect(() => {
    return () => {
      destroy()
    }
  }, [destroy])

  return {
    player,
    isReady,
    play,
    pause,
    seekTo,
    getCurrentTime,
    getDuration,
    getPlayerState,
    setVolume,
    getVolume,
    destroy,
    syncVideo
  }
}