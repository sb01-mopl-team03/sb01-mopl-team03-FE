import React, { useState } from 'react'
import { Eye, EyeOff, Camera } from 'lucide-react'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { Separator } from './ui/separator'
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar'
import { ProfileImageSelector } from './ProfileImageSelector'

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
  const [profileImage, setProfileImage] = useState<File | null>(null)
  const [showProfileSelector, setShowProfileSelector] = useState(false)
  const [passwordError, setPasswordError] = useState('')
  

  const validatePassword = (value: string) => {
  const passwordRegex = /^(?=.*[0-9])(?=.*[a-zA-Z])(?=.*[!@#$%^&*]).{8,}$/;
  if (!value) {
    setPasswordError('비밀번호를 입력해주세요.');
  } else if (!passwordRegex.test(value)) {
    setPasswordError('비밀번호는 8자 이상이며, 숫자, 영문, 특수문자를 포함해야 합니다.');
  } else {
    setPasswordError('');
  }
};


  // 카카오 OAuth 로그인
  const handleKakaoLogin = () => {
    console.log('🟡 카카오 로그인 버튼 클릭됨')
    // 백엔드에서 소셜 로그인 성공 후, 프론트엔드의 /oauth/callback 으로 access_token을 쿼리로 리다이렉트해야 함
    window.location.href = `${import.meta.env.VITE_BACKEND_URL || 'http://localhost:8080'}/oauth2/authorization/kakao`
  }

  // 구글 OAuth 로그인
  const handleGoogleLogin = () => {
    // 백엔드에서 소셜 로그인 성공 후, 프론트엔드의 /oauth/callback 으로 access_token을 쿼리로 리다이렉트해야 함
    window.location.href = `${import.meta.env.VITE_BACKEND_URL || 'http://localhost:8080'}/oauth2/authorization/google`
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsLoading(true)
    
    try {
      if (isRegister) {
        // 회원가입 폼 검증
        if (!formData.name.trim()) {
          setError('이름을 입력해주세요.')
          return
        }
        
        if (formData.name.length < 3 || formData.name.length > 50) {
          setError('이름은 3자 이상 50자 이하로 입력해주세요.')
          return
        }
        
        if (!formData.email.trim()) {
          setError('이메일을 입력해주세요.')
          return
        }
        
        if (!formData.password.trim()) {
          setError('비밀번호를 입력해주세요.')
          return
        }
        
        const passwordRegex  = /^(?=.*[0-9])(?=.*[a-zA-Z])(?=.*[!@#$%^&*]).{8,}$/;

        if(!passwordRegex.test(formData.password)){
          setError('비밀번호는 8자 이상, 숫자, 영문, 특수문자를 포함해야 합니다.')
          return
        }

        if (formData.password !== formData.confirmPassword) {
          setError('비밀번호가 일치하지 않습니다.')
          return
        }
        
        // 회원가입 API 호출 - multipart/form-data 방식
        const formDataToSend = new FormData()
        formDataToSend.append('email', formData.email)
        formDataToSend.append('name', formData.name)
        formDataToSend.append('password', formData.password)
        
        // 프로필 이미지 추가
        if (profileImage) {
          formDataToSend.append('profile', profileImage)
        }
        
        const response = await fetch(`${import.meta.env.VITE_BACKEND_URL || 'http://localhost:8080'}/api/users`, {
          method: 'POST',
          credentials: 'include', // 쿠키 포함
          body: formDataToSend, // FormData를 직접 전송 (Content-Type 헤더는 자동 설정됨)
        })
        
        if (!response.ok) {
          let errorMessage = '회원가입에 실패했습니다.'
          
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
        
        // 회원가입 성공 시 로그인 화면으로 전환
        alert('회원가입이 완료되었습니다. 로그인해주세요.')
        onToggleAuth()
      } else {
        // 로그인 API 호출
        const requestBody = {
          email: formData.email,
          password: formData.password,
        }
        
        const response = await fetch(`${import.meta.env.VITE_BACKEND_URL || 'http://localhost:8080'}/api/auth/login`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include', // 쿠키 포함 - refresh token 받기 위함
          body: JSON.stringify(requestBody),
        })
        
        if (!response.ok) {
          let errorMessage = '로그인에 실패했습니다.'
          
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
        
        const text = await response.text()
        
        if (!text || text.trim() === '') {
          console.warn('Empty response body received')
          onLogin('temp-token', false)
          return
        }
        
        try {
          const data: LoginResponse = JSON.parse(text)
          onLogin(data.accessToken, data.isTempPassword)
        } catch (parseError) {
          console.error('Error parsing success response:', parseError)
          throw new Error('서버 응답을 처리할 수 없습니다.')
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '처리 중 오류가 발생했습니다.')
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
                  placeholder="이름을 입력하세요 (3-50자)"
                  required
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
                  onChange={(e) => {
                    const value = e.target.value;
                    setFormData({ ...formData, password: value });
                    if (isRegister) validatePassword(value); // 회원가입일 때만 실시간 검사
                  }}
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
               {isRegister && passwordError && (
                  <p className="text-red-500 text-sm mt-2">{passwordError}</p>
                )}
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
                  required
                />
              </div>
            )}
            
            {isRegister && (
              <div>
                <Label className="text-base">프로필 사진</Label>
                <div className="mt-2 flex items-center space-x-4">
                  {/* 프로필 이미지 미리보기 */}
                  <Avatar className="h-16 w-16">
                    <AvatarImage 
                      src={profileImage ? URL.createObjectURL(profileImage) : undefined}
                    />
                    <AvatarFallback className="bg-[#4ecdc4] text-black">
                      {formData.name.charAt(0) || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  
                  {/* 프로필 이미지 선택 버튼 */}
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowProfileSelector(!showProfileSelector)}
                    className="flex items-center space-x-2 border-white/20 hover:bg-white/5"
                  >
                    <Camera className="w-4 h-4" />
                    <span>사진 선택</span>
                  </Button>
                </div>
                
                {/* 프로필 이미지 선택기 */}
                {showProfileSelector && (
                  <div className="mt-4">
                    <ProfileImageSelector
                      selectedImage={profileImage}
                      onImageSelect={setProfileImage}
                      onClose={() => setShowProfileSelector(false)}
                      userName={formData.name}
                    />
                  </div>
                )}
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
              onClick={handleKakaoLogin}
              disabled={isLoading}
            >
              카카오로 {isRegister ? '가입하기' : '로그인'}
            </Button>
            
            <Button
              variant="outline"
              className="w-full h-12 text-base bg-white hover:bg-white/90 text-black border-white"
              onClick={handleGoogleLogin}
              disabled={isLoading}
            >
              Google로 {isRegister ? '가입하기' : '로그인'}
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