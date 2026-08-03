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
  assert.doesNotMatch(html, /codex-preview|Building your site|react-loading-skeleton/);
});

test("renders a draggable geographic globe with native page scrolling", async () => {
  const signalField = await readFile(
    new URL("../app/SignalField.tsx", import.meta.url),
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
  assert.match(signalField, /compact \? 4 : 3/);
  assert.match(signalField, /new THREE\.LineSegments/);
  assert.match(signalField, /gl_PointCoord/);
  assert.match(signalField, /canvas\.setPointerCapture/);
  assert.match(signalField, /canvas\.classList\.add\("is-dragging"\)/);
  assert.match(signalField, /globe\.rotation\.y \+= deltaX \* 0\.006/);
  assert.match(signalField, /THREE\.MathUtils\.damp/);
  assert.match(signalField, /visibilityObserver/);
  assert.doesNotMatch(signalField, /heroTimeline|scrollRig/);
  assert.doesNotMatch(signalField, /["']wheel["']|touchmove/);
  assert.doesNotMatch(signalField, /TubeGeometry|InstancedMesh|routeTrail/);
  assert.doesNotMatch(signalField, /createSignalPointMaterial|orbiter/);
  assert.doesNotMatch(signalField, /earth-(?:day|night)\.jpg/);
  assert.doesNotMatch(signalField, /atmosphereGeometry/);
  assert.match(styles, /pointer-events: auto/);
  assert.match(styles, /cursor: grab/);
  assert.match(styles, /touch-action: pan-y/);
  assert.match(experience, /Scroll to explore/);
  assert.doesNotMatch(experience, /hero-orbit/);
  assert.equal((experience.match(/href: "https:\/\//g) ?? []).length, 8);
  assert.match(experience, /id="web-development"/);
  assert.match(experience, /id="ai-automations"/);
  assert.match(experience, /id="voice-agents"/);
});
