import { expect, test as base, type Locator, type Page } from "@playwright/test";

/**
 * City Explorer map — verified with rendered pixels and real interactions.
 * A map container existing in the DOM is never treated as proof of a visible map.
 */

const test = base.extend<{ runtimeErrors: string[] }>({
  runtimeErrors: async ({ page }, use) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await use(errors);
    expect(errors, "no runtime errors").toEqual([]);
  },
});

const map = (page: Page) => page.getByTestId("geo-map");
const marker = (page: Page, id: number) => page.locator(`.uf-marker[data-region="${id}"]`);
const listButton = (page: Page, id: number) =>
  page.locator(`ul[aria-label="Regions ranked by activity"] button[data-region="${id}"]`);

async function openExplorer(page: Page) {
  await page.goto("/#/explorer");
  await expect(page.getByTestId("tile-status")).toContainText("Esri", { timeout: 20_000 });
  await expect(page.locator(".uf-tiles-base .leaflet-tile-loaded, .uf-tiles-base.leaflet-tile-loaded").first()).toBeAttached();
  await page.waitForTimeout(900); // let tiles fade in
}

/** Luminance statistics of a screenshot region, decoded inside the browser. */
async function pixelStats(page: Page, clip: { x: number; y: number; width: number; height: number }) {
  const png = await page.screenshot({ clip });
  return page.evaluate(async (b64) => {
    const img = new Image();
    img.src = `data:image/png;base64,${b64}`;
    await img.decode();
    const c = document.createElement("canvas");
    c.width = 96;
    c.height = 96;
    const ctx = c.getContext("2d")!;
    ctx.drawImage(img, 0, 0, 96, 96);
    const d = ctx.getImageData(0, 0, 96, 96).data;
    const lum: number[] = [];
    for (let i = 0; i < d.length; i += 4) lum.push(0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2]);
    const mean = lum.reduce((a, b) => a + b, 0) / lum.length;
    const sd = Math.sqrt(lum.reduce((a, b) => a + (b - mean) ** 2, 0) / lum.length);
    return { mean, sd, lum };
  }, png.toString("base64"));
}

async function center(l: Locator) {
  const b = (await l.boundingBox())!;
  return { x: b.x + b.width / 2, y: b.y + b.height / 2 };
}

async function expectMarkerNearMapCentre(page: Page, id: number, tolerance = 70) {
  await expect
    .poll(async () => {
      const m = await center(marker(page, id));
      const c = await center(map(page));
      return Math.hypot(m.x - c.x, m.y - c.y);
    }, { timeout: 5000 })
    .toBeLessThan(tolerance);
}

test("map renders real geographic content, not a blank or placeholder surface", async ({ page, runtimeErrors }) => {
  await openExplorer(page);
  const box = (await map(page).boundingBox())!;
  expect(box.height).toBeGreaterThan(400);
  expect(box.width).toBeGreaterThan(600);

  // Hide our own overlays so only basemap pixels are measured.
  await page.addStyleTag({ content: ".uf-marker-host,.leaflet-overlay-pane,[class*='z-[500]']{visibility:hidden!important}" });
  const a = await pixelStats(page, { x: box.x + 20, y: box.y + 80, width: 220, height: 220 });
  const b = await pixelStats(page, { x: box.x + box.width - 260, y: box.y + box.height - 300, width: 220, height: 220 });

  // Not black: land, water and roads produce visible tone and structure.
  expect(a.mean).toBeGreaterThan(8);
  expect(a.sd + b.sd).toBeGreaterThan(8);
  // Not a repeated placeholder tile: two distant areas must differ.
  const diff = a.lum.reduce((s, v, i) => s + Math.abs(v - b.lum[i]), 0) / a.lum.length;
  expect(diff, "distinct map areas should not be identical tiles").toBeGreaterThan(4);

  // The basemap really comes from the attributed provider.
  const src = await page.locator(".uf-tiles-base img.leaflet-tile").first().getAttribute("src");
  expect(src).toContain("arcgisonline.com");
  await expect(page.locator(".leaflet-control-attribution")).toContainText("Esri");
  await expect(page.locator(".leaflet-control-attribution")).toContainText("OpenStreetMap");
  expect(runtimeErrors).toEqual([]);
});

test("all thirty markers are visible inside the initial city framing", async ({ page, runtimeErrors }) => {
  await openExplorer(page);
  const box = (await map(page).boundingBox())!;
  await expect(page.locator(".uf-marker")).toHaveCount(30);
  for (const id of [3, 6, 15, 24, 28, 17]) {
    const m = (await marker(page, id).boundingBox())!;
    expect(m.width).toBeGreaterThan(8);
    expect(m.x).toBeGreaterThanOrEqual(box.x);
    expect(m.x + m.width).toBeLessThanOrEqual(box.x + box.width);
    expect(m.y).toBeGreaterThanOrEqual(box.y);
    expect(m.y + m.height).toBeLessThanOrEqual(box.y + box.height);
  }
  await expect(marker(page, 15)).toHaveClass(/is-selected/);
  await expect(page.getByTestId("data-status")).toHaveText("Historical inference");
  expect(runtimeErrors).toEqual([]);
});

test("clicking a marker selects the region everywhere", async ({ page, runtimeErrors }) => {
  await openExplorer(page);
  await marker(page, 3).hover();
  await expect(page.locator(".uf-tooltip")).toContainText("JFK Airport");
  await marker(page, 3).click();
  await expect(page.getByTestId("selected-region")).toHaveText("JFK Airport");
  await expect(listButton(page, 3)).toHaveAttribute("aria-pressed", "true");
  await expect(marker(page, 3)).toHaveClass(/is-selected/);
  await expect(marker(page, 15)).not.toHaveClass(/is-selected/);
  await expectMarkerNearMapCentre(page, 3);
  expect(runtimeErrors).toEqual([]);
});

test("selecting from the list focuses the map on that region", async ({ page, runtimeErrors }) => {
  await openExplorer(page);
  await listButton(page, 24).click();
  await expect(page.getByTestId("selected-region")).toHaveText("Park Slope");
  await expect(marker(page, 24)).toHaveClass(/is-selected/);
  await expectMarkerNearMapCentre(page, 24);
  await expect(page.locator(".uf-marker__label")).toContainText("Park Slope");
  expect(runtimeErrors).toEqual([]);
});

test("search filters the list and Enter flies to the match", async ({ page, runtimeErrors }) => {
  await openExplorer(page);
  const search = page.getByPlaceholder("Search regions");
  await search.fill("Manhattan");
  await expect(page.locator('ul[aria-label="Regions ranked by activity"] button')).toHaveCount(21);
  await search.fill("Williamsburg");
  await search.press("Enter");
  await expect(page.getByTestId("selected-region")).toHaveText("Williamsburg");
  await expectMarkerNearMapCentre(page, 16);
  await search.fill("zzz");
  await expect(page.getByText("No region matches")).toBeVisible();
  expect(runtimeErrors).toEqual([]);
});

test("zoom, pan and reset all change the view predictably", async ({ page, runtimeErrors }) => {
  await openExplorer(page);
  const spread = async () => {
    const a = await center(marker(page, 17));
    const b = await center(marker(page, 24));
    return Math.hypot(a.x - b.x, a.y - b.y);
  };
  const start = await spread();

  await page.getByRole("button", { name: "Zoom in" }).click();
  await expect.poll(spread).toBeGreaterThan(start * 1.7);
  const zoomed = await spread();
  await page.getByRole("button", { name: "Zoom out" }).click();
  await expect.poll(spread).toBeLessThan(zoomed * 0.6);

  // drag-pan: a marker moves with the pointer
  const before = await center(marker(page, 15));
  const box = (await map(page).boundingBox())!;
  await page.mouse.move(box.x + box.width * 0.7, box.y + box.height * 0.7);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.7 - 160, box.y + box.height * 0.7 - 90, { steps: 8 });
  await page.mouse.up();
  await expect.poll(async () => (await center(marker(page, 15))).x).toBeLessThan(before.x - 120);

  // reset brings the whole city back into frame
  await page.getByRole("button", { name: "Zoom in" }).click();
  await page.getByRole("button", { name: /Reset view/ }).click();
  await expect.poll(spread, { timeout: 4000 }).toBeLessThan(start * 1.15);
  const m = (await marker(page, 3).boundingBox())!;
  expect(m.x + m.width).toBeLessThanOrEqual(box.x + box.width);
  expect(runtimeErrors).toEqual([]);
});

test("map stays visible after navigating away and after reload", async ({ page, runtimeErrors }) => {
  await openExplorer(page);
  await page.getByRole("navigation").getByRole("button", { name: /^Overview/ }).click();
  await expect(page.getByRole("heading", { level: 1, name: /HISTORICAL INTELLIGENCE/ })).toBeVisible();
  await page.getByRole("navigation").getByRole("button", { name: /^City Explorer/ }).click();
  await expect(page.getByTestId("tile-status")).toContainText("Esri", { timeout: 20_000 });
  await page.waitForTimeout(800);
  let box = (await map(page).boundingBox())!;
  expect(box.height).toBeGreaterThan(400);
  expect((await pixelStats(page, { x: box.x + 40, y: box.y + 90, width: 200, height: 200 })).sd).toBeGreaterThan(3);

  await page.reload();
  await expect(page.getByTestId("tile-status")).toContainText("Esri", { timeout: 20_000 });
  box = (await map(page).boundingBox())!;
  expect(box.height).toBeGreaterThan(400);
  await expect(page.locator(".uf-marker")).toHaveCount(30);
  expect(runtimeErrors).toEqual([]);
});

test("mobile: map leads the page and markers are tappable", async ({ page, runtimeErrors }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openExplorer(page);
  const box = (await map(page).boundingBox())!;
  expect(box.width).toBeGreaterThan(380);
  expect(box.height).toBeGreaterThan(360);
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
  await marker(page, 8).click();
  await expect(page.getByTestId("selected-region")).toHaveText("Upper East Side-Carnegie Hill");
  await expect(marker(page, 8)).toHaveClass(/is-selected/);
  expect(runtimeErrors).toEqual([]);
});

test("if basemap tiles fail, an honest schematic outline replaces the black void", async ({ page, runtimeErrors }) => {
  await page.route(/arcgisonline\.com/, (r) => r.abort());
  await page.goto("/#/explorer");
  await expect(page.getByTestId("tile-status")).toHaveText("Basemap unavailable · schematic outline", { timeout: 15_000 });
  await expect(page.locator(".leaflet-schematic-pane path")).toHaveCount(5);
  await expect(page.locator(".leaflet-control-attribution")).toContainText("Schematic coastline");
  await expect(page.locator(".leaflet-control-attribution")).not.toContainText("Esri");
  await expect(page.locator(".uf-marker")).toHaveCount(30);
  const box = (await map(page).boundingBox())!;
  const hide = await page.addStyleTag({ content: ".uf-marker-host,.leaflet-overlay-pane,[class*='z-[500]']{visibility:hidden!important}" });
  const stats = await pixelStats(page, { x: box.x, y: box.y + 60, width: box.width, height: box.height - 80 });
  expect(stats.sd, "coastline outline should be visible").toBeGreaterThan(3);
  await hide.evaluate((el) => el.remove());
  await page.screenshot({ path: "test-results/explorer-tiles-offline.png" });
  // Fitted Midtown centroids can overlap at city-wide zoom. Keyboard selection
  // targets the genuine marker without moving coordinates or forcing a covered click.
  await page.getByRole('button',{name:'Financial District-Battery Park City, region 20',exact:true}).press('Enter');
  await expect(page.getByTestId("selected-region")).toHaveText("Financial District-Battery Park City");
  expect(runtimeErrors).toEqual([]);
});

