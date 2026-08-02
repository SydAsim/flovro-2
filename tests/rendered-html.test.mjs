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

test("keeps the realistic globe lightweight and scroll input damped", async () => {
  const signalField = await readFile(
    new URL("../app/SignalField.tsx", import.meta.url),
    "utf8",
  );
  const experience = await readFile(
    new URL("../app/FlovroExperience.tsx", import.meta.url),
    "utf8",
  );

  assert.match(signalField, /isCompactViewport \? 1\.15 : 1\.35/);
  assert.match(signalField, /earth-day\.jpg/);
  assert.match(signalField, /earth-night\.jpg/);
  assert.match(signalField, /new THREE\.ShaderMaterial/);
  assert.match(signalField, /new THREE\.TubeGeometry/);
  assert.match(signalField, /createStarField\(isCompactViewport \? 260 : 520\)/);
  assert.match(signalField, /new THREE\.InstancedMesh/);
  assert.match(signalField, /THREE\.MathUtils\.damp/);
  assert.match(signalField, /duration: 0\.42/);
  assert.match(signalField, /visibilityObserver/);
  assert.equal((experience.match(/href: "https:\/\//g) ?? []).length, 8);
  assert.match(experience, /id="web-development"/);
  assert.match(experience, /id="ai-automations"/);
  assert.match(experience, /id="voice-agents"/);
});
