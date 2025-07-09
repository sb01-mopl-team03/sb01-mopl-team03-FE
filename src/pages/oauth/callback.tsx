import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

export default function OAuthCallback() {
  const navigate = useNavigate()

  useEffect(() => {
    // access_token을 쿼리에서 추출
    const params = new URLSearchParams(window.location.search)
    const accessToken = params.get('access_token')

    if (accessToken) {
      // 토큰 저장 (localStorage 등)
      localStorage.setItem('accessToken', accessToken)
      // 메인 페이지로 이동
      navigate('/', { replace: true })
    } else {
      // 토큰이 없으면 로그인 페이지로 이동
      navigate('/login', { replace: true })
    }
  }, [navigate])

  return (
    <div className="flex items-center justify-center min-h-screen">
      <span>로그인 처리 중...</span>
    </div>
  )
}
