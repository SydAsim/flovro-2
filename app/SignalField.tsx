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

    void loadGsap().then(({ gsap }) => {
      if (cancelled) return;

    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    const isCompactViewport = window.innerWidth < 760;
    const hero = host.closest<HTMLElement>(".hero");
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
    camera.position.set(0, 0, 7.6);

    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: !isCompactViewport,
      powerPreference: "high-performance",
    });
    renderer.setClearColor(0x000000, 0);
    renderer.setPixelRatio(
      Math.min(window.devicePixelRatio, isCompactViewport ? 1.15 : 1.35),
    );
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    host.appendChild(renderer.domElement);

    const scrollRig = new THREE.Group();
    const pointerRig = new THREE.Group();
    const signal = new THREE.Group();
    scene.add(scrollRig);
    scrollRig.add(pointerRig);
    pointerRig.add(signal);

    const coreGeometry = new THREE.IcosahedronGeometry(1.18, 3);
    const coreMaterial = new THREE.MeshBasicMaterial({
      color: 0x7affc0,
      wireframe: true,
      transparent: true,
      opacity: 0.26,
    });
    const core = new THREE.Mesh(coreGeometry, coreMaterial);
    signal.add(core);

    const shellGeometry = new THREE.IcosahedronGeometry(1.02, 2);
    const shellMaterial = new THREE.MeshBasicMaterial({
      color: 0x0d2f23,
      transparent: true,
      opacity: 0.72,
    });
    const shell = new THREE.Mesh(shellGeometry, shellMaterial);
    signal.add(shell);

    const haloMaterial = new THREE.MeshBasicMaterial({
      color: 0x8bffd0,
      transparent: true,
      opacity: 0.25,
    });

    const haloAGeometry = new THREE.TorusGeometry(1.82, 0.012, 8, 120);
    const haloA = new THREE.Mesh(haloAGeometry, haloMaterial);
    haloA.rotation.set(1.14, 0.25, 0.18);
    signal.add(haloA);

    const haloBGeometry = new THREE.TorusGeometry(2.12, 0.009, 8, 120);
    const haloBMaterial = haloMaterial.clone();
    const haloB = new THREE.Mesh(haloBGeometry, haloBMaterial);
    haloB.rotation.set(0.5, 1.05, -0.45);
    signal.add(haloB);

    const count = isCompactViewport ? 650 : 1200;
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

    const dotGeometry = new THREE.SphereGeometry(0.035, 6, 6);
    const dotMaterial = new THREE.MeshBasicMaterial({ color: 0xcaffea });
    const orbiters = new THREE.InstancedMesh(dotGeometry, dotMaterial, 11);
    const orbiterTransform = new THREE.Object3D();
    for (let i = 0; i < 11; i += 1) {
      const angle = (i / 11) * Math.PI * 2;
      const orbit = 1.62 + (i % 3) * 0.3;
      orbiterTransform.position.set(
        Math.cos(angle) * orbit,
        Math.sin(angle * 1.7) * 0.78,
        Math.sin(angle) * orbit,
      );
      orbiterTransform.updateMatrix();
      orbiters.setMatrixAt(i, orbiterTransform.matrix);
    }
    orbiters.instanceMatrix.needsUpdate = true;
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

    let restoreHeroScroll: (() => void) | undefined;

    const context = gsap.context(() => {
      gsap.set(signal.scale, { x: 0.12, y: 0.12, z: 0.12 });
      const entranceTimeline = gsap
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
        const scrollCue = hero.querySelector<HTMLElement>(".scroll-cue");
        const orbitA = hero.querySelector<HTMLElement>(".hero-orbit-a");
        const orbitB = hero.querySelector<HTMLElement>(".hero-orbit-b");
        const nextSection = hero.nextElementSibling as HTMLElement | null;
        const root = document.documentElement;
        const body = document.body;
        const lockAtTop = window.scrollY <= hero.offsetTop + 4;
        const previousRootOverflow = root.style.overflow;
        const previousBodyOverflow = body.style.overflow;
        let lockActive = lockAtTop;
        let entranceReady = false;
        let queuedDelta = 0;
        let scrollProgress = 0;
        const progressState = { value: 0 };
        let touchY = 0;
        let detachIntentListeners = () => {};

        const unlockHero = () => {
          if (!lockActive) return;
          lockActive = false;
          root.style.overflow = previousRootOverflow;
          body.style.overflow = previousBodyOverflow;
          detachIntentListeners();
        };

        const finishHero = () => {
          const shouldAdvance = lockActive;
          unlockHero();
          if (shouldAdvance) {
            window.requestAnimationFrame(() => {
              nextSection?.scrollIntoView({ behavior: "smooth", block: "start" });
            });
          }
        };

        const heroTimeline = gsap.timeline({
          paused: true,
          defaults: { ease: "none" },
          onComplete: finishHero,
        });

        heroTimeline
          .addLabel("focus", 0)
          .to(scrollCue, { autoAlpha: 0, duration: 0.08 }, "focus")
          .to(camera.position, { z: 4.65, duration: 0.78 }, "focus")
          .to(
            scrollRig.rotation,
            { y: Math.PI * 0.9, x: -0.22, duration: 0.78 },
            "focus",
          )
          .to(
            scrollRig.scale,
            { x: 1.3, y: 1.3, z: 1.3, duration: 0.78 },
            "focus",
          )
          .to(orbitA, { scale: 1.2, rotation: 18, duration: 0.78 }, "focus")
          .to(orbitB, { scale: 1.12, rotation: -12, duration: 0.78 }, "focus")
          .to({}, { duration: 0.18 });

        const updateHeroProgress = (delta: number) => {
          if (!lockActive || delta === 0) return;
          if (!entranceReady) {
            queuedDelta += delta;
            return;
          }

          const interactionDistance = Math.max(window.innerHeight * 1.4, 900);
          scrollProgress = gsap.utils.clamp(
            0,
            1,
            scrollProgress + delta / interactionDistance,
          );
          gsap.to(progressState, {
            value: scrollProgress,
            duration: 0.42,
            ease: "power3.out",
            overwrite: "auto",
            onUpdate: () => {
              heroTimeline.progress(progressState.value);
            },
          });
        };

        const onWheelIntent = (event: WheelEvent) => {
          const multiplier =
            event.deltaMode === 1
              ? 32
              : event.deltaMode === 2
                ? window.innerHeight
                : 1;
          updateHeroProgress(event.deltaY * multiplier);
        };

        const onKeyIntent = (event: KeyboardEvent) => {
          const target = event.target as HTMLElement | null;
          if (
            event.altKey ||
            event.ctrlKey ||
            event.metaKey ||
            target?.closest("a, button, input, select, textarea, [contenteditable='true']")
          ) {
            return;
          }

          if (["ArrowDown", "PageDown", " "].includes(event.key)) {
            updateHeroProgress(window.innerHeight * 0.28);
          } else if (["ArrowUp", "PageUp"].includes(event.key)) {
            updateHeroProgress(window.innerHeight * -0.28);
          }
        };

        const onTouchStart = (event: TouchEvent) => {
          touchY = event.touches[0]?.clientY ?? 0;
        };

        const onTouchMove = (event: TouchEvent) => {
          const nextTouchY = event.touches[0]?.clientY ?? touchY;
          const delta = touchY - nextTouchY;
          touchY = nextTouchY;
          updateHeroProgress(delta * 2.2);
        };

        if (lockAtTop) {
          root.style.overflow = "hidden";
          body.style.overflow = "hidden";
          window.addEventListener("wheel", onWheelIntent, { passive: true });
          window.addEventListener("keydown", onKeyIntent);
          window.addEventListener("touchstart", onTouchStart, { passive: true });
          window.addEventListener("touchmove", onTouchMove, { passive: true });

          detachIntentListeners = () => {
            window.removeEventListener("wheel", onWheelIntent);
            window.removeEventListener("keydown", onKeyIntent);
            window.removeEventListener("touchstart", onTouchStart);
            window.removeEventListener("touchmove", onTouchMove);
          };
        }

        entranceTimeline.eventCallback("onComplete", () => {
          entranceReady = true;
          if (queuedDelta !== 0) {
            const delta = queuedDelta;
            queuedDelta = 0;
            updateHeroProgress(delta);
          }
        });
        restoreHeroScroll = unlockHero;
      }
    }, host);

    let frame = 0;
    let sceneVisible = true;
    const visibilityObserver = new IntersectionObserver(
      ([entry]) => {
        sceneVisible = entry?.isIntersecting ?? true;
      },
      { rootMargin: "180px" },
    );
    visibilityObserver.observe(host);
    const clock = new THREE.Clock();
    const render = () => {
      const delta = Math.min(clock.getDelta(), 0.05);
      const elapsed = clock.elapsedTime;
      if (sceneVisible && !reduceMotion) {
        particles.rotation.y = elapsed * 0.035;
        particles.rotation.x = Math.sin(elapsed * 0.16) * 0.06;
        haloA.rotation.z += delta * 0.105;
        haloB.rotation.z -= delta * 0.072;
        orbiters.rotation.y = elapsed * -0.12;
        pointerRig.rotation.y = THREE.MathUtils.damp(
          pointerRig.rotation.y,
          pointerX,
          3.4,
          delta,
        );
        pointerRig.rotation.x = THREE.MathUtils.damp(
          pointerRig.rotation.x,
          -pointerY,
          3.4,
          delta,
        );
      }
      if (sceneVisible) {
        renderer.render(scene, camera);
      }
      frame = window.requestAnimationFrame(render);
    };
    render();

    teardown = () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("pointermove", onPointerMove);
      visibilityObserver.disconnect();
      restoreHeroScroll?.();
      resizeObserver.disconnect();
      context.revert();
      coreGeometry.dispose();
      shellGeometry.dispose();
      haloAGeometry.dispose();
      haloBGeometry.dispose();
      pointsGeometry.dispose();
      dotGeometry.dispose();
      coreMaterial.dispose();
      shellMaterial.dispose();
      haloMaterial.dispose();
      haloBMaterial.dispose();
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
