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

    const ambientLight = new THREE.AmbientLight(0x9ddcff, 1.7);
    const blueLight = new THREE.PointLight(0x55dfff, 7, 14);
    blueLight.position.set(2.8, 2.2, 4.6);
    scene.add(ambientLight, blueLight);

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

    const shellGeometry = new THREE.IcosahedronGeometry(1.02, 2);
    const shellMaterial = new THREE.MeshBasicMaterial({
      color: 0x0d2f23,
      transparent: true,
      opacity: 0.72,
    });
    const shell = new THREE.Mesh(shellGeometry, shellMaterial);
    signal.add(shell);

    const blueGeometry = new THREE.IcosahedronGeometry(1.34, 3);
    const bluePositions = blueGeometry.getAttribute("position");
    for (let index = 0; index < bluePositions.count; index += 1) {
      const x = bluePositions.getX(index);
      const y = bluePositions.getY(index);
      const z = bluePositions.getZ(index);
      const warp =
        1 +
        Math.sin(x * 3.2 + y * 1.7) * 0.055 +
        Math.cos(z * 4.1 - x * 1.3) * 0.04;
      bluePositions.setXYZ(index, x * warp, y * warp, z * warp);
    }
    blueGeometry.computeVertexNormals();
    const blueMaterial = new THREE.MeshStandardMaterial({
      color: 0x2178ff,
      emissive: 0x0a2c72,
      emissiveIntensity: 0.75,
      flatShading: true,
      metalness: 0.05,
      roughness: 0.34,
      transparent: true,
      opacity: 0,
    });
    const blueBlob = new THREE.Mesh(blueGeometry, blueMaterial);
    blueBlob.scale.setScalar(0.68);
    signal.add(blueBlob);

    const latticeGeometry = new THREE.IcosahedronGeometry(1.62, 1);
    const latticeMaterial = new THREE.MeshBasicMaterial({
      color: 0x9fcf2f,
      wireframe: true,
      transparent: true,
      opacity: 0,
    });
    const lattice = new THREE.Mesh(latticeGeometry, latticeMaterial);
    lattice.rotation.set(0.18, -0.28, 0.1);
    signal.add(lattice);

    const crystalGeometry = new THREE.TetrahedronGeometry(0.24, 0);
    const crystalMaterial = new THREE.MeshBasicMaterial({
      color: 0x66fff0,
      transparent: true,
      opacity: 0,
      depthWrite: false,
    });
    const crystals = new THREE.Group();
    [
      [-0.35, 0.38, 1.08],
      [0.12, 0.52, 1.12],
      [0.38, 0.03, 1.16],
      [-0.08, -0.18, 1.2],
      [-0.42, -0.38, 1.02],
    ].forEach(([x, y, z], index) => {
      const crystal = new THREE.Mesh(crystalGeometry, crystalMaterial);
      crystal.position.set(x, y, z);
      crystal.rotation.set(index * 0.34, index * -0.42, index * 0.27);
      crystal.scale.setScalar(0.72 + index * 0.07);
      crystals.add(crystal);
    });
    signal.add(crystals);

    const haloMaterial = new THREE.MeshBasicMaterial({
      color: 0x8bffd0,
      transparent: true,
      opacity: 0.25,
    });

    const haloAGeometry = new THREE.TorusGeometry(1.82, 0.012, 8, 180);
    const haloA = new THREE.Mesh(haloAGeometry, haloMaterial);
    haloA.rotation.set(1.14, 0.25, 0.18);
    signal.add(haloA);

    const haloBMaterial = haloMaterial.clone();
    const haloBGeometry = new THREE.TorusGeometry(2.12, 0.009, 8, 180);
    const haloB = new THREE.Mesh(haloBGeometry, haloBMaterial);
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
    const particleMaterial = new THREE.PointsMaterial({
      color: 0x8bffd0,
      size: 0.024,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0.78,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const particles = new THREE.Points(pointsGeometry, particleMaterial);
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
        const heroCopy = hero.querySelector<HTMLElement>(".hero-copy");
        const heroSide = hero.querySelector<HTMLElement>(".hero-side");
        const heroStatus = hero.querySelector<HTMLElement>(".hero-status");
        const scrollCue = hero.querySelector<HTMLElement>(".scroll-cue");
        const orbitA = hero.querySelector<HTMLElement>(".hero-orbit-a");
        const orbitB = hero.querySelector<HTMLElement>(".hero-orbit-b");
        const blueGlow = hero.querySelector<HTMLElement>(".hero-blue-glow");
        const transitionWash = hero.querySelector<HTMLElement>(
          ".hero-transition-wash",
        );

        const heroTimeline = gsap.timeline({
          defaults: { ease: "none" },
          scrollTrigger: {
            trigger: hero,
            start: "top top",
            end: () =>
              canPinHero
                ? `+=${Math.max(window.innerHeight * 3.15, 2200)}`
                : "bottom top",
            pin: canPinHero,
            pinSpacing: true,
            scrub: 0.55,
            anticipatePin: 1,
            invalidateOnRefresh: true,
            refreshPriority: -10,
          },
        });

        heroTimeline
          .addLabel("focus", 0)
          .to(scrollCue, { autoAlpha: 0, duration: 0.08 }, "focus")
          .to(camera.position, { z: 5.6, duration: 0.34 }, "focus")
          .to(
            scrollRig.rotation,
            { y: Math.PI * 0.4, x: -0.1, duration: 0.34 },
            "focus",
          )
          .to(
            scrollRig.scale,
            { x: 1.12, y: 1.12, z: 1.12, duration: 0.34 },
            "focus",
          )
          .to(orbitA, { scale: 1.1, rotation: 11, duration: 0.34 }, "focus")
          .to(orbitB, { scale: 1.06, rotation: -8, duration: 0.34 }, "focus")
          .addLabel("blue", 0.28)
          .to(camera.position, { z: 4.55, duration: 0.52 }, "blue")
          .to(
            scrollRig.rotation,
            { y: Math.PI * 0.92, x: -0.2, duration: 0.52 },
            "blue",
          )
          .to(
            scrollRig.scale,
            { x: 1.32, y: 1.32, z: 1.32, duration: 0.52 },
            "blue",
          )
          .to(blueBlob.scale, { x: 1.08, y: 1.08, z: 1.08, duration: 0.52 }, "blue")
          .to(blueBlob.rotation, { x: 0.34, y: -0.64, duration: 0.52 }, "blue")
          .to(blueMaterial, { opacity: 0.88, duration: 0.38 }, "blue")
          .to(shellMaterial, { opacity: 0.04, duration: 0.3 }, "blue")
          .to(coreMaterial, { opacity: 0.1, duration: 0.3 }, "blue")
          .to(latticeMaterial, { opacity: 0.5, duration: 0.38 }, "blue+=0.08")
          .to(crystalMaterial, { opacity: 0.82, duration: 0.3 }, "blue+=0.14")
          .to(
            particleMaterial.color,
            { r: 0.47, g: 0.3, b: 1, duration: 0.42 },
            "blue",
          )
          .to(blueGlow, { autoAlpha: 1, scale: 1.08, duration: 0.44 }, "blue")
          .to(orbitA, { scale: 1.28, rotation: 28, duration: 0.52 }, "blue")
          .to(orbitB, { scale: 1.18, rotation: -20, duration: 0.52 }, "blue")
          .addLabel("resolve", 0.8)
          .to(blueBlob.rotation, { y: -0.15, z: 0.18, duration: 0.2 }, "resolve")
          .to(lattice.rotation, { x: 0.45, y: 0.58, duration: 0.2 }, "resolve")
          .to(crystals.rotation, { z: 0.52, y: -0.28, duration: 0.2 }, "resolve")
          .addLabel("release", 0.98)
          .to(heroCopy, { y: -48, autoAlpha: 0, duration: 0.2 }, "release")
          .to(heroSide, { y: -30, autoAlpha: 0, duration: 0.16 }, "release")
          .to(heroStatus, { y: 24, autoAlpha: 0, duration: 0.16 }, "release")
          .to(host, { scale: 1.1, autoAlpha: 0.08, duration: 0.22 }, "release")
          .to(blueGlow, { autoAlpha: 0, duration: 0.2 }, "release")
          .to(transitionWash, { autoAlpha: 1, duration: 0.22 }, "release");
      }
    }, host);

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
      window.removeEventListener("pointermove", onPointerMove);
      resizeObserver.disconnect();
      context.revert();
      coreGeometry.dispose();
      shellGeometry.dispose();
      blueGeometry.dispose();
      latticeGeometry.dispose();
      crystalGeometry.dispose();
      haloAGeometry.dispose();
      haloBGeometry.dispose();
      pointsGeometry.dispose();
      dotGeometry.dispose();
      coreMaterial.dispose();
      shellMaterial.dispose();
      blueMaterial.dispose();
      latticeMaterial.dispose();
      crystalMaterial.dispose();
      particleMaterial.dispose();
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
