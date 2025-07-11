import { useEffect, useRef, useState } from 'react';

interface YouTubePlayerProps {
  videoId: string;
  onReady?: (player: YT.Player) => void;
  onStateChange?: (event: YT.OnStateChangeEvent) => void;
  autoplay?: boolean;
  controls?: boolean;
  height?: string;
  width?: string;
  startTime?: number;
}

declare global {
  interface Window {
    YT: typeof YT;
    onYouTubeIframeAPIReady: () => void;
  }
}

export function YouTubePlayer({
  videoId,
  onReady,
  onStateChange,
  autoplay = false,
  controls = false,
  height = '100%',
  width = '100%',
  startTime = 0
}: YouTubePlayerProps) {
  const playerRef = useRef<YT.Player | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isApiReady, setIsApiReady] = useState(false);

  useEffect(() => {
    // YouTube API가 로드되었는지 확인
    if (window.YT && window.YT.Player) {
      setIsApiReady(true);
      return;
    }

    // YouTube API 로드 대기
    const checkYouTubeAPI = () => {
      if (window.YT && window.YT.Player) {
        setIsApiReady(true);
      } else {
        setTimeout(checkYouTubeAPI, 100);
      }
    };

    // API 준비 콜백 설정
    if (!window.onYouTubeIframeAPIReady) {
      window.onYouTubeIframeAPIReady = () => {
        setIsApiReady(true);
      };
    }

    checkYouTubeAPI();
  }, []);

  useEffect(() => {
    if (!isApiReady || !containerRef.current) return;

    // 기존 플레이어 정리
    if (playerRef.current) {
      playerRef.current.destroy();
    }

    // 새 플레이어 생성
    playerRef.current = new window.YT.Player(containerRef.current, {
      height,
      width,
      videoId,
      playerVars: {
        autoplay: autoplay ? 1 : 0,
        controls: controls ? 1 : 0,
        disablekb: 1,
        fs: 0,
        modestbranding: 1,
        rel: 0,
        showinfo: 0,
        start: startTime,
        iv_load_policy: 3,
        playsinline: 1,
      },
      events: {
        onReady: (event) => {
          onReady?.(event.target);
        },
        onStateChange: (event) => {
          onStateChange?.(event);
        },
      },
    });

    return () => {
      if (playerRef.current) {
        try {
          playerRef.current.destroy();
        } catch (error) {
          console.error('Error destroying YouTube player:', error);
        }
      }
    };
  }, [isApiReady, videoId, autoplay, controls, height, width, startTime, onReady, onStateChange]);

  return (
    <div className="relative w-full h-full">
      <div ref={containerRef} className="w-full h-full" />
    </div>
  );
}