import { useEffect, useRef } from 'react';

/**
 * Ambient particle field with cursor repulsion, isolated from the rest of
 * the landing page so it can be reused/tuned independently.
 *
 * - Canvas + requestAnimationFrame (not per-particle DOM nodes) for 60fps
 *   with 80-150 particles.
 * - Each particle drifts continuously on its own; on mousemove, nearby
 *   particles are pushed away and ease back via lerp (no instant snapping).
 * - Pauses entirely when the tab is hidden (document.visibilitychange).
 * - On touch devices there's no cursor, so we skip the repulsion listener
 *   and keep only the ambient drift.
 * - Respects prefers-reduced-motion: renders a static dot field, no RAF loop.
 *
 * Original implementation — canvas + vanilla math, no third-party particle
 * library, not a copy of any specific site's assets/code.
 */
export default function ParticleBackground({ className = '' }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const isTouchDevice = window.matchMedia('(pointer: coarse)').matches;

    let width = 0;
    let height = 0;
    let particles = [];
    let mouse = { x: -9999, y: -9999, active: false };
    let rafId = null;
    let visible = true;

    const PARTICLE_COUNT = () => Math.min(150, Math.max(60, Math.floor((width * height) / 14000)));
    const REPEL_RADIUS = 130;
    const REPEL_STRENGTH = 2.6;
    const EASE = 0.08; // lerp factor easing particles back to their resting drift path

    function resize() {
      const rect = canvas.parentElement.getBoundingClientRect();
      width = canvas.width = rect.width * window.devicePixelRatio;
      height = canvas.height = rect.height * window.devicePixelRatio;
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;
      initParticles();
    }

    function initParticles() {
      const count = PARTICLE_COUNT();
      particles = Array.from({ length: count }, () => {
        const x = Math.random() * width;
        const y = Math.random() * height;
        return {
          x,
          y,
          baseX: x,
          baseY: y,
          // gentle ambient drift, unique per-particle so the field feels alive at rest
          angle: Math.random() * Math.PI * 2,
          driftSpeed: 0.15 + Math.random() * 0.25,
          driftRadius: 8 + Math.random() * 18,
          r: 0.8 + Math.random() * 1.6,
          offsetX: 0,
          offsetY: 0,
        };
      });
    }

    function drawStatic() {
      // Reduced-motion: render a single still frame, no animation loop.
      ctx.clearRect(0, 0, width, height);
      particles.forEach((p) => {
        ctx.beginPath();
        ctx.arc(p.baseX, p.baseY, p.r, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255,255,255,0.35)';
        ctx.fill();
      });
    }

    function tick(time) {
      if (!visible) {
        rafId = requestAnimationFrame(tick);
        return;
      }
      ctx.clearRect(0, 0, width, height);

      particles.forEach((p) => {
        // ambient drift around the resting point
        p.angle += p.driftSpeed * 0.01;
        const driftX = Math.cos(p.angle) * p.driftRadius;
        const driftY = Math.sin(p.angle * 0.8) * p.driftRadius;
        let targetX = p.baseX + driftX;
        let targetY = p.baseY + driftY;

        if (mouse.active) {
          const dx = targetX - mouse.x;
          const dy = targetY - mouse.y;
          const dist = Math.hypot(dx, dy);
          const radius = REPEL_RADIUS * (window.devicePixelRatio || 1);
          if (dist < radius && dist > 0.01) {
            const force = (1 - dist / radius) * REPEL_STRENGTH * 20;
            targetX += (dx / dist) * force;
            targetY += (dy / dist) * force;
          }
        }

        // lerp toward the (possibly repelled) target — smooth, no snapping
        p.x += (targetX - p.x) * EASE;
        p.y += (targetY - p.y) * EASE;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255,255,255,0.4)';
        ctx.fill();
      });

      rafId = requestAnimationFrame(tick);
    }

    function handleMouseMove(e) {
      const rect = canvas.getBoundingClientRect();
      mouse.x = (e.clientX - rect.left) * window.devicePixelRatio;
      mouse.y = (e.clientY - rect.top) * window.devicePixelRatio;
      mouse.active = true;
    }
    function handleMouseLeave() {
      mouse.active = false;
    }
    function handleVisibility() {
      visible = document.visibilityState === 'visible';
    }

    resize();
    window.addEventListener('resize', resize);
    document.addEventListener('visibilitychange', handleVisibility);

    if (prefersReducedMotion) {
      drawStatic();
    } else {
      if (!isTouchDevice) {
        canvas.parentElement.addEventListener('mousemove', handleMouseMove);
        canvas.parentElement.addEventListener('mouseleave', handleMouseLeave);
      }
      rafId = requestAnimationFrame(tick);
    }

    return () => {
      window.removeEventListener('resize', resize);
      document.removeEventListener('visibilitychange', handleVisibility);
      canvas.parentElement?.removeEventListener('mousemove', handleMouseMove);
      canvas.parentElement?.removeEventListener('mouseleave', handleMouseLeave);
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className={`pointer-events-none absolute inset-0 h-full w-full ${className}`}
      aria-hidden="true"
    />
  );
}
