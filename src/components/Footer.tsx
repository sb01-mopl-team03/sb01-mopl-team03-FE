import { Heart, Github, Twitter, Instagram, Mail } from 'lucide-react'

export function Footer() {
  const currentYear = new Date().getFullYear()

  const footerLinks = {
    서비스: [
      { name: '홈', href: '#home' },
      { name: '영화', href: '#movies' },
      { name: '드라마', href: '#drama' },
      { name: '스포츠', href: '#sports' },
      { name: '큐레이션', href: '#curation' },
      { name: '라이브', href: '#live' }
    ],
    고객지원: [
      { name: '공지사항', href: '#notices' },
      { name: '자주 묻는 질문', href: '#faq' },
      { name: '고객센터', href: '#support' },
      { name: '버그 신고', href: '#bug-report' }
    ],
    정책: [
      { name: '이용약관', href: '#terms' },
      { name: '개인정보처리방침', href: '#privacy' },
      { name: '저작권 정책', href: '#copyright' },
      { name: '커뮤니티 가이드라인', href: '#guidelines' }
    ],
    회사: [
      { name: '회사소개', href: '#about' },
      { name: '채용정보', href: '#careers' },
      { name: '파트너십', href: '#partnership' },
      { name: '광고문의', href: '#advertising' }
    ]
  }

  const socialLinks = [
    { name: 'Github', icon: Github, href: '#github' },
    { name: 'Twitter', icon: Twitter, href: '#twitter' },
    { name: 'Instagram', icon: Instagram, href: '#instagram' },
    { name: 'Email', icon: Mail, href: 'mailto:contact@mopl.kr' }
  ]

  return (
    <footer className="bg-[#0f0f0f] border-t border-white/10 mt-20">
      <div className="max-w-7xl mx-auto px-6 py-12">
        {/* Main Footer Content */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-8 mb-8">
          {/* Brand Section */}
          <div className="lg:col-span-2">
            <div className="gradient-text text-2xl font-bold mb-4">모플</div>
            <p className="text-white/60 text-sm leading-relaxed mb-6">
              친구들과 실시간으로 영화, 드라마, 스포츠를 함께 시청하고 공유하는 
              소셜 스트리밍 플랫폼입니다.
            </p>
            
            {/* Social Links */}
            <div className="flex space-x-4">
              {socialLinks.map((social) => {
                const Icon = social.icon
                return (
                  <a
                    key={social.name}
                    href={social.href}
                    className="text-white/40 hover:text-[#4ecdc4] transition-colors p-2 hover:bg-white/5 rounded-lg"
                    aria-label={social.name}
                  >
                    <Icon className="w-5 h-5" />
                  </a>
                )
              })}
            </div>
          </div>

          {/* Footer Links */}
          {Object.entries(footerLinks).map(([category, links]) => (
            <div key={category}>
              <h3 className="font-medium mb-4 text-white">{category}</h3>
              <ul className="space-y-3">
                {links.map((link) => (
                  <li key={link.name}>
                    <a
                      href={link.href}
                      className="text-white/60 hover:text-white transition-colors text-sm"
                    >
                      {link.name}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom Footer */}
        <div className="pt-8 border-t border-white/10">
          <div className="flex flex-col sm:flex-row justify-between items-center space-y-4 sm:space-y-0">
            <div className="text-white/40 text-sm">
              © {currentYear} 모플(MOPL). All rights reserved.
            </div>
            
            <div className="flex items-center space-x-2 text-white/40 text-sm">
              <span>Made with</span>
              <Heart className="w-4 h-4 text-red-500 fill-current" />
              <span>in Korea</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}