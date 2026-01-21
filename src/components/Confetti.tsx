"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

type ConfettiPiece = {
  id: number;
  x: number;
  y: number;
  rotation: number;
  scale: number;
  color: string;
  velocityX: number;
  velocityY: number;
  rotationSpeed: number;
  shape: "square" | "circle" | "strip";
};

type ConfettiProps = {
  active: boolean;
  duration?: number;
  particleCount?: number;
  spread?: number;
  origin?: { x: number; y: number };
  colors?: string[];
  onComplete?: () => void;
};

const DEFAULT_COLORS = [
  "#3d8bfd", // accent-primary
  "#7ad7e3", // teal accent
  "#f47c5d", // accent-secondary
  "#ffd166", // accent-3
  "#a78bfa", // purple
  "#34d399", // green
];

function generatePiece(id: number, origin: { x: number; y: number }, spread: number, colors: string[]): ConfettiPiece {
  const angle = (Math.random() * spread - spread / 2) * (Math.PI / 180);
  const velocity = 8 + Math.random() * 8;
  const shapes: ConfettiPiece["shape"][] = ["square", "circle", "strip"];

  return {
    id,
    x: origin.x,
    y: origin.y,
    rotation: Math.random() * 360,
    scale: 0.6 + Math.random() * 0.6,
    color: colors[Math.floor(Math.random() * colors.length)],
    velocityX: Math.sin(angle) * velocity * (Math.random() > 0.5 ? 1 : -1),
    velocityY: -Math.cos(angle) * velocity - Math.random() * 4,
    rotationSpeed: (Math.random() - 0.5) * 20,
    shape: shapes[Math.floor(Math.random() * shapes.length)],
  };
}

function ConfettiPieceElement({ piece, elapsed }: { piece: ConfettiPiece; elapsed: number }) {
  const gravity = 0.3;
  const friction = 0.99;
  const time = elapsed / 16; // normalize to ~60fps

  const x = piece.x + piece.velocityX * time * friction;
  const y = piece.y + piece.velocityY * time + 0.5 * gravity * time * time;
  const rotation = piece.rotation + piece.rotationSpeed * time;
  const opacity = Math.max(0, 1 - elapsed / 2500);

  const style: React.CSSProperties = {
    position: "absolute",
    left: x,
    top: y,
    transform: `rotate(${rotation}deg) scale(${piece.scale})`,
    opacity,
    pointerEvents: "none",
  };

  if (piece.shape === "square") {
    return (
      <div
        style={{
          ...style,
          width: 10,
          height: 10,
          backgroundColor: piece.color,
          borderRadius: 2,
        }}
      />
    );
  }

  if (piece.shape === "circle") {
    return (
      <div
        style={{
          ...style,
          width: 8,
          height: 8,
          backgroundColor: piece.color,
          borderRadius: "50%",
        }}
      />
    );
  }

  // strip
  return (
    <div
      style={{
        ...style,
        width: 4,
        height: 14,
        backgroundColor: piece.color,
        borderRadius: 2,
      }}
    />
  );
}

export function Confetti({
  active,
  duration = 3000,
  particleCount = 50,
  spread = 120,
  origin = { x: 0.5, y: 0.4 },
  colors = DEFAULT_COLORS,
  onComplete,
}: ConfettiProps) {
  const [pieces, setPieces] = useState<ConfettiPiece[]>([]);
  const [elapsed, setElapsed] = useState(0);
  const [mounted, setMounted] = useState(false);
  const startTimeRef = useRef<number | null>(null);
  const frameRef = useRef<number | null>(null);
  const animateRef = useRef<() => void>(() => undefined);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  const animate = useCallback(() => {
    if (startTimeRef.current === null) return;

    const now = performance.now();
    const newElapsed = now - startTimeRef.current;
    setElapsed(newElapsed);

    if (newElapsed < duration) {
      frameRef.current = requestAnimationFrame(() => animateRef.current());
    } else {
      setPieces([]);
      startTimeRef.current = null;
      onComplete?.();
    }
  }, [duration, onComplete]);

  useEffect(() => {
    animateRef.current = animate;
  }, [animate]);

  useEffect(() => {
    if (!active || !mounted) return;

    const originPx = {
      x: window.innerWidth * origin.x,
      y: window.innerHeight * origin.y,
    };

    const newPieces = Array.from({ length: particleCount }, (_, i) =>
      generatePiece(i, originPx, spread, colors)
    );

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPieces(newPieces);
    setElapsed(0);
    startTimeRef.current = performance.now();
    frameRef.current = requestAnimationFrame(() => animateRef.current());

    return () => {
      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current);
      }
    };
  }, [active, mounted, particleCount, spread, origin.x, origin.y, colors, animate]);

  if (!mounted || pieces.length === 0) return null;

  return createPortal(
    <div
      style={{
        position: "fixed",
        inset: 0,
        pointerEvents: "none",
        zIndex: 9999,
        overflow: "hidden",
      }}
      aria-hidden="true"
    >
      {pieces.map((piece) => (
        <ConfettiPieceElement key={piece.id} piece={piece} elapsed={elapsed} />
      ))}
    </div>,
    document.body
  );
}

// Simplified confetti burst for smaller celebrations
export function useConfetti() {
  const [active, setActive] = useState(false);

  const trigger = useCallback(() => {
    setActive(true);
  }, []);

  const reset = useCallback(() => {
    setActive(false);
  }, []);

  return { active, trigger, reset };
}
