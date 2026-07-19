import assert from "node:assert/strict";
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
  assert.match(html, /Start a conversation/);
  assert.doesNotMatch(html, /codex-preview|Building your site|react-loading-skeleton/);
});
