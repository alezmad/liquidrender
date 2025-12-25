// Component Visual & Functional Tests
// Run: pnpm exec playwright test
import { test, expect } from '@playwright/test';

// Component test definitions
const components = {
  // P0 - Critical (new)
  list: { dsl: '0 ^col *items [Cd :$.title :$.description]', data: 'list' },
  select: { dsl: 'Se :user.role "Role"', data: 'form' },
  switch: { dsl: 'Sw :enabled "Enable"', data: 'kpi' },
  checkbox: { dsl: 'Ck :agreed "Agree"', data: 'kpi' },
  tag: { dsl: 'Tg "Active" #green', data: 'kpi' },
  progress: { dsl: 'Pg :progress "Loading"', data: 'kpi' },

  // P1 - Important (new)
  heading: { dsl: 'Hd "Title" #2', data: 'kpi' },
  icon: { dsl: 'Ic "check"', data: 'kpi' },
  avatar: { dsl: 'Av :name "User"', data: 'kpi' },
  radio: { dsl: 'Rd :role "Role"', data: 'form' },
  accordion: { dsl: 'Ac "More" [Tx "Content"]', data: 'kpi' },
  stepper: { dsl: 'St :step [stp "A", stp "B"]', data: 'kpi' },

  // Existing (regression)
  kpi: { dsl: 'Kp :value "Revenue"', data: 'kpi' },
  button: { dsl: 'Bt "Click"', data: 'kpi' },
  text: { dsl: 'Tx "Hello"', data: 'kpi' },
  card: { dsl: 'Cd "Card" [Tx "Body"]', data: 'kpi' },
  table: { dsl: 'Tb :items', data: 'table' },
  line: { dsl: 'Ln :monthly', data: 'chart' },
  bar: { dsl: 'Br :monthly', data: 'chart' },
  pie: { dsl: 'Pi :monthly', data: 'chart' },
  input: { dsl: 'In :name "Name"', data: 'form' },
  form: { dsl: 'Fm :user [In :name "Name"]', data: 'form' },
};

// Generate test URL
function testUrl(component: string, dsl: string, data: string): string {
  const encodedDsl = encodeURIComponent(dsl);
  return `/test?component=${component}&dsl=${encodedDsl}&data=${data}`;
}

// Test each component renders without errors
for (const [name, config] of Object.entries(components)) {
  test(`${name}: renders without errors`, async ({ page }) => {
    await page.goto(testUrl(name, config.dsl, config.data));

    // Wait for component harness
    await expect(page.getByTestId('component-test-harness')).toBeVisible();

    // Check no console errors
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') errors.push(msg.text());
    });

    // Wait for render
    await page.waitForTimeout(500);

    // Verify component rendered (has content)
    const render = page.getByTestId('component-render');
    await expect(render).not.toBeEmpty();

    // Check for data-liquid-type attribute
    const liquidElement = render.locator('[data-liquid-type]').first();
    await expect(liquidElement).toBeVisible();

    // No React errors
    expect(errors.filter(e => e.includes('React') || e.includes('Error'))).toHaveLength(0);
  });
}

// Interactive tests for specific components
test.describe('Interactive Components', () => {
  test('button: click triggers action', async ({ page }) => {
    await page.goto(testUrl('button', 'Bt "Click Me"', 'kpi'));
    const btn = page.getByRole('button', { name: 'Click Me' });
    await expect(btn).toBeVisible();
    await btn.click();
    // Button should be clickable without error
  });

  test('input: can type text', async ({ page }) => {
    await page.goto(testUrl('input', 'In :value "Name"', 'form'));
    const input = page.getByRole('textbox');
    await expect(input).toBeVisible();
    await input.fill('Test Value');
    await expect(input).toHaveValue('Test Value');
  });

  test('switch: can toggle', async ({ page }) => {
    await page.goto(testUrl('switch', 'Sw :enabled "Toggle"', 'kpi'));
    const toggle = page.getByRole('switch');
    await expect(toggle).toBeVisible();
    await toggle.click();
    // Toggle state should change
  });

  test('checkbox: can check', async ({ page }) => {
    await page.goto(testUrl('checkbox', 'Ck :agreed "Agree"', 'kpi'));
    const checkbox = page.getByRole('checkbox');
    await expect(checkbox).toBeVisible();
    await checkbox.click();
    await expect(checkbox).toBeChecked();
  });

  test('accordion: can expand', async ({ page }) => {
    await page.goto(testUrl('accordion', 'Ac "Details" [Tx "Hidden"]', 'kpi'));
    // Find accordion trigger
    const trigger = page.getByText('Details');
    await expect(trigger).toBeVisible();
    await trigger.click();
    // Content should be visible after click
    await expect(page.getByText('Hidden')).toBeVisible();
  });
});

// Visual regression tests
test.describe('Visual Regression', () => {
  const visualComponents = ['kpi', 'card', 'table', 'button', 'tag', 'progress'];

  for (const name of visualComponents) {
    const config = components[name as keyof typeof components];
    if (!config) continue;

    test(`${name}: visual snapshot`, async ({ page }) => {
      await page.goto(testUrl(name, config.dsl, config.data));
      await page.waitForTimeout(500);

      const render = page.getByTestId('component-render');
      await expect(render).toHaveScreenshot(`${name}.png`, {
        maxDiffPixelRatio: 0.05,
      });
    });
  }
});
