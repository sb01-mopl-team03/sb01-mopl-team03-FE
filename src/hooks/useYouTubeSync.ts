import { useEffect, useRef, useState } from 'react';
import { VideoControlAction } from '../types/watchRoom';

interface YouTubeSyncProps {
  player: YT.Player | null;
  isHost: boolean;
  isConnected: boolean;
  onVideoControl: (data: {
    videoControlAction: VideoControlAction;
    currentTime: number;
    isPlaying: boolean;
  }) => void;
}

export function useYouTubeSync({
  player,
  isHost,
  isConnected,
  onVideoControl
}: YouTubeSyncProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const syncThrottleRef = useRef<NodeJS.Timeout>();

  // 플레이어 상태 변경 감지
  useEffect(() => {
    if (!player) return;

    const handleStateChange = (event: YT.OnStateChangeEvent) => {
      const state = event.data;
      const newIsPlaying = state === window.YT.PlayerState.PLAYING;
      const newCurrentTime = Math.floor(player.getCurrentTime());

      setIsPlaying(newIsPlaying);
      setCurrentTime(newCurrentTime);

      // 호스트만 다른 사용자에게 동기화 신호 전송
      if (isHost && isConnected) {
        // 중복 요청 방지를 위한 throttle
        if (syncThrottleRef.current) {
          clearTimeout(syncThrottleRef.current);
        }

        syncThrottleRef.current = setTimeout(() => {
          const action = newIsPlaying ? VideoControlAction.PLAY : VideoControlAction.PAUSE;
          onVideoControl({
            videoControlAction: action,
            currentTime: newCurrentTime,
            isPlaying: newIsPlaying
          });
        }, 300); // 300ms 지연으로 중복 요청 방지
      }
    };

    player.addEventListener('onStateChange', handleStateChange);

    return () => {
      if (syncThrottleRef.current) {
        clearTimeout(syncThrottleRef.current);
      }
    };
  }, [player, isHost, isConnected, onVideoControl]);

  // 현재 시간 업데이트 (1초마다)
  useEffect(() => {
    if (!player || !isPlaying) return;

    const interval = setInterval(() => {
      const time = Math.floor(player.getCurrentTime());
      setCurrentTime(time);
    }, 1000);

    return () => clearInterval(interval);
  }, [player, isPlaying]);

  // WebSocket에서 받은 동기화 데이터 처리는 상위 컴포넌트에서 처리

  // 호스트 전용 비디오 제어 함수들
  const playVideo = () => {
    if (!player || !isHost) return;
    player.playVideo();
  };

  const pauseVideo = () => {
    if (!player || !isHost) return;
    player.pauseVideo();
  };

  const seekTo = (time: number) => {
    if (!player || !isHost) return;
    player.seekTo(time, true);
  };

  const togglePlayPause = () => {
    if (!player || !isHost) return;
    
    if (isPlaying) {
      pauseVideo();
    } else {
      playVideo();
    }
  };

  return {
    isPlaying,
    currentTime,
    playVideo,
    pauseVideo,
    seekTo,
    togglePlayPause
  };
}