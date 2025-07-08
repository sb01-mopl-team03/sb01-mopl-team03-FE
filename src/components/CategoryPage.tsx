import React, { useState } from 'react'
import { Search, Filter, Play, Eye, Star, MessageSquare, Plus } from 'lucide-react'
import { Input } from './ui/input'
import { Button } from './ui/button'
import { Badge } from './ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select'

interface CategoryPageProps {
  category: 'movies' | 'drama' | 'sports'
  onContentPlay: (content: ContentItem) => void
  onContentDetail?: (content: ContentItem) => void
  onAddToPlaylist?: (content: ContentItem) => void
}

interface ContentItem {
  id: number
  title: string
  thumbnail: string
  type: 'movie' | 'drama' | 'sports'
  duration: string
  description: string
  rating?: number
  reviewCount?: number
  year?: number
}

const getCategoryTitle = (category: string) => {
  switch (category) {
    case 'movies': return '영화'
    case 'drama': return '드라마'
    case 'sports': return '스포츠'
    default: return '콘텐츠'
  }
}

const getContentByCategory = (category: string): ContentItem[] => {
  const baseContent = {
    movies: [
      {
        id: 1,
        title: '기생충',
        thumbnail: 'https://images.unsplash.com/photo-1489599538883-17dd35352ad5?w=400&h=600&fit=crop&crop=face',
        type: 'movie' as const,
        duration: '132분',
        description: '전 세계를 놀라게 한 봉준호 감독의 작품. 계급 갈등을 다룬 블랙 코미디 스릴러.',
        rating: 4.8,
        reviewCount: 342,
        year: 2019
      },
      {
        id: 2,
        title: '올드보이',
        thumbnail: 'https://images.unsplash.com/photo-1515634928627-2a4e0dae3ddf?w=400&h=600&fit=crop&crop=face',
        type: 'movie' as const,
        duration: '120분',
        description: '박찬욱 감독의 복수 3부작 중 두 번째 작품. 15년간 감금된 남자의 복수 이야기.',
        rating: 4.6,
        reviewCount: 289,
        year: 2003
      },
      {
        id: 3,
        title: '아가씨',
        thumbnail: 'https://images.unsplash.com/photo-1574267432553-4b4628081c31?w=400&h=600&fit=crop&crop=face',
        type: 'movie' as const,
        duration: '145분',
        description: '박찬욱 감독이 그려낸 사랑과 배신의 이야기. 정교한 스토리텔링이 돋보이는 작품.',
        rating: 4.7,
        reviewCount: 156,
        year: 2016
      },
      {
        id: 4,
        title: '버닝',
        thumbnail: 'https://images.unsplash.com/photo-1516715094483-75da06c83c84?w=400&h=600&fit=crop&crop=face',
        type: 'movie' as const,
        duration: '148분',
        description: '이창동 감독의 미스터리 드라마. 하루키의 소설을 바탕으로 한 작품.',
        rating: 4.4,
        reviewCount: 203,
        year: 2018
      },
      {
        id: 5,
        title: '헤어질 결심',
        thumbnail: 'https://images.unsplash.com/photo-1509909756405-be0199881695?w=400&h=600&fit=crop&crop=face',
        type: 'movie' as const,
        duration: '138분',
        description: '박찬욱 감독의 로맨틱 스릴러. 형사와 용의자 사이의 복잡한 감정을 그린 작품.',
        rating: 4.5,
        reviewCount: 178,
        year: 2022
      },
      {
        id: 6,
        title: '실버라이닝 플레이북',
        thumbnail: 'https://images.unsplash.com/photo-1513475382585-d06e58bcb0e0?w=400&h=600&fit=crop&crop=face',
        type: 'movie' as const,
        duration: '122분',
        description: '정신적 문제를 가진 두 사람의 사랑과 치유를 그린 로맨틱 코미디.',
        rating: 4.3,
        reviewCount: 124,
        year: 2012
      },
      {
        id: 7,
        title: '라라랜드',
        thumbnail: 'https://images.unsplash.com/photo-1518929458119-e5bf444c30f4?w=400&h=600&fit=crop&crop=face',
        type: 'movie' as const,
        duration: '128분',
        description: '꿈을 좇는 두 연인의 이야기를 담은 뮤지컬 영화. 아름다운 음악과 안무가 인상적.',
        rating: 4.6,
        reviewCount: 267,
        year: 2016
      },
      {
        id: 8,
        title: '인터스텔라',
        thumbnail: 'https://images.unsplash.com/photo-1446776877081-d282a0f896e2?w=400&h=600&fit=crop&crop=face',
        type: 'movie' as const,
        duration: '169분',
        description: '크리스토퍼 놀란 감독의 SF 대작. 인류의 생존을 위한 우주 여행을 그린 작품.',
        rating: 4.7,
        reviewCount: 389,
        year: 2014
      }
    ],
    drama: [
      {
        id: 9,
        title: '스카이캐슬',
        thumbnail: 'https://images.unsplash.com/photo-1551334787-21e6bd773eed?w=400&h=600&fit=crop&crop=face',
        type: 'drama' as const,
        duration: '16화',
        description: '상위 1% 상류층의 입시 전쟁을 다룬 블랙 코미디 드라마.',
        rating: 4.9,
        reviewCount: 456,
        year: 2018
      },
      {
        id: 10,
        title: '사랑의 불시착',
        thumbnail: 'https://images.unsplash.com/photo-1516684732162-798a0062be99?w=400&h=600&fit=crop&crop=face',
        type: 'drama' as const,
        duration: '16화',
        description: '재벌 2세 여자와 북한 군인의 로맨스를 그린 로맨틱 코미디.',
        rating: 4.8,
        reviewCount: 523,
        year: 2019
      },
      {
        id: 11,
        title: '이태원 클라쓰',
        thumbnail: 'https://images.unsplash.com/photo-1546015720-b8b30df5aa27?w=400&h=600&fit=crop&crop=face',
        type: 'drama' as const,
        duration: '16화',
        description: '작은 술집에서 시작해 대기업에 맞서는 청년의 성장 스토리.',
        rating: 4.6,
        reviewCount: 378,
        year: 2020
      },
      {
        id: 12,
        title: '킹덤',
        thumbnail: 'https://images.unsplash.com/photo-1489424731084-a5d8b219a5bb?w=400&h=600&fit=crop&crop=face',
        type: 'drama' as const,
        duration: '시즌 1-2',
        description: '조선시대를 배경으로 한 좀비 스릴러. 정치와 호러가 결합된 독특한 작품.',
        rating: 4.7,
        reviewCount: 234,
        year: 2019
      },
      {
        id: 13,
        title: '도깨비',
        thumbnail: 'https://images.unsplash.com/photo-1503023345310-bd7c1de61c7d?w=400&h=600&fit=crop&crop=face',
        type: 'drama' as const,
        duration: '16화',
        description: '불멸의 존재 도깨비와 인간들의 판타지 로맨스 드라마.',
        rating: 4.8,
        reviewCount: 467,
        year: 2016
      },
      {
        id: 14,
        title: '태양의 후예',
        thumbnail: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=600&fit=crop&crop=face',
        type: 'drama' as const,
        duration: '16화',
        description: '군인과 의사의 사랑을 그린 로맨틱 멜로 드라마.',
        rating: 4.5,
        reviewCount: 356,
        year: 2016
      },
      {
        id: 15,
        title: '시그널',
        thumbnail: 'https://images.unsplash.com/photo-1481069768798-8ef2e9b8b44c?w=400&h=600&fit=crop&crop=face',
        type: 'drama' as const,
        duration: '16화',
        description: '과거와 현재를 잇는 무전기로 미제 사건을 해결하는 스릴러.',
        rating: 4.6,
        reviewCount: 289,
        year: 2016
      },
      {
        id: 16,
        title: '화양연화',
        thumbnail: 'https://images.unsplash.com/photo-1516724562728-afc824a36e84?w=400&h=600&fit=crop&crop=face',
        type: 'drama' as const,
        duration: '20화',
        description: '청춘의 꿈과 사랑을 그린 성장 로맨스 드라마.',
        rating: 4.4,
        reviewCount: 198,
        year: 2019
      }
    ],
    sports: [
      {
        id: 17,
        title: '2024 파리 올림픽',
        thumbnail: 'https://images.unsplash.com/photo-1530549387789-4c1017266635?w=400&h=600&fit=crop&crop=center',
        type: 'sports' as const,
        duration: '라이브',
        description: '세계 최고의 선수들이 펼치는 올림픽 경기 실시간 중계.',
        rating: 4.9,
        reviewCount: 634,
        year: 2024
      },
      {
        id: 18,
        title: 'KBO 리그',
        thumbnail: 'https://images.unsplash.com/photo-1566577739112-5180d4bf9390?w=400&h=600&fit=crop&crop=center',
        type: 'sports' as const,
        duration: '라이브',
        description: '한국 프로야구 경기 실시간 중계 및 하이라이트.',
        rating: 4.5,
        reviewCount: 423,
        year: 2024
      },
      {
        id: 19,
        title: 'K리그1',
        thumbnail: 'https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=400&h=600&fit=crop&crop=center',
        type: 'sports' as const,
        duration: '라이브',
        description: '한국 프로축구 K리그1 경기 실시간 중계.',
        rating: 4.3,
        reviewCount: 234,
        year: 2024
      },
      {
        id: 20,
        title: 'V-리그',
        thumbnail: 'https://images.unsplash.com/photo-1612872087720-bb876e2e67d1?w=400&h=600&fit=crop&crop=center',
        type: 'sports' as const,
        duration: '라이브',
        description: '한국 프로배구 V-리그 남녀부 경기 중계.',
        rating: 4.2,
        reviewCount: 167,
        year: 2024
      },
      {
        id: 21,
        title: 'UFC',
        thumbnail: 'https://images.unsplash.com/photo-1544737151500-6fadb0e4e9aa?w=400&h=600&fit=crop&crop=center',
        type: 'sports' as const,
        duration: '라이브',
        description: '세계 최정상급 종합격투기 대회 UFC 경기 중계.',
        rating: 4.6,
        reviewCount: 345,
        year: 2024
      },
      {
        id: 22,
        title: 'NBA',
        thumbnail: 'https://images.unsplash.com/photo-1546519638-68e109498ffc?w=400&h=600&fit=crop&crop=center',
        type: 'sports' as const,
        duration: '라이브',
        description: '미국 프로농구 NBA 정규시즌 및 플레이오프 중계.',
        rating: 4.7,
        reviewCount: 456,
        year: 2024
      },
      {
        id: 23,
        title: '프리미어리그',
        thumbnail: 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=400&h=600&fit=crop&crop=center',
        type: 'sports' as const,
        duration: '라이브',
        description: '영국 프리미어리그 축구 경기 실시간 중계.',
        rating: 4.8,
        reviewCount: 567,
        year: 2024
      },
      {
        id: 24,
        title: '테니스 윔블던',
        thumbnail: 'https://images.unsplash.com/photo-1552196563-55cd4e45efb3?w=400&h=600&fit=crop&crop=center',
        type: 'sports' as const,
        duration: '라이브',
        description: '테니스 4대 그랜드슬램 대회 윔블던 중계.',
        rating: 4.4,
        reviewCount: 289,
        year: 2024
      }
    ]
  }

  return baseContent[category as keyof typeof baseContent] || []
}

export function CategoryPage({ category, onContentPlay, onContentDetail, onAddToPlaylist }: CategoryPageProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState('latest')
  const [filterBy, setFilterBy] = useState('all')

  const content = getContentByCategory(category)
  const categoryTitle = getCategoryTitle(category)

  const filteredContent = content.filter(item =>
    item.title.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleAddToPlaylist = (item: ContentItem) => {
    onAddToPlaylist?.(item)
    console.log(`Opening playlist modal for: ${item.title}`)
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl mb-4">{categoryTitle}</h1>
          
          {/* Search and Filters */}
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 w-4 h-4 text-white/60" />
              <Input
                placeholder={`${categoryTitle} 검색...`}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-14 h-12 bg-white/5 border-white/20 focus:border-[#4ecdc4]"
              />
            </div>
            
            <div className="flex gap-3">
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-40 bg-white/5 border-white/20">
                  <SelectValue placeholder="정렬" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="latest">최신순</SelectItem>
                  <SelectItem value="popular">인기순</SelectItem>
                  <SelectItem value="rating">평점순</SelectItem>
                  <SelectItem value="title">제목순</SelectItem>
                </SelectContent>
              </Select>

              <Select value={filterBy} onValueChange={setFilterBy}>
                <SelectTrigger className="w-40 bg-white/5 border-white/20">
                  <SelectValue placeholder="필터" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">전체</SelectItem>
                  <SelectItem value="new">신작</SelectItem>
                  <SelectItem value="trending">인기</SelectItem>
                  <SelectItem value="recommended">추천</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Stats */}
          <div className="flex items-center gap-4 text-white/60">
            <span>총 {filteredContent.length}개</span>
            <Badge variant="outline" className="border-[#4ecdc4]/30 text-[#4ecdc4]">
              업데이트됨
            </Badge>
          </div>
        </div>

        {/* Content Grid - 4 columns */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {filteredContent.map((item) => (
            <div
              key={item.id}
              className="bg-card rounded-lg overflow-hidden border border-white/10 hover:border-[#4ecdc4]/30 transition-all duration-300 group"
            >
              {/* Thumbnail */}
              <div className="aspect-[3/4] relative overflow-hidden">
                <img
                  src={item.thumbnail}
                  alt={item.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement
                    target.src = `https://images.unsplash.com/photo-1489599538883-17dd35352ad5?w=400&h=600&fit=crop&crop=face&auto=format&q=80`
                  }}
                />
                
                {/* Overlay with action buttons */}
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center gap-2">
                  <Button
                    size="sm"
                    onClick={() => onContentPlay(item)}
                    className="teal-gradient hover:opacity-80 text-black"
                  >
                    <Play className="w-4 h-4 mr-1" />
                    재생
                  </Button>
                  
                  {onContentDetail && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onContentDetail(item)}
                      className="border-white/20 hover:bg-white/10"
                    >
                      <Eye className="w-4 h-4 mr-1" />
                      상세
                    </Button>
                  )}
                  
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleAddToPlaylist(item)}
                    className="border-white/20 hover:bg-white/10"
                    title="플레이리스트에 추가"
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* Content Info */}
              <div className="p-4">
                <h3 className="font-medium mb-2 line-clamp-1">{item.title}</h3>
                <p className="text-sm text-white/60 mb-2">{item.duration}</p>
                
                {/* Rating and Reviews */}
                {item.rating && (
                  <div className="flex items-center gap-3 mb-2">
                    <div className="flex items-center gap-1">
                      <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                      <span className="text-sm">{item.rating}</span>
                    </div>
                    <div className="flex items-center gap-1 text-white/60">
                      <MessageSquare className="w-3 h-3" />
                      <span className="text-xs">{item.reviewCount}</span>
                    </div>
                  </div>
                )}
                
                <p className="text-xs text-white/40 line-clamp-2">{item.description}</p>
                
                {/* Action buttons for mobile */}
                <div className="flex gap-2 mt-4 md:hidden">
                  <Button
                    size="sm"
                    onClick={() => onContentPlay(item)}
                    className="flex-1 teal-gradient hover:opacity-80 text-black"
                  >
                    <Play className="w-4 h-4 mr-2" />
                    재생
                  </Button>
                  
                  <div className="flex gap-1">
                    {onContentDetail && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onContentDetail(item)}
                        className="border-white/20 hover:bg-white/10"
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                    )}
                    
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleAddToPlaylist(item)}
                      className="border-white/20 hover:bg-white/10"
                      title="플레이리스트에 추가"
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Empty State */}
        {filteredContent.length === 0 && (
          <div className="text-center py-12">
            <p className="text-white/60 mb-4">검색 결과가 없습니다.</p>
            <Button
              variant="outline"
              onClick={() => setSearchQuery('')}
              className="border-white/20 hover:bg-white/5"
            >
              전체 {categoryTitle} 보기
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}