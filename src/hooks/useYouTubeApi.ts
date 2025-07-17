import { useState, useEffect, useCallback } from 'react'
import { YouTubeApiState } from '../types/youtube'

export function useYouTubeApi(autoLoad: boolean = false) {
  const [apiState, setApiState] = useState<YouTubeApiState>({
    isLoaded: false,
    isLoading: false,
    error: null
  })

  const loadYouTubeApi = useCallback(() => {
    // 이미 로드된 경우
    if (window.YT && window.YT.Player) {
      setApiState({ isLoaded: true, isLoading: false, error: null })
      return
    }

    // 이미 로딩 중인 경우
    if (apiState.isLoading) {
      return
    }

    setApiState(prev => ({ ...prev, isLoading: true, error: null }))

    // 스크립트가 이미 추가된 경우 확인
    if (document.querySelector('script[src="https://www.youtube.com/iframe_api"]')) {
      // 스크립트는 있지만 API가 아직 로드되지 않은 경우
      const checkApi = setInterval(() => {
        if (window.YT && window.YT.Player) {
          setApiState({ isLoaded: true, isLoading: false, error: null })
          clearInterval(checkApi)
        }
      }, 100)
      
      // 타임아웃 설정 (10초)
      setTimeout(() => {
        clearInterval(checkApi)
        if (!window.YT || !window.YT.Player) {
          setApiState({ isLoaded: false, isLoading: false, error: 'YouTube API 로드 타임아웃' })
        }
      }, 10000)
      
      return
    }

    // YouTube API 콜백 설정
    window.onYouTubeIframeAPIReady = () => {
      setApiState({ isLoaded: true, isLoading: false, error: null })
    }

    // 스크립트 태그 생성 및 추가
    const script = document.createElement('script')
    script.src = 'https://www.youtube.com/iframe_api'
    script.async = true
    script.onload = () => {
      console.log('YouTube API 스크립트 로드 완료')
    }
    script.onerror = () => {
      setApiState({ isLoaded: false, isLoading: false, error: 'YouTube API 스크립트 로드 실패' })
    }

    document.head.appendChild(script)
  }, [apiState.isLoading])

  // 컴포넌트 마운트 시 API 로드 (autoLoad가 true인 경우에만)
  useEffect(() => {
    if (autoLoad) {
      loadYouTubeApi()
    }
  }, [autoLoad, loadYouTubeApi])

  return {
    ...apiState,
    loadYouTubeApi
  }
}