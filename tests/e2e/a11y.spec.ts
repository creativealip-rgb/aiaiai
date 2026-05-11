import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test("home page has no critical accessibility violations", async ({ page }) => {
  await page.goto("/");
  const axe = new AxeBuilder({ page });
  const results = await axe.analyze();

  const criticalViolations = results.violations.filter(
    (v) => v.impact === "critical",
  );

  expect(criticalViolations).toEqual([]);
});

