'use client'

import Image from 'next/image'

interface MotivLogoProps {
  size?: number
  className?: string
}

export function MotivLogo({ size = 36, className = '' }: MotivLogoProps) {
  return (
    <Image
      src="/logo.png"
      alt="Motiv"
      width={size}
      height={size}
      className={`rounded-md object-contain ${className}`}
      priority
    />
  )
}
