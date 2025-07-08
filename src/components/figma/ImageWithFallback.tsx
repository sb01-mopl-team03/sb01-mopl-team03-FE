import React, { useState } from 'react'
import { ImageIcon } from 'lucide-react'

export function ImageWithFallback(props: React.ImgHTMLAttributes<HTMLImageElement>) {
  const [didError, setDidError] = useState(false)

  const handleError = () => {
    setDidError(true)
  }

  const { src, alt, style, className, ...rest } = props

  return didError ? (
    <div
      className={`inline-block teal-gradient text-center align-middle ${className ?? ''}`}
      style={style}
    >
      <div className="flex items-center justify-center w-full h-full">
        <div className="text-center text-black/70">
          <ImageIcon className="w-8 h-8 mx-auto mb-2" />
          <p className="text-sm font-medium">이미지 없음</p>
        </div>
      </div>
    </div>
  ) : (
    <img src={src} alt={alt} className={className} style={style} {...rest} onError={handleError} />
  )
}