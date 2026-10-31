"use client";

import React, { useEffect, useRef } from "react";
import * as THREE from "three";

interface ThoughtWorldCanvasProps {
  isWriting?: boolean;
}

export function ThoughtWorldCanvas({
  isWriting = false,
}: ThoughtWorldCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const isWritingRef = useRef(isWriting);

  useEffect(() => {
    isWritingRef.current = isWriting;
  }, [isWriting]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: false,
        powerPreference: "high-performance",
      });
    } catch {
      return;
    }

    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.8));
    renderer.setSize(container.clientWidth, container.clientHeight);
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

    // --- Molten Silk & Chromatic Twilight GLSL Shader ---
    const vertexShader = `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = vec4(position, 1.0);
      }
    `;

    const fragmentShader = `
      uniform float u_time;
      uniform vec2 u_mouse;
      uniform vec2 u_resolution;
      uniform float u_intensity;
      varying vec2 vUv;

      // Precision Simplex Noise
      vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
      vec2 mod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
      vec3 permute(vec3 x) { return mod289(((x*34.0)+1.0)*x); }

      float snoise(vec2 v) {
        const vec4 C = vec4(0.211324865405187,
                            0.366025403784439,
                           -0.577350269189626,
                            0.024390243902439);
        vec2 i  = floor(v + dot(v, C.yy));
        vec2 x0 = v -   i + dot(i, C.xx);
        vec2 i1;
        i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
        vec4 x12 = x0.xyxy + C.xxzz;
        x12.xy -= i1;
        i = mod289(i);
        vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0))
          + i.x + vec3(0.0, i1.x, 1.0));
        vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
        m = m*m;
        m = m*m;
        vec3 x = 2.0 * fract(p * C.www) - 1.0;
        vec3 h = abs(x) - 0.5;
        vec3 ox = floor(x + 0.5);
        vec3 a0 = x - ox;
        m *= 1.79284291400159 - 0.85373472095314 * (a0*a0 + h*h);
        vec3 g;
        g.x  = a0.x  * x0.x  + h.x  * x0.y;
        g.yz = a0.yz * x12.xz + h.yz * x12.yw;
        return 130.0 * dot(m, g);
      }

      // Domain Warping for Liquid Silk Marbling
      float fbm(vec2 p) {
        float f = 0.0;
        mat2 m = mat2(1.6, 1.2, -1.2, 1.6);
        f += 0.5000 * snoise(p); p = m * p;
        f += 0.2500 * snoise(p); p = m * p;
        f += 0.1250 * snoise(p); p = m * p;
        f += 0.0625 * snoise(p);
        return f;
      }

      void main() {
        vec2 uv = gl_FragCoord.xy / u_resolution.xy;
        float aspect = u_resolution.x / u_resolution.y;
        vec2 p = (uv - 0.5) * vec2(aspect, 1.0);

        // Fluid mouse influence
        vec2 m = (u_mouse - 0.5) * vec2(aspect, 1.0);
        float mouseDist = length(p - m);
        float mouseWave = smoothstep(0.8, 0.0, mouseDist) * 0.12;

        float t = u_time * 0.18;

        // Multi-layered chromatic domain warp (liquid silk flow)
        vec2 q = vec2(
          fbm(p * 1.4 + vec2(0.0, t * 0.4) + mouseWave),
          fbm(p * 1.4 + vec2(5.2, 1.3 - t * 0.3))
        );

        vec2 r = vec2(
          fbm(p * 1.8 + 4.0 * q + vec2(1.7, 9.2) + t * 0.2),
          fbm(p * 1.8 + 4.0 * q + vec2(8.3, 2.8) - t * 0.25)
        );

        float f = fbm(p + 3.0 * r + t * 0.1);

        // --- Vibrant Chromatic Twilight Palette ---
        // 1. Deep Midnight Velvet Indigo
        vec3 indigo = vec3(0.05, 0.07, 0.18);
        // 2. Rich Royal Dusk Violet
        vec3 dusk = vec3(0.24, 0.10, 0.32);
        // 3. Velvet Crimson Plum
        vec3 plum = vec3(0.52, 0.14, 0.36);
        // 4. Molten Sunset Amber
        vec3 amber = vec3(0.98, 0.44, 0.18);
        // 5. Radiant Golden Champagne Peak
        vec3 gold = vec3(1.0, 0.82, 0.60);

        // Smooth color composition based on fluid folds
        vec3 col = mix(indigo, dusk, clamp(length(q), 0.0, 1.0));
        col = mix(col, plum, clamp(length(r.x), 0.0, 1.0));
        col = mix(col, amber, clamp(pow(f * 1.35, 2.2), 0.0, 1.0));
        col = mix(col, gold, clamp(pow(f, 4.0) * 0.85, 0.0, 1.0));

        // Subtle chromatic aberration on silk fold edges
        float edgeR = fbm(p + 3.05 * r + t * 0.1);
        float edgeB = fbm(p + 2.95 * r + t * 0.1);
        col.r += (edgeR - f) * 0.35;
        col.b += (edgeB - f) * 0.35;

        // Reactive typing intensity glow
        col += amber * (u_intensity * 0.22 * clamp(f, 0.0, 1.0));

        // Soft cinema vignette
        float vignette = smoothstep(1.6, 0.4, length(p));
        col *= vignette;

        gl_FragColor = vec4(col, 1.0);
      }
    `;

    const uniforms = {
      u_time: { value: 0 },
      u_mouse: { value: new THREE.Vector2(0.5, 0.5) },
      u_resolution: {
        value: new THREE.Vector2(container.clientWidth, container.clientHeight),
      },
      u_intensity: { value: 0 },
    };

    const material = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms,
      depthWrite: false,
      depthTest: false,
    });

    const geometry = new THREE.PlaneGeometry(2, 2);
    const quad = new THREE.Mesh(geometry, material);
    scene.add(quad);

    // Mouse movement
    let targetMouseX = 0.5;
    let targetMouseY = 0.5;

    const onMouseMove = (e: MouseEvent) => {
      targetMouseX = e.clientX / window.innerWidth;
      targetMouseY = 1.0 - e.clientY / window.innerHeight;
    };
    window.addEventListener("mousemove", onMouseMove);

    const onResize = () => {
      if (!container) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      renderer.setSize(w, h);
      uniforms.u_resolution.value.set(w, h);
    };
    window.addEventListener("resize", onResize);

    // Animation Loop
    let animationFrameId: number;
    let clock = new THREE.Clock();

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      const elapsedTime = clock.getElapsedTime();

      uniforms.u_time.value = elapsedTime;

      // Smooth mouse damping
      uniforms.u_mouse.value.x +=
        (targetMouseX - uniforms.u_mouse.value.x) * 0.05;
      uniforms.u_mouse.value.y +=
        (targetMouseY - uniforms.u_mouse.value.y) * 0.05;

      // Target intensity when typing
      const targetIntensity = isWritingRef.current ? 1.0 : 0.0;
      uniforms.u_intensity.value +=
        (targetIntensity - uniforms.u_intensity.value) * 0.05;

      renderer.render(scene, camera);
    };

    animate();

    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("resize", onResize);
      cancelAnimationFrame(animationFrameId);
      if (container && renderer.domElement) {
        container.removeChild(renderer.domElement);
      }
      geometry.dispose();
      material.dispose();
      renderer.dispose();
    };
  }, []);

  return (
    <div
      ref={containerRef}
      aria-hidden="true"
      className="fixed inset-0 pointer-events-none z-0 overflow-hidden"
    >
      {/* Ultra-fine analog film grain texture for luxury tactile finish */}
      <div className="absolute inset-0 noir-grain opacity-40 pointer-events-none z-10" />
    </div>
  );
}
