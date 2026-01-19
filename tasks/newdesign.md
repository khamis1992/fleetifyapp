<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>صفحة القيود المحاسبية</title>
    <!-- تحميل Tailwind CSS -->
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap" rel="stylesheet">
    <style>
        /* تعريف خط Inter والاحتفاظ بالنمط العربي */
        body {
            font-family: 'Inter', sans-serif;
            background-color: #f4f7f9; /* خلفية فاتحة نظيفة */
        }
        /* تعديل صغير لمدخلات التاريخ في المتصفحات التي لا تدعم dir="rtl" بشكل كامل للتأكد من اتجاه النص */
        input[type="date"] {
            text-align: right;
            direction: ltr;
        }
    </style>
</head>
<body class="p-4 md:p-8">

    <div id="app" class="max-w-6xl mx-auto space-y-8">

        <!-- العنوان والوصف -->
        <header class="text-right pb-4 border-b border-gray-200">
            <h1 class="text-3xl font-bold text-gray-800">القيود المحاسبية</h1>
            <p class="text-sm text-gray-500 mt-1">قائمة جميع القيود المحاسبية مع إمكانيات البحث والتصفية المتقدمة.</p>
        </header>

        <!-- لوحة التحكم (البحث والتصفية) -->
        <div class="bg-white p-6 rounded-xl shadow-md grid grid-cols-1 md:grid-cols-4 gap-4">
            
            <!-- البحث في القيود -->
            <div class="md:col-span-4 lg:col-span-1">
                <label for="search" class="sr-only">البحث في القيود</label>
                <div class="relative">
                    <input type="text" id="search" placeholder="البحث في القيود (البيان، الرقم...)" class="w-full pr-10 pl-4 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 transition duration-150" dir="rtl">
                    <svg class="absolute right-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
                </div>
            </div>

            <!-- من تاريخ -->
            <div class="lg:col-span-1">
                <label for="date-from" class="block text-sm font-medium text-gray-700 mb-1">من تاريخ</label>
                <input type="date" id="date-from" class="w-full p-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 transition duration-150">
            </div>

            <!-- إلى تاريخ -->
            <div class="lg:col-span-1">
                <label for="date-to" class="block text-sm font-medium text-gray-700 mb-1">إلى تاريخ</label>
                <input type="date" id="date-to" class="w-full p-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 transition duration-150">
            </div>

            <!-- حالة القيد -->
            <div class="lg:col-span-1">
                <label for="status-filter" class="block text-sm font-medium text-gray-700 mb-1">تصفية حسب الحالة</label>
                <select id="status-filter" class="w-full p-2 border border-gray-300 bg-white rounded-lg focus:ring-indigo-500 focus:border-indigo-500 transition duration-150 appearance-none custom-select">
                    <option value="">جميع الحالات</option>
                    <option value="posted">مرحل</option>
                    <option value="draft">مسودة</option>
                    <option value="pending">معلق</option>
                </select>
            </div>
            
        </div>

        <!-- قائمة القيود المحاسبية -->
        <section id="entry-list" class="space-y-4">
            <!-- سيتم إضافة بطاقات القيود هنا بواسطة الجافاسكريبت -->
        </section>
    </div>

    <script>
        // بيانات القيود المحاسبية (بيانات وهمية)
        const entries = [
            {
                id: '000227',
                date: '2026-03-01',
                status: 'مرحل',
                narration: 'دفعة إيجار - إبراهيم حضر عبدالله',
                totalDebit: 1500.000,
                totalCredit: 1500.000,
                details: [
                    { code: '4510', account: 'مصاريف إيجار', debit: 1500.000, credit: 0.000, statement: 'إيجار شهر مارس' },
                    { code: '1110', account: 'الصندوق', debit: 0.000, credit: 1500.000, statement: 'دفع المبلغ نقداً' },
                ]
            },
            {
                id: '000226',
                date: '2026-02-01',
                status: 'مسودة',
                narration: 'فاتورة مبيعات شهر فبراير',
                totalDebit: 2500.000,
                totalCredit: 2500.000,
                details: [
                    { code: '1220', account: 'عملاء', debit: 2500.000, credit: 0.000, statement: 'قيد المبيعات الآجلة' },
                    { code: '3310', account: 'إيرادات مبيعات', debit: 0.000, credit: 2500.000, statement: 'الإيراد المحقق' },
                ]
            },
            {
                id: '000225',
                date: '2026-01-15',
                status: 'مرحل',
                narration: 'شراء أثاث مكتبي جديد',
                totalDebit: 5000.000,
                totalCredit: 5000.000,
                details: [
                    { code: '1530', account: 'أثاث ومعدات', debit: 5000.000, credit: 0.000, statement: 'شراء أثاث' },
                    { code: '1120', account: 'البنك', debit: 0.000, credit: 5000.000, statement: 'دفع المبلغ بشيك' },
                ]
            }
        ];

        /**
         * تنسيق الأرقام كعملة (دينار كويتي وهمي)
         * @param {number} amount
         * @returns {string}
         */
        const formatCurrency = (amount) => {
            if (typeof amount !== 'number') return '0.000 د.ك';
            return amount.toFixed(3).replace(/\B(?=(\d{3})+(?!\d))/g, ",") + ' د.ك';
        };

        /**
         * الحصول على فئة اللون للحالة
         * @param {string} status
         * @returns {string}
         */
        const getStatusClass = (status) => {
            switch (status) {
                case 'مرحل':
                    return 'bg-green-100 text-green-800';
                case 'مسودة':
                    return 'bg-yellow-100 text-yellow-800';
                case 'معلق':
                    return 'bg-blue-100 text-blue-800';
                default:
                    return 'bg-gray-100 text-gray-800';
            }
        };

        /**
         * إنشاء HTML لبطاقة القيد
         * @param {object} entry
         * @returns {string}
         */
        const createEntryCard = (entry) => {
            const statusClass = getStatusClass(entry.status);

            // إنشاء جدول تفاصيل القيد
            const detailsTable = `
                <div class="overflow-x-auto mt-4 pt-4 border-t border-gray-200">
                    <table class="min-w-full divide-y divide-gray-200 text-sm">
                        <thead>
                            <tr class="text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50">
                                <th class="px-6 py-3 text-right">رمز الحساب</th>
                                <th class="px-6 py-3 text-right">اسم الحساب</th>
                                <th class="px-6 py-3 text-right">البيان</th>
                                <th class="px-6 py-3 text-right">مدين</th>
                                <th class="px-6 py-3 text-right">دائن</th>
                            </tr>
                        </thead>
                        <tbody class="bg-white divide-y divide-gray-200">
                            ${entry.details.map(detail => `
                                <tr class="hover:bg-gray-50">
                                    <td class="px-6 py-4 whitespace-nowrap text-gray-500">${detail.code}</td>
                                    <td class="px-6 py-4 whitespace-nowrap text-gray-900">${detail.account}</td>
                                    <td class="px-6 py-4 text-gray-600">${detail.statement}</td>
                                    <td class="px-6 py-4 whitespace-nowrap text-green-600 font-semibold">${formatCurrency(detail.debit)}</td>
                                    <td class="px-6 py-4 whitespace-nowrap text-red-600 font-semibold">${formatCurrency(detail.credit)}</td>
                                </tr>
                            `).join('')}
                            <!-- صف المجموع -->
                            <tr class="bg-indigo-50 font-bold">
                                <td class="px-6 py-3 text-base text-gray-800" colspan="3">المجموع</td>
                                <td class="px-6 py-3 whitespace-nowrap text-green-700 text-base">${formatCurrency(entry.totalDebit)}</td>
                                <td class="px-6 py-3 whitespace-nowrap text-red-700 text-base">${formatCurrency(entry.totalCredit)}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            `;

            return `
                <div id="entry-${entry.id}" class="bg-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300">
                    
                    <!-- ملخص القيد (الرأس) -->
                    <div class="p-5 flex flex-col md:flex-row justify-between items-start md:items-center border-b border-gray-100 cursor-pointer" onclick="toggleDetails('${entry.id}')">
                        
                        <!-- معلومات القيد الأساسية -->
                        <div class="flex flex-col md:flex-row md:items-center space-y-2 md:space-y-0 md:space-x-8 md:space-x-reverse">
                            <h2 class="text-lg font-bold text-indigo-600">سند قيد رقم: ${entry.id}</h2>
                            <span class="text-sm font-medium ${statusClass} px-3 py-1 rounded-full whitespace-nowrap">${entry.status}</span>
                            <p class="text-sm text-gray-600 flex items-center">
                                <svg class="ml-1 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
                                التاريخ: ${entry.date}
                            </p>
                        </div>
                        
                        <!-- الإجمالي وزر التفاصيل -->
                        <div class="mt-4 md:mt-0 flex items-center space-x-4 space-x-reverse">
                            <div class="text-sm text-gray-700 text-right">
                                <p>إجمالي المدين: <span class="font-semibold text-green-600">${formatCurrency(entry.totalDebit)}</span></p>
                                <p>إجمالي الدائن: <span class="font-semibold text-red-600">${formatCurrency(entry.totalCredit)}</span></p>
                            </div>

                            <button id="btn-${entry.id}" class="flex items-center text-indigo-600 hover:text-indigo-800 font-semibold transition duration-150">
                                <span class="mr-1">عرض التفاصيل</span>
                                <svg class="w-5 h-5 transform transition-transform duration-300" id="icon-${entry.id}" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>
                            </button>
                        </div>
                    </div>

                    <!-- التفاصيل الكاملة (مخفية) -->
                    <div id="details-${entry.id}" class="hidden p-5 bg-gray-50 rounded-b-xl">
                        <p class="text-gray-700 font-medium text-right mb-4">البيان: <span class="font-normal">${entry.narration}</span></p>
                        ${detailsTable}
                        
                        <div class="mt-4 text-center">
                            <button class="text-sm text-blue-500 hover:underline">معاينة عكس القيد</button>
                        </div>
                    </div>
                </div>
            `;
        };

        /**
         * رسم قائمة القيود
         */
        const renderEntryList = () => {
            const listContainer = document.getElementById('entry-list');
            listContainer.innerHTML = entries.map(createEntryCard).join('');
        };

        /**
         * تبديل عرض تفاصيل القيد
         * @param {string} entryId
         */
        window.toggleDetails = (entryId) => {
            const detailsElement = document.getElementById(`details-${entryId}`);
            const iconElement = document.getElementById(`icon-${entryId}`);
            
            if (detailsElement.classList.contains('hidden')) {
                // إظهار التفاصيل
                detailsElement.classList.remove('hidden');
                iconElement.classList.add('rotate-180');
            } else {
                // إخفاء التفاصيل
                detailsElement.classList.add('hidden');
                iconElement.classList.remove('rotate-180');
            }
        };

        // تشغيل العرض عند تحميل الصفحة
        document.addEventListener('DOMContentLoaded', renderEntryList);
    </script>
</body>
</html>
