import { test, expect } from "@playwright/test";
import { canonicalFace } from "../tests/fixtures/canonical-face.js";

test("@benchmark integrated reading stays inside the low-end CPU proxy budget", async ({ page, context, browserName }) => {
  test.skip(browserName !== "chromium", "CPU throttling is a Chromium protocol capability");
  await page.goto("/qise.html");
  const session = await context.newCDPSession(page);
  await session.send("Emulation.setCPUThrottlingRate", { rate: 6 });
  const samples = await page.evaluate(async (points) => {
    const { measureIntegratedReading } = await import("/qise/integrated.js");
    const width = 768;
    const height = 1024;
    const data = new Uint8ClampedArray(width * height * 4);
    for (let offset = 0; offset < data.length; offset += 4) {
      data[offset] = 186;
      data[offset + 1] = 137;
      data[offset + 2] = 112;
      data[offset + 3] = 255;
    }
    const timings = [];
    for (let run = 0; run < 7; run++) {
      const started = performance.now();
      measureIntegratedReading({ data, width, height }, points);
      timings.push(performance.now() - started);
    }
    return { timings, hardwareConcurrency: navigator.hardwareConcurrency, userAgent: navigator.userAgent };
  }, canonicalFace());
  await session.send("Emulation.setCPUThrottlingRate", { rate: 1 });

  const ordered = [...samples.timings].sort((a, b) => a - b);
  const p50 = ordered[Math.floor(ordered.length * 0.5)];
  const p95 = ordered[Math.min(ordered.length - 1, Math.ceil(ordered.length * 0.95) - 1)];
  console.log(JSON.stringify({ profile: "chromium-6x-cpu", p50Ms: p50, p95Ms: p95, ...samples }));
  expect(p95).toBeLessThanOrEqual(1800);
});
