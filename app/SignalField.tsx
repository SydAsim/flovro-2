"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { createGlobeNetwork } from "./GlobeNetwork";
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

function createGraticulePositions(radius: number) {
  const positions: number[] = [];
  const pushSegment = (a: THREE.Vector3, b: THREE.Vector3) => {
    positions.push(a.x, a.y, a.z, b.x, b.y, b.z);
  };

  for (let lat = -80; lat <= 80; lat += 10) {
    for (let lng = -180; lng < 180; lng += 2) {
      pushSegment(
        latLngToVector3(lng, lat, radius),
        latLngToVector3(lng + 2, lat, radius),
      );
    }
  }

  for (let lng = -180; lng < 180; lng += 10) {
    for (let lat = -88; lat < 88; lat += 2) {
      pushSegment(
        latLngToVector3(lng, lat, radius),
        latLngToVector3(lng, Math.min(lat + 2, 88), radius),
      );
    }
  }

  return new Float32Array(positions);
}

function createGeographyPositions(worldData: WorldData, compact: boolean) {
  const canvas = document.createElement("canvas");
  canvas.width = compact ? 640 : 1024;
  canvas.height = compact ? 320 : 512;
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
          const longitudeDelta = next[0] - lng;
          const latitudeDelta = next[1] - lat;
          const subdivisions = Math.max(
            1,
            Math.ceil(
              Math.max(Math.abs(longitudeDelta), Math.abs(latitudeDelta)) / 0.5,
            ),
          );

          for (let segment = 0; segment < subdivisions; segment += 1) {
            const startProgress = segment / subdivisions;
            const endProgress = (segment + 1) / subdivisions;
            const start = latLngToVector3(
              lng + longitudeDelta * startProgress,
              lat + latitudeDelta * startProgress,
              GLOBE_RADIUS + 0.042,
            );
            const end = latLngToVector3(
              lng + longitudeDelta * endProgress,
              lat + latitudeDelta * endProgress,
              GLOBE_RADIUS + 0.042,
            );
            outlinePositions.push(
              start.x,
              start.y,
              start.z,
              end.x,
              end.y,
              end.z,
            );
          }
        });
        path.closePath();
      });

      context.fill(path, "evenodd");
    });
  });

  const imageData = context.getImageData(0, 0, canvas.width, canvas.height).data;
  const dotPositions: number[] = [];
  const step = compact ? 3 : 2;

  for (let y = step / 2; y < canvas.height; y += step) {
    const rowOffset = Math.floor(y / step) % 2 === 0 ? 0 : step * 0.5;
    for (let x = step / 2 + rowOffset; x < canvas.width; x += step) {
      const pixel = (Math.floor(y) * canvas.width + Math.floor(x)) * 4;
      if (imageData[pixel + 3] < 100) continue;
      const lng = (x / canvas.width) * 360 - 180;
      const lat = 90 - (y / canvas.height) * 180;
      const point = latLngToVector3(lng, lat, GLOBE_RADIUS + 0.036);
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

        const signal = new THREE.Group();
        const globe = new THREE.Group();
        scene.add(signal);
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
            isCompactViewport ? 64 : 96,
            isCompactViewport ? 40 : 64,
          ),
        );
        const sphereMaterial = registerMaterial(
          new THREE.MeshPhongMaterial({
            color: 0x06251d,
            emissive: 0x052b21,
            emissiveIntensity: 0.94,
            shininess: 105,
            transparent: false,
          }),
        );
        const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
        sphere.renderOrder = 0;
        globe.add(sphere);

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
            color: 0x39c7a4,
            transparent: true,
            opacity: 0.17,
            blending: THREE.NormalBlending,
            depthTest: true,
            depthWrite: false,
          }),
        );
        const graticule = new THREE.LineSegments(
          graticuleGeometry,
          graticuleMaterial,
        );
        graticule.renderOrder = 1;
        globe.add(graticule);

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
                uColor: { value: new THREE.Color(0x6affe0) },
                uTime: { value: 0 },
                uSize: { value: isCompactViewport ? 0.095 : 0.115 },
              },
              vertexShader: `
                uniform float uTime;
                uniform float uSize;
                varying float vPulse;
                varying float vFacing;
                void main() {
                  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
                  vec3 viewNormal = normalize(normalMatrix * normalize(position));
                  vFacing = smoothstep(0.02, 0.32, viewNormal.z);
                  vPulse = 0.88 + 0.12 * sin(uTime * 1.25 + position.y * 13.0 + position.x * 7.0);
                  gl_PointSize = uSize * vPulse * (100.0 / max(1.0, -mvPosition.z));
                  gl_Position = projectionMatrix * mvPosition;
                }
              `,
              fragmentShader: `
                uniform vec3 uColor;
                varying float vPulse;
                varying float vFacing;
                void main() {
                  float distanceToCenter = distance(gl_PointCoord, vec2(0.5));
                  float alpha = smoothstep(0.5, 0.12, distanceToCenter) * vPulse * vFacing;
                  gl_FragColor = vec4(uColor, alpha);
                }
              `,
              transparent: true,
              blending: THREE.NormalBlending,
              depthTest: true,
              depthWrite: false,
            }),
          );
          const land = new THREE.Points(landGeometry, landMaterial);
          land.renderOrder = 2;
          globe.add(land);

          const outlineGeometry = registerGeometry(new THREE.BufferGeometry());
          outlineGeometry.setAttribute(
            "position",
            new THREE.BufferAttribute(geography.outlines, 3),
          );
          outlineMaterial = registerMaterial(
            new THREE.LineBasicMaterial({
              color: 0xa9ffe8,
              transparent: true,
              opacity: 0.62,
              blending: THREE.NormalBlending,
              depthTest: true,
              depthWrite: false,
            }),
          );
          const outlines = new THREE.LineSegments(
            outlineGeometry,
            outlineMaterial,
          );
          outlines.renderOrder = 3;
          globe.add(outlines);
        }

        const ambientLight = new THREE.HemisphereLight(0x8dffe4, 0x02100c, 0.72);
        const keyLight = new THREE.PointLight(0x74ffd8, 12, 10, 2);
        keyLight.position.set(-2.5, 3.3, 4.8);
        const fillLight = new THREE.PointLight(0x26b994, 5, 9, 2);
        fillLight.position.set(3.5, -2.2, 3.8);
        scene.add(ambientLight, keyLight, fillLight);

        const globeNetwork = createGlobeNetwork({
          globe,
          signal,
          radius: GLOBE_RADIUS,
          compact: isCompactViewport,
        });

        const resize = () => {
          const { width, height } = host.getBoundingClientRect();
          renderer.setSize(width, height, false);
          camera.aspect = width / Math.max(height, 1);
          camera.updateProjectionMatrix();
        };
        resize();
        const resizeObserver = new ResizeObserver(resize);
        resizeObserver.observe(host);

        const canvas = renderer.domElement;
        let dragging = false;
        let activePointerId = -1;
        let previousPointerX = 0;
        let previousPointerY = 0;
        let spinVelocityX = 0;
        let spinVelocityY = 0;

        const onPointerDown = (event: PointerEvent) => {
          if (event.pointerType !== "mouse" || event.button !== 0) return;
          dragging = true;
          activePointerId = event.pointerId;
          previousPointerX = event.clientX;
          previousPointerY = event.clientY;
          spinVelocityX = 0;
          spinVelocityY = 0;
          canvas.classList.add("is-dragging");
          canvas.setPointerCapture(event.pointerId);
        };

        const onPointerMove = (event: PointerEvent) => {
          if (!dragging || event.pointerId !== activePointerId) return;
          const deltaX = event.clientX - previousPointerX;
          const deltaY = event.clientY - previousPointerY;
          previousPointerX = event.clientX;
          previousPointerY = event.clientY;

          globe.rotation.y += deltaX * 0.006;
          globe.rotation.x = THREE.MathUtils.clamp(
            globe.rotation.x + deltaY * 0.004,
            -0.65,
            0.65,
          );
          spinVelocityY = THREE.MathUtils.clamp(deltaX * 0.035, -1.2, 1.2);
          spinVelocityX = THREE.MathUtils.clamp(deltaY * 0.025, -0.7, 0.7);
        };

        const finishPointerDrag = (event: PointerEvent) => {
          if (event.pointerId !== activePointerId) return;
          dragging = false;
          activePointerId = -1;
          canvas.classList.remove("is-dragging");
          if (canvas.hasPointerCapture(event.pointerId)) {
            canvas.releasePointerCapture(event.pointerId);
          }
        };

        canvas.addEventListener("pointerdown", onPointerDown);
        canvas.addEventListener("pointermove", onPointerMove);
        canvas.addEventListener("pointerup", finishPointerDrag);
        canvas.addEventListener("pointercancel", finishPointerDrag);
        canvas.addEventListener("lostpointercapture", finishPointerDrag);

        const context = gsap.context(() => {
          gsap.set(signal.scale, { x: 0.12, y: 0.12, z: 0.12 });
          gsap
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
        let animationTime = 0;
        let tabVisible = !document.hidden;
        const onVisibilityChange = () => {
          tabVisible = !document.hidden;
          clock.getDelta();
        };
        document.addEventListener("visibilitychange", onVisibilityChange);

        const render = () => {
          const delta = Math.min(clock.getDelta(), 0.05);
          const canRender = sceneVisible && tabVisible;

          if (canRender && !reduceMotion) {
            animationTime += delta;
            if (!dragging) {
              globe.rotation.y += delta * (0.045 + spinVelocityY);
              globe.rotation.x = THREE.MathUtils.clamp(
                globe.rotation.x + delta * spinVelocityX,
                -0.65,
                0.65,
              );
              spinVelocityY = THREE.MathUtils.damp(
                spinVelocityY,
                0,
                2.4,
                delta,
              );
              spinVelocityX = THREE.MathUtils.damp(
                spinVelocityX,
                0,
                2.4,
                delta,
              );
            }
            if (landMaterial) landMaterial.uniforms.uTime.value = animationTime;
            if (outlineMaterial) {
              outlineMaterial.opacity =
                0.58 + Math.sin(animationTime * 0.8) * 0.04;
            }
            graticuleMaterial.opacity =
              0.16 + Math.sin(animationTime * 0.45) * 0.015;
            globeNetwork.update(animationTime);
          }

          if (canRender) renderer.render(scene, camera);
          frame = window.requestAnimationFrame(render);
        };
        render();

        teardown = () => {
          window.cancelAnimationFrame(frame);
          visibilityObserver.disconnect();
          resizeObserver.disconnect();
          document.removeEventListener("visibilitychange", onVisibilityChange);
          context.revert();
          canvas.removeEventListener("pointerdown", onPointerDown);
          canvas.removeEventListener("pointermove", onPointerMove);
          canvas.removeEventListener("pointerup", finishPointerDrag);
          canvas.removeEventListener("pointercancel", finishPointerDrag);
          canvas.removeEventListener("lostpointercapture", finishPointerDrag);
          canvas.classList.remove("is-dragging");
          globeNetwork.dispose();
          geometries.forEach((geometry) => geometry.dispose());
          materials.forEach((material) => material.dispose());
          renderer.dispose();
          canvas.remove();
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
