// YouTube API 관련 타입 정의

export interface YouTubePlayerConfig {
  height: string | number
  width: string | number
  videoId: string
  playerVars?: YouTubePlayerVars
  events?: YouTubePlayerEvents
}

export interface YouTubePlayerVars {
  autoplay?: 0 | 1
  cc_load_policy?: 0 | 1
  color?: 'red' | 'white'
  controls?: 0 | 1
  disablekb?: 0 | 1
  enablejsapi?: 0 | 1
  end?: number
  fs?: 0 | 1
  hl?: string
  iv_load_policy?: 1 | 3
  list?: string
  listType?: 'playlist' | 'user_uploads'
  loop?: 0 | 1
  modestbranding?: 0 | 1
  origin?: string
  playlist?: string
  playsinline?: 0 | 1
  rel?: 0 | 1
  showinfo?: 0 | 1
  start?: number
  widget_referrer?: string
}

export interface YouTubePlayerEvents {
  onReady?: (event: YouTubePlayerReadyEvent) => void
  onStateChange?: (event: YouTubePlayerStateChangeEvent) => void
  onPlaybackQualityChange?: (event: YouTubePlayerPlaybackQualityChangeEvent) => void
  onPlaybackRateChange?: (event: YouTubePlayerPlaybackRateChangeEvent) => void
  onError?: (event: YouTubePlayerErrorEvent) => void
  onApiChange?: (event: YouTubePlayerApiChangeEvent) => void
}

export interface YouTubePlayerReadyEvent {
  target: YouTubePlayer
}

export interface YouTubePlayerStateChangeEvent {
  target: YouTubePlayer
  data: YouTubePlayerState
}

export interface YouTubePlayerPlaybackQualityChangeEvent {
  target: YouTubePlayer
  data: string
}

export interface YouTubePlayerPlaybackRateChangeEvent {
  target: YouTubePlayer
  data: number
}

export interface YouTubePlayerErrorEvent {
  target: YouTubePlayer
  data: YouTubePlayerError
}

export interface YouTubePlayerApiChangeEvent {
  target: YouTubePlayer
}

export enum YouTubePlayerState {
  UNSTARTED = -1,
  ENDED = 0,
  PLAYING = 1,
  PAUSED = 2,
  BUFFERING = 3,
  CUED = 5
}

export enum YouTubePlayerError {
  INVALID_PARAM = 2,
  HTML5_ERROR = 5,
  VIDEO_NOT_FOUND = 100,
  EMBED_NOT_ALLOWED = 101,
  EMBED_NOT_ALLOWED_DISGUISE = 150
}

export interface YouTubePlayer {
  // 재생 제어
  playVideo(): void
  pauseVideo(): void
  stopVideo(): void
  seekTo(seconds: number, allowSeekAhead?: boolean): void
  clearVideo(): void

  // 상태 조회
  getPlayerState(): YouTubePlayerState
  getCurrentTime(): number
  getDuration(): number
  getVideoLoadedFraction(): number
  getVideoUrl(): string
  getVideoEmbedCode(): string

  // 볼륨 제어
  mute(): void
  unMute(): void
  isMuted(): boolean
  setVolume(volume: number): void
  getVolume(): number

  // 재생 속도 제어
  setPlaybackRate(suggestedRate: number): void
  getPlaybackRate(): number
  getAvailablePlaybackRates(): number[]

  // 품질 제어
  setPlaybackQuality(suggestedQuality: string): void
  getPlaybackQuality(): string
  getAvailableQualityLevels(): string[]

  // 크기 제어
  setSize(width: number, height: number): void

  // 이벤트
  addEventListener(event: string, listener: Function): void
  removeEventListener(event: string, listener: Function): void

  // 플레이어 상태
  destroy(): void
}

// 전역 YouTube API 타입
declare global {
  interface Window {
    YT: {
      Player: {
        new (elementId: string | HTMLElement, config: YouTubePlayerConfig): YouTubePlayer
      }
      PlayerState: typeof YouTubePlayerState
      ready: (callback: () => void) => void
    }
    onYouTubeIframeAPIReady: () => void
  }
}

// YouTube API 로드 상태
export interface YouTubeApiState {
  isLoaded: boolean
  isLoading: boolean
  error: string | null
}

// YouTube 플레이어 컨트롤러 인터페이스
export interface YouTubePlayerController {
  player: YouTubePlayer | null
  isReady: boolean
  play(): void
  pause(): void
  seekTo(seconds: number): void
  getCurrentTime(): number
  getDuration(): number
  getPlayerState(): YouTubePlayerStateChangeEvent
  setVolume(volume: number): void
  getVolume(): number
  destroy(): void
  syncVideo?: (videoSync: { action: VideoControlAction; currentTime: number; isPlaying: boolean }) => boolean
}

// VideoControlAction import를 위한 타입 (순환 참조 방지)
export enum VideoControlAction {
  PLAY = 'PLAY',
  PAUSE = 'PAUSE',
  SEEK = 'SEEK'
}