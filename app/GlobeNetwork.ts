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

type OrbitingGlyph = {
  object: THREE.Object3D;
  radius: number;
  speed: number;
  phase: number;
  scale: number;
};

type OrbitGlyphKind = "satellite" | "ship" | "airplane" | "cube";

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

function createShipGeometry() {
  const hull = new THREE.Shape();
  hull.moveTo(-0.095, -0.025);
  hull.lineTo(0.095, -0.025);
  hull.lineTo(0.058, -0.072);
  hull.lineTo(-0.06, -0.072);
  hull.closePath();
  const geometry = new THREE.ExtrudeGeometry(hull, {
    depth: 0.06,
    bevelEnabled: false,
    steps: 1,
  });
  geometry.translate(0, 0, -0.03);
  return geometry;
}

function createCubeGeometry() {
  return new THREE.BoxGeometry(0.13, 0.13, 0.13, 1, 1, 1);
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
  panelGeometry: THREE.BoxGeometry,
  panelGridGeometry: THREE.PlaneGeometry,
  boomGeometry: THREE.CylinderGeometry,
  dishGeometry: THREE.ConeGeometry,
  glowGeometry: THREE.SphereGeometry,
  metalMaterial: THREE.MeshStandardMaterial,
  panelMaterial: THREE.MeshStandardMaterial,
  gridMaterial: THREE.MeshBasicMaterial,
  glowMaterial: THREE.MeshBasicMaterial,
) {
  const object = new THREE.Group();
  const body = new THREE.Mesh(bodyGeometry, metalMaterial);
  const leftPanel = new THREE.Mesh(panelGeometry, panelMaterial);
  const rightPanel = new THREE.Mesh(panelGeometry, panelMaterial);
  const leftGrid = new THREE.Mesh(panelGridGeometry, gridMaterial);
  const rightGrid = new THREE.Mesh(panelGridGeometry, gridMaterial);
  const boom = new THREE.Mesh(boomGeometry, metalMaterial);
  const dish = new THREE.Mesh(dishGeometry, metalMaterial);
  const glow = new THREE.Mesh(glowGeometry, glowMaterial);

  leftPanel.position.z = -0.11;
  rightPanel.position.z = 0.11;
  leftGrid.rotation.x = -Math.PI / 2;
  rightGrid.rotation.x = -Math.PI / 2;
  leftGrid.position.set(0, 0.006, -0.11);
  rightGrid.position.set(0, 0.006, 0.11);
  boom.position.y = 0.055;
  dish.position.y = 0.092;
  dish.rotation.z = Math.PI;
  [body, leftPanel, rightPanel, leftGrid, rightGrid, boom, dish].forEach(
    (part) => {
      part.renderOrder = 7;
    },
  );
  glow.renderOrder = 6;
  object.add(
    glow,
    body,
    leftPanel,
    rightPanel,
    leftGrid,
    rightGrid,
    boom,
    dish,
  );
  return object;
}

function createOrbitingAirplane(
  fuselageGeometry: THREE.CylinderGeometry,
  noseGeometry: THREE.ConeGeometry,
  wingGeometry: THREE.BoxGeometry,
  tailWingGeometry: THREE.BoxGeometry,
  tailFinGeometry: THREE.BoxGeometry,
  glowGeometry: THREE.SphereGeometry,
  metalMaterial: THREE.MeshStandardMaterial,
  accentMaterial: THREE.MeshStandardMaterial,
  glowMaterial: THREE.MeshBasicMaterial,
) {
  const object = new THREE.Group();
  const fuselage = new THREE.Mesh(fuselageGeometry, metalMaterial);
  const nose = new THREE.Mesh(noseGeometry, accentMaterial);
  const wings = new THREE.Mesh(wingGeometry, metalMaterial);
  const tailWings = new THREE.Mesh(tailWingGeometry, metalMaterial);
  const tailFin = new THREE.Mesh(tailFinGeometry, accentMaterial);
  const glow = new THREE.Mesh(glowGeometry, glowMaterial);
  fuselage.rotation.z = -Math.PI / 2;
  nose.rotation.z = -Math.PI / 2;
  nose.position.x = 0.084;
  wings.position.x = 0.005;
  tailWings.position.x = -0.054;
  tailFin.position.set(-0.052, 0.018, 0);
  [fuselage, nose, wings, tailWings, tailFin].forEach((part) => {
    part.renderOrder = 7;
  });
  glow.renderOrder = 6;
  object.add(glow, fuselage, nose, wings, tailWings, tailFin);
  return object;
}

function createOrbitingShip(
  hullGeometry: THREE.ExtrudeGeometry,
  containerGeometry: THREE.BoxGeometry,
  cabinGeometry: THREE.BoxGeometry,
  mastGeometry: THREE.CylinderGeometry,
  glowGeometry: THREE.SphereGeometry,
  hullMaterial: THREE.MeshStandardMaterial,
  metalMaterial: THREE.MeshStandardMaterial,
  accentMaterial: THREE.MeshStandardMaterial,
  glowMaterial: THREE.MeshBasicMaterial,
) {
  const object = new THREE.Group();
  const hull = new THREE.Mesh(hullGeometry, hullMaterial);
  const cabin = new THREE.Mesh(cabinGeometry, metalMaterial);
  const mast = new THREE.Mesh(mastGeometry, accentMaterial);
  const glow = new THREE.Mesh(glowGeometry, glowMaterial);
  const containerPositions = [
    [-0.052, 0.005, -0.026],
    [-0.052, 0.005, 0.026],
    [-0.012, 0.005, -0.026],
    [-0.012, 0.005, 0.026],
    [0.028, 0.005, -0.026],
    [0.028, 0.005, 0.026],
  ] as const;
  const containers = containerPositions.map(([x, y, z], index) => {
    const container = new THREE.Mesh(
      containerGeometry,
      index % 2 === 0 ? accentMaterial : metalMaterial,
    );
    container.position.set(x, y, z);
    container.renderOrder = 7;
    return container;
  });
  cabin.position.set(-0.067, 0.037, 0);
  mast.position.set(-0.067, 0.095, 0);
  hull.renderOrder = 7;
  cabin.renderOrder = 7;
  mast.renderOrder = 7;
  glow.renderOrder = 6;
  object.add(glow, hull, cabin, mast, ...containers);
  return object;
}

function createOrbitingCube(
  cubeGeometry: THREE.BoxGeometry,
  edgeGeometry: THREE.EdgesGeometry,
  coreGeometry: THREE.BoxGeometry,
  glowGeometry: THREE.SphereGeometry,
  glassMaterial: THREE.MeshStandardMaterial,
  edgeMaterial: THREE.LineBasicMaterial,
  accentMaterial: THREE.MeshStandardMaterial,
  glowMaterial: THREE.MeshBasicMaterial,
) {
  const object = new THREE.Group();
  const shell = new THREE.Mesh(cubeGeometry, glassMaterial);
  const edges = new THREE.LineSegments(edgeGeometry, edgeMaterial);
  const core = new THREE.Mesh(coreGeometry, accentMaterial);
  const glow = new THREE.Mesh(glowGeometry, glowMaterial);
  shell.renderOrder = 7;
  edges.renderOrder = 8;
  core.renderOrder = 7;
  glow.renderOrder = 6;
  object.add(glow, shell, edges, core);
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
  const orbitalMetalMaterial = ownMaterial(
    new THREE.MeshStandardMaterial({
      color: 0xcfffee,
      emissive: 0x123f34,
      emissiveIntensity: 0.28,
      metalness: 0.72,
      roughness: 0.3,
    }),
  );
  const orbitalDarkMaterial = ownMaterial(
    new THREE.MeshStandardMaterial({
      color: 0x174c40,
      emissive: 0x082b23,
      emissiveIntensity: 0.34,
      metalness: 0.58,
      roughness: 0.36,
    }),
  );
  const orbitalAccentMaterial = ownMaterial(
    new THREE.MeshStandardMaterial({
      color: 0x8bffd0,
      emissive: 0x1b6b55,
      emissiveIntensity: 0.42,
      metalness: 0.45,
      roughness: 0.28,
    }),
  );
  const orbitalPanelMaterial = ownMaterial(
    new THREE.MeshStandardMaterial({
      color: 0x0d6f5d,
      emissive: 0x063d33,
      emissiveIntensity: 0.36,
      metalness: 0.52,
      roughness: 0.3,
    }),
  );
  const orbitalGridMaterial = ownMaterial(
    new THREE.MeshBasicMaterial({
      color: 0xcffff0,
      transparent: true,
      opacity: 0.5,
      wireframe: true,
      depthTest: true,
      depthWrite: false,
      side: THREE.DoubleSide,
    }),
  );
  const orbitGlyphLineMaterial = ownMaterial(
    new THREE.LineBasicMaterial({
      color: 0xd6fff1,
      transparent: true,
      opacity: 0.74,
      depthTest: true,
      depthWrite: false,
      blending: THREE.NormalBlending,
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
  const orbitalGlassMaterial = ownMaterial(
    new THREE.MeshStandardMaterial({
      color: 0x68dbba,
      emissive: 0x0b4b3d,
      emissiveIntensity: 0.3,
      metalness: 0.25,
      roughness: 0.18,
      transparent: true,
      opacity: 0.28,
      depthWrite: false,
    }),
  );
  const satelliteBodyGeometry = ownGeometry(
    new THREE.BoxGeometry(0.085, 0.065, 0.065, 1, 1, 1),
  );
  const satellitePanelGeometry = ownGeometry(
    new THREE.BoxGeometry(0.085, 0.008, 0.1, 1, 1, 1),
  );
  const satellitePanelGridGeometry = ownGeometry(
    new THREE.PlaneGeometry(0.085, 0.1, 3, 3),
  );
  const satelliteBoomGeometry = ownGeometry(
    new THREE.CylinderGeometry(0.004, 0.004, 0.06, 8),
  );
  const satelliteDishGeometry = ownGeometry(
    new THREE.ConeGeometry(0.031, 0.024, 12, 1, true),
  );
  const satelliteGlowGeometry = ownGeometry(
    new THREE.SphereGeometry(0.12, 10, 8),
  );
  const orbitShipGeometry = ownGeometry(createShipGeometry());
  const orbitCubeGeometry = ownGeometry(createCubeGeometry());
  const orbitCubeEdgeGeometry = ownGeometry(
    new THREE.EdgesGeometry(orbitCubeGeometry, 1),
  );
  const orbitCubeCoreGeometry = ownGeometry(
    new THREE.BoxGeometry(0.044, 0.044, 0.044, 1, 1, 1),
  );
  const orbitPlaneFuselageGeometry = ownGeometry(
    new THREE.CylinderGeometry(0.012, 0.017, 0.13, 12),
  );
  const orbitPlaneNoseGeometry = ownGeometry(
    new THREE.ConeGeometry(0.017, 0.04, 12),
  );
  const orbitPlaneWingGeometry = ownGeometry(
    new THREE.BoxGeometry(0.055, 0.006, 0.14),
  );
  const orbitPlaneTailWingGeometry = ownGeometry(
    new THREE.BoxGeometry(0.03, 0.005, 0.066),
  );
  const orbitPlaneTailFinGeometry = ownGeometry(
    new THREE.BoxGeometry(0.028, 0.035, 0.006),
  );
  const orbitShipContainerGeometry = ownGeometry(
    new THREE.BoxGeometry(0.034, 0.03, 0.044),
  );
  const orbitShipCabinGeometry = ownGeometry(
    new THREE.BoxGeometry(0.036, 0.055, 0.052),
  );
  const orbitShipMastGeometry = ownGeometry(
    new THREE.CylinderGeometry(0.003, 0.003, 0.065, 8),
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

  const orbitGlyphDefinitions: Array<{
    kind: OrbitGlyphKind;
    orbit: number;
    speed: number;
    phase: number;
    scale: number;
  }> = [
    { kind: "satellite", orbit: 0, speed: 0.024, phase: 0.08, scale: 0.86 },
    { kind: "ship", orbit: 1, speed: -0.019, phase: 0.32, scale: 0.9 },
    { kind: "airplane", orbit: 0, speed: 0.022, phase: 0.58, scale: 1.1 },
    { kind: "cube", orbit: 1, speed: -0.016, phase: 0.78, scale: 0.82 },
  ];
  const orbitingGlyphs: OrbitingGlyph[] = orbitGlyphDefinitions.map(
    (definition) => {
      let object: THREE.Object3D;
      if (definition.kind === "satellite") {
        object = createOrbitingSatellite(
          satelliteBodyGeometry,
          satellitePanelGeometry,
          satellitePanelGridGeometry,
          satelliteBoomGeometry,
          satelliteDishGeometry,
          satelliteGlowGeometry,
          orbitalMetalMaterial,
          orbitalPanelMaterial,
          orbitalGridMaterial,
          satelliteGlowMaterial,
        );
      } else if (definition.kind === "ship") {
        object = createOrbitingShip(
          orbitShipGeometry,
          orbitShipContainerGeometry,
          orbitShipCabinGeometry,
          orbitShipMastGeometry,
          satelliteGlowGeometry,
          orbitalDarkMaterial,
          orbitalMetalMaterial,
          orbitalAccentMaterial,
          satelliteGlowMaterial,
        );
      } else if (definition.kind === "cube") {
        object = createOrbitingCube(
          orbitCubeGeometry,
          orbitCubeEdgeGeometry,
          orbitCubeCoreGeometry,
          satelliteGlowGeometry,
          orbitalGlassMaterial,
          orbitGlyphLineMaterial,
          orbitalAccentMaterial,
          satelliteGlowMaterial,
        );
      } else {
        object = createOrbitingAirplane(
          orbitPlaneFuselageGeometry,
          orbitPlaneNoseGeometry,
          orbitPlaneWingGeometry,
          orbitPlaneTailWingGeometry,
          orbitPlaneTailFinGeometry,
          satelliteGlowGeometry,
          orbitalMetalMaterial,
          orbitalAccentMaterial,
          satelliteGlowMaterial,
        );
      }
      orbitRoots[definition.orbit].add(object);
      return {
        object,
        radius: orbitDefinitions[definition.orbit].radius,
        speed: definition.speed,
        phase: definition.phase,
        scale: definition.scale * (compact ? 0.86 : 1),
      };
    },
  );

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

    orbitingGlyphs.forEach((glyph, index) => {
      const angle = (elapsed * glyph.speed + glyph.phase) * Math.PI * 2;
      tempPoint.set(
        Math.cos(angle) * glyph.radius,
        Math.sin(angle) * glyph.radius,
        0,
      );
      tempTangent.set(-Math.sin(angle), Math.cos(angle), 0).normalize();
      tempUp.copy(tempPoint).normalize();
      tempSide.crossVectors(tempTangent, tempUp).normalize();
      tempMatrix.makeBasis(tempTangent, tempUp, tempSide);
      glyph.object.position.copy(tempPoint);
      glyph.object.quaternion.setFromRotationMatrix(tempMatrix);
      glyph.object.scale.setScalar(
        glyph.scale * (1 + Math.sin(elapsed * 0.45 + index) * 0.025),
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
