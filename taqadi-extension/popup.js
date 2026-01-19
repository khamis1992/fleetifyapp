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
    
    const savedAt = new Date(data.lawsuitData.savedAt);
    const now = new Date();
    const diffMinutes = Math.round((now - savedAt) / 1000 / 60);
    statusDetails.textContent = `تم الحفظ منذ ${diffMinutes} دقيقة`;
    
    // عرض معاينة البيانات
    dataPreview.style.display = 'block';
    
    const texts = data.lawsuitData.texts || data.lawsuitData;
    document.getElementById('caseTitle').textContent = texts.title || texts.caseTitle || '-';
    document.getElementById('amount').textContent = texts.amount || data.lawsuitData.amounts?.total 
      ? `${texts.amount || data.lawsuitData.amounts?.total} ر.ق` 
      : '-';
    document.getElementById('defendant').textContent = data.lawsuitData.defendant?.name || '-';
    
    fillBtn.disabled = false;
  } else {
    statusBox.classList.remove('has-data');
    statusBox.classList.add('no-data');
    statusIcon.textContent = '❌';
    statusText.textContent = 'لا توجد بيانات محفوظة';
    statusDetails.textContent = 'افتح صفحة تجهيز الدعوى واضغط "رفع تلقائي إلى تقاضي"';
    
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
  const tabs = await chrome.tabs.query({ url: ['https://www.alaraf.online/*', 'https://alaraf.online/*'] });
  
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
  // محاولة قراءة البيانات من localStorage أولاً
  try {
    const storedData = localStorage.getItem('alarafLawsuitDataFull');
    if (storedData) {
      const parsed = JSON.parse(storedData);
      console.log('📋 تم استخراج البيانات من localStorage');
      return parsed;
    }
  } catch (e) {
    console.log('⚠️ فشل قراءة localStorage:', e);
  }
  
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
  const nameMatch = document.body.innerText.match(/الاسم:\s*([^\n]+)/);
  if (nameMatch) data.defendantName = nameMatch[1].trim();
  
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
  
  // إرسال البيانات للـ content script
  try {
    await chrome.tabs.sendMessage(taqadiTab.id, {
      action: 'fillForm',
      data: data.lawsuitData
    });
    
    // التبديل لتبويب تقاضي
    await chrome.tabs.update(taqadiTab.id, { active: true });
    
    document.getElementById('statusText').textContent = 'تم إرسال البيانات! ✅';
  } catch (error) {
    console.error('Error filling form:', error);
    
    // محاولة حقن content script وإعادة المحاولة
    try {
      await chrome.scripting.executeScript({
        target: { tabId: taqadiTab.id },
        files: ['content.js']
      });
      
      await chrome.tabs.sendMessage(taqadiTab.id, {
        action: 'fillForm',
        data: data.lawsuitData
      });
      
      await chrome.tabs.update(taqadiTab.id, { active: true });
      document.getElementById('statusText').textContent = 'تم إرسال البيانات! ✅';
    } catch (e) {
      alert('فشل في ملء النموذج. تأكد من فتح صفحة إنشاء الدعوى في تقاضي.');
    }
  }
}
