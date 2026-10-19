import { test, expect } from "@playwright/test";

async function join(context, name, observe = () => {}) {
  const page = await context.newPage();
  observe(page);
  page.on("pageerror", error => console.log(`Client ${name} error: ${error.message}`));
  await page.goto("/join");
  await page.locator('[name="userId"]').waitFor();
  await page.locator('[name="userId"]').selectOption({ label: name });
  await page.locator('button[name="join"]').click();
  await page.waitForFunction(() => globalThis.game?.ready === true, {}, { timeout: 60000 });
  console.log(`Client ready: ${name}`);
  const world = await page.evaluate(() => game.world.id);
  if (world !== "shared-bastion-integration") throw new Error("Integration tests only run in the dedicated shared-bastion-integration world");
  return page;
}

test("T01: native startup and the status application render without module errors", async ({ browser }) => {
  const context = await browser.newContext();
  try {
    const errors = [];
    const failures = [];
    const page = await join(context, "Gamemaster", page => {
      page.on("pageerror", error => errors.push(error.message));
      page.on("response", response => { if (response.url().includes("/modules/shared-bastion/") && response.status() >= 400) failures.push(response.url()); });
    });
    await expect.poll(() => page.evaluate(() => game.modules.get("shared-bastion")?.api?.diagnostics().supported)).toBe(true);
    await page.evaluate(() => new (game.settings.menus.get("shared-bastion.status").type)().render({ force: true }));
    await expect(page.locator("#shared-bastion-status")).toContainText("14.369");
    await expect(page.locator("#shared-bastion-status")).toContainText("6.0.6");
    await page.locator("#shared-bastion-status").screenshot({ path: "test-results/t01-status.png" });
    expect(errors).toEqual([]);
    expect(failures).toEqual([]);
  } finally { await context.close(); }
});
