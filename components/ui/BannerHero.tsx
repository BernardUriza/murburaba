import React from 'react'
import Image from 'next/image'
import styles from './BannerHero.module.css'

export const BannerHero: React.FC = () => {
  return (
    <div className={styles.heroContainer}>
      <div className={styles.radialGlow} />
      <div className={styles.bannerWrapper}>
        <Image
          src="/banner.png"
          alt="Murmuraba"
          width={600}
          height={200}
          className={styles.bannerImage}
          priority
        />
      </div>
      <div className={styles.blurTop} />
      <div className={styles.blurBottom} />
    </div>
  )
}