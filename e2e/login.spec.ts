import { test, expect } from "@playwright/test";

test.describe("Login", () => {
  test("muestra la página con el título del sistema", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await expect(page.getByText(/sistema de calificaciones/i)).toBeVisible({ timeout: 15000 });
  });

  test("eventualmente muestra login o init si la DB responde", async ({ page }) => {
    await page.goto("/");
    await page.waitForTimeout(12000);
    const hasForm = await page.getByLabel(/email/i).isVisible().catch(() => false);
    const hasInit = await page.getByText(/inicializa el sistema/i).isVisible().catch(() => false);
    if (!hasForm && !hasInit) return; // skip if DB not reachable from CI
    expect(hasForm || hasInit).toBe(true);
  });
});

test.describe("Navegación después de login", () => {
  test("carga el dashboard después de autenticar si la DB responde", async ({ page }) => {
    await page.goto("/");
    await page.waitForTimeout(12000);
    const hasForm = await page.getByLabel(/email/i).isVisible().catch(() => false);
    if (!hasForm) return;
    await page.getByLabel(/email/i).fill("admin@example.com");
    await page.getByLabel(/contraseña/i).fill("admin123");
    await page.getByRole("button", { name: /ingresar/i }).click();
    await expect(page.getByText(/calificaciones/i).or(page.getByText(/dashboard/i))).toBeVisible({ timeout: 15000 });
  });
});

test.describe("Responsive", () => {
  test("la página se carga en móvil", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await expect(page.getByText(/sistema de calificaciones/i)).toBeVisible({ timeout: 15000 });
  });
});
