import { test, expect } from "@playwright/test";

test.describe("Login", () => {
  test("muestra la página de login con el título del sistema", async ({ page }) => {
    await page.goto("/", { waitUntil: "networkidle" });
    await expect(page.getByText(/sistema de calificaciones/i)).toBeVisible({ timeout: 20000 });
  });

  test("tiene formulario de ingreso o botón de inicialización", async ({ page }) => {
    await page.goto("/");
    await page.waitForTimeout(10000); // wait for potential API timeout
    const hasForm = await page.getByLabel(/email/i).isVisible().catch(() => false);
    const hasInit = await page.getByText(/inicializa el sistema/i).isVisible().catch(() => false);
    expect(hasForm || hasInit).toBe(true);
  });
});

test.describe("Navegación después de login", () => {
  test("carga el dashboard después de autenticar si el sistema está inicializado", async ({ page }) => {
    await page.goto("/");
    await page.waitForTimeout(10000);
    const hasForm = await page.getByLabel(/email/i).isVisible().catch(() => false);
    if (!hasForm) return;
    await page.getByLabel(/email/i).fill("admin@example.com");
    await page.getByLabel(/contraseña/i).fill("admin123");
    await page.getByRole("button", { name: /ingresar/i }).click();
    await expect(page.getByText(/calificaciones/i).or(page.getByText(/dashboard/i))).toBeVisible({ timeout: 15000 });
  });
});

test.describe("Responsive", () => {
  test("la página se carga correctamente en móvil", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto("/", { waitUntil: "networkidle" });
    await expect(page.getByText(/sistema de calificaciones/i)).toBeVisible({ timeout: 20000 });
  });
});
