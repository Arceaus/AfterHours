"use client";

import React, { useEffect, useRef } from "react";

interface ThoughtWorldCanvasProps {
  isWriting?: boolean;
}

export function ThoughtWorldCanvas({
  isWriting = false,
}: ThoughtWorldCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isWritingRef = useRef(isWriting);

  useEffect(() => {
    isWritingRef.current = isWriting;
  }, [isWriting]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    let mouseX = width * 0.5;
    let mouseY = height * 0.45;
    let targetMouseX = mouseX;
    let targetMouseY = mouseY;

    const onMouseMove = (e: MouseEvent) => {
      targetMouseX = e.clientX;
      targetMouseY = e.clientY;
    };
    window.addEventListener("mousemove", onMouseMove);

    const onResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener("resize", onResize);

    // Candlelight simulation variables
    let time = 0;
    let animationFrameId: number;
    let currentIntensity = 0.5;

    const render = () => {
      time += 0.02;

      // Smooth cursor follow for the lantern ambient warmth
      mouseX += (targetMouseX - mouseX) * 0.04;
      mouseY += (targetMouseY - mouseY) * 0.04;

      // Organic multi-octave candle flame flicker
      const flicker1 = Math.sin(time * 2.3) * 0.04;
      const flicker2 = Math.cos(time * 4.1) * 0.025;
      const flicker3 = Math.sin(time * 0.8) * 0.06;
      const flicker = flicker1 + flicker2 + flicker3;

      // Reactive flame intensity when writing
      const targetIntensity = isWritingRef.current ? 0.72 : 0.46;
      currentIntensity += (targetIntensity - currentIntensity) * 0.03;

      ctx.clearRect(0, 0, width, height);

      // --- 1. Ambient Volumetric Candlelight Glow ---
      const centerX = width * 0.5 + (mouseX - width * 0.5) * 0.12;
      const centerY = height * 0.38 + (mouseY - height * 0.38) * 0.12;
      const baseRadius = Math.min(width, height) * (0.48 + flicker * 0.5);

      const lanternGradient = ctx.createRadialGradient(
        centerX,
        centerY,
        0,
        centerX,
        centerY,
        baseRadius
      );

      // Warm Amber / Smoked Honey / Pure Noir decay
      const alphaCore = 0.14 * (currentIntensity + flicker);
      const alphaMid = 0.06 * (currentIntensity + flicker);
      const alphaRim = 0.02 * currentIntensity;

      lanternGradient.addColorStop(0, `rgba(226, 138, 59, ${alphaCore})`);
      lanternGradient.addColorStop(0.35, `rgba(212, 110, 40, ${alphaMid})`);
      lanternGradient.addColorStop(0.7, `rgba(160, 75, 25, ${alphaRim})`);
      lanternGradient.addColorStop(1, "rgba(7, 6, 7, 0)");

      ctx.fillStyle = lanternGradient;
      ctx.fillRect(0, 0, width, height);

      // --- 2. Architectural Shadow & Light Slit (Tadao Ando / Shoji Slit) ---
      // A dramatic vertical light seam cutting quietly through the darkness
      const slitX = width * 0.5;
      const slitGradient = ctx.createLinearGradient(slitX - 1, 0, slitX + 1, 0);
      slitGradient.addColorStop(0, "rgba(226, 138, 59, 0)");
      slitGradient.addColorStop(0.5, `rgba(226, 138, 59, ${0.035 * currentIntensity})`);
      slitGradient.addColorStop(1, "rgba(226, 138, 59, 0)");

      ctx.fillStyle = slitGradient;
      ctx.fillRect(slitX - 120, 0, 240, height);

      // Subtle horizontal tatami/shoji architectural datum line
      const datumY = height * 0.22;
      const datumGradient = ctx.createLinearGradient(0, datumY, width, datumY);
      datumGradient.addColorStop(0, "rgba(226, 138, 59, 0)");
      datumGradient.addColorStop(0.2, "rgba(255, 255, 255, 0.02)");
      datumGradient.addColorStop(0.5, `rgba(226, 138, 59, ${0.05 * currentIntensity})`);
      datumGradient.addColorStop(0.8, "rgba(255, 255, 255, 0.02)");
      datumGradient.addColorStop(1, "rgba(226, 138, 59, 0)");

      ctx.strokeStyle = datumGradient;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, datumY);
      ctx.lineTo(width, datumY);
      ctx.stroke();

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("resize", onResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <div
      aria-hidden="true"
      className="fixed inset-0 pointer-events-none z-0 overflow-hidden"
    >
      <canvas
        ref={canvasRef}
        className="w-full h-full block"
      />
      {/* Fine grain washi paper & architectural overlay */}
      <div className="absolute inset-0 noir-grain opacity-75" />
      <div className="absolute inset-0 architectural-grid opacity-60" />
    </div>
  );
}
