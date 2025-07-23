import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

interface OAuthCallbackProps {
  onLogin: (accessToken: string) => void
}

export default function OAuthCallback({ onLogin }: OAuthCallbackProps) {
  const navigate = useNavigate()

useEffect(() => {
  console.log("🟡 현재 위치:", window.location.href)
}, [])

  useEffect(() => {
    console.log("🟡 /oauth/callback 라우트 진입");
    const params = new URLSearchParams(window.location.search)
    const accessToken = params.get('access_token')

    if (accessToken) {
      localStorage.setItem('accessToken', accessToken)
      onLogin(accessToken) // ✅ 로그인 상태 갱신
      navigate('/', { replace: true })
    } else {
      navigate('/login', { replace: true })
    }
  }, [navigate, onLogin])

  return (
    <div className="flex items-center justify-center min-h-screen">
      <span>로그인 처리 중...</span>
    </div>
  )
}
