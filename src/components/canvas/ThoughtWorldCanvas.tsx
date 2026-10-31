"use client";

import React, { useEffect, useRef } from "react";
import * as THREE from "three";

interface ThoughtWorldCanvasProps {
  isWriting?: boolean;
  intensity?: number;
}

export function ThoughtWorldCanvas({
  isWriting = false,
  intensity = 1.0,
}: ThoughtWorldCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const isWritingRef = useRef(isWriting);

  useEffect(() => {
    isWritingRef.current = isWriting;
  }, [isWriting]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Check WebGL availability
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true,
        powerPreference: "high-performance",
      });
    } catch {
      console.warn("WebGL not supported, falling back to CSS environment");
      return;
    }

    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.8));
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setClearColor(0x000000, 0);
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      45,
      container.clientWidth / container.clientHeight,
      0.1,
      100
    );
    camera.position.set(0, 0, 18);

    // --- 1. Soft Ambient & Directional Lighting ---
    const ambientLight = new THREE.AmbientLight(0x282224, 1.8);
    scene.add(ambientLight);

    const warmLight = new THREE.DirectionalLight(0xd78a70, 2.2); // Warm Terracotta light
    warmLight.position.set(12, 10, 14);
    scene.add(warmLight);

    const coolSageLight = new THREE.DirectionalLight(0x7e8a7d, 1.4); // Subtle Desaturated Sage rim
    coolSageLight.position.set(-12, -8, -10);
    scene.add(coolSageLight);

    const softFillLight = new THREE.PointLight(0xe8dfd5, 1.2, 50); // Soft Ivory/Sand fill
    softFillLight.position.set(0, -6, 10);
    scene.add(softFillLight);

    // --- 2. Floating Abstract Organic Sculptural Form (The Mind's Surface) ---
    // A distorted high-detail organic torus knot / deformed landscape ribbon
    const sphereGeometry = new THREE.IcosahedronGeometry(5.2, 32);
    
    // Deform vertices organically using noise-like offsets
    const positionAttribute = sphereGeometry.getAttribute("position");
    const originalPositions = positionAttribute.clone();
    
    const material = new THREE.MeshPhysicalMaterial({
      color: 0x1d171a, // Deep espresso stone
      roughness: 0.65,
      metalness: 0.1,
      clearcoat: 0.25,
      clearcoatRoughness: 0.4,
      transmission: 0.15, // Subtle transluscence
      ior: 1.2,
      reflectivity: 0.3,
      flatShading: false,
    });

    const sculptureMesh = new THREE.Mesh(sphereGeometry, material);
    sculptureMesh.position.set(2.5, -0.5, 0);
    scene.add(sculptureMesh);

    // Secondary subtle floating ribbon
    const torusGeometry = new THREE.TorusGeometry(7.2, 0.4, 24, 100);
    const torusMaterial = new THREE.MeshStandardMaterial({
      color: 0x362b2e,
      roughness: 0.8,
      metalness: 0.1,
      wireframe: true,
      transparent: true,
      opacity: 0.18,
    });
    const torusMesh = new THREE.Mesh(torusGeometry, torusMaterial);
    torusMesh.rotation.x = Math.PI / 3;
    torusMesh.rotation.y = Math.PI / 6;
    scene.add(torusMesh);

    // --- 3. Atmospheric Particle Dust (Memories drifting in space) ---
    const particleCount = 180;
    const particlePositions = new Float32Array(particleCount * 3);
    const particleScales = new Float32Array(particleCount);

    for (let i = 0; i < particleCount; i++) {
      particlePositions[i * 3] = (Math.random() - 0.5) * 36;
      particlePositions[i * 3 + 1] = (Math.random() - 0.5) * 26;
      particlePositions[i * 3 + 2] = (Math.random() - 0.5) * 20;
      particleScales[i] = Math.random() * 0.8 + 0.2;
    }

    const particleGeometry = new THREE.BufferGeometry();
    particleGeometry.setAttribute(
      "position",
      new THREE.BufferAttribute(particlePositions, 3)
    );

    // Circular particle texture created programmatically
    const canvas = document.createElement("canvas");
    canvas.width = 32;
    canvas.height = 32;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      const gradient = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
      gradient.addColorStop(0, "rgba(240, 232, 223, 0.9)");
      gradient.addColorStop(0.5, "rgba(215, 138, 112, 0.3)");
      gradient.addColorStop(1, "rgba(0, 0, 0, 0)");
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, 32, 32);
    }
    const particleTexture = new THREE.CanvasTexture(canvas);

    const particleMaterial = new THREE.PointsMaterial({
      size: 0.35,
      map: particleTexture,
      transparent: true,
      opacity: 0.45,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    const particles = new THREE.Points(particleGeometry, particleMaterial);
    scene.add(particles);

    // Mouse parallax tracking
    let targetMouseX = 0;
    let targetMouseY = 0;
    let currentMouseX = 0;
    let currentMouseY = 0;

    const handleMouseMove = (e: MouseEvent) => {
      targetMouseX = (e.clientX / window.innerWidth - 0.5) * 2;
      targetMouseY = (e.clientY / window.innerHeight - 0.5) * 2;
    };

    window.addEventListener("mousemove", handleMouseMove, { passive: true });

    // Handle Resize
    const handleResize = () => {
      if (!container) return;
      const width = container.clientWidth;
      const height = container.clientHeight;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    };

    window.addEventListener("resize", handleResize);

    // Animation Loop
    let clock = new THREE.Clock();
    let animationFrameId: number;

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);

      const elapsedTime = clock.getElapsedTime();
      const isWritingActive = isWritingRef.current;

      // Smooth mouse damping
      currentMouseX += (targetMouseX - currentMouseX) * 0.03;
      currentMouseY += (targetMouseY - currentMouseY) * 0.03;

      // When writing, quiet the environment and pull back slightly
      const targetZ = isWritingActive ? 21 : 18;
      camera.position.z += (targetZ - camera.position.z) * 0.04;
      camera.position.x = currentMouseX * 1.5;
      camera.position.y = -currentMouseY * 1.0;
      camera.lookAt(0, 0, 0);

      // Organic vertex wave deformation
      const positions = sculptureMesh.geometry.attributes.position;
      const count = positions.count;

      for (let i = 0; i < count; i++) {
        const ox = originalPositions.getX(i);
        const oy = originalPositions.getY(i);
        const oz = originalPositions.getZ(i);

        // Sinusoidal spatial wave harmonics
        const distance = Math.sqrt(ox * ox + oy * oy + oz * oz);
        const wave =
          Math.sin(ox * 0.6 + elapsedTime * 0.4) *
          Math.cos(oy * 0.6 + elapsedTime * 0.3) *
          0.45;

        const factor = (distance + wave) / distance;
        positions.setXYZ(i, ox * factor, oy * factor, oz * factor);
      }
      positions.needsUpdate = true;
      sculptureMesh.geometry.computeVertexNormals();

      // Slow organic rotation
      const rotationSpeed = isWritingActive ? 0.08 : 0.2;
      sculptureMesh.rotation.y = elapsedTime * rotationSpeed * 0.6;
      sculptureMesh.rotation.x = Math.sin(elapsedTime * 0.15) * 0.2;

      torusMesh.rotation.z = elapsedTime * 0.05;
      torusMesh.rotation.y = elapsedTime * 0.08;

      // Particle floating drift
      particles.rotation.y = elapsedTime * 0.02;
      particles.rotation.x = elapsedTime * 0.01;

      // Subtle dimming during deep writing
      const targetOpacity = isWritingActive ? 0.25 : 0.55;
      torusMaterial.opacity += (targetOpacity * 0.3 - torusMaterial.opacity) * 0.05;
      particleMaterial.opacity += (targetOpacity - particleMaterial.opacity) * 0.05;

      renderer.render(scene, camera);
    };

    animate();

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("resize", handleResize);
      cancelAnimationFrame(animationFrameId);

      // Cleanup WebGL resources
      sphereGeometry.dispose();
      torusGeometry.dispose();
      particleGeometry.dispose();
      material.dispose();
      torusMaterial.dispose();
      particleMaterial.dispose();
      particleTexture.dispose();
      renderer.dispose();

      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  return (
    <div
      ref={containerRef}
      aria-hidden="true"
      className="fixed inset-0 pointer-events-none z-0 overflow-hidden transition-opacity duration-1000"
      style={{
        opacity: isWriting ? 0.4 : 0.85,
      }}
    />
  );
}
