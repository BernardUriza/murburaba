import React, { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import styles from './BannerHero.module.css'

export const BannerHero: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null)
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 })
  const [isHovered, setIsHovered] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      if (containerRef.current) {
        const scrollY = window.scrollY
        const parallaxSpeed = 0.5
        containerRef.current.style.transform = `translateY(${scrollY * parallaxSpeed}px)`
      }
    }

    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return
    const rect = containerRef.current.getBoundingClientRect()
    const x = (e.clientX - rect.left) / rect.width - 0.5
    const y = (e.clientY - rect.top) / rect.height - 0.5
    setMousePosition({ x, y })
  }

  return (
    <div 
      ref={containerRef}
      className={styles.heroContainer}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Floating particles */}
      <div className={styles.particlesContainer}>
        {[...Array(6)].map((_, i) => (
          <div key={i} className={`${styles.particle} ${styles[`particle${i + 1}`]}`} />
        ))}
      </div>
      
      {/* Dynamic glow that follows mouse */}
      <div 
        className={styles.radialGlow} 
        style={{
          transform: `translate(calc(-50% + ${mousePosition.x * 50}px), calc(-50% + ${mousePosition.y * 50}px))`,
          opacity: isHovered ? 0.8 : 0.5
        }}
      />
      
      {/* Main banner with 3D transform */}
      <div className={styles.bannerWrapper}>
        <div 
          className={styles.bannerInner}
          style={{
            transform: `perspective(1000px) rotateX(${-mousePosition.y * 10}deg) rotateY(${mousePosition.x * 10}deg) scale(${isHovered ? 1.05 : 1})`
          }}
        >
          <Image
            src="/banner.png"
            alt="Murmuraba - Neural Audio Engine"
            width={600}
            height={200}
            className={styles.bannerImage}
            priority
            quality={100}
          />
        </div>
        
        {/* Animated sound waves */}
        <div className={styles.soundWaves}>
          {[...Array(3)].map((_, i) => (
            <div key={i} className={`${styles.wave} ${styles[`wave${i + 1}`]}`} />
          ))}
        </div>
      </div>
      
      {/* Enhanced blur gradients */}
      <div className={`${styles.blurTop} ${isHovered ? styles.blurActive : ''}`} />
      <div className={`${styles.blurBottom} ${isHovered ? styles.blurActive : ''}`} />
      
      {/* Decorative corners */}
      <div className={styles.cornerDecoration}>
        <div className={styles.cornerTL} />
        <div className={styles.cornerTR} />
        <div className={styles.cornerBL} />
        <div className={styles.cornerBR} />
      </div>
      
      {/* Animated tagline */}
      <div className={styles.taglineContainer}>
        <p className={styles.tagline}>
          <span className={styles.taglineWord}>Neural</span>
          <span className={styles.taglineDot}>•</span>
          <span className={styles.taglineWord}>Audio</span>
          <span className={styles.taglineDot}>•</span>
          <span className={styles.taglineWord}>Engine</span>
        </p>
      </div>
    </div>
  )
}