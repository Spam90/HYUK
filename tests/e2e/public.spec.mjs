import { test, expect } from '@playwright/test';

const publicPages = [
  { path: '/pricing', heading: /planes|pricing/i },
  { path: '/contact', heading: /soporte|ventas/i },
  { path: '/privacy', heading: /privacidad|privacy/i },
  { path: '/terms', heading: /términos|terms/i },
];

for (const pageCase of publicPages) {
  test(`public page ${pageCase.path} loads without a server error`, async ({ page }) => {
    const response = await page.goto(pageCase.path);
    expect(response?.status()).toBeLessThan(500);
    await expect(page.locator('body')).toContainText(pageCase.heading);
  });
}

test('unauthenticated users are redirected away from admin', async ({ page }) => {
  test.skip(!process.env.E2E_REAL_AUTH, 'Requires a real Supabase auth environment');
  await page.goto('/admin');
  await expect(page).toHaveURL(/\/login(?:\?|$)/);
});

test('the demo catalog is reachable as a public experience', async ({ page }) => {
  const response = await page.goto('/demo');
  expect(response?.status()).toBeLessThan(500);
  await expect(page.locator('body')).toContainText(/Mi Tienda Demo|Buscar productos/i);
});

test('demo catalog product flows through cart quantity, total and removal', async ({ page }) => {
  await page.goto('/demo');
  const addButton = page.getByRole('button', { name: /Agregar$/ }).first();
  await expect(addButton).toBeVisible();
  await addButton.click();
  const addToOrder = page.getByRole('button', { name: /Agregar al pedido/ });
  await addToOrder.evaluate((button) => button.click());

  await expect(page.getByRole('heading', { name: 'Mi carrito' })).toBeVisible();
  const increase = page.getByRole('button', { name: /Aumentar cantidad/ }).first();
  await increase.click();
  await expect(page.getByRole('button', { name: /2 productos/ })).toBeVisible();
  await expect(page.getByText(/Subtotal/)).toBeVisible();

  await page.getByRole('button', { name: /Eliminar/ }).click();
  await expect(page.getByText('Tu carrito está vacío')).toBeVisible();
});

test('server-authoritative checkout fixture is opt-in', async () => {
  test.skip(!process.env.E2E_REAL_CHECKOUT, 'Requires a real Supabase fixture and test store');
  test.fail(true, 'Real checkout fixture must be supplied by the environment before enabling this test');
});

test('public catalog smoke test when a real store slug is provided', async ({ page }) => {
  test.skip(!process.env.E2E_STORE_SLUG, 'Requires a real public Supabase store slug');
  const response = await page.goto(`/${process.env.E2E_STORE_SLUG}`);
  expect(response?.status()).toBe(200);
  await expect(page.locator('body')).not.toContainText(/Internal Server Error/i);
});
