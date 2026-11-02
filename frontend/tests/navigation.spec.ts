import { expect, test as base, type Page } from "@playwright/test";

const test = base.extend<{ runtimeErrors: string[] }>({
  runtimeErrors: async ({ page }, use) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await use(errors);
    expect(errors, "The application should not throw during navigation").toEqual([]);
  },
});

const headings = {
  home: /THE CITY\s+NEVER\s+STOPS\./i,
  overview: /NEW YORK\s*\/\s*HISTORICAL INTELLIGENCE/i,
  forecast: /FORECAST\s+THE CITY\./i,
  explorer: /EXPLORE\s+THE CITY\./i,
  insights: /DEMAND\s+INSIGHTS\./i,
  model: /INSIDE\s+THE ENGINE\./i,
};

async function expectPage(page: Page, route: keyof typeof headings) {
  await expect(page).toHaveURL(route === "home" ? /\/$/ : new RegExp(`#/${route}$`));
  await expect(page.getByRole("heading", { name: headings[route], level: 1 })).toBeVisible();
}

test("opens on the cinematic homepage with the original images", async ({ page, runtimeErrors }) => {
  await page.goto("/");
  await expectPage(page, "home");
  await expect(page.locator("#scene-0")).toBeVisible();
  for (const image of [
    "hero-manhattan.jpg",
    "digital-twin.jpg",
    "street-rain.jpg",
    "times-canyon.jpg",
    "aerial-intersection.jpg",
  ]) {
    const response = await page.request.get(`/images/${image}`);
    expect(response.ok(), `${image} should be available`).toBeTruthy();
  }
  expect(runtimeErrors).toEqual([]);
});

const ctas: {
  label: string;
  container: string;
  name: RegExp;
  route: keyof typeof headings;
}[] = [
  { label: "Enter the System", container: "#scene-0", name: /^enter the system/i, route: "overview" },
  { label: "Enter System in the header", container: "header", name: /^enter system/i, route: "overview" },
  { label: "Launch UrbanFlow", container: "#scene-4", name: /^launch urbanflow/i, route: "overview" },
  { label: "Explore the City", container: "#scene-0", name: /^explore the city/i, route: "explorer" },
  { label: "Run a Forecast", container: "#scene-3", name: /^run a forecast/i, route: "forecast" },
];

for (const cta of ctas) {
  test(`${cta.label} opens its intended page on the first click`, async ({ page, runtimeErrors }) => {
    await page.goto("/");
    await expectPage(page, "home");
    await page.locator(cta.container).getByRole("button", { name: cta.name }).click();
    await expectPage(page, cta.route);
    expect(runtimeErrors).toEqual([]);
  });

  test(`${cta.label} also works on mobile`, async ({ page, runtimeErrors }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");
    await expectPage(page, "home");
    await page.locator(cta.container).getByRole("button", { name: cta.name }).click();
    await expectPage(page, cta.route);
    expect(runtimeErrors).toEqual([]);
  });
}

test("desktop sidebar opens every page and returns to the homepage", async ({ page, runtimeErrors }) => {
  await page.goto("/");
  await page.locator("#scene-0").getByRole("button", { name: /^enter the system/i }).click();
  await expectPage(page, "overview");
  await expect(page.getByText("REGIONAL ACTIVITY RANKING", { exact: true })).toBeVisible();

  const pages = [
    { label: /^Forecast Studio/i, route: "forecast" as const, content: "FORECAST PARAMETERS" },
    { label: /^City Explorer/i, route: "explorer" as const, content: "Activity at origin" },
    { label: /^Demand Insights/i, route: "insights" as const, content: "COMPARATIVE SUMMARY" },
    { label: /^Model Intelligence/i, route: "model" as const, content: "HELD-OUT EVALUATION" },
    { label: /^Overview/i, route: "overview" as const, content: "REGIONAL ACTIVITY RANKING" },
  ];

  for (const destination of pages) {
    const link = page.getByRole("navigation").getByRole("button", { name: destination.label });
    await link.click();
    await expectPage(page, destination.route);
    await expect(link).toHaveAttribute("aria-current", "page");
    await expect(page.getByText(destination.content, { exact: true })).toBeVisible();
  }

  await page.getByRole("button", { name: /back to film/i }).click();
  await expectPage(page, "home");
  expect(runtimeErrors).toEqual([]);
});

test("browser back, forward and reload follow the same routes", async ({ page, runtimeErrors }) => {
  await page.goto("/");
  await page.locator("#scene-0").getByRole("button", { name: /^enter the system/i }).click();
  await expectPage(page, "overview");
  await page.getByRole("navigation").getByRole("button", { name: /^Forecast Studio/i }).click();
  await expectPage(page, "forecast");

  await page.goBack();
  await expectPage(page, "overview");
  await page.goBack();
  await expectPage(page, "home");
  await page.goForward();
  await expectPage(page, "overview");
  await page.goForward();
  await expectPage(page, "forecast");
  await page.reload();
  await expectPage(page, "forecast");
  expect(runtimeErrors).toEqual([]);
});

test("mobile menu opens application pages and goes back to the film", async ({ page, runtimeErrors }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await expectPage(page, "home");
  await page.locator("#scene-0").getByRole("button", { name: /^enter the system/i }).click();
  await expectPage(page, "overview");

  for (const destination of [
    { label: /^Forecast Studio/i, route: "forecast" as const },
    { label: /^City Explorer/i, route: "explorer" as const },
    { label: /^Demand Insights/i, route: "insights" as const },
    { label: /^Model Intelligence/i, route: "model" as const },
  ]) {
    await page.getByRole("button", { name: "Open navigation" }).click();
    await page.getByRole("navigation").getByRole("button", { name: destination.label }).click();
    await expectPage(page, destination.route);
  }

  await page.getByRole("button", { name: "Open navigation" }).click();
  await page.getByRole("button", { name: /back to film/i }).click();
  await expectPage(page, "home");
  expect(runtimeErrors).toEqual([]);
});

test("explorer selection carries through to a working historical forecast", async ({ page, runtimeErrors }) => {
  await page.goto("/");
  await page.locator("#scene-0").getByRole("button", { name: /^explore the city/i }).click();
  await expectPage(page, "explorer");
  await page.getByPlaceholder(/search region/i).fill("Williamsburg");
  await page.locator('ul[aria-label="Regions ranked by activity"] button[data-region="16"]').click();
  await page.getByRole("button", { name: /^forecast this region/i }).click();
  await expectPage(page, "forecast");
  await expect(page.locator('select:not([aria-label="Forecast model"])').first()).toHaveValue("16");

  await page.getByRole("button", { name: /^1 HOUR\b/i }).click();
  const generate = page.getByRole("button", { name: /generate forecast/i });
  await expect(generate).toBeEnabled();
  await generate.click();
  await expect(page.locator("table tbody tr")).toHaveCount(4);
  await expect(page.getByText("HISTORICAL", { exact: true }).first()).toBeVisible();
  expect(runtimeErrors).toEqual([]);
});

test("an overview region opens the forecast for that region", async ({ page, runtimeErrors }) => {
  await page.goto("/");
  await page.locator("#scene-0").getByRole("button", { name: /^enter the system/i }).click();
  await expectPage(page, "overview");
  await page.locator('table tbody tr[data-region="5"]').click();
  await expectPage(page, "forecast");
  await expect(page.locator('select:not([aria-label="Forecast model"])').first()).toHaveValue("5");
  expect(runtimeErrors).toEqual([]);
});