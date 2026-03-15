import React, { useEffect, useMemo, useRef } from 'react';
import { gsap } from 'gsap';

interface ParticlesBackgroundProps {
  isDarkMode: boolean;
}

interface ParticleSeed {
  id: number;
  left: number;
  top: number;
  size: number;
  opacity: number;
}

export const ParticlesBackground: React.FC<ParticlesBackgroundProps> = ({ isDarkMode }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  const particles = useMemo<ParticleSeed[]>(() => {
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
    const count = isMobile ? 260 : 520;

    return Array.from({ length: count }, (_, index) => ({
      id: index,
      left: Math.random() * 100,
      top: Math.random() * 100,
      size: Math.random() * 3.6 + 1.2,
      opacity: Math.random() * 0.7 + 0.25
    }));
  }, []);

  useEffect(() => {
    if (!containerRef.current) return;

    const ctx = gsap.context(() => {
      const dots = gsap.utils.toArray<HTMLElement>('.concepta-particle-dot');

      dots.forEach((dot) => {
        const angle = gsap.utils.random(0, Math.PI * 2);
        const distance = gsap.utils.random(90, 260);
        const xTravel = Math.cos(angle) * distance;
        const yTravel = Math.sin(angle) * distance;
        const duration = gsap.utils.random(5, 13);

        gsap.to(dot, {
          y: yTravel,
          x: xTravel,
          duration,
          ease: 'power1.inOut',
          repeat: -1,
          yoyo: true,
          delay: gsap.utils.random(0, 4)
        });

        gsap.to(dot, {
          opacity: gsap.utils.random(0.2, 0.95),
          duration: gsap.utils.random(1.5, 4),
          ease: 'sine.inOut',
          repeat: -1,
          yoyo: true,
          delay: gsap.utils.random(0, 2)
        });
      });
    }, containerRef);

    return () => ctx.revert();
  }, [particles.length]);

  return (
    <div
      ref={containerRef}
      className={`concepta-particle-field ${isDarkMode ? 'dark' : ''}`}
      aria-hidden="true"
    >
      {particles.map((particle) => (
        <span
          key={particle.id}
          className="concepta-particle-dot"
          style={{
            left: `${particle.left}%`,
            top: `${particle.top}%`,
            width: `${particle.size}px`,
            height: `${particle.size}px`,
            opacity: particle.opacity
          }}
        />
      ))}
    </div>
  );
};
