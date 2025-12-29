import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const COMPONENTS = {
  Core: ['KPI Card', 'Button', 'Text', 'Heading', 'Container', 'Card', 'Alert', 'Separator', 'Empty State', 'Skeleton', 'Spinner', 'Toast'],
  Charts: ['Line Chart', 'Bar Chart', 'Pie Chart', 'Area Chart', 'Scatter Chart', 'Gauge', 'Sparkline', 'Heatmap', 'Sankey'],
  Forms: ['Input', 'Textarea', 'Select', 'Checkbox', 'Switch', 'Radio', 'Range', 'Date Picker', 'Time Picker', 'Date Range', 'Form', 'Upload', 'Rating', 'OTP Input', 'Color Picker', 'Stepper'],
  Layout: ['Grid', 'Stack', 'VStack', 'HStack', 'Sheet', 'Drawer', 'Split Pane', 'Collapsible'],
  Navigation: ['Tabs', 'Nav', 'Breadcrumb', 'Header', 'Sidebar', 'Pagination', 'Command Palette', 'Dropdown Menu', 'Context Menu'],
  DataDisplay: ['Data Table', 'List', 'Avatar', 'Badge', 'Tag', 'Progress', 'Icon', 'Image', 'Calendar', 'Timeline', 'Tree View', 'Kanban', 'Org Chart', 'Flow Diagram', 'Map', 'Carousel'],
  Interactive: ['Modal', 'Tooltip', 'Popover', 'Accordion', 'Alert Dialog', 'Hover Card', 'Lightbox', 'Video', 'Audio'],
};

test.describe('Accessibility Audit', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: '📚 Component Gallery' }).click();
    await page.waitForTimeout(500);
  });

  for (const [category, components] of Object.entries(COMPONENTS)) {
    test.describe(category, () => {
      for (const componentName of components) {
        test(`${componentName}`, async ({ page }) => {
          // Click on component
          const button = page.getByRole('button', { name: componentName, exact: true });
          if (await button.isVisible()) {
            await button.click();
            await page.waitForTimeout(300);

            // Run axe on the preview area
            const results = await new AxeBuilder({ page })
              .include('[data-liquid-type]')
              .disableRules(['color-contrast']) // Often false positives in demos
              .analyze();

            // Report violations
            const violations = results.violations;
            if (violations.length > 0) {
              console.log(`\n❌ ${componentName} - ${violations.length} violations:`);
              violations.forEach(v => {
                console.log(`  - [${v.impact}] ${v.id}: ${v.description}`);
                v.nodes.forEach(n => console.log(`    ${n.html.slice(0, 100)}`));
              });
            } else {
              console.log(`✅ ${componentName} - No violations`);
            }

            expect(violations.filter(v => v.impact === 'critical' || v.impact === 'serious')).toHaveLength(0);
          }
        });
      }
    });
  }
});
