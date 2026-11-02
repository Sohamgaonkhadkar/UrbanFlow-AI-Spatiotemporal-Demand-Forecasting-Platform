import { expect, test as base, type Page } from "@playwright/test";

const test = base.extend<{ runtimeErrors: string[] }>({
  runtimeErrors: async ({ page }, use) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await use(errors);
    expect(errors).toEqual([]);
  },
});

async function sceneGeometry(page: Page) {
  return page.locator("#scene-1").evaluate((element) => ({
    top: element.getBoundingClientRect().top + window.scrollY,
    height: element.getBoundingClientRect().height,
    viewport: window.innerHeight,
  }));
}

async function scrollToProgress(page: Page, progress: number) {
  const { top, height, viewport } = await sceneGeometry(page);
  await page.evaluate((y) => window.scrollTo({ top: y, behavior: "instant" }), top + (height - viewport) * progress);
  await expect.poll(async () => {
    const value = await page.getByRole("progressbar", { name: "City transformation" }).getAttribute("aria-valuenow");
    return Math.abs(Number(value) - Math.round(progress * 100));
  }).toBeLessThanOrEqual(1);
  await page.waitForTimeout(100);
}

async function sceneState(page: Page) {
  return page.locator("#scene-1").evaluate((scene) => {
    const photo = scene.querySelector<HTMLElement>('[data-testid="scene2-photo"]')!;
    const digital = scene.querySelector<HTMLElement>('[data-testid="scene2-digital"]')!;
    const canvas = scene.querySelector<HTMLCanvasElement>("canvas")!;
    const pixels = canvas.getContext("2d")!.getImageData(0, 0, canvas.width, canvas.height).data;
    let painted = 0;
    for (let i = 3; i < pixels.length; i += 256) if (pixels[i] > 0) painted++;
    return {
      count: Number(scene.querySelector('[data-testid="scene2-counter"]')!.textContent!.replace(/,/g, "")),
      photoOpacity: Number(getComputedStyle(photo).opacity),
      digitalOpacity: Number(getComputedStyle(digital).opacity),
      photoBackground: getComputedStyle(photo).backgroundImage,
      digitalBackground: getComputedStyle(digital).backgroundImage,
      painted,
      stageTop: scene.querySelector('[data-testid="scene2-stage"]')!.getBoundingClientRect().top,
      overflow: document.documentElement.scrollWidth - window.innerWidth,
    };
  });
}

async function backgroundLuminance(page: Page) {
  const screenshot = await page.screenshot({ animations: "allow" });
  return page.evaluate(async (base64) => {
    const image = new Image();
    image.src = `data:image/png;base64,${base64}`;
    await image.decode();
    const canvas = document.createElement("canvas");
    canvas.width = 100;
    canvas.height = 100;
    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(image, 0, 0, 100, 100);
    const pixels = ctx.getImageData(0, 0, 100, 100).data;
    let sum = 0;
    let lit = 0;
    let samples = 0;
    for (let y = 22; y < 72; y++) {
      for (let x = 52; x < 95; x++) {
        const offset = (y * 100 + x) * 4;
        const brightness = pixels[offset] * 0.2126 + pixels[offset + 1] * 0.7152 + pixels[offset + 2] * 0.0722;
        sum += brightness;
        if (brightness > 12) lit++;
        samples++;
      }
    }
    return { mean: sum / samples, litFraction: lit / samples };
  }, screenshot.toString("base64"));
}

for (const layout of [
  { name: "desktop", width: 1440, height: 900, minScroll: 1.75, maxScroll: 1.85 },
  { name: "mobile", width: 390, height: 844, minScroll: 1.15, maxScroll: 1.25 },
]) {
  test(`${layout.name}: the city stays visible and the transformation reverses`, async ({ page, runtimeErrors }) => {
    test.setTimeout(60_000);
    await page.setViewportSize({ width: layout.width, height: layout.height });
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.goto("/");
    await expect(page.getByTestId("scene2-stage")).toBeAttached();
    await expect(page.getByText("INITIALIZING URBAN INTELLIGENCE")).toBeHidden();

    const geometry = await sceneGeometry(page);
    const scrollDistance = (geometry.height - geometry.viewport) / geometry.viewport;
    expect(scrollDistance).toBeGreaterThan(layout.minScroll);
    expect(scrollDistance).toBeLessThan(layout.maxScroll);

    let previousCount = -1;
    let previousOpacity = -1;
    for (const progress of [0, 0.12, 0.25, 0.4, 0.55, 0.7, 0.85, 0.98, 1]) {
      await scrollToProgress(page, progress);
      const state = await sceneState(page);
      expect(state.photoBackground).toContain("data:image");
      expect(state.digitalBackground).toContain("data:image");
      expect(state.photoOpacity).toBe(1);
      expect(state.digitalOpacity).toBeGreaterThanOrEqual(previousOpacity - 0.01);
      expect(state.count).toBeGreaterThanOrEqual(previousCount);
      expect(Math.abs(state.stageTop)).toBeLessThanOrEqual(2);
      expect(state.overflow).toBeLessThanOrEqual(1);
      if (progress >= 0.25) expect(state.painted).toBeGreaterThan(30);
      if ([0, 0.25, 0.55, 0.85, 1].includes(progress)) {
        const luminance = await backgroundLuminance(page);
        expect(luminance.mean, `visible city at ${progress * 100}%`).toBeGreaterThan(15);
        expect(luminance.litFraction).toBeGreaterThan(0.35);
      }
      previousCount = state.count;
      previousOpacity = state.digitalOpacity;
    }
    await expect(page.getByTestId("scene2-counter")).toHaveText("33,000,000");
    await expect(page.getByTestId("scene2-progress")).toHaveText("100%");

    await scrollToProgress(page, 0.3);
    const reversed = await sceneState(page);
    expect(reversed.count).toBeGreaterThan(0);
    expect(reversed.count).toBeLessThan(15_000_000);
    expect(reversed.count % 1_000_000).not.toBe(0);
    expect(reversed.digitalOpacity).toBeLessThan(0.5);
    await scrollToProgress(page, 0);
    await expect(page.getByTestId("scene2-counter")).toHaveText("00,000,000");

    const latest = await sceneGeometry(page);
    await page.evaluate((y) => window.scrollTo({ top: y, behavior: "instant" }), latest.top + latest.height - latest.viewport * 0.55);
    const seam = await page.evaluate(() => ({
      previousBottom: document.querySelector("#scene-1")!.getBoundingClientRect().bottom,
      nextTop: document.querySelector("#scene-2")!.getBoundingClientRect().top,
    }));
    expect(Math.abs(seam.previousBottom - seam.nextTop)).toBeLessThan(1);
    expect(seam.nextTop).toBeGreaterThan(0);
    expect(seam.nextTop).toBeLessThan(layout.height);
    await expect(page.getByText("THE HIDDEN PATTERNS", { exact: true })).toBeVisible();

    await page.locator("header").getByRole("button", { name: /^enter system/i }).click();
    await expect(page.getByRole("heading", { name: /NEW YORK\s*\/\s*LIVE INTELLIGENCE/i })).toBeVisible();
    expect(runtimeErrors).toEqual([]);
  });
}

test("wheel scrolling drives the scene forward, pauses, and reverses", async ({ page, runtimeErrors }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  await expect(page.getByText("INITIALIZING URBAN INTELLIGENCE")).toBeHidden();
  await scrollToProgress(page, 0);
  await page.mouse.move(1100, 450);

  let previous = 0;
  for (let i = 0; i < 6; i++) {
    await page.mouse.wheel(0, 150);
    await expect.poll(async () => Number(await page.getByRole("progressbar", { name: "City transformation" }).getAttribute("aria-valuenow"))).toBeGreaterThan(previous);
    previous = Number(await page.getByRole("progressbar", { name: "City transformation" }).getAttribute("aria-valuenow"));
  }

  await page.waitForTimeout(250);
  const countAtRest = await page.getByTestId("scene2-counter").textContent();
  await page.waitForTimeout(400);
  await expect(page.getByTestId("scene2-counter")).toHaveText(countAtRest!);
  await page.mouse.wheel(0, -450);
  await expect.poll(async () => Number(await page.getByRole("progressbar", { name: "City transformation" }).getAttribute("aria-valuenow"))).toBeLessThan(previous);
  expect(runtimeErrors).toEqual([]);
});

test("small portrait and landscape screens keep all scene text inside the viewport", async ({ page, runtimeErrors }) => {
  for (const viewport of [{ width: 320, height: 568 }, { width: 667, height: 375 }, { width: 320, height: 400 }]) {
    await page.setViewportSize(viewport);
    await page.goto("/");
    await scrollToProgress(page, 0.65);
    const bounds = await page.locator("#scene-1").evaluate((scene) => {
      const rect = (selector: string) => scene.querySelector(selector)!.getBoundingClientRect();
      return {
        intro: rect(".scene-city__intro").toJSON(),
        headline: rect(".scene-city__headline").toJSON(),
        footer: rect(".scene-city__footer").toJSON(),
        count: rect(".scene-city__count").toJSON(),
        overflow: document.documentElement.scrollWidth - window.innerWidth,
        width: window.innerWidth,
        height: window.innerHeight,
      };
    });
    expect(bounds.intro.top).toBeGreaterThanOrEqual(64);
    expect(bounds.intro.bottom).toBeLessThanOrEqual(bounds.headline.top + 1);
    expect(bounds.headline.bottom).toBeLessThanOrEqual(bounds.footer.top + 1);
    expect(bounds.footer.bottom).toBeLessThanOrEqual(bounds.height + 1);
    expect(bounds.count.right).toBeLessThanOrEqual(bounds.width + 1);
    expect(bounds.overflow).toBeLessThanOrEqual(1);
  }
  expect(runtimeErrors).toEqual([]);
});

test("reduced motion shows a complete static twin without a long pinned section", async ({ page, runtimeErrors }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  const geometry = await sceneGeometry(page);
  await page.evaluate((top) => window.scrollTo({ top, behavior: "instant" }), geometry.top);
  await expect(page.getByTestId("scene2-counter")).toHaveText("33,000,000");
  await expect(page.getByTestId("scene2-progress")).toHaveText("100%");
  await expect.poll(async () => (await sceneState(page)).painted).toBeGreaterThan(30);
  const state = await sceneState(page);
  expect(state.digitalOpacity).toBe(1);
  expect(state.painted).toBeGreaterThan(30);
  expect(Math.abs(geometry.height - geometry.viewport)).toBeLessThan(2);
  const positioning = await page.getByTestId("scene2-stage").evaluate((element) => getComputedStyle(element).position);
  expect(positioning).not.toBe("sticky");
  const animation = await page.locator(".scene-city__flow").first().evaluate((element) => getComputedStyle(element).animationName);
  expect(animation).toBe("none");
  expect(runtimeErrors).toEqual([]);
});