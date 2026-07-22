"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { loadGsap } from "./gsapClient";

export function SignalField() {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    let cancelled = false;
    let teardown: (() => void) | undefined;
    let refreshFrame = 0;

    void loadGsap().then(({ gsap, ScrollTrigger }) => {
      if (cancelled) return;

    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    const hero = host.closest<HTMLElement>(".hero");
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
    camera.position.set(0, 0, 7.6);

    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      powerPreference: "high-performance",
    });
    renderer.setClearColor(0x000000, 0);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    host.appendChild(renderer.domElement);

    const scrollRig = new THREE.Group();
    const signal = new THREE.Group();
    scene.add(scrollRig);
    scrollRig.add(signal);

    const coreGeometry = new THREE.IcosahedronGeometry(1.18, 4);
    const coreMaterial = new THREE.MeshBasicMaterial({
      color: 0x7affc0,
      wireframe: true,
      transparent: true,
      opacity: 0.26,
    });
    const core = new THREE.Mesh(coreGeometry, coreMaterial);
    signal.add(core);

    const shell = new THREE.Mesh(
      new THREE.IcosahedronGeometry(1.02, 2),
      new THREE.MeshBasicMaterial({
        color: 0x0d2f23,
        transparent: true,
        opacity: 0.72,
      }),
    );
    signal.add(shell);

    const haloMaterial = new THREE.MeshBasicMaterial({
      color: 0x8bffd0,
      transparent: true,
      opacity: 0.25,
    });

    const haloA = new THREE.Mesh(
      new THREE.TorusGeometry(1.82, 0.012, 8, 180),
      haloMaterial,
    );
    haloA.rotation.set(1.14, 0.25, 0.18);
    signal.add(haloA);

    const haloB = new THREE.Mesh(
      new THREE.TorusGeometry(2.12, 0.009, 8, 180),
      haloMaterial.clone(),
    );
    haloB.rotation.set(0.5, 1.05, -0.45);
    signal.add(haloB);

    const count = window.innerWidth < 760 ? 900 : 1700;
    const pointPositions = new Float32Array(count * 3);
    const pointSizes = new Float32Array(count);
    const golden = Math.PI * (3 - Math.sqrt(5));

    for (let i = 0; i < count; i += 1) {
      const y = 1 - (i / (count - 1)) * 2;
      const radius = Math.sqrt(1 - y * y);
      const theta = golden * i;
      const distance = 2.55 + Math.sin(i * 1.73) * 0.18;
      pointPositions[i * 3] = Math.cos(theta) * radius * distance;
      pointPositions[i * 3 + 1] = y * distance;
      pointPositions[i * 3 + 2] = Math.sin(theta) * radius * distance;
      pointSizes[i] = 0.8 + ((i * 17) % 13) / 13;
    }

    const pointsGeometry = new THREE.BufferGeometry();
    pointsGeometry.setAttribute(
      "position",
      new THREE.BufferAttribute(pointPositions, 3),
    );
    pointsGeometry.setAttribute(
      "size",
      new THREE.BufferAttribute(pointSizes, 1),
    );
    const particles = new THREE.Points(
      pointsGeometry,
      new THREE.PointsMaterial({
        color: 0x8bffd0,
        size: 0.024,
        sizeAttenuation: true,
        transparent: true,
        opacity: 0.78,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    );
    signal.add(particles);

    const orbiters = new THREE.Group();
    const dotGeometry = new THREE.SphereGeometry(0.035, 8, 8);
    const dotMaterial = new THREE.MeshBasicMaterial({ color: 0xcaffea });
    for (let i = 0; i < 11; i += 1) {
      const dot = new THREE.Mesh(dotGeometry, dotMaterial);
      const angle = (i / 11) * Math.PI * 2;
      const orbit = 1.62 + (i % 3) * 0.3;
      dot.position.set(
        Math.cos(angle) * orbit,
        Math.sin(angle * 1.7) * 0.78,
        Math.sin(angle) * orbit,
      );
      orbiters.add(dot);
    }
    signal.add(orbiters);

    const resize = () => {
      const { width, height } = host.getBoundingClientRect();
      renderer.setSize(width, height, false);
      camera.aspect = width / Math.max(height, 1);
      camera.updateProjectionMatrix();
    };
    resize();
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(host);

    let pointerX = 0;
    let pointerY = 0;
    const onPointerMove = (event: PointerEvent) => {
      pointerX = (event.clientX / window.innerWidth - 0.5) * 0.36;
      pointerY = (event.clientY / window.innerHeight - 0.5) * 0.22;
    };
    window.addEventListener("pointermove", onPointerMove, { passive: true });

    const context = gsap.context(() => {
      gsap.set(signal.scale, { x: 0.12, y: 0.12, z: 0.12 });
      gsap
        .timeline({ defaults: { ease: "power4.out" } })
        .to(signal.scale, { x: 1, y: 1, z: 1, duration: 1.9 }, 0.35)
        .fromTo(
          signal.rotation,
          { x: -0.45, y: -1.1 },
          { x: 0.12, y: 0.18, duration: 2.2 },
          0.28,
        )
        .fromTo(
          camera.position,
          { z: 10.8 },
          { z: 7.6, duration: 2.1 },
          0.25,
        );

      if (!reduceMotion && hero) {
        const canPinHero = window.matchMedia("(min-width: 900px)").matches;
        const scrollCue = hero.querySelector<HTMLElement>(".scroll-cue");
        const orbitA = hero.querySelector<HTMLElement>(".hero-orbit-a");
        const orbitB = hero.querySelector<HTMLElement>(".hero-orbit-b");

        const heroTimeline = gsap.timeline({
          defaults: { ease: "none" },
          scrollTrigger: {
            trigger: hero,
            start: "top top",
            end: () =>
              canPinHero
                ? `+=${Math.max(window.innerHeight * 1.55, 1200)}`
                : "bottom top",
            pin: canPinHero,
            pinSpacing: true,
            scrub: 0.65,
            anticipatePin: 1,
            invalidateOnRefresh: true,
            refreshPriority: -10,
          },
        });

        heroTimeline
          .addLabel("focus", 0)
          .to(scrollCue, { autoAlpha: 0, duration: 0.1 }, "focus")
          .to(camera.position, { z: 5.05, duration: 1 }, "focus")
          .to(
            scrollRig.rotation,
            { y: Math.PI * 0.76, x: -0.18, duration: 1 },
            "focus",
          )
          .to(
            scrollRig.scale,
            { x: 1.24, y: 1.24, z: 1.24, duration: 1 },
            "focus",
          )
          .to(orbitA, { scale: 1.18, rotation: 18, duration: 1 }, "focus")
          .to(orbitB, { scale: 1.1, rotation: -12, duration: 1 }, "focus");
      }
    }, host);

    refreshFrame = window.requestAnimationFrame(() => {
      ScrollTrigger.sort();
      ScrollTrigger.refresh();
    });

    let frame = 0;
    const clock = new THREE.Clock();
    const render = () => {
      const elapsed = clock.getElapsedTime();
      if (!reduceMotion) {
        particles.rotation.y = elapsed * 0.035;
        particles.rotation.x = Math.sin(elapsed * 0.16) * 0.06;
        haloA.rotation.z += 0.0018;
        haloB.rotation.z -= 0.0012;
        orbiters.rotation.y = elapsed * -0.12;
        signal.rotation.y += (pointerX - signal.rotation.y * 0.04) * 0.003;
        signal.rotation.x += (-pointerY - signal.rotation.x * 0.03) * 0.003;
      }
      renderer.render(scene, camera);
      frame = window.requestAnimationFrame(render);
    };
    render();

    teardown = () => {
      window.cancelAnimationFrame(frame);
      window.cancelAnimationFrame(refreshFrame);
      window.removeEventListener("pointermove", onPointerMove);
      resizeObserver.disconnect();
      context.revert();
      coreGeometry.dispose();
      pointsGeometry.dispose();
      dotGeometry.dispose();
      coreMaterial.dispose();
      haloMaterial.dispose();
      dotMaterial.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    };
    });

    return () => {
      cancelled = true;
      teardown?.();
    };
  }, []);

  return <div className="signal-field" ref={hostRef} aria-hidden="true" />;
}
