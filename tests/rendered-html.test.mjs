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
  assert.match(html, /Turn Your Vision/);
  assert.match(html, /Into the Growth/);
  assert.match(html, /You Deserve\./);
  assert.match(
    html,
    /AI voice agents, powerful websites, and intelligent automations[^<]*built to move your business forward\./,
  );
  assert.equal(
    (html.match(/class="section-index-link(?: [^"]*)?"/g) ?? []).length,
    6,
  );
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

test("renders a clean draggable geographic globe with native page scrolling", async () => {
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
  assert.match(signalField, /document\.hidden/);
  assert.match(signalField, /visibilitychange/);
  assert.doesNotMatch(signalField, /createGlobeNetwork|globeNetwork/);
  assert.doesNotMatch(signalField, /heroTimeline|scrollRig/);
  assert.doesNotMatch(signalField, /["']wheel["']|touchmove/);
  assert.doesNotMatch(signalField, /TubeGeometry|InstancedMesh|routeTrail/);
  assert.doesNotMatch(
    signalField,
    /createSignalPointMaterial|orbiter|createOrbitRing|createConnectionArc/,
  );
  assert.doesNotMatch(signalField, /earth-(?:day|night)\.jpg/);
  assert.doesNotMatch(signalField, /atmosphereGeometry/);
  assert.match(styles, /pointer-events: auto/);
  assert.match(styles, /cursor: grab/);
  assert.match(styles, /touch-action: pan-y/);
  assert.match(styles, /right:\s*-6vw/);
  assert.match(experience, /className="section-index section-pad"/);
  assert.match(experience, /const sectionLinks =/);
  assert.match(experience, /label: "Benefits"/);
  assert.match(experience, /label: "Contact"/);
  assert.match(experience, /window\.addEventListener\("scroll"/);
  assert.match(experience, /requestAnimationFrame\(updateActiveSection\)/);
  assert.match(experience, /--section-progress/);
  assert.match(experience, /aria-current=/);
  assert.match(styles, /\.section-index\s*\{[^}]*position:\s*fixed/s);
  assert.match(styles, /\.section-index\s*\{[^}]*right:\s*clamp/s);
  assert.match(styles, /height:\s*var\(--section-progress\)/);
  assert.match(styles, /\.section-index-link\.is-active/);
  assert.match(experience, /id="benefits"/);
  assert.match(experience, /id="industries"/);
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
