"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { loadGsap } from "./gsapClient";

const EARTH_RADIUS = 1.56;

type Route = {
  from: [number, number];
  to: [number, number];
  height: number;
  phase: number;
  speed: number;
};

const routes: Route[] = [
  { from: [40.71, -74], to: [51.51, -0.13], height: 0.34, phase: 0.05, speed: 0.12 },
  { from: [37.77, -122.42], to: [35.68, 139.69], height: 0.52, phase: 0.38, speed: 0.09 },
  { from: [25.2, 55.27], to: [1.35, 103.82], height: 0.3, phase: 0.68, speed: 0.14 },
  { from: [28.54, -81.38], to: [-23.55, -46.63], height: 0.42, phase: 0.22, speed: 0.1 },
  { from: [51.51, -0.13], to: [6.52, 3.38], height: 0.28, phase: 0.76, speed: 0.13 },
  { from: [34.02, -6.84], to: [24.86, 67.01], height: 0.4, phase: 0.52, speed: 0.11 },
  { from: [24.86, 67.01], to: [-33.87, 151.21], height: 0.56, phase: 0.9, speed: 0.08 },
];

function latLngToVector3(lat: number, lng: number, radius: number) {
  const phi = THREE.MathUtils.degToRad(90 - lat);
  const theta = THREE.MathUtils.degToRad(lng + 180);

  return new THREE.Vector3(
    -radius * Math.sin(phi) * Math.cos(theta),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta),
  );
}

function createRouteCurve(route: Route) {
  const start = latLngToVector3(route.from[0], route.from[1], EARTH_RADIUS + 0.025);
  const end = latLngToVector3(route.to[0], route.to[1], EARTH_RADIUS + 0.025);
  const midpoint = start
    .clone()
    .add(end)
    .normalize()
    .multiplyScalar(EARTH_RADIUS + route.height);

  return new THREE.QuadraticBezierCurve3(start, midpoint, end);
}

function createStarField(count: number) {
  const positions = new Float32Array(count * 3);
  let seed = 48271;
  const random = () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };

  for (let index = 0; index < count; index += 1) {
    const radius = 4.8 + random() * 4.2;
    const theta = random() * Math.PI * 2;
    const phi = Math.acos(2 * random() - 1);
    positions[index * 3] = radius * Math.sin(phi) * Math.cos(theta);
    positions[index * 3 + 1] = radius * Math.cos(phi);
    positions[index * 3 + 2] = radius * Math.sin(phi) * Math.sin(theta);
  }

  return positions;
}

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
      camera.position.set(0, 0, 7.35);

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
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.12;
      host.appendChild(renderer.domElement);

      const scrollRig = new THREE.Group();
      const pointerRig = new THREE.Group();
      const signal = new THREE.Group();
      const globe = new THREE.Group();
      scene.add(scrollRig);
      scrollRig.add(pointerRig);
      pointerRig.add(signal);
      signal.add(globe);
      globe.rotation.set(0.08, -0.12, -0.1);

      const geometries: THREE.BufferGeometry[] = [];
      const materials: THREE.Material[] = [];
      const registerGeometry = <T extends THREE.BufferGeometry>(geometry: T) => {
        geometries.push(geometry);
        return geometry;
      };
      const registerMaterial = <T extends THREE.Material>(material: T) => {
        materials.push(material);
        return material;
      };

      const textureLoader = new THREE.TextureLoader();
      const dayTexture = textureLoader.load("/textures/earth-day.jpg");
      const nightTexture = textureLoader.load("/textures/earth-night.jpg");
      const anisotropy = Math.min(renderer.capabilities.getMaxAnisotropy(), 4);
      [dayTexture, nightTexture].forEach((texture) => {
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.anisotropy = anisotropy;
      });

      const earthGeometry = registerGeometry(
        new THREE.SphereGeometry(
          EARTH_RADIUS,
          isCompactViewport ? 56 : 80,
          isCompactViewport ? 32 : 48,
        ),
      );
      const earthMaterial = registerMaterial(
        new THREE.MeshStandardMaterial({
          map: dayTexture,
          color: 0xb7d8dc,
          roughness: 0.78,
          metalness: 0.03,
          emissive: new THREE.Color(0xffa95c),
          emissiveMap: nightTexture,
          emissiveIntensity: 1.22,
        }),
      );
      const earth = new THREE.Mesh(earthGeometry, earthMaterial);
      globe.add(earth);

      const cloudsGeometry = registerGeometry(
        new THREE.SphereGeometry(
          EARTH_RADIUS + 0.018,
          isCompactViewport ? 48 : 72,
          isCompactViewport ? 28 : 40,
        ),
      );
      const cloudsMaterial = registerMaterial(
        new THREE.ShaderMaterial({
          uniforms: {
            uTime: { value: 0 },
          },
          vertexShader: `
            varying vec2 vUv;
            void main() {
              vUv = uv;
              gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
          `,
          fragmentShader: `
            varying vec2 vUv;
            uniform float uTime;

            float random(vec2 p) {
              return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
            }

            float noise(vec2 p) {
              vec2 i = floor(p);
              vec2 f = fract(p);
              vec2 u = f * f * (3.0 - 2.0 * f);
              return mix(
                mix(random(i), random(i + vec2(1.0, 0.0)), u.x),
                mix(random(i + vec2(0.0, 1.0)), random(i + vec2(1.0, 1.0)), u.x),
                u.y
              );
            }

            float fbm(vec2 p) {
              float value = 0.0;
              float amplitude = 0.5;
              for (int i = 0; i < 4; i++) {
                value += amplitude * noise(p);
                p = p * 2.03 + vec2(11.7, 7.3);
                amplitude *= 0.5;
              }
              return value;
            }

            void main() {
              vec2 flow = vec2(vUv.x * 7.5 + uTime * 0.009, vUv.y * 4.6);
              float cloud = fbm(flow);
              cloud += fbm(flow * 1.9 - vec2(uTime * 0.005, 0.0)) * 0.26;
              float alpha = smoothstep(0.58, 0.78, cloud) * 0.5;
              vec3 cloudColor = mix(vec3(0.42, 0.72, 0.79), vec3(0.96), cloud);
              gl_FragColor = vec4(cloudColor, alpha);
            }
          `,
          transparent: true,
          depthWrite: false,
        }),
      );
      const clouds = new THREE.Mesh(cloudsGeometry, cloudsMaterial);
      globe.add(clouds);

      const atmosphereGeometry = registerGeometry(
        new THREE.SphereGeometry(
          EARTH_RADIUS + 0.13,
          isCompactViewport ? 48 : 72,
          isCompactViewport ? 28 : 40,
        ),
      );
      const atmosphereMaterial = registerMaterial(
        new THREE.ShaderMaterial({
          vertexShader: `
            varying vec3 vNormal;
            varying vec3 vViewDirection;
            void main() {
              vec4 modelViewPosition = modelViewMatrix * vec4(position, 1.0);
              vNormal = normalize(normalMatrix * normal);
              vViewDirection = normalize(-modelViewPosition.xyz);
              gl_Position = projectionMatrix * modelViewPosition;
            }
          `,
          fragmentShader: `
            varying vec3 vNormal;
            varying vec3 vViewDirection;
            void main() {
              float rim = pow(max(0.0, 0.72 - dot(vNormal, vViewDirection)), 2.25);
              vec3 cyan = vec3(0.22, 0.91, 1.0);
              gl_FragColor = vec4(cyan, rim * 0.88);
            }
          `,
          transparent: true,
          blending: THREE.AdditiveBlending,
          side: THREE.BackSide,
          depthWrite: false,
        }),
      );
      const atmosphere = new THREE.Mesh(atmosphereGeometry, atmosphereMaterial);
      globe.add(atmosphere);

      const routeMaterial = registerMaterial(
        new THREE.MeshBasicMaterial({
          color: 0x56ffe0,
          transparent: true,
          opacity: 0.7,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        }),
      );
      const routeCurves = routes.map(createRouteCurve);
      routeCurves.forEach((curve) => {
        const routeGeometry = registerGeometry(
          new THREE.TubeGeometry(
            curve,
            isCompactViewport ? 32 : 52,
            isCompactViewport ? 0.006 : 0.008,
            5,
            false,
          ),
        );
        globe.add(new THREE.Mesh(routeGeometry, routeMaterial));
      });

      const nodeGeometry = registerGeometry(new THREE.SphereGeometry(0.028, 7, 7));
      const nodeMaterial = registerMaterial(
        new THREE.MeshBasicMaterial({ color: 0xbffff1 }),
      );
      const routeNodes = new THREE.InstancedMesh(
        nodeGeometry,
        nodeMaterial,
        routes.length * 2,
      );
      const nodeTransform = new THREE.Object3D();
      routes.forEach((route, index) => {
        [route.from, route.to].forEach(([lat, lng], endpointIndex) => {
          nodeTransform.position.copy(
            latLngToVector3(lat, lng, EARTH_RADIUS + 0.035),
          );
          nodeTransform.updateMatrix();
          routeNodes.setMatrixAt(index * 2 + endpointIndex, nodeTransform.matrix);
        });
      });
      routeNodes.instanceMatrix.needsUpdate = true;
      globe.add(routeNodes);

      const pulsePositions = new Float32Array(routes.length * 3);
      const pulseGeometry = registerGeometry(new THREE.BufferGeometry());
      pulseGeometry.setAttribute(
        "position",
        new THREE.BufferAttribute(pulsePositions, 3),
      );
      const pulseMaterial = registerMaterial(
        new THREE.PointsMaterial({
          color: 0xd8fff7,
          size: isCompactViewport ? 0.07 : 0.085,
          sizeAttenuation: true,
          transparent: true,
          opacity: 1,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        }),
      );
      const pulses = new THREE.Points(pulseGeometry, pulseMaterial);
      globe.add(pulses);

      const orbitShell = new THREE.Group();
      signal.add(orbitShell);
      const orbitMaterial = registerMaterial(
        new THREE.MeshBasicMaterial({
          color: 0x59ffe2,
          transparent: true,
          opacity: 0.19,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        }),
      );
      const orbitGeometryA = registerGeometry(
        new THREE.TorusGeometry(2.18, 0.009, 6, isCompactViewport ? 88 : 132),
      );
      const orbitGeometryB = registerGeometry(
        new THREE.TorusGeometry(2.34, 0.007, 6, isCompactViewport ? 88 : 132),
      );
      const orbitGeometryC = registerGeometry(
        new THREE.TorusGeometry(2.05, 0.006, 6, isCompactViewport ? 88 : 132),
      );
      const orbitA = new THREE.Mesh(orbitGeometryA, orbitMaterial);
      const orbitB = new THREE.Mesh(orbitGeometryB, orbitMaterial);
      const orbitC = new THREE.Mesh(orbitGeometryC, orbitMaterial);
      orbitA.rotation.set(1.06, 0.24, 0.14);
      orbitB.rotation.set(0.48, 1.14, -0.46);
      orbitC.rotation.set(1.42, -0.62, 0.32);
      orbitShell.add(orbitA, orbitB, orbitC);

      const orbitDotGeometry = registerGeometry(new THREE.SphereGeometry(0.035, 7, 7));
      const orbitDotMaterial = registerMaterial(
        new THREE.MeshBasicMaterial({ color: 0x9dffe9 }),
      );
      const orbiters = new THREE.InstancedMesh(orbitDotGeometry, orbitDotMaterial, 12);
      const orbiterTransform = new THREE.Object3D();
      for (let index = 0; index < 12; index += 1) {
        const angle = (index / 12) * Math.PI * 2;
        const orbit = 2.03 + (index % 3) * 0.15;
        orbiterTransform.position.set(
          Math.cos(angle) * orbit,
          Math.sin(angle * 1.7) * 0.72,
          Math.sin(angle) * orbit,
        );
        orbiterTransform.updateMatrix();
        orbiters.setMatrixAt(index, orbiterTransform.matrix);
      }
      orbiters.instanceMatrix.needsUpdate = true;
      orbitShell.add(orbiters);

      const starGeometry = registerGeometry(new THREE.BufferGeometry());
      starGeometry.setAttribute(
        "position",
        new THREE.BufferAttribute(
          createStarField(isCompactViewport ? 260 : 520),
          3,
        ),
      );
      const starMaterial = registerMaterial(
        new THREE.PointsMaterial({
          color: 0x83d9d1,
          size: 0.014,
          sizeAttenuation: true,
          transparent: true,
          opacity: 0.52,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        }),
      );
      const stars = new THREE.Points(starGeometry, starMaterial);
      signal.add(stars);

      const ambientLight = new THREE.HemisphereLight(0x88dff4, 0x01090d, 0.34);
      const keyLight = new THREE.DirectionalLight(0xd1f6ff, 3.6);
      const rimLight = new THREE.PointLight(0x34dfff, 12, 12, 2);
      keyLight.position.set(-4.2, 3.8, 5.6);
      rimLight.position.set(2.8, 1.8, -2.4);
      scene.add(ambientLight, keyLight, rimLight);

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
        pointerX = (event.clientX / window.innerWidth - 0.5) * 0.3;
        pointerY = (event.clientY / window.innerHeight - 0.5) * 0.18;
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
            { x: -0.34, y: -0.86 },
            { x: 0.06, y: 0.1, duration: 2.2 },
            0.28,
          )
          .fromTo(
            camera.position,
            { z: 10.6 },
            { z: 7.35, duration: 2.1 },
            0.25,
          );

        if (!reduceMotion && hero) {
          const scrollCue = hero.querySelector<HTMLElement>(".scroll-cue");
          const heroOrbitA = hero.querySelector<HTMLElement>(".hero-orbit-a");
          const heroOrbitB = hero.querySelector<HTMLElement>(".hero-orbit-b");
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
            .to(camera.position, { z: 4.85, duration: 0.78 }, "focus")
            .to(
              scrollRig.rotation,
              { y: Math.PI * 0.82, x: -0.2, duration: 0.78 },
              "focus",
            )
            .to(
              scrollRig.scale,
              { x: 1.26, y: 1.26, z: 1.26, duration: 0.78 },
              "focus",
            )
            .to(heroOrbitA, { scale: 1.2, rotation: 18, duration: 0.78 }, "focus")
            .to(heroOrbitB, { scale: 1.12, rotation: -12, duration: 0.78 }, "focus")
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
      const pulseAttribute = pulseGeometry.getAttribute("position") as THREE.BufferAttribute;

      const render = () => {
        const delta = Math.min(clock.getDelta(), 0.05);
        const elapsed = clock.elapsedTime;

        if (sceneVisible && !reduceMotion) {
          globe.rotation.y += delta * 0.052;
          clouds.rotation.y += delta * 0.014;
          cloudsMaterial.uniforms.uTime.value = elapsed;
          orbitShell.rotation.y = elapsed * -0.035;
          orbitShell.rotation.z = Math.sin(elapsed * 0.11) * 0.035;
          stars.rotation.y = elapsed * 0.004;

          routes.forEach((route, index) => {
            const progress = (elapsed * route.speed + route.phase) % 1;
            const point = routeCurves[index].getPointAt(progress);
            pulsePositions[index * 3] = point.x;
            pulsePositions[index * 3 + 1] = point.y;
            pulsePositions[index * 3 + 2] = point.z;
          });
          pulseAttribute.needsUpdate = true;

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
        dayTexture.dispose();
        nightTexture.dispose();
        geometries.forEach((geometry) => geometry.dispose());
        materials.forEach((material) => material.dispose());
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
