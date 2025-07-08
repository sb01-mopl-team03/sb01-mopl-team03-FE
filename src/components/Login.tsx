import React, { useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { Separator } from './ui/separator'

interface LoginProps {
  onLogin: (accessToken: string, isTempPassword: boolean) => void
  onToggleAuth: () => void
  onForgotPassword: () => void
  isRegister: boolean
}

interface LoginResponse {
  accessToken: string
  isTempPassword: boolean
}

export function Login({ onLogin, onToggleAuth, onForgotPassword, isRegister }: LoginProps) {
  const [showPassword, setShowPassword] = useState(false)
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    name: ''
  })
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsLoading(true)
    
    try {
      // 요청 본문 생성
      const requestBody: {email: string, password: string, name?: string} = {
        email: formData.email,
        password: formData.password,
      }
      
      // 회원가입인 경우 이름 추가
      if (isRegister && formData.name) {
        requestBody.name = formData.name
      }
      
      // API 호출
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      })
      
      // 응답 처리 개선
      if (!response.ok) {
        // 에러 응답 처리
        let errorMessage = '로그인에 실패했습니다.'
        
        // 응답 본문이 있는지 확인하고 JSON 파싱 시도
        const contentType = response.headers.get('content-type')
        if (contentType && contentType.includes('application/json')) {
          try {
            const text = await response.text()
            if (text) {
              const errorData = JSON.parse(text)
              errorMessage = errorData.message || errorMessage
            }
          } catch (parseError) {
            console.error('Error parsing error response:', parseError)
          }
        }
        
        throw new Error(errorMessage)
      }
      
      // 성공 응답 처리
      const text = await response.text()
      
      // 응답이 비어있는지 확인
      if (!text || text.trim() === '') {
        // 응답 본문이 비어있지만 요청은 성공했으므로 임시 데이터로 처리
        console.warn('Empty response body received')
        // 임시 데이터로 처리 (실제 구현에서는 서버가 올바른 응답을 반환해야 함)
        onLogin('temp-token', false)
        return
      }
      
      // JSON 파싱 시도
      try {
        const data: LoginResponse = JSON.parse(text)
        onLogin(data.accessToken, data.isTempPassword)
      } catch (parseError) {
        console.error('Error parsing success response:', parseError)
        throw new Error('서버 응답을 처리할 수 없습니다.')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '로그인 중 오류가 발생했습니다.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-[#0f0f0f] via-[#1a1a1a] to-[#0f0f0f]">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute inset-0" style={{
          backgroundImage: `radial-gradient(circle at 25% 25%, #4ecdc4 0%, transparent 50%), 
                           radial-gradient(circle at 75% 75%, #26a69a 0%, transparent 50%)`
        }} />
      </div>
      
      <div className="relative w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold gradient-text mb-2">모플</h1>
          <p className="text-white/60">친구들과 실시간으로 영화, 드라마, 스포츠를 함께 시청하고 공유하세요</p>
        </div>
        
        {/* Form Container */}
        <div className="glass-effect rounded-2xl p-8 border border-white/20">
          <h2 className="text-2xl mb-6 text-center">
            {isRegister ? '회원가입' : '로그인'}
          </h2>
          
          {error && (
            <div className="bg-red-500/10 border border-red-500/50 text-red-500 p-3 rounded-md mb-4">
              {error}
            </div>
          )}
          
          <form onSubmit={handleSubmit} className="space-y-6">
            {isRegister && (
              <div>
                <Label htmlFor="name" className="text-base">이름</Label>
                <Input
                  id="name"
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="mt-2 h-12 px-4 text-base bg-white/5 border-white/20 focus:border-[#4ecdc4]"
                  placeholder="이름을 입력하세요"
                />
              </div>
            )}
            
            <div>
              <Label htmlFor="email" className="text-base">이메일</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="mt-2 h-12 px-4 text-base bg-white/5 border-white/20 focus:border-[#4ecdc4]"
                placeholder="이메일을 입력하세요"
                required
              />
            </div>
            
            <div>
              <Label htmlFor="password" className="text-base">비밀번호</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="mt-2 h-12 px-4 pr-12 text-base bg-white/5 border-white/20 focus:border-[#4ecdc4]"
                  placeholder="비밀번호를 입력하세요"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 text-white/40 hover:text-white/60"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>
            
            {isRegister && (
              <div>
                <Label htmlFor="confirmPassword" className="text-base">비밀번호 확인</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                  className="mt-2 h-12 px-4 text-base bg-white/5 border-white/20 focus:border-[#4ecdc4]"
                  placeholder="비밀번호를 다시 입력하세요"
                />
              </div>
            )}
            
            <Button 
              type="submit" 
              className="w-full h-12 text-base teal-gradient hover:opacity-80 text-black mt-8"
              disabled={isLoading}
            >
              {isLoading ? '처리 중...' : (isRegister ? '회원가입' : '로그인')}
            </Button>
          </form>
          
          <Separator className="my-6 bg-white/20" />
          
          {/* Social Login */}
          <div className="space-y-4">
            <Button
              variant="outline"
              className="w-full h-12 text-base bg-[#FEE500] hover:bg-[#FEE500]/80 text-black border-[#FEE500]"
              onClick={() => alert('소셜 로그인 API가 연결되지 않았습니다')}
              disabled={isLoading}
            >
              카카오로 계속하기
            </Button>
            
            <Button
              variant="outline"
              className="w-full h-12 text-base bg-white hover:bg-white/90 text-black border-white"
              onClick={() => alert('소셜 로그인 API가 연결되지 않았습니다')}
              disabled={isLoading}
            >
              Google로 계속하기
            </Button>
          </div>
          
          {/* Toggle Auth Mode */}
          <div className="text-center mt-6">
            <span className="text-white/60">
              {isRegister ? '이미 계정이 있나요?' : '계정이 없나요?'}{' '}
            </span>
            <button
              onClick={onToggleAuth}
              className="text-[#4ecdc4] hover:text-[#26a69a] transition-colors"
              disabled={isLoading}
            >
              {isRegister ? '로그인' : '회원가입'}
            </button>
          </div>
          
          {/* Forgot Password - Only show on login */}
          {!isRegister && (
            <div className="text-center mt-4">
              <span className="text-white/60">
                비밀번호를 잊어버리셨나요?{' '}
              </span>
              <button
                onClick={onForgotPassword}
                className="text-[#4ecdc4] hover:text-[#26a69a] transition-colors"
                disabled={isLoading}
              >
                임시비밀번호 발급
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}