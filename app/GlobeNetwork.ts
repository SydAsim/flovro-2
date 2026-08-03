import * as THREE from "three";

type GeoPoint = {
  lng: number;
  lat: number;
};

type RouteDefinition = {
  start: GeoPoint;
  end: GeoPoint;
  active?: boolean;
  plane?: boolean;
  particle?: boolean;
  arrow?: boolean;
  speed: number;
  offset: number;
};

type NetworkOptions = {
  globe: THREE.Group;
  signal: THREE.Group;
  radius: number;
  compact: boolean;
};

type PathMarker = {
  object: THREE.Object3D;
  curve: THREE.CatmullRomCurve3;
  speed: number;
  offset: number;
  scale: number;
  fadeAtEnds: boolean;
};

type PulsingNode = {
  core: THREE.Mesh;
  ring: THREE.Mesh<THREE.RingGeometry, THREE.MeshBasicMaterial>;
  phase: number;
};

type SatelliteOrbit = {
  object: THREE.Group;
  radius: number;
  speed: number;
  phase: number;
  scale: number;
};

const ROUTES: RouteDefinition[] = [
  {
    start: { lng: -0.13, lat: 51.51 },
    end: { lng: 55.27, lat: 25.2 },
    active: true,
    plane: true,
    particle: true,
    arrow: true,
    speed: 0.035,
    offset: 0.12,
  },
  {
    start: { lng: 36.82, lat: -1.29 },
    end: { lng: -0.13, lat: 51.51 },
    active: true,
    plane: true,
    particle: true,
    speed: 0.03,
    offset: 0.58,
  },
  {
    start: { lng: 55.27, lat: 25.2 },
    end: { lng: 103.82, lat: 1.35 },
    particle: true,
    arrow: true,
    speed: 0.026,
    offset: 0.34,
  },
  {
    start: { lng: 3.38, lat: 6.52 },
    end: { lng: -46.63, lat: -23.55 },
    plane: true,
    speed: 0.024,
    offset: 0.72,
  },
  {
    start: { lng: 18.42, lat: -33.92 },
    end: { lng: 103.82, lat: 1.35 },
    particle: true,
    speed: 0.021,
    offset: 0.46,
  },
  {
    start: { lng: -74.01, lat: 40.71 },
    end: { lng: -0.13, lat: 51.51 },
    active: true,
    plane: true,
    particle: true,
    speed: 0.032,
    offset: 0.83,
  },
  {
    start: { lng: 139.69, lat: 35.68 },
    end: { lng: 55.27, lat: 25.2 },
    speed: 0.022,
    offset: 0.2,
  },
];

const tempPoint = new THREE.Vector3();
const tempTangent = new THREE.Vector3();
const tempUp = new THREE.Vector3();
const tempSide = new THREE.Vector3();
const tempMatrix = new THREE.Matrix4();

function latLngToVector3(point: GeoPoint, radius: number) {
  const phi = THREE.MathUtils.degToRad(90 - point.lat);
  const theta = THREE.MathUtils.degToRad(point.lng + 180);

  return new THREE.Vector3(
    -radius * Math.sin(phi) * Math.cos(theta),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta),
  );
}

function createFlightPath(
  start: GeoPoint,
  end: GeoPoint,
  radius: number,
) {
  const startNormal = latLngToVector3(start, 1).normalize();
  const endNormal = latLngToVector3(end, 1).normalize();
  const angularDistance = startNormal.angleTo(endNormal);
  const elevation = THREE.MathUtils.clamp(
    0.12 + angularDistance * 0.2,
    0.16,
    0.42,
  );
  const points: THREE.Vector3[] = [];

  for (let index = 0; index <= 8; index += 1) {
    const progress = index / 8;
    const normal = startNormal.clone().lerp(endNormal, progress).normalize();
    const altitude =
      radius + 0.055 + Math.sin(Math.PI * progress) * elevation;
    points.push(normal.multiplyScalar(altitude));
  }

  return new THREE.CatmullRomCurve3(points, false, "centripetal");
}

function createConnectionArc(
  route: RouteDefinition,
  radius: number,
  material: THREE.LineBasicMaterial,
) {
  const curve = createFlightPath(route.start, route.end, radius);
  const geometry = new THREE.BufferGeometry().setFromPoints(curve.getPoints(72));
  const line = new THREE.Line(geometry, material);
  line.renderOrder = 4;

  return { curve, geometry, line };
}

function createAirplaneGeometry() {
  return new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(0.065, 0, 0),
    new THREE.Vector3(-0.05, 0, 0),
    new THREE.Vector3(0.014, 0, 0),
    new THREE.Vector3(-0.018, 0, 0.052),
    new THREE.Vector3(0.014, 0, 0),
    new THREE.Vector3(-0.018, 0, -0.052),
    new THREE.Vector3(-0.032, 0, 0),
    new THREE.Vector3(-0.054, 0, 0.023),
    new THREE.Vector3(-0.032, 0, 0),
    new THREE.Vector3(-0.054, 0, -0.023),
  ]);
}

function createArrowGeometry() {
  return new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(0.032, 0, 0),
    new THREE.Vector3(-0.026, 0, 0.026),
    new THREE.Vector3(0.032, 0, 0),
    new THREE.Vector3(-0.026, 0, -0.026),
  ]);
}

function createAirplaneMarker(
  curve: THREE.CatmullRomCurve3,
  geometry: THREE.BufferGeometry,
  material: THREE.LineBasicMaterial,
  route: RouteDefinition,
  index: number,
): PathMarker {
  const object = new THREE.LineSegments(geometry, material);
  object.renderOrder = 7;

  return {
    object,
    curve,
    speed: route.speed,
    offset: route.offset + index * 0.09,
    scale: 0.85 + (index % 3) * 0.08,
    fadeAtEnds: true,
  };
}

function createMovingParticle(
  curve: THREE.CatmullRomCurve3,
  geometry: THREE.SphereGeometry,
  material: THREE.MeshBasicMaterial,
  route: RouteDefinition,
  index: number,
): PathMarker {
  const object = new THREE.Mesh(geometry, material);
  object.renderOrder = 6;

  return {
    object,
    curve,
    speed: route.speed * (1.45 + (index % 2) * 0.24),
    offset: route.offset + 0.22 + index * 0.13,
    scale: 0.78 + (index % 3) * 0.12,
    fadeAtEnds: true,
  };
}

function createDirectionalArrow(
  curve: THREE.CatmullRomCurve3,
  geometry: THREE.BufferGeometry,
  material: THREE.LineBasicMaterial,
  route: RouteDefinition,
  index: number,
): PathMarker {
  const object = new THREE.LineSegments(geometry, material);
  object.renderOrder = 6;

  return {
    object,
    curve,
    speed: route.speed * 1.18,
    offset: route.offset + 0.42 + index * 0.17,
    scale: 0.72,
    fadeAtEnds: true,
  };
}

function createGlobeNode(
  point: GeoPoint,
  radius: number,
  coreGeometry: THREE.SphereGeometry,
  coreMaterial: THREE.MeshBasicMaterial,
  ringGeometry: THREE.RingGeometry,
  phase: number,
) {
  const root = new THREE.Group();
  const normal = latLngToVector3(point, 1).normalize();
  root.position.copy(normal).multiplyScalar(radius + 0.06);
  root.quaternion.setFromUnitVectors(
    new THREE.Vector3(0, 0, 1),
    normal,
  );

  const core = new THREE.Mesh(coreGeometry, coreMaterial);
  core.renderOrder = 6;
  const ringMaterial = new THREE.MeshBasicMaterial({
    color: 0x8bffd0,
    transparent: true,
    opacity: 0.3,
    depthTest: true,
    depthWrite: false,
    blending: THREE.NormalBlending,
    side: THREE.DoubleSide,
  });
  const ring = new THREE.Mesh(ringGeometry, ringMaterial);
  ring.renderOrder = 5;
  root.add(core, ring);

  return {
    root,
    node: { core, ring, phase } satisfies PulsingNode,
    material: ringMaterial,
  };
}

function createOrbitRing(
  radius: number,
  material: THREE.LineDashedMaterial,
) {
  const points: THREE.Vector3[] = [];
  for (let index = 0; index < 160; index += 1) {
    const angle = (index / 160) * Math.PI * 2;
    points.push(
      new THREE.Vector3(Math.cos(angle) * radius, Math.sin(angle) * radius, 0),
    );
  }

  const geometry = new THREE.BufferGeometry().setFromPoints(points);
  const ring = new THREE.LineLoop(geometry, material);
  ring.computeLineDistances();
  ring.renderOrder = 4;
  return { geometry, ring };
}

function createOrbitingSatellite(
  bodyGeometry: THREE.BoxGeometry,
  panelGeometry: THREE.PlaneGeometry,
  glowGeometry: THREE.SphereGeometry,
  wireMaterial: THREE.MeshBasicMaterial,
  glowMaterial: THREE.MeshBasicMaterial,
) {
  const object = new THREE.Group();
  const body = new THREE.Mesh(bodyGeometry, wireMaterial);
  const leftPanel = new THREE.Mesh(panelGeometry, wireMaterial);
  const rightPanel = new THREE.Mesh(panelGeometry, wireMaterial);
  const glow = new THREE.Mesh(glowGeometry, glowMaterial);

  leftPanel.rotation.x = Math.PI / 2;
  rightPanel.rotation.x = Math.PI / 2;
  leftPanel.position.z = -0.11;
  rightPanel.position.z = 0.11;
  body.renderOrder = 7;
  leftPanel.renderOrder = 7;
  rightPanel.renderOrder = 7;
  glow.renderOrder = 6;
  object.add(glow, body, leftPanel, rightPanel);
  return object;
}

function orientMarkerToPath(
  object: THREE.Object3D,
  curve: THREE.CatmullRomCurve3,
  progress: number,
) {
  curve.getPointAt(progress, tempPoint);
  curve.getTangentAt(progress, tempTangent).normalize();
  tempUp
    .copy(tempPoint)
    .normalize()
    .addScaledVector(tempTangent, -tempUp.dot(tempTangent))
    .normalize();
  tempSide.crossVectors(tempTangent, tempUp).normalize();
  tempMatrix.makeBasis(tempTangent, tempUp, tempSide);
  object.position.copy(tempPoint);
  object.quaternion.setFromRotationMatrix(tempMatrix);
}

function edgeFade(progress: number) {
  return THREE.MathUtils.smoothstep(progress, 0, 0.1) *
    (1 - THREE.MathUtils.smoothstep(progress, 0.9, 1));
}

export function createGlobeNetwork({
  globe,
  signal,
  radius,
  compact,
}: NetworkOptions) {
  const ownedGeometries: THREE.BufferGeometry[] = [];
  const ownedMaterials: THREE.Material[] = [];
  const globeLayer = new THREE.Group();
  const orbitLayer = new THREE.Group();
  globeLayer.name = "flovro-globe-network";
  orbitLayer.name = "flovro-orbit-network";
  globe.add(globeLayer);
  signal.add(orbitLayer);

  const ownGeometry = <T extends THREE.BufferGeometry>(geometry: T) => {
    ownedGeometries.push(geometry);
    return geometry;
  };
  const ownMaterial = <T extends THREE.Material>(material: T) => {
    ownedMaterials.push(material);
    return material;
  };

  const dimRouteMaterial = ownMaterial(
    new THREE.LineBasicMaterial({
      color: 0x5de2bd,
      transparent: true,
      opacity: 0.15,
      depthTest: true,
      depthWrite: false,
      blending: THREE.NormalBlending,
    }),
  );
  const activeRouteMaterial = ownMaterial(
    new THREE.LineBasicMaterial({
      color: 0x8bffd0,
      transparent: true,
      opacity: 0.42,
      depthTest: true,
      depthWrite: false,
      blending: THREE.NormalBlending,
    }),
  );
  const markerMaterial = ownMaterial(
    new THREE.LineBasicMaterial({
      color: 0xc7ffe9,
      transparent: true,
      opacity: 0.78,
      depthTest: true,
      depthWrite: false,
      blending: THREE.NormalBlending,
    }),
  );
  const arrowMaterial = ownMaterial(
    new THREE.LineBasicMaterial({
      color: 0x8bffd0,
      transparent: true,
      opacity: 0.54,
      depthTest: true,
      depthWrite: false,
      blending: THREE.NormalBlending,
    }),
  );
  const particleMaterial = ownMaterial(
    new THREE.MeshBasicMaterial({
      color: 0xb7ffe8,
      transparent: true,
      opacity: 0.86,
      depthTest: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }),
  );
  const nodeCoreMaterial = ownMaterial(
    new THREE.MeshBasicMaterial({
      color: 0xbfffee,
      transparent: true,
      opacity: 0.9,
      depthTest: true,
      depthWrite: false,
      blending: THREE.NormalBlending,
    }),
  );

  const airplaneGeometry = ownGeometry(createAirplaneGeometry());
  const arrowGeometry = ownGeometry(createArrowGeometry());
  const particleGeometry = ownGeometry(
    new THREE.SphereGeometry(compact ? 0.013 : 0.015, 8, 6),
  );
  const nodeCoreGeometry = ownGeometry(
    new THREE.SphereGeometry(compact ? 0.021 : 0.025, 10, 8),
  );
  const nodeRingGeometry = ownGeometry(
    new THREE.RingGeometry(0.038, 0.047, compact ? 18 : 28),
  );

  const routeCount = compact ? 4 : ROUTES.length;
  const routes = ROUTES.slice(0, routeCount);
  const pathMarkers: PathMarker[] = [];
  const pulsingNodes: PulsingNode[] = [];
  const nodeKeys = new Set<string>();

  routes.forEach((route, index) => {
    const connection = createConnectionArc(
      route,
      radius,
      route.active ? activeRouteMaterial : dimRouteMaterial,
    );
    ownedGeometries.push(connection.geometry);
    globeLayer.add(connection.line);

    if (route.plane) {
      const airplane = createAirplaneMarker(
        connection.curve,
        airplaneGeometry,
        markerMaterial,
        route,
        index,
      );
      pathMarkers.push(airplane);
      globeLayer.add(airplane.object);
    }

    if (route.particle && (!compact || index < 3)) {
      const particle = createMovingParticle(
        connection.curve,
        particleGeometry,
        particleMaterial,
        route,
        index,
      );
      pathMarkers.push(particle);
      globeLayer.add(particle.object);
    }

    if (route.arrow && (!compact || index === 0)) {
      const arrow = createDirectionalArrow(
        connection.curve,
        arrowGeometry,
        arrowMaterial,
        route,
        index,
      );
      pathMarkers.push(arrow);
      globeLayer.add(arrow.object);
    }

    [route.start, route.end].forEach((point) => {
      const key = `${point.lng}:${point.lat}`;
      if (nodeKeys.has(key) || (compact && nodeKeys.size >= 6)) return;
      nodeKeys.add(key);
      const created = createGlobeNode(
        point,
        radius,
        nodeCoreGeometry,
        nodeCoreMaterial,
        nodeRingGeometry,
        nodeKeys.size * 0.137,
      );
      ownedMaterials.push(created.material);
      pulsingNodes.push(created.node);
      globeLayer.add(created.root);
    });
  });

  const orbitMaterial = ownMaterial(
    new THREE.LineDashedMaterial({
      color: 0x74d9bd,
      transparent: true,
      opacity: 0.2,
      dashSize: 0.025,
      gapSize: 0.055,
      depthTest: true,
      depthWrite: false,
      blending: THREE.NormalBlending,
    }),
  );
  const satelliteWireMaterial = ownMaterial(
    new THREE.MeshBasicMaterial({
      color: 0xc6ffed,
      transparent: true,
      opacity: 0.62,
      wireframe: true,
      depthTest: true,
      depthWrite: false,
      blending: THREE.NormalBlending,
      side: THREE.DoubleSide,
    }),
  );
  const satelliteGlowMaterial = ownMaterial(
    new THREE.MeshBasicMaterial({
      color: 0x61dcb9,
      transparent: true,
      opacity: 0.075,
      depthTest: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }),
  );
  const satelliteBodyGeometry = ownGeometry(
    new THREE.BoxGeometry(0.11, 0.065, 0.065, 1, 1, 1),
  );
  const satellitePanelGeometry = ownGeometry(
    new THREE.PlaneGeometry(0.12, 0.07, 2, 1),
  );
  const satelliteGlowGeometry = ownGeometry(
    new THREE.SphereGeometry(0.105, 10, 8),
  );

  const orbitDefinitions = [
    { radius: radius + 0.5, rotation: [0.94, 0.12, -0.28] as const },
    { radius: radius + 0.68, rotation: [-0.5, 0.68, 0.38] as const },
  ];
  const orbitRoots = orbitDefinitions.map((definition) => {
    const root = new THREE.Group();
    root.rotation.set(...definition.rotation);
    const created = createOrbitRing(definition.radius, orbitMaterial);
    ownedGeometries.push(created.geometry);
    root.add(created.ring);
    orbitLayer.add(root);
    return root;
  });

  const satelliteDefinitions = [
    { orbit: 0, speed: 0.055, phase: 0.08, scale: 0.8 },
    { orbit: 1, speed: -0.042, phase: 0.47, scale: 0.72 },
    { orbit: 0, speed: 0.036, phase: 0.72, scale: 0.64 },
  ];
  const satelliteCount = compact ? 2 : satelliteDefinitions.length;
  const satellites: SatelliteOrbit[] = satelliteDefinitions
    .slice(0, satelliteCount)
    .map((definition) => {
      const object = createOrbitingSatellite(
        satelliteBodyGeometry,
        satellitePanelGeometry,
        satelliteGlowGeometry,
        satelliteWireMaterial,
        satelliteGlowMaterial,
      );
      orbitRoots[definition.orbit].add(object);
      return {
        object,
        radius: orbitDefinitions[definition.orbit].radius,
        speed: definition.speed,
        phase: definition.phase,
        scale: definition.scale,
      };
    });

  const update = (elapsed: number) => {
    pathMarkers.forEach((marker) => {
      const progress = (elapsed * marker.speed + marker.offset + 1) % 1;
      orientMarkerToPath(marker.object, marker.curve, progress);
      const visibility = marker.fadeAtEnds ? edgeFade(progress) : 1;
      marker.object.scale.setScalar(marker.scale * visibility);
    });

    pulsingNodes.forEach((node) => {
      const pulse = (elapsed * 0.28 + node.phase) % 1;
      const corePulse = 0.92 + Math.sin((elapsed * 0.9 + node.phase) * 2) * 0.1;
      node.core.scale.setScalar(corePulse);
      node.ring.scale.setScalar(0.82 + pulse * 1.85);
      node.ring.material.opacity = (1 - pulse) * 0.28;
    });

    satellites.forEach((satellite, index) => {
      const angle = (elapsed * satellite.speed + satellite.phase) * Math.PI * 2;
      tempPoint.set(
        Math.cos(angle) * satellite.radius,
        Math.sin(angle) * satellite.radius,
        0,
      );
      tempTangent.set(-Math.sin(angle), Math.cos(angle), 0).normalize();
      tempUp.copy(tempPoint).normalize();
      tempSide.crossVectors(tempTangent, tempUp).normalize();
      tempMatrix.makeBasis(tempTangent, tempUp, tempSide);
      satellite.object.position.copy(tempPoint);
      satellite.object.quaternion.setFromRotationMatrix(tempMatrix);
      satellite.object.scale.setScalar(
        satellite.scale * (1 + Math.sin(elapsed * 0.45 + index) * 0.025),
      );
    });
  };

  update(0);

  return {
    update,
    dispose: () => {
      globe.remove(globeLayer);
      signal.remove(orbitLayer);
      ownedGeometries.forEach((geometry) => geometry.dispose());
      ownedMaterials.forEach((material) => material.dispose());
    },
  };
}
