// Bookmarklet لملء نموذج تقاضي تلقائياً
// يجب تشغيله في صفحة تقاضي بعد تسجيل الدخول

(function() {
  'use strict';
  
  // جلب البيانات من localStorage
  const dataStr = localStorage.getItem('alarafLawsuitDataFull');
  
  if (!dataStr) {
    alert('❌ لم يتم العثور على بيانات الدعوى!\n\nيرجى الذهاب إلى صفحة تجهيز الدعوى في العراف والضغط على زر "رفع تلقائي إلى تقاضي" أولاً.');
    return;
  }
  
  let data;
  try {
    data = JSON.parse(dataStr);
  } catch (e) {
    alert('❌ خطأ في قراءة البيانات!');
    return;
  }
  
  console.log('📋 بيانات الدعوى:', data);
  
  // دالة للبحث عن حقل وملئه
  function fillField(selectors, value, fieldName) {
    if (!value) {
      console.log(`⚠️ ${fieldName}: لا توجد قيمة`);
      return false;
    }
    
    for (const selector of selectors) {
      const elements = document.querySelectorAll(selector);
      for (const el of elements) {
        if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA')) {
          el.value = value;
          el.dispatchEvent(new Event('input', { bubbles: true }));
          el.dispatchEvent(new Event('change', { bubbles: true }));
          console.log(`✅ ${fieldName}: تم الملء بنجاح`);
          return true;
        }
      }
    }
    console.log(`❌ ${fieldName}: لم يتم العثور على الحقل`);
    return false;
  }
  
  // دالة للبحث عن حقل بالـ label
  function fillByLabel(labelText, value, fieldName) {
    if (!value) return false;
    
    const labels = document.querySelectorAll('label');
    for (const label of labels) {
      if (label.textContent.includes(labelText)) {
        // البحث عن الحقل المرتبط
        const forId = label.getAttribute('for');
        if (forId) {
          const input = document.getElementById(forId);
          if (input) {
            input.value = value;
            input.dispatchEvent(new Event('input', { bubbles: true }));
            input.dispatchEvent(new Event('change', { bubbles: true }));
            console.log(`✅ ${fieldName}: تم الملء بنجاح (via label)`);
            return true;
          }
        }
        // البحث عن الحقل التالي
        const nextInput = label.nextElementSibling;
        if (nextInput && (nextInput.tagName === 'INPUT' || nextInput.tagName === 'TEXTAREA')) {
          nextInput.value = value;
          nextInput.dispatchEvent(new Event('input', { bubbles: true }));
          nextInput.dispatchEvent(new Event('change', { bubbles: true }));
          console.log(`✅ ${fieldName}: تم الملء بنجاح (via sibling)`);
          return true;
        }
        // البحث داخل الـ parent
        const parent = label.parentElement;
        if (parent) {
          const input = parent.querySelector('input, textarea');
          if (input) {
            input.value = value;
            input.dispatchEvent(new Event('input', { bubbles: true }));
            input.dispatchEvent(new Event('change', { bubbles: true }));
            console.log(`✅ ${fieldName}: تم الملء بنجاح (via parent)`);
            return true;
          }
        }
      }
    }
    return false;
  }
  
  // دالة للبحث عن حقل بالـ placeholder
  function fillByPlaceholder(placeholderText, value, fieldName) {
    if (!value) return false;
    
    const inputs = document.querySelectorAll('input, textarea');
    for (const input of inputs) {
      const placeholder = input.getAttribute('placeholder') || '';
      if (placeholder.includes(placeholderText)) {
        input.value = value;
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
        console.log(`✅ ${fieldName}: تم الملء بنجاح (via placeholder)`);
        return true;
      }
    }
    return false;
  }
  
  // محاولة ملء الحقول
  let filledCount = 0;
  
  // عنوان الدعوى
  if (fillByLabel('عنوان', data.title, 'عنوان الدعوى') ||
      fillByPlaceholder('عنوان', data.title, 'عنوان الدعوى') ||
      fillField(['input[name*="title"]', 'input[name*="subject"]', '#title', '#subject'], data.title, 'عنوان الدعوى')) {
    filledCount++;
  }
  
  // الوقائع
  if (fillByLabel('وقائع', data.facts, 'الوقائع') ||
      fillByLabel('الوقائع', data.facts, 'الوقائع') ||
      fillByPlaceholder('وقائع', data.facts, 'الوقائع') ||
      fillField(['textarea[name*="fact"]', 'textarea[name*="detail"]', '#facts', '#details'], data.facts, 'الوقائع')) {
    filledCount++;
  }
  
  // الطلبات
  if (fillByLabel('طلبات', data.claims, 'الطلبات') ||
      fillByLabel('الطلبات', data.claims, 'الطلبات') ||
      fillByPlaceholder('طلبات', data.claims, 'الطلبات') ||
      fillField(['textarea[name*="claim"]', 'textarea[name*="request"]', '#claims', '#requests'], data.claims, 'الطلبات')) {
    filledCount++;
  }
  
  // المبلغ
  if (fillByLabel('مبلغ', data.amount, 'المبلغ') ||
      fillByLabel('المبلغ', data.amount, 'المبلغ') ||
      fillByPlaceholder('مبلغ', data.amount, 'المبلغ') ||
      fillField(['input[name*="amount"]', 'input[name*="value"]', 'input[type="number"]', '#amount'], data.amount, 'المبلغ')) {
    filledCount++;
  }
  
  // المبلغ كتابة
  if (fillByLabel('كتابة', data.amountInWords, 'المبلغ كتابة') ||
      fillByLabel('بالحروف', data.amountInWords, 'المبلغ كتابة') ||
      fillByPlaceholder('كتابة', data.amountInWords, 'المبلغ كتابة') ||
      fillField(['input[name*="word"]', 'input[name*="text"]', '#amountWords'], data.amountInWords, 'المبلغ كتابة')) {
    filledCount++;
  }
  
  // عرض النتيجة
  if (filledCount > 0) {
    alert(`✅ تم ملء ${filledCount} حقول بنجاح!\n\nيرجى مراجعة البيانات والتأكد من صحتها قبل الإرسال.\n\n📋 البيانات:\n- العنوان: ${data.title || 'غير متوفر'}\n- المبلغ: ${data.amount || 'غير متوفر'}`);
  } else {
    // محاولة عرض البيانات للنسخ اليدوي
    const copyText = `عنوان الدعوى:\n${data.title}\n\nالوقائع:\n${data.facts}\n\nالطلبات:\n${data.claims}\n\nالمبلغ:\n${data.amount}\n\nالمبلغ كتابة:\n${data.amountInWords}`;
    
    const result = confirm('⚠️ لم يتم التعرف على حقول النموذج تلقائياً.\n\nهل تريد نسخ البيانات للصق اليدوي؟');
    if (result) {
      navigator.clipboard.writeText(copyText).then(() => {
        alert('✅ تم نسخ البيانات!\n\nيمكنك الآن لصقها في الحقول المناسبة.');
      }).catch(() => {
        // طريقة بديلة للنسخ
        const textarea = document.createElement('textarea');
        textarea.value = copyText;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        alert('✅ تم نسخ البيانات!\n\nيمكنك الآن لصقها في الحقول المناسبة.');
      });
    }
  }
  
  console.log('🏁 انتهى تنفيذ Bookmarklet');
})();
