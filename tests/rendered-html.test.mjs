import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request("http://localhost/", {
      headers: { accept: "text/html" },
    }),
    {
      ASSETS: {
        fetch: async () => new Response("Not found", { status: 404 }),
      },
    },
    {
      waitUntil() {},
      passThroughOnException() {},
    },
  );
}

test("server-renders the Flovro experience", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<title>Flovro — AI Voice Agents &amp; Business Automation<\/title>/i);
  assert.match(html, /Every conversation\./);
  assert.match(html, /Every workflow\./);
  assert.match(html, /In motion\./);
  assert.match(html, /AI voice agents/);
  assert.match(html, /Business automation/);
  assert.match(html, /Digital products/);
  assert.match(html, /Web development projects/);
  assert.match(html, /AI automations/);
  assert.match(html, /Voice agents/);
  assert.match(html, /VaultShield/);
  assert.match(html, /MediLink AI/);
  assert.match(html, /Dental Front Desk Agent/);
  assert.match(html, /Start a conversation/);
  assert.doesNotMatch(html, /INTELLIGENT SYSTEMS \/ 2026|Why Flovro/i);
  assert.doesNotMatch(html, /A missed call is not just a call|Not another disconnected tool/i);
  assert.doesNotMatch(html, /What we build|One partner\. A connected system\./i);
  assert.doesNotMatch(html, /Voice intelligence|Demo environment/i);
  assert.doesNotMatch(html, /Connected by design|From first signal/i);
  assert.doesNotMatch(html, /codex-preview|Building your site|react-loading-skeleton/);
});

test("renders a draggable geographic globe with native page scrolling", async () => {
  const signalField = await readFile(
    new URL("../app/SignalField.tsx", import.meta.url),
    "utf8",
  );
  const globeNetwork = await readFile(
    new URL("../app/GlobeNetwork.ts", import.meta.url),
    "utf8",
  );
  const experience = await readFile(
    new URL("../app/FlovroExperience.tsx", import.meta.url),
    "utf8",
  );
  const styles = await readFile(
    new URL("../app/globals.css", import.meta.url),
    "utf8",
  );

  assert.match(signalField, /isCompactViewport \? 1\.15 : 1\.35/);
  assert.match(signalField, /world-110m\.geojson/);
  assert.match(signalField, /createGeographyPositions/);
  assert.match(signalField, /createGraticulePositions/);
  assert.match(signalField, /compact \? 640 : 1024/);
  assert.match(signalField, /compact \? 3 : 2/);
  assert.match(signalField, /new THREE\.LineSegments/);
  assert.match(signalField, /gl_PointCoord/);
  assert.match(signalField, /vFacing = smoothstep/);
  assert.match(signalField, /THREE\.NormalBlending/);
  assert.match(signalField, /fillLight/);
  assert.match(signalField, /canvas\.setPointerCapture/);
  assert.match(signalField, /canvas\.classList\.add\("is-dragging"\)/);
  assert.match(signalField, /globe\.rotation\.y \+= deltaX \* 0\.006/);
  assert.match(signalField, /THREE\.MathUtils\.damp/);
  assert.match(signalField, /visibilityObserver/);
  assert.match(signalField, /createGlobeNetwork/);
  assert.match(signalField, /document\.hidden/);
  assert.match(signalField, /visibilitychange/);
  assert.match(signalField, /globeNetwork\.update/);
  assert.doesNotMatch(signalField, /heroTimeline|scrollRig/);
  assert.doesNotMatch(signalField, /["']wheel["']|touchmove/);
  assert.doesNotMatch(signalField, /TubeGeometry|InstancedMesh|routeTrail/);
  assert.doesNotMatch(signalField, /createSignalPointMaterial|orbiter/);
  assert.doesNotMatch(signalField, /earth-(?:day|night)\.jpg/);
  assert.doesNotMatch(signalField, /atmosphereGeometry/);
  assert.match(globeNetwork, /function createGlobeNode/);
  assert.match(globeNetwork, /function createConnectionArc/);
  assert.match(globeNetwork, /function createMovingParticle/);
  assert.match(globeNetwork, /function createAirplaneMarker/);
  assert.match(globeNetwork, /function createOrbitingSatellite/);
  assert.match(globeNetwork, /function createShipGeometry/);
  assert.match(globeNetwork, /function createCubeGeometry/);
  assert.match(globeNetwork, /function createOrbitingAirplane/);
  assert.match(globeNetwork, /function createOrbitingShip/);
  assert.match(globeNetwork, /function createOrbitingCube/);
  assert.match(globeNetwork, /function createOrbitRing/);
  assert.match(globeNetwork, /THREE\.CatmullRomCurve3/);
  assert.match(globeNetwork, /getPointAt/);
  assert.match(globeNetwork, /getTangentAt/);
  assert.match(globeNetwork, /depthTest:\s*true/);
  assert.match(globeNetwork, /const routeCount = compact \? 4 : ROUTES\.length/);
  assert.match(globeNetwork, /kind: "satellite"/);
  assert.match(globeNetwork, /kind: "ship"/);
  assert.match(globeNetwork, /kind: "airplane"/);
  assert.match(globeNetwork, /kind: "cube"/);
  assert.match(globeNetwork, /new THREE\.MeshStandardMaterial/);
  assert.match(globeNetwork, /new THREE\.ExtrudeGeometry/);
  assert.match(globeNetwork, /new THREE\.CylinderGeometry/);
  assert.match(globeNetwork, /new THREE\.ConeGeometry/);
  assert.match(globeNetwork, /speed: 0\.024/);
  assert.match(globeNetwork, /speed: -0\.016/);
  assert.match(globeNetwork, /orbitingGlyphs\.forEach/);
  assert.match(styles, /pointer-events: auto/);
  assert.match(styles, /cursor: grab/);
  assert.match(styles, /touch-action: pan-y/);
  assert.match(experience, /Scroll to explore/);
  assert.doesNotMatch(experience, /hero-orbit/);
  assert.doesNotMatch(experience, /intro-curtain|loader-word|manifesto/);
  assert.equal((experience.match(/href: "https:\/\//g) ?? []).length, 8);
  assert.match(experience, /id="web-development"/);
  assert.match(experience, /id="ai-automations"/);
  assert.match(experience, /id="voice-agents"/);
  assert.equal((experience.match(/className="[^"]* work-rail"/g) ?? []).length, 3);
  assert.match(experience, /scrollProjectRail/);
  assert.match(experience, /rail\.scrollBy/);
  assert.match(experience, /Web development project carousel/);
  assert.match(experience, /Workflow automation project carousel/);
  assert.match(experience, /Voice agent project carousel/);
  assert.match(styles, /grid-auto-flow:\s*column/);
  assert.match(styles, /scroll-snap-type:\s*x mandatory/);
  assert.match(styles, /scroll-snap-align:\s*start/);
  assert.doesNotMatch(experience, /systems-section|voice-lab|flow-section|demoModes/);
});
