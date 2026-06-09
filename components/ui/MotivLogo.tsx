'use client'

import Image from 'next/image'

interface MotivLogoProps {
  size?: number
  className?: string
}

export function MotivLogo({ size = 44, className = '' }: MotivLogoProps) {
  return (
    <Image
      src="/logo.svg"
      alt="Motiv"
      width={size}
      height={size}
      className={`object-contain ${className}`}
      priority
    />
  )
}
