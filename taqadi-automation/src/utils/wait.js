/**
 * دوال الانتظار
 */

/**
 * انتظار مدة محددة
 */
export async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * انتظار حتى يختفي عنصر (مثل: loader)
 */
export async function waitForElementToDisappear(page, selector, timeout = 10000) {
  try {
    await page.waitForSelector(selector, { hidden: true, timeout });
    console.log(`✅ اختفى العنصر: ${selector}`);
    return true;
  } catch (error) {
    console.log(`⚠️ لم يختف العنصر: ${selector}`);
    return false;
  }
}

/**
 * انتظار ظهور نص في الصفحة
 */
export async function waitForText(page, text, timeout = 10000) {
  try {
    await page.waitForFunction(
      (searchText) => document.body.innerText.includes(searchText),
      { timeout },
      text
    );
    console.log(`✅ ظهر النص: ${text}`);
    return true;
  } catch (error) {
    console.log(`⚠️ لم يظهر النص: ${text}`);
    return false;
  }
}

/**
 * انتظار اكتمال عملية حفظ (التحقق من ظهور صف في جدول)
 */
export async function waitForTableRow(page, rowText, timeout = 10000) {
  try {
    const xpath = `//tr[contains(., "${rowText}")]`;
    await page.waitForXPath(xpath, { timeout });
    console.log(`✅ ظهر الصف في الجدول: ${rowText}`);
    return true;
  } catch (error) {
    console.log(`⚠️ لم يظهر الصف: ${rowText}`);
    return false;
  }
}
