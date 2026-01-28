/**
 * المرحلة 2: أطراف الدعوى (40%)
 */
import { SELECTORS, clickXPath, typeXPath, waitForXPath } from '../config/selectors.js';
import { sleep, waitForTableRow } from '../utils/wait.js';
import { logger } from '../utils/logger.js';

/**
 * فتح قائمة Kendo واختيار خيار
 */
async function selectKendoOption(page, dropdownXPath, optionXPath) {
  // فتح القائمة
  await clickXPath(page, dropdownXPath);
  await sleep(800);
  
  // اختيار الخيار
  await waitForXPath(page, optionXPath);
  await clickXPath(page, optionXPath);
  await sleep(500);
}

/**
 * إضافة طرف (شركة أو شخص)
 */
async function addParty(page, partyData) {
  logger.info(`إضافة طرف: ${partyData.name}`);
  
  try {
    // 1. النقر على "إضافة طرف"
    await clickXPath(page, SELECTORS.parties.addPartyButton);
    await sleep(2000);
    
    // 2. اختيار تصنيف الطرف (شركة / شخص طبيعي)
    const typeOption = partyData.type === 'company' 
      ? SELECTORS.parties.companyOption 
      : SELECTORS.parties.individualOption;
    await selectKendoOption(page, SELECTORS.parties.partyTypeDropdown, typeOption);
    logger.success(`تصنيف الطرف: ${partyData.type}`);
    
    // 3. اختيار صفة الطرف (مدعى / مدعى عليه)
    const roleOption = partyData.role === 'plaintiff' 
      ? SELECTORS.parties.plaintiffOption 
      : SELECTORS.parties.defendantOption;
    await selectKendoOption(page, SELECTORS.parties.partyRoleDropdown, roleOption);
    logger.success(`صفة الطرف: ${partyData.role}`);
    
    // 4. تعيين الترتيب
    await sleep(500);
    try {
      const orderElement = await page.waitForSelector(`xpath/${SELECTORS.parties.orderInput}`, { timeout: 5000 });
      await orderElement.click();
      await orderElement.evaluate(el => el.value = ''); // مسح القيمة
      await orderElement.type(partyData.order.toString());
      logger.success(`الترتيب: ${partyData.order}`);
    } catch (error) {
      logger.warning(`⚠️ لم يتم تعيين الترتيب: ${error.message}`);
    }
    
    // 5. ملء البيانات حسب النوع
    if (partyData.type === 'company') {
      await fillCompanyData(page, partyData);
    } else {
      await fillIndividualData(page, partyData);
    }
    
    // 6. ملء تفاصيل البنك (إذا وُجدت)
    if (partyData.bankDetails) {
      await fillBankDetails(page, partyData.bankDetails);
    }
    
    // 7. النقر على "حفظ"
    await sleep(1000);
    await clickXPath(page, SELECTORS.saveButton);
    await sleep(3000); // انتظار الحفظ
    
    // 8. التحقق من ظهور الطرف في الجدول
    await waitForTableRow(page, partyData.name, 10000);
    
    logger.success(`✅ تم إضافة: ${partyData.name}`);
    return true;
  } catch (error) {
    logger.error(`فشل إضافة الطرف: ${partyData.name}`, { error: error.message });
    throw error;
  }
}

/**
 * ملء بيانات الشركة
 */
async function fillCompanyData(page, data) {
  await typeXPath(page, SELECTORS.parties.companyName, data.name);
  await sleep(300);
  
  if (data.commercialReg) {
    await typeXPath(page, SELECTORS.parties.commercialReg, data.commercialReg);
    await sleep(300);
  }
  
  if (data.phone) {
    await typeXPath(page, SELECTORS.parties.phone, data.phone);
    await sleep(300);
  }
  
  if (data.email) {
    await typeXPath(page, SELECTORS.parties.email, data.email);
    await sleep(300);
  }
  
  if (data.address) {
    await typeXPath(page, SELECTORS.parties.address, data.address);
    await sleep(300);
  }
  
  logger.success('تم ملء بيانات الشركة');
}

/**
 * ملء بيانات الشخص الطبيعي
 */
async function fillIndividualData(page, data) {
  await typeXPath(page, SELECTORS.parties.firstName, data.firstName);
  await sleep(300);
  
  if (data.middleName) {
    await typeXPath(page, SELECTORS.parties.middleName, data.middleName);
    await sleep(300);
  }
  
  if (data.thirdName) {
    await typeXPath(page, SELECTORS.parties.thirdName, data.thirdName);
    await sleep(300);
  }
  
  await typeXPath(page, SELECTORS.parties.lastName, data.lastName);
  await sleep(300);
  
  // الجنسية (Kendo dropdown)
  if (data.nationality) {
    await selectKendoOption(page, SELECTORS.parties.nationalityDropdown, SELECTORS.parties.qatarNationalityOption);
    await sleep(300);
  }
  
  // نوع البطاقة
  if (data.idType) {
    await selectKendoOption(page, SELECTORS.parties.idTypeDropdown, SELECTORS.parties.qatariIdOption);
    await sleep(300);
  }
  
  if (data.idNumber) {
    await typeXPath(page, SELECTORS.parties.idNumber, data.idNumber);
    await sleep(300);
  }
  
  if (data.phone) {
    await typeXPath(page, SELECTORS.parties.phone, data.phone);
    await sleep(300);
  }
  
  if (data.email) {
    await typeXPath(page, SELECTORS.parties.email, data.email);
    await sleep(300);
  }
  
  if (data.address) {
    await typeXPath(page, SELECTORS.parties.address, data.address);
    await sleep(300);
  }
  
  logger.success('تم ملء بيانات الشخص');
}

/**
 * ملء تفاصيل البنك
 */
async function fillBankDetails(page, bankData) {
  if (bankData.nameAr) {
    await typeXPath(page, SELECTORS.parties.bankNameAr, bankData.nameAr);
    await sleep(300);
  }
  
  if (bankData.nameEn) {
    await typeXPath(page, SELECTORS.parties.bankNameEn, bankData.nameEn);
    await sleep(300);
  }
  
  if (bankData.iban) {
    await typeXPath(page, SELECTORS.parties.iban, bankData.iban);
    await sleep(300);
  }
  
  if (bankData.swift) {
    await typeXPath(page, SELECTORS.parties.swift, bankData.swift);
    await sleep(300);
  }
  
  if (bankData.address) {
    await typeXPath(page, SELECTORS.parties.bankAddress, bankData.address);
    await sleep(300);
  }
  
  logger.success('تم ملء تفاصيل البنك');
}

/**
 * المرحلة 2 الكاملة: إضافة جميع الأطراف
 */
export async function fillParties(page, partiesData) {
  logger.info('👥 المرحلة 2: إضافة أطراف الدعوى...');
  
  try {
    // إضافة شركة العراف (مدعى - ترتيب 1)
    await addParty(page, partiesData.plaintiff1);
    
    // إضافة خميس الجبر (مدعى - ترتيب 2)
    await addParty(page, partiesData.plaintiff2);
    
    // إضافة المدعى عليه (ترتيب 1)
    await addParty(page, partiesData.defendant);
    
    // التحقق من الترتيب الصحيح قبل "التالي"
    logger.info('🔍 التحقق من ترتيب الأطراف...');
    
    const companyRowExists = await page.waitForSelector(
      `xpath///tr[contains(., "${partiesData.plaintiff1.name}") and contains(., "1")]`,
      { timeout: 5000 }
    ).catch(() => null);
    
    const khamisRowExists = await page.waitForSelector(
      `xpath///tr[contains(., "${partiesData.plaintiff2.name}") and contains(., "2")]`,
      { timeout: 5000 }
    ).catch(() => null);
    
    const defendantRowExists = await page.waitForSelector(
      `xpath///tr[contains(., "${partiesData.defendant.name}") and contains(., "1")]`,
      { timeout: 5000 }
    ).catch(() => null);
    
    if (!companyRowExists || !khamisRowExists || !defendantRowExists) {
      logger.warning('⚠️ تحذير: لم يتم التحقق من ترتيب الأطراف بشكل كامل');
    } else {
      logger.success('✅ ترتيب الأطراف صحيح');
    }
    
    // النقر على "التالي"
    await sleep(1000);
    await clickXPath(page, SELECTORS.nextButton);
    await sleep(2000);
    
    logger.success('✅ تم إكمال المرحلة 2');
    return true;
  } catch (error) {
    logger.error('فشلت المرحلة 2', { error: error.message });
    throw error;
  }
}
