"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { loadGsap } from "./gsapClient";

const GLOBE_RADIUS = 1.58;

type Coordinate = [number, number];
type PolygonRings = Coordinate[][];
type WorldGeometry =
  | { type: "Polygon"; coordinates: PolygonRings }
  | { type: "MultiPolygon"; coordinates: PolygonRings[] };
type WorldData = {
  features: Array<{ geometry: WorldGeometry | null }>;
};
type Route = {
  from: Coordinate;
  to: Coordinate;
  height: number;
  phase: number;
  speed: number;
};

const routes: Route[] = [
  { from: [-0.13, 51.51], to: [55.27, 25.2], height: 0.38, phase: 0.04, speed: 0.14 },
  { from: [-0.13, 51.51], to: [3.38, 6.52], height: 0.3, phase: 0.28, speed: 0.11 },
  { from: [2.35, 48.86], to: [31.24, 30.04], height: 0.24, phase: 0.52, speed: 0.16 },
  { from: [55.27, 25.2], to: [67.01, 24.86], height: 0.25, phase: 0.72, speed: 0.13 },
  { from: [36.82, -1.29], to: [18.42, -33.92], height: 0.34, phase: 0.86, speed: 0.1 },
  { from: [-3.7, 40.42], to: [-74, 40.71], height: 0.52, phase: 0.18, speed: 0.08 },
  { from: [67.01, 24.86], to: [103.82, 1.35], height: 0.42, phase: 0.62, speed: 0.12 },
  { from: [28.98, 41.01], to: [18.07, 59.33], height: 0.28, phase: 0.4, speed: 0.15 },
];

function getPolygons(geometry: WorldGeometry) {
  return geometry.type === "Polygon"
    ? [geometry.coordinates]
    : geometry.coordinates;
}

function latLngToVector3(lng: number, lat: number, radius: number) {
  const phi = THREE.MathUtils.degToRad(90 - lat);
  const theta = THREE.MathUtils.degToRad(lng + 180);

  return new THREE.Vector3(
    -radius * Math.sin(phi) * Math.cos(theta),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta),
  );
}

function createRouteCurve(route: Route) {
  const start = latLngToVector3(route.from[0], route.from[1], GLOBE_RADIUS + 0.045);
  const end = latLngToVector3(route.to[0], route.to[1], GLOBE_RADIUS + 0.045);
  const midpoint = start
    .clone()
    .add(end)
    .normalize()
    .multiplyScalar(GLOBE_RADIUS + route.height);

  return new THREE.QuadraticBezierCurve3(start, midpoint, end);
}

function createGraticulePositions(radius: number) {
  const positions: number[] = [];
  const pushSegment = (a: THREE.Vector3, b: THREE.Vector3) => {
    positions.push(a.x, a.y, a.z, b.x, b.y, b.z);
  };

  for (let lat = -75; lat <= 75; lat += 15) {
    for (let lng = -180; lng < 180; lng += 4) {
      pushSegment(
        latLngToVector3(lng, lat, radius),
        latLngToVector3(lng + 4, lat, radius),
      );
    }
  }

  for (let lng = -180; lng < 180; lng += 15) {
    for (let lat = -88; lat < 88; lat += 4) {
      pushSegment(
        latLngToVector3(lng, lat, radius),
        latLngToVector3(lng, Math.min(lat + 4, 88), radius),
      );
    }
  }

  return new Float32Array(positions);
}

function createStarField(count: number) {
  const positions = new Float32Array(count * 3);
  let seed = 48271;
  const random = () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };

  for (let index = 0; index < count; index += 1) {
    const radius = 3.8 + random() * 5.2;
    const theta = random() * Math.PI * 2;
    const phi = Math.acos(2 * random() - 1);
    positions[index * 3] = radius * Math.sin(phi) * Math.cos(theta);
    positions[index * 3 + 1] = radius * Math.cos(phi);
    positions[index * 3 + 2] = radius * Math.sin(phi) * Math.sin(theta);
  }

  return positions;
}

function createGeographyPositions(worldData: WorldData, compact: boolean) {
  const canvas = document.createElement("canvas");
  canvas.width = compact ? 480 : 720;
  canvas.height = compact ? 240 : 360;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  const outlinePositions: number[] = [];

  if (!context) {
    return {
      dots: new Float32Array(),
      outlines: new Float32Array(),
    };
  }

  context.clearRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = "#ffffff";

  worldData.features.forEach(({ geometry }) => {
    if (!geometry) return;

    getPolygons(geometry).forEach((polygon) => {
      const path = new Path2D();

      polygon.forEach((ring) => {
        ring.forEach(([lng, lat], index) => {
          const x = ((lng + 180) / 360) * canvas.width;
          const y = ((90 - lat) / 180) * canvas.height;
          if (index === 0) path.moveTo(x, y);
          else path.lineTo(x, y);

          const next = ring[index + 1];
          if (!next || Math.abs(next[0] - lng) > 180) return;
          const start = latLngToVector3(lng, lat, GLOBE_RADIUS + 0.035);
          const end = latLngToVector3(next[0], next[1], GLOBE_RADIUS + 0.035);
          outlinePositions.push(
            start.x,
            start.y,
            start.z,
            end.x,
            end.y,
            end.z,
          );
        });
        path.closePath();
      });

      context.fill(path, "evenodd");
    });
  });

  const imageData = context.getImageData(0, 0, canvas.width, canvas.height).data;
  const dotPositions: number[] = [];
  const step = compact ? 5 : 4;

  for (let y = step / 2; y < canvas.height; y += step) {
    const rowOffset = Math.floor(y / step) % 2 === 0 ? 0 : step * 0.5;
    for (let x = step / 2 + rowOffset; x < canvas.width; x += step) {
      const pixel = (Math.floor(y) * canvas.width + Math.floor(x)) * 4;
      if (imageData[pixel + 3] < 100) continue;
      const lng = (x / canvas.width) * 360 - 180;
      const lat = 90 - (y / canvas.height) * 180;
      const point = latLngToVector3(lng, lat, GLOBE_RADIUS + 0.022);
      dotPositions.push(point.x, point.y, point.z);
    }
  }

  return {
    dots: new Float32Array(dotPositions),
    outlines: new Float32Array(outlinePositions),
  };
}

export function SignalField() {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    let cancelled = false;
    let teardown: (() => void) | undefined;
    const abortController = new AbortController();
    const worldDataPromise = fetch("/data/world-110m.geojson", {
      signal: abortController.signal,
    })
      .then((response) => (response.ok ? response.json() : null))
      .catch(() => null) as Promise<WorldData | null>;

    void Promise.all([loadGsap(), worldDataPromise]).then(
      ([{ gsap }, worldData]) => {
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
        renderer.toneMappingExposure = 1.15;
        host.appendChild(renderer.domElement);

        const scrollRig = new THREE.Group();
        const pointerRig = new THREE.Group();
        const signal = new THREE.Group();
        const globe = new THREE.Group();
        scene.add(scrollRig);
        scrollRig.add(pointerRig);
        pointerRig.add(signal);
        signal.add(globe);
        globe.rotation.set(0.08, -1.9, -0.07);

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

        const sphereGeometry = registerGeometry(
          new THREE.SphereGeometry(
            GLOBE_RADIUS,
            isCompactViewport ? 52 : 72,
            isCompactViewport ? 30 : 44,
          ),
        );
        const sphereMaterial = registerMaterial(
          new THREE.MeshPhongMaterial({
            color: 0x041915,
            emissive: 0x031c17,
            emissiveIntensity: 0.82,
            shininess: 130,
            transparent: true,
            opacity: 0.92,
          }),
        );
        globe.add(new THREE.Mesh(sphereGeometry, sphereMaterial));

        const graticuleGeometry = registerGeometry(new THREE.BufferGeometry());
        graticuleGeometry.setAttribute(
          "position",
          new THREE.BufferAttribute(
            createGraticulePositions(GLOBE_RADIUS + 0.014),
            3,
          ),
        );
        const graticuleMaterial = registerMaterial(
          new THREE.LineBasicMaterial({
            color: 0x43d9b2,
            transparent: true,
            opacity: 0.16,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
          }),
        );
        globe.add(new THREE.LineSegments(graticuleGeometry, graticuleMaterial));

        let landMaterial: THREE.ShaderMaterial | undefined;
        let outlineMaterial: THREE.LineBasicMaterial | undefined;

        if (worldData) {
          const geography = createGeographyPositions(worldData, isCompactViewport);
          const landGeometry = registerGeometry(new THREE.BufferGeometry());
          landGeometry.setAttribute(
            "position",
            new THREE.BufferAttribute(geography.dots, 3),
          );
          landMaterial = registerMaterial(
            new THREE.ShaderMaterial({
              uniforms: {
                uColor: { value: new THREE.Color(0x4fffc8) },
                uTime: { value: 0 },
                uSize: { value: isCompactViewport ? 0.13 : 0.16 },
              },
              vertexShader: `
                uniform float uTime;
                uniform float uSize;
                varying float vPulse;
                void main() {
                  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
                  vPulse = 0.82 + 0.18 * sin(uTime * 1.4 + position.y * 13.0 + position.x * 7.0);
                  gl_PointSize = uSize * vPulse * (100.0 / max(1.0, -mvPosition.z));
                  gl_Position = projectionMatrix * mvPosition;
                }
              `,
              fragmentShader: `
                uniform vec3 uColor;
                varying float vPulse;
                void main() {
                  float distanceToCenter = distance(gl_PointCoord, vec2(0.5));
                  float alpha = smoothstep(0.5, 0.16, distanceToCenter) * vPulse;
                  gl_FragColor = vec4(uColor, alpha);
                }
              `,
              transparent: true,
              blending: THREE.AdditiveBlending,
              depthWrite: false,
            }),
          );
          globe.add(new THREE.Points(landGeometry, landMaterial));

          const outlineGeometry = registerGeometry(new THREE.BufferGeometry());
          outlineGeometry.setAttribute(
            "position",
            new THREE.BufferAttribute(geography.outlines, 3),
          );
          outlineMaterial = registerMaterial(
            new THREE.LineBasicMaterial({
              color: 0x72ffda,
              transparent: true,
              opacity: 0.72,
              blending: THREE.AdditiveBlending,
              depthWrite: false,
            }),
          );
          globe.add(new THREE.LineSegments(outlineGeometry, outlineMaterial));
        }

        const atmosphereGeometry = registerGeometry(
          new THREE.SphereGeometry(
            GLOBE_RADIUS + 0.13,
            isCompactViewport ? 48 : 68,
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
                float rim = pow(max(0.0, 0.76 - dot(vNormal, vViewDirection)), 2.1);
                vec3 mint = vec3(0.23, 1.0, 0.78);
                gl_FragColor = vec4(mint, rim * 0.94);
              }
            `,
            transparent: true,
            blending: THREE.AdditiveBlending,
            side: THREE.BackSide,
            depthWrite: false,
          }),
        );
        globe.add(new THREE.Mesh(atmosphereGeometry, atmosphereMaterial));

        const routeCurves = routes.map(createRouteCurve);
        const routeMaterial = registerMaterial(
          new THREE.MeshBasicMaterial({
            color: 0x55ffd0,
            transparent: true,
            opacity: 0.7,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
          }),
        );
        routeCurves.forEach((curve) => {
          const geometry = registerGeometry(
            new THREE.TubeGeometry(
              curve,
              isCompactViewport ? 28 : 48,
              isCompactViewport ? 0.005 : 0.007,
              5,
              false,
            ),
          );
          globe.add(new THREE.Mesh(geometry, routeMaterial));
        });

        const nodeGeometry = registerGeometry(new THREE.SphereGeometry(0.026, 7, 7));
        const nodeMaterial = registerMaterial(
          new THREE.MeshBasicMaterial({ color: 0xc9fff0 }),
        );
        const routeNodes = new THREE.InstancedMesh(
          nodeGeometry,
          nodeMaterial,
          routes.length * 2,
        );
        const nodeTransform = new THREE.Object3D();
        routes.forEach((route, index) => {
          [route.from, route.to].forEach(([lng, lat], endpointIndex) => {
            nodeTransform.position.copy(
              latLngToVector3(lng, lat, GLOBE_RADIUS + 0.05),
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
            color: 0xe1fff6,
            size: isCompactViewport ? 0.075 : 0.09,
            sizeAttenuation: true,
            transparent: true,
            opacity: 1,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
          }),
        );
        globe.add(new THREE.Points(pulseGeometry, pulseMaterial));

        const orbitSpecs = [
          { radius: 2.08, rotation: new THREE.Euler(1.1, 0.18, 0.12), speed: 0.28 },
          { radius: 2.24, rotation: new THREE.Euler(0.5, 1.08, -0.42), speed: -0.22 },
          { radius: 2.34, rotation: new THREE.Euler(1.44, -0.58, 0.28), speed: 0.18 },
          { radius: 2.16, rotation: new THREE.Euler(0.78, -1.18, 0.56), speed: -0.31 },
        ];
        const orbitShell = new THREE.Group();
        signal.add(orbitShell);
        const orbitMaterial = registerMaterial(
          new THREE.MeshBasicMaterial({
            color: 0x6effda,
            transparent: true,
            opacity: 0.28,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
          }),
        );
        orbitSpecs.forEach((spec) => {
          const geometry = registerGeometry(
            new THREE.TorusGeometry(
              spec.radius,
              0.006,
              5,
              isCompactViewport ? 88 : 132,
            ),
          );
          const orbit = new THREE.Mesh(geometry, orbitMaterial);
          orbit.rotation.copy(spec.rotation);
          orbitShell.add(orbit);
        });

        const orbiterGeometry = registerGeometry(new THREE.SphereGeometry(0.034, 7, 7));
        const orbiterMaterial = registerMaterial(
          new THREE.MeshBasicMaterial({ color: 0xc5fff0 }),
        );
        const orbiterCount = isCompactViewport ? 9 : 14;
        const orbiters = new THREE.InstancedMesh(
          orbiterGeometry,
          orbiterMaterial,
          orbiterCount,
        );
        orbiters.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
        orbitShell.add(orbiters);
        const orbiterTransform = new THREE.Object3D();
        const orbiterPosition = new THREE.Vector3();

        const starGeometry = registerGeometry(new THREE.BufferGeometry());
        starGeometry.setAttribute(
          "position",
          new THREE.BufferAttribute(
            createStarField(isCompactViewport ? 420 : 800),
            3,
          ),
        );
        const starMaterial = registerMaterial(
          new THREE.PointsMaterial({
            color: 0x75eacb,
            size: 0.017,
            sizeAttenuation: true,
            transparent: true,
            opacity: 0.62,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
          }),
        );
        const stars = new THREE.Points(starGeometry, starMaterial);
        signal.add(stars);

        const ambientLight = new THREE.HemisphereLight(0x7dffe0, 0x010806, 0.45);
        const keyLight = new THREE.PointLight(0x74ffd8, 15, 10, 2);
        keyLight.position.set(-2.5, 3.3, 4.8);
        scene.add(ambientLight, keyLight);

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
              .to(camera.position, { z: 4.8, duration: 0.78 }, "focus")
              .to(
                scrollRig.rotation,
                { y: Math.PI * 0.82, x: -0.2, duration: 0.78 },
                "focus",
              )
              .to(
                scrollRig.scale,
                { x: 1.27, y: 1.27, z: 1.27, duration: 0.78 },
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
            if (landMaterial) landMaterial.uniforms.uTime.value = elapsed;
            if (outlineMaterial) {
              outlineMaterial.opacity = 0.64 + Math.sin(elapsed * 0.8) * 0.08;
            }
            graticuleMaterial.opacity = 0.14 + Math.sin(elapsed * 0.45) * 0.025;
            stars.rotation.y = elapsed * 0.006;
            stars.rotation.x = Math.sin(elapsed * 0.1) * 0.018;
            orbitShell.rotation.y = elapsed * -0.025;
            orbitShell.rotation.z = Math.sin(elapsed * 0.12) * 0.04;

            routes.forEach((route, index) => {
              const progress = (elapsed * route.speed + route.phase) % 1;
              const point = routeCurves[index].getPointAt(progress);
              pulsePositions[index * 3] = point.x;
              pulsePositions[index * 3 + 1] = point.y;
              pulsePositions[index * 3 + 2] = point.z;
            });
            pulseAttribute.needsUpdate = true;

            for (let index = 0; index < orbiterCount; index += 1) {
              const spec = orbitSpecs[index % orbitSpecs.length];
              const angle = elapsed * spec.speed + (index / orbiterCount) * Math.PI * 2;
              orbiterPosition
                .set(Math.cos(angle) * spec.radius, Math.sin(angle) * spec.radius, 0)
                .applyEuler(spec.rotation);
              orbiterTransform.position.copy(orbiterPosition);
              const pulse = 0.82 + Math.sin(elapsed * 2.2 + index) * 0.18;
              orbiterTransform.scale.setScalar(pulse);
              orbiterTransform.updateMatrix();
              orbiters.setMatrixAt(index, orbiterTransform.matrix);
            }
            orbiters.instanceMatrix.needsUpdate = true;

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
          geometries.forEach((geometry) => geometry.dispose());
          materials.forEach((material) => material.dispose());
          renderer.dispose();
          renderer.domElement.remove();
        };
      },
    );

    return () => {
      cancelled = true;
      abortController.abort();
      teardown?.();
    };
  }, []);

  return <div className="signal-field" ref={hostRef} aria-hidden="true" />;
}
