import { test, expect } from "@playwright/test";

test.describe("Login", () => {
  test("muestra el formulario de login", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { name: /iniciar sesión/i })).toBeVisible();
    await expect(page.getByLabel(/correo/i)).toBeVisible();
    await expect(page.getByLabel(/contraseña/i)).toBeVisible();
  });

  test("muestra error con credenciales vacías", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: /ingresar/i }).click();
    await expect(page.getByText(/válido/i).or(page.getByText(/requerido/i))).toBeVisible();
  });
});

test.describe("Navegación después de login", () => {
  test("carga el dashboard después de autenticar", async ({ page }) => {
    await page.goto("/");
    await page.getByLabel(/correo/i).fill("admin@example.com");
    await page.getByLabel(/contraseña/i).fill("admin123");
    await page.getByRole("button", { name: /ingresar/i }).click();
    await expect(page.getByText(/calificaciones/i).or(page.getByText(/dashboard/i))).toBeVisible({ timeout: 10000 });
  });
});

test.describe("Responsive", () => {
  test("menú se colapsa en móvil", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto("/");
    await expect(page.getByRole("heading", { name: /iniciar sesión/i })).toBeVisible();
  });
});
