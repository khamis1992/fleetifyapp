// تحميل البيانات المحفوظة عند فتح الـ popup
document.addEventListener('DOMContentLoaded', async () => {
  await checkStoredData();
  
  // ربط الأزرار
  document.getElementById('fillBtn').addEventListener('click', fillForm);
  document.getElementById('openTaqadi').addEventListener('click', openTaqadi);
  document.getElementById('loadData').addEventListener('click', loadDataFromAlaraf);
});

// التحقق من البيانات المحفوظة
async function checkStoredData() {
  const data = await chrome.storage.local.get(['lawsuitData']);
  const statusBox = document.getElementById('statusBox');
  const statusIcon = document.getElementById('statusIcon');
  const statusText = document.getElementById('statusText');
  const statusDetails = document.getElementById('statusDetails');
  const dataPreview = document.getElementById('dataPreview');
  const fillBtn = document.getElementById('fillBtn');
  
  if (data.lawsuitData) {
    statusBox.classList.remove('no-data');
    statusBox.classList.add('has-data');
    statusIcon.textContent = '✅';
    statusText.textContent = 'بيانات الدعوى جاهزة!';
    statusDetails.textContent = `تم الحفظ: ${new Date(data.lawsuitData.savedAt).toLocaleString('ar-QA')}`;
    
    // عرض معاينة البيانات
    dataPreview.style.display = 'block';
    document.getElementById('caseTitle').textContent = data.lawsuitData.caseTitle || '-';
    document.getElementById('amount').textContent = data.lawsuitData.amount ? `${data.lawsuitData.amount} ر.ق` : '-';
    document.getElementById('defendant').textContent = data.lawsuitData.defendantName || '-';
    
    fillBtn.disabled = false;
  } else {
    statusBox.classList.remove('has-data');
    statusBox.classList.add('no-data');
    statusIcon.textContent = '❌';
    statusText.textContent = 'لا توجد بيانات محفوظة';
    statusDetails.textContent = 'افتح صفحة تجهيز الدعوى واضغط "تحديث البيانات"';
    
    dataPreview.style.display = 'none';
    fillBtn.disabled = true;
  }
}

// فتح موقع تقاضي
function openTaqadi() {
  chrome.tabs.create({ url: 'https://taqadi.sjc.gov.qa/itc/' });
}

// تحميل البيانات من صفحة العراف
async function loadDataFromAlaraf() {
  const statusText = document.getElementById('statusText');
  const statusIcon = document.getElementById('statusIcon');
  
  statusIcon.textContent = '⏳';
  statusText.textContent = 'جاري البحث عن صفحة العراف...';
  
  // البحث عن تبويب العراف المفتوح
  const tabs = await chrome.tabs.query({ url: 'https://www.alaraf.online/*' });
  
  if (tabs.length === 0) {
    statusIcon.textContent = '❌';
    statusText.textContent = 'لم يتم العثور على صفحة العراف';
    alert('يرجى فتح صفحة تجهيز الدعوى في نظام العراف أولاً');
    return;
  }
  
  // البحث عن صفحة تجهيز الدعوى
  const lawsuitTab = tabs.find(t => t.url.includes('/legal/lawsuit/prepare/'));
  
  if (!lawsuitTab) {
    statusIcon.textContent = '⚠️';
    statusText.textContent = 'افتح صفحة تجهيز الدعوى';
    alert('يرجى فتح صفحة "تجهيز الدعوى" في نظام العراف');
    return;
  }
  
  statusText.textContent = 'جاري استخراج البيانات...';
  
  // تنفيذ سكريبت لاستخراج البيانات
  try {
    const results = await chrome.scripting.executeScript({
      target: { tabId: lawsuitTab.id },
      func: extractLawsuitData
    });
    
    if (results && results[0] && results[0].result) {
      const lawsuitData = results[0].result;
      lawsuitData.savedAt = new Date().toISOString();
      
      await chrome.storage.local.set({ lawsuitData });
      
      statusIcon.textContent = '✅';
      statusText.textContent = 'تم حفظ البيانات بنجاح!';
      
      await checkStoredData();
    } else {
      throw new Error('فشل في استخراج البيانات');
    }
  } catch (error) {
    statusIcon.textContent = '❌';
    statusText.textContent = 'فشل في استخراج البيانات';
    console.error('Error extracting data:', error);
    alert('فشل في استخراج البيانات. تأكد من فتح صفحة تجهيز الدعوى.');
  }
}

// دالة استخراج البيانات (تُنفذ في صفحة العراف)
function extractLawsuitData() {
  // البحث عن حقول البيانات في الصفحة
  const data = {};
  
  // استخراج عنوان الدعوى
  const titleInput = document.querySelector('input[value*="مطالبة مالية"]') || 
                     document.querySelector('textarea[placeholder*="عنوان"]') ||
                     Array.from(document.querySelectorAll('input, textarea')).find(el => 
                       el.value && el.value.includes('مطالبة') && el.value.length < 60
                     );
  if (titleInput) data.caseTitle = titleInput.value;
  
  // استخراج الوقائع
  const factsInput = Array.from(document.querySelectorAll('textarea')).find(el => 
    el.value && el.value.includes('أبرمت شركة العراف')
  );
  if (factsInput) data.facts = factsInput.value;
  
  // استخراج الطلبات
  const requestsInput = Array.from(document.querySelectorAll('textarea')).find(el => 
    el.value && el.value.includes('إلزام المدعى عليه')
  );
  if (requestsInput) data.requests = requestsInput.value;
  
  // استخراج المبلغ
  const amountInput = Array.from(document.querySelectorAll('input')).find(el => 
    el.value && /^\d+$/.test(el.value) && el.value.length >= 4
  );
  if (amountInput) data.amount = amountInput.value;
  
  // استخراج المبلغ كتابةً
  const amountTextInput = Array.from(document.querySelectorAll('input, textarea')).find(el => 
    el.value && el.value.includes('ريال قطري') && el.value.length < 100
  );
  if (amountTextInput) data.amountText = amountTextInput.value;
  
  // استخراج اسم المدعى عليه من الصفحة
  const defendantElement = Array.from(document.querySelectorAll('div, span, p')).find(el => 
    el.textContent && el.textContent.includes('الاسم:') && el.nextElementSibling
  );
  if (defendantElement && defendantElement.nextElementSibling) {
    data.defendantName = defendantElement.nextElementSibling.textContent.trim();
  }
  
  // محاولة أخرى للحصول على اسم المدعى عليه
  if (!data.defendantName) {
    const nameMatch = document.body.innerText.match(/الاسم:\s*([^\n]+)/);
    if (nameMatch) data.defendantName = nameMatch[1].trim();
  }
  
  return data;
}

// ملء النموذج في تقاضي
async function fillForm() {
  const data = await chrome.storage.local.get(['lawsuitData']);
  
  if (!data.lawsuitData) {
    alert('لا توجد بيانات محفوظة!');
    return;
  }
  
  // البحث عن تبويب تقاضي
  const tabs = await chrome.tabs.query({ url: 'https://taqadi.sjc.gov.qa/*' });
  
  if (tabs.length === 0) {
    alert('يرجى فتح موقع تقاضي أولاً');
    openTaqadi();
    return;
  }
  
  const taqadiTab = tabs[0];
  
  // تنفيذ سكريبت الملء
  try {
    await chrome.scripting.executeScript({
      target: { tabId: taqadiTab.id },
      func: fillTaqadiForm,
      args: [data.lawsuitData]
    });
    
    // التبديل لتبويب تقاضي
    await chrome.tabs.update(taqadiTab.id, { active: true });
    
    document.getElementById('statusText').textContent = 'تم ملء النموذج! ✅';
  } catch (error) {
    console.error('Error filling form:', error);
    alert('فشل في ملء النموذج. تأكد من فتح صفحة إنشاء الدعوى في تقاضي.');
  }
}

// دالة ملء النموذج (تُنفذ في صفحة تقاضي)
function fillTaqadiForm(data) {
  console.log('🚀 بدء ملء النموذج...', data);
  
  // دالة مساعدة لملء حقل
  function fillField(selector, value, fieldName) {
    if (!value) {
      console.log(`⚠️ لا توجد قيمة لـ ${fieldName}`);
      return false;
    }
    
    const field = document.querySelector(selector);
    if (field) {
      field.value = value;
      field.dispatchEvent(new Event('input', { bubbles: true }));
      field.dispatchEvent(new Event('change', { bubbles: true }));
      console.log(`✅ تم ملء ${fieldName}`);
      return true;
    } else {
      console.log(`❌ لم يتم العثور على حقل ${fieldName}: ${selector}`);
      return false;
    }
  }
  
  // دالة بحث عن حقل بعدة طرق
  function findAndFill(patterns, value, fieldName) {
    if (!value) return false;
    
    for (const pattern of patterns) {
      let field = null;
      
      if (pattern.startsWith('#') || pattern.startsWith('.') || pattern.startsWith('[')) {
        field = document.querySelector(pattern);
      } else {
        // البحث بالنص
        const labels = Array.from(document.querySelectorAll('label, span, div'));
        const label = labels.find(l => l.textContent.includes(pattern));
        if (label) {
          // البحث عن input/textarea قريب
          field = label.querySelector('input, textarea') ||
                  label.parentElement.querySelector('input, textarea') ||
                  label.nextElementSibling;
        }
      }
      
      if (field && (field.tagName === 'INPUT' || field.tagName === 'TEXTAREA')) {
        field.value = value;
        field.dispatchEvent(new Event('input', { bubbles: true }));
        field.dispatchEvent(new Event('change', { bubbles: true }));
        console.log(`✅ تم ملء ${fieldName} عبر: ${pattern}`);
        return true;
      }
    }
    
    console.log(`❌ لم يتم العثور على حقل ${fieldName}`);
    return false;
  }
  
  // ملء الحقول
  let filled = 0;
  
  // عنوان الدعوى
  if (findAndFill([
    '[name*="subject"]', '[name*="title"]', '[id*="subject"]', '[id*="title"]',
    'عنوان الدعوى', 'موضوع الدعوى', 'العنوان'
  ], data.caseTitle, 'عنوان الدعوى')) filled++;
  
  // الوقائع
  if (findAndFill([
    '[name*="facts"]', '[name*="description"]', '[id*="facts"]',
    'textarea[rows]', 'الوقائع', 'وصف الدعوى'
  ], data.facts, 'الوقائع')) filled++;
  
  // الطلبات
  if (findAndFill([
    '[name*="requests"]', '[name*="demands"]', '[id*="requests"]',
    'الطلبات', 'المطالب'
  ], data.requests, 'الطلبات')) filled++;
  
  // المبلغ
  if (findAndFill([
    '[name*="amount"]', '[name*="value"]', '[id*="amount"]', '[type="number"]',
    'المبلغ', 'قيمة المطالبة'
  ], data.amount, 'المبلغ')) filled++;
  
  // عرض رسالة
  if (filled > 0) {
    const notification = document.createElement('div');
    notification.innerHTML = `
      <div style="position: fixed; top: 20px; left: 50%; transform: translateX(-50%); 
                  background: linear-gradient(135deg, #22c55e, #16a34a); 
                  color: white; padding: 15px 30px; border-radius: 10px; 
                  font-size: 16px; z-index: 999999; box-shadow: 0 4px 20px rgba(0,0,0,0.3);
                  display: flex; align-items: center; gap: 10px;">
        <span style="font-size: 24px;">✅</span>
        <span>تم ملء ${filled} حقول بنجاح! راجع البيانات قبل الاعتماد.</span>
      </div>
    `;
    document.body.appendChild(notification);
    setTimeout(() => notification.remove(), 5000);
  } else {
    alert('لم يتم العثور على حقول لملئها. تأكد من فتح صفحة إنشاء الدعوى الصحيحة.');
  }
  
  return filled;
}

