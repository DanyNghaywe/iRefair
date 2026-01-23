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

const COLORS = ['rgba(122, 215, 227, 0.55)', 'rgba(59, 159, 175, 0.55)', 'rgba(199, 240, 255, 0.55)'];
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

    const particles: Particle[] = [];
    let devicePixelRatio = window.devicePixelRatio || 1;
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const visualViewport = window.visualViewport;
    let reducedMotion = prefersReducedMotion.matches;
    let isVisible = !document.hidden;
    let isRunning = false;
    let width = 0;
    let height = 0;
    let animationFrameId = 0;
    let resizeRaf = 0;
    let particleCount = PARTICLE_COUNT;
    let maxDistance = MAX_DISTANCE;
    let linkOpacityBase = 0.6;

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
      const isSmallScreen = window.innerWidth < 720 || (window.matchMedia && window.matchMedia('(pointer: coarse)').matches);
      particleCount = isSmallScreen ? 20 : PARTICLE_COUNT;
      maxDistance = isSmallScreen ? 90 : MAX_DISTANCE;
      linkOpacityBase = reducedMotion ? 0 : isSmallScreen ? 0 : 0.2;
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

    const getViewportSize = () => {
      if (visualViewport) {
        return {
          width: Math.round(visualViewport.width),
          height: Math.round(visualViewport.height),
        };
      }
      return {
        width: window.innerWidth,
        height: window.innerHeight,
      };
    };

    const resize = () => {
      syncSettings();
      const viewport = getViewportSize();
      const screenHeight = window.screen?.height ?? viewport.height;
      const paddedHeight = Math.max(viewport.height, screenHeight);
      const nextDevicePixelRatio = window.devicePixelRatio || 1;

      if (viewport.width === width && paddedHeight === height && nextDevicePixelRatio === devicePixelRatio) {
        return;
      }

      width = viewport.width;
      height = paddedHeight;
      devicePixelRatio = nextDevicePixelRatio;

      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      canvas.width = Math.floor(width * devicePixelRatio);
      canvas.height = Math.floor(height * devicePixelRatio);

      context.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);

      document.documentElement.style.setProperty('--visual-viewport-height', `${height}px`);

      syncParticleCount();
      particles.forEach((particle) => {
        particle.x = Math.min(Math.max(particle.x, 0), width);
        particle.y = Math.min(Math.max(particle.y, 0), height);
      });
      renderFrame(false);
    };

    const scheduleResize = () => {
      if (resizeRaf) return;
      resizeRaf = window.requestAnimationFrame(() => {
        resizeRaf = 0;
        resize();
      });
    };

    const renderFrame = (animate: boolean) => {
      context.clearRect(0, 0, width, height);

      for (let i = 0; i < particles.length; i += 1) {
        const particle = particles[i];
        if (animate) {
          particle.x += particle.vx;
          particle.y += particle.vy;

          if (particle.x <= 0 || particle.x >= width) {
            particle.vx *= -1;
          }

          if (particle.y <= 0 || particle.y >= height) {
            particle.vy *= -1;
          }
        }

        for (let j = i + 1; j < particles.length; j += 1) {
          const neighbor = particles[j];
          const dx = particle.x - neighbor.x;
          const dy = particle.y - neighbor.y;
          const distance = Math.hypot(dx, dy);

          if (distance < maxDistance && linkOpacityBase > 0) {
            const opacity = linkOpacityBase * (1 - distance / maxDistance);
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
    };

    const draw = () => {
      if (!isRunning) return;
      renderFrame(true);
      animationFrameId = window.requestAnimationFrame(draw);
    };

    const stopAnimation = () => {
      if (!isRunning) return;
      isRunning = false;
      window.cancelAnimationFrame(animationFrameId);
      animationFrameId = 0;
    };

    const startAnimation = () => {
      if (isRunning || reducedMotion || !isVisible) return;
      isRunning = true;
      animationFrameId = window.requestAnimationFrame(draw);
    };

    const handleVisibilityChange = () => {
      isVisible = !document.hidden;
      if (!isVisible) {
        stopAnimation();
      } else {
        startAnimation();
      }
    };

    const handleReducedMotionChange = (event: MediaQueryListEvent) => {
      reducedMotion = event.matches;
      syncSettings();
      if (reducedMotion) {
        stopAnimation();
        renderFrame(false);
      } else {
        startAnimation();
      }
    };

    const addListener = (media: MediaQueryList, handler: (event: MediaQueryListEvent) => void) => {
      if (typeof media.addEventListener === 'function') {
        media.addEventListener('change', handler);
      } else {
        media.addListener(handler);
      }
    };

    const removeListener = (media: MediaQueryList, handler: (event: MediaQueryListEvent) => void) => {
      if (typeof media.removeEventListener === 'function') {
        media.removeEventListener('change', handler);
      } else {
        media.removeListener(handler);
      }
    };

    resize();
    if (reducedMotion) {
      renderFrame(false);
    } else {
      startAnimation();
    }
    window.addEventListener('resize', scheduleResize);
    if (visualViewport) {
      visualViewport.addEventListener('resize', scheduleResize);
      visualViewport.addEventListener('scroll', scheduleResize);
    }
    document.addEventListener('visibilitychange', handleVisibilityChange);
    addListener(prefersReducedMotion, handleReducedMotionChange);

    return () => {
      stopAnimation();
      if (resizeRaf) {
        window.cancelAnimationFrame(resizeRaf);
        resizeRaf = 0;
      }
      window.removeEventListener('resize', scheduleResize);
      if (visualViewport) {
        visualViewport.removeEventListener('resize', scheduleResize);
        visualViewport.removeEventListener('scroll', scheduleResize);
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      removeListener(prefersReducedMotion, handleReducedMotionChange);
    };
  }, []);

  return <canvas ref={canvasRef} className={classes} aria-hidden="true" />;
}
