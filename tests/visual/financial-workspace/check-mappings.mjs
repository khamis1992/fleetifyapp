import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1000 },
  });
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("http://127.0.0.1:4191/finance/account-mappings");
  await page.getByText("هذا الربط يحتاج تصحيحًا:", { exact: false }).waitFor();
  await page.getByRole("button", { name: "إضافة ربط جديد" }).click();
  await page.getByRole("combobox").first().click();
  await page
    .getByRole("option", { name: "إيرادات رسوم التأخير المحصّلة" })
    .click();
  await page.getByRole("combobox").nth(1).click();
  const options = await page.getByRole("option").allTextContents();
  assert.deepEqual(options, ["430101 - رسوم التأخير المحصّلة"]);
  await page.getByRole("option").click();
  assert.equal(
    await page.getByRole("button", { name: "حفظ", exact: true }).isEnabled(),
    true
  );
  await page.getByRole("button", { name: "إلغاء", exact: true }).click();
  await page.getByRole("dialog").waitFor({ state: "detached" });
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 1000 });
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth > window.innerWidth + 1
      ),
      false
    );
    await page.screenshot({
      path: `docs/reviews/financial-system-2026-09-06/account-mappings-${width}.png`,
      fullPage: true,
    });
  }
  assert.deepEqual(errors, []);
  console.log(
    "PASS: mapping warnings, eligible fee accounts only, desktop/mobile with no overflow. Fixture data; no save executed."
  );
} finally {
  await browser.close();
}
