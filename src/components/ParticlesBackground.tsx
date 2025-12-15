'use client';

import { useEffect, useRef } from 'react';

type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
};

const COLORS = ['#7ad7e3', '#3b9faf', '#c7f0ff'];
const LINK_COLOR = '122, 215, 227';
const PARTICLE_COUNT = 60;
const MAX_DISTANCE = 120;
const MAX_SPEED = 0.35;

export function ParticlesBackground({ className }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const classes = ['particles-layer', className].filter(Boolean).join(' ');

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;

    const context = canvas.getContext('2d');
    if (!context) return undefined;

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (prefersReducedMotion.matches) {
      canvas.style.display = 'none';
      return () => {
        canvas.style.display = '';
      };
    }

    const particles: Particle[] = [];
    const devicePixelRatio = window.devicePixelRatio || 1;
    let width = 0;
    let height = 0;
    let animationFrameId = 0;
    let particleCount = PARTICLE_COUNT;
    let maxDistance = MAX_DISTANCE;

    const randomVelocity = () => {
      const velocity = (Math.random() - 0.5) * (MAX_SPEED * 2);
      return Math.abs(velocity) < 0.05 ? Math.sign(velocity || 1) * 0.05 : velocity;
    };

    const createParticle = (): Particle => ({
      x: Math.random() * width,
      y: Math.random() * height,
      vx: randomVelocity(),
      vy: randomVelocity(),
      size: 1.4 + Math.random() * 2.6,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
    });

    const syncSettings = () => {
      const isSmallScreen = window.innerWidth < 720;
      particleCount = isSmallScreen ? 30 : PARTICLE_COUNT;
      maxDistance = isSmallScreen ? 90 : MAX_DISTANCE;
    };

    const syncParticleCount = () => {
      if (particles.length < particleCount) {
        for (let i = particles.length; i < particleCount; i += 1) {
          particles.push(createParticle());
        }
      } else if (particles.length > particleCount) {
        particles.splice(particleCount);
      }
    };

    const resize = () => {
      syncSettings();
      width = window.innerWidth;
      height = window.innerHeight;

      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      canvas.width = Math.floor(width * devicePixelRatio);
      canvas.height = Math.floor(height * devicePixelRatio);

      context.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);

      syncParticleCount();
      particles.forEach((particle) => {
        particle.x = Math.min(Math.max(particle.x, 0), width);
        particle.y = Math.min(Math.max(particle.y, 0), height);
      });
    };

    const draw = () => {
      context.clearRect(0, 0, width, height);

      for (let i = 0; i < particles.length; i += 1) {
        const particle = particles[i];
        particle.x += particle.vx;
        particle.y += particle.vy;

        if (particle.x <= 0 || particle.x >= width) {
          particle.vx *= -1;
        }

        if (particle.y <= 0 || particle.y >= height) {
          particle.vy *= -1;
        }

        for (let j = i + 1; j < particles.length; j += 1) {
          const neighbor = particles[j];
          const dx = particle.x - neighbor.x;
          const dy = particle.y - neighbor.y;
          const distance = Math.hypot(dx, dy);

          if (distance < maxDistance) {
            const opacity = 0.6 * (1 - distance / maxDistance);
            context.strokeStyle = `rgba(${LINK_COLOR}, ${opacity.toFixed(3)})`;
            context.lineWidth = 1;
            context.beginPath();
            context.moveTo(particle.x, particle.y);
            context.lineTo(neighbor.x, neighbor.y);
            context.stroke();
          }
        }

        context.fillStyle = particle.color;
        const halfSize = particle.size / 2;
        context.fillRect(particle.x - halfSize, particle.y - halfSize, particle.size, particle.size);
      }

      animationFrameId = window.requestAnimationFrame(draw);
    };

    resize();
    animationFrameId = window.requestAnimationFrame(draw);
    window.addEventListener('resize', resize);

    return () => {
      window.cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return <canvas ref={canvasRef} className={classes} aria-hidden="true" />;
}
