import { useState, useEffect, useCallback, useRef } from 'react'
import { YouTubePlayer, YouTubePlayerStateChangeEvent, YouTubePlayerState, YouTubePlayerController, VideoControlAction } from '../types/youtube'

interface UseYouTubePlayerProps {
  videoId: string
  containerId: string
  isHost: boolean
  onStateChange?: (isPlaying: boolean, currentTime: number, action: VideoControlAction) => void
  onError?: (error: string) => void
  onTimeUpdate?: (currentTime: number) => void // Add new prop for continuous time updates
}

export function useYouTubePlayer({
  videoId,
  containerId,
  isHost,
  onStateChange,
  onError,
  onTimeUpdate // Destructure new prop
}: UseYouTubePlayerProps): YouTubePlayerController {
  const [player, setPlayer] = useState<YouTubePlayer | null>(null)
  const [isReady, setIsReady] = useState(false)
  const playerRef = useRef<YouTubePlayer | null>(null)
  const isHostControlRef = useRef(false)
  const currentTimeIntervalRef = useRef<NodeJS.Timeout | null>(null) // Ref to store interval ID

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
          controls: 0, // 기본 컨트롤 활성화 (디버깅용)
          disablekb: 0, // 키보드 제어 활성화 (디버깅용)
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
            console.log('YouTube Player Ready - verifying functionality')
            playerRef.current = event.target
            setPlayer(event.target)
            
            const verifyPlayerReady = () => {
              try {
                const canGetState = typeof event.target.getPlayerState === 'function'
                const canGetTime = typeof event.target.getCurrentTime === 'function'
                const state = event.target.getPlayerState()
                
                if (canGetState && canGetTime && state !== undefined) {
                  console.log('🎬 Player functionality verified, setting ready')
                  setIsReady(true)
                } else {
                  console.log('🎬 Player not fully ready, retrying in 200ms...')
                  setTimeout(verifyPlayerReady, 200)
                }
              } catch (error) {
                console.log('🎬 Player verification failed, retrying in 200ms...', error)
                setTimeout(verifyPlayerReady, 200)
              }
            }
            verifyPlayerReady()
          },
          onStateChange: (event) => {
            const state = event.data
            const rawTime = event.target.getCurrentTime()
            const currentTime = Math.round(rawTime * 100) / 100
            
            let action: VideoControlAction | null = null;
            let isPlaying = false;
            
            // Clear existing interval before handling state change
            if (currentTimeIntervalRef.current) {
              clearInterval(currentTimeIntervalRef.current);
              currentTimeIntervalRef.current = null;
            }

            switch (state) {
              case window.YT.PlayerState.PLAYING:
                action = VideoControlAction.PLAY
                isPlaying = true
                // Start continuous time updates when playing
                currentTimeIntervalRef.current = setInterval(() => {
                  if (event.target.getPlayerState() === window.YT.PlayerState.PLAYING) {
                    onTimeUpdate?.(event.target.getCurrentTime());
                  } else {
                    // Stop interval if state changes unexpectedly
                    clearInterval(currentTimeIntervalRef.current!);
                    currentTimeIntervalRef.current = null;
                  }
                }, 500); // Update every 500ms
                break
              case window.YT.PlayerState.PAUSED:
                action = VideoControlAction.PAUSE
                isPlaying = false
                break
              case window.YT.PlayerState.ENDED:
                action = VideoControlAction.PAUSE // Treat ended as paused for UI
                isPlaying = false
                break
              default:
                // For other states like BUFFERING, CUED, UNSTARTED, we just clear interval and return
                return
            }
            
            console.log('🎵 YouTube Player State Change:', { 
              state, 
              rawTime,
              currentTime, 
              isPlaying, 
              isHost,
              isHostControl: isHostControlRef.current
            })
            
            // 모든 상태 변경은 로컬 UI 업데이트만 수행
            // WebSocket 전송은 UI 이벤트 핸들러(handlePlayPause 등)에서만 처리
            console.log('🎵 Updating local UI state only')
            onStateChange?.(isPlaying, currentTime, action);
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
  }, [videoId, containerId, isHost, onStateChange, onError, onTimeUpdate]) // Add onTimeUpdate to dependency array

  // YouTube API 로드 후 플레이어 초기화
  useEffect(() => {
    if (!videoId) return;

    if (playerRef.current && playerRef.current.getVideoUrl() !== videoId) {
      console.log('🧹 videoId 변경으로 기존 플레이어 파기');
      playerRef.current.destroy();
      playerRef.current = null;
      setPlayer(null);
      setIsReady(false);
      if (currentTimeIntervalRef.current) { // Clear interval on videoId change / player destruction
        clearInterval(currentTimeIntervalRef.current);
        currentTimeIntervalRef.current = null;
      }
    }

    if (!playerRef.current && window.YT && window.YT.Player) {
      initializePlayer();
    }
  }, [videoId, initializePlayer]);

  // 플레이어 제어 함수들
  const play = useCallback(() => {
    console.log('▶️ YouTube play() called:', {
      playerExists: !!playerRef.current,
      isReady,
      playerState: playerRef.current?.getPlayerState?.(),
      currentTime: playerRef.current?.getCurrentTime?.()
    })
    
    if (playerRef.current && isReady) {
      try {
        isHostControlRef.current = true
        const result = playerRef.current.playVideo()
        console.log('▶️ playVideo() result:', result)
        
        // 상태 확인
        setTimeout(() => {
          const newState = playerRef.current?.getPlayerState?.()
          console.log('▶️ Player state after play():', newState)
        }, 500)
      } catch (error) {
        console.error('❌ playVideo() error:', error)
      }
      setTimeout(() => {
        isHostControlRef.current = false
      }, 100)
    } else {
      console.error('❌ Cannot play: player not ready:', {
        playerExists: !!playerRef.current,
        isReady
      })
    }
  }, [isReady])

  const pause = useCallback(() => {
    console.log('⏸️ YouTube pause() called:', {
      playerExists: !!playerRef.current,
      isReady,
      playerState: playerRef.current?.getPlayerState?.(),
      currentTime: playerRef.current?.getCurrentTime?.()
    })
    
    if (playerRef.current && isReady) {
      try {
        isHostControlRef.current = true
        const result = playerRef.current.pauseVideo()
        console.log('⏸️ pauseVideo() result:', result)
        
        // 상태 확인
        setTimeout(() => {
          const newState = playerRef.current?.getPlayerState?.()
          console.log('⏸️ Player state after pause():', newState)
        }, 500)
      } catch (error) {
        console.error('❌ pauseVideo() error:', error)
      }
      setTimeout(() => {
        isHostControlRef.current = false
      }, 100)
    } else {
      console.error('❌ Cannot pause: player not ready:', {
        playerExists: !!playerRef.current,
        isReady
      })
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
    let time = 0
    try {
      if (playerRef.current && isReady) {
        const rawTime = playerRef.current.getCurrentTime()
        time = Math.round(rawTime * 100) / 100
        
        console.log('🎵 getCurrentTime called:', {
          rawTime,
          preciseTime: time,
          isReady,
          playerExists: !!playerRef.current,
          playerState: playerRef.current?.getPlayerState?.()
        })
        
        if (time > 10000 || time < 0 || isNaN(time)) {
          console.warn('🚨 ABNORMAL TIME FROM YOUTUBE PLAYER:', {
            rawTime,
            preciseTime: time,
            playerState: playerRef.current?.getPlayerState?.()
          })
        }
      } else {
        console.log('🎵 getCurrentTime called but player not ready')
      }
    } catch (error) {
      console.error('🎵 getCurrentTime error:', error)
    }
    
    return time
  }, [isReady])

  const getDuration = useCallback((): number => {
    if (playerRef.current && isReady) {
      return Math.floor(playerRef.current.getDuration())
    }
    return 0
  }, [isReady])

  const getPlayerState = useCallback((): YouTubePlayerStateChangeEvent => {
    return {
      target: playerRef.current!,
      data: playerRef.current?.getPlayerState() ?? YouTubePlayerState.UNSTARTED
    }
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
    // Clear interval on destroy
    if (currentTimeIntervalRef.current) {
      clearInterval(currentTimeIntervalRef.current);
      currentTimeIntervalRef.current = null;
    }
  }, [])

  // 외부에서 비디오 동기화 (모든 참여자)
  const syncVideo = useCallback((videoSync :{ action: VideoControlAction; currentTime: number; isPlaying: boolean } , retryCount = 0) => {
      console.log('[syncVideo] Called:', { isReady, retryCount, hasPlayer: !!playerRef.current });

  if (playerRef.current == null) {
    console.error('플레이어가 초기화되지 않았습니다.');
    return false;
  }

  isHostControlRef.current = true // Temporarily set flag for sync operations

  // Always seek first for precise positioning
  playerRef.current.seekTo(videoSync.currentTime, true);
  playerRef.current.pauseVideo();

  
  if (videoSync.action === 'PLAY' || videoSync.isPlaying === true) {
    // 재생 직전 사용자 볼륨 기억
    const prevVolume = playerRef.current.getVolume();
    // 자연스러운 재생 시작
    playerRef.current.setVolume(0); // 음소거로 시작
    playerRef.current.playVideo();
    console.log('▶️ 동기화 재생 시작 (음소거)');

    // 약간의 지연 후 사용자 볼륨으로 복원
    setTimeout(() => {
      if (playerRef.current) {
        playerRef.current.setVolume(prevVolume);
        console.log('🔊 볼륨 복원(사용자 설정):', prevVolume);
      }
    }, 120);
  }
  
  // Reset flag after a short delay to allow player state to update
  setTimeout(() => {
    isHostControlRef.current = false;
  }, 100);

  return true;
}, [isReady]);

  // 플레이어 상태 모니터링 (5초마다) - Keep for general logging, but time updates are handled by onTimeUpdate now
  useEffect(() => {
    if (playerRef.current && isReady) {
      console.log('🎵 Starting player status monitoring')
      
      const checkInterval = setInterval(() => {
        try {
          const playerExists = !!playerRef.current
          const canGetState = typeof playerRef.current?.getPlayerState === 'function'
          const canGetTime = typeof playerRef.current?.getCurrentTime === 'function'
          const state = playerRef.current?.getPlayerState?.()
          
          const status = {
            isReady,
            playerExists,
            canGetState,
            canGetTime,
            state,
            currentTime: Math.floor(playerRef.current?.getCurrentTime?.() || 0),
            duration: Math.floor(playerRef.current?.getDuration?.() || 0),
            volume: playerRef.current?.getVolume?.(),
            playbackRate: playerRef.current?.getPlaybackRate?.(),
            wouldSyncPass: isReady && playerExists && canGetTime && state !== undefined && state !== null
          }
          console.log('🎵 Player Status:', status)
        } catch (error) {
          console.error('❌ Error checking player status:', error)
        }
      }, 5000)
      
      return () => {
        console.log('🎵 Stopping player status monitoring')
        clearInterval(checkInterval)
      }
    }
  }, [isReady])

  // 컴포넌트 언마운트 시 플레이어 정리
  useEffect(() => {
    return () => {
      destroy()
      // Ensure interval is cleared even if destroy isn't explicitly called (e.g., if player init failed)
      if (currentTimeIntervalRef.current) {
        clearInterval(currentTimeIntervalRef.current);
        currentTimeIntervalRef.current = null;
      }
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