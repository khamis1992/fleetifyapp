import os
import matplotlib.pyplot as plt
import matplotlib.font_manager as fm
import numpy as np
import arabic_reshaper
from bidi.algorithm import get_display

def ar(text):
    reshaped = arabic_reshaper.reshape(text)
    return get_display(reshaped)

amiri_path = '/usr/share/fonts/opentype/fonts-hosny-amiri/Amiri-Regular.ttf'
amiri_bold = '/usr/share/fonts/opentype/fonts-hosny-amiri/Amiri-Bold.ttf'

prop = fm.FontProperties(fname=amiri_path, size=11)
prop_bold = fm.FontProperties(fname=amiri_bold, size=12)
prop_title = fm.FontProperties(fname=amiri_bold, size=14)

os.makedirs('/home/ubuntu/fleetifyapp/reports', exist_ok=True)

# Data 2023 - 2026
years = ['2023', '2024', '2025', '2026']

assets = [7.29, 12.47, 8.39, 7.45]
liabilities = [0.67, 2.79, 8.50, 7.63]
equity = [6.62, 9.68, -0.11, -0.18]

cash = [0.57, 1.22, 1.79, 1.64]
receivables = [0.45, 1.20, 1.60, 3.20]
fleet_net = [6.25, 10.02, 4.95, 2.54]

plt.style.use('seaborn-v0_8-whitegrid' if 'seaborn-v0_8-whitegrid' in plt.style.available else 'default')
fig, ((ax1, ax2), (ax3, ax4)) = plt.subplots(2, 2, figsize=(16, 12), dpi=200)
fig.patch.set_facecolor('#F8FAFC')

# 1. Assets vs Liabilities vs Equity
x = np.arange(len(years))
width = 0.25
r1 = ax1.bar(x - width, assets, width, label=ar('إجمالي الأصول (Assets)'), color='#1F4E78')
r2 = ax1.bar(x, liabilities, width, label=ar('إجمالي الالتزامات (Liabilities)'), color='#DC2626')
r3 = ax1.bar(x + width, equity, width, label=ar('حقوق الملكية (Equity)'), color='#16A34A')

ax1.set_title(ar('تطور المركز المالي: الأصول مقابل الالتزامات وحقوق الملكية (2023 - 2026)'), fontproperties=prop_title, pad=12, color='#0F172A')
ax1.set_ylabel(ar('مليون ريال قطري (Million QAR)'), fontproperties=prop_bold)
ax1.set_xticks(x)
ax1.set_xticklabels(years, fontsize=11, fontweight='bold')
ax1.legend(loc='upper right', prop=prop, frameon=True, facecolor='white')
ax1.axhline(0, color='black', linewidth=0.8, linestyle='--')

for rect in r1 + r2 + r3:
    h = rect.get_height()
    va = 'bottom' if h >= 0 else 'top'
    ax1.annotate(f'{h:.2f}M', xy=(rect.get_x() + rect.get_width() / 2, h),
                 xytext=(0, 3 if h >= 0 else -12),
                 textcoords='offset points', ha='center', va=va, fontsize=9.5, fontweight='bold')

# 2. Asset Breakdown
p1 = ax2.bar(years, cash, label=ar('النقد وما في حكمه (Cash & Bank)'), color='#0284C7')
p2 = ax2.bar(years, receivables, bottom=cash, label=ar('الذمم المدينة (Receivables)'), color='#F59E0B')
bottom_fleet = [c + r for c, r in zip(cash, receivables)]
p3 = ax2.bar(years, fleet_net, bottom=bottom_fleet, label=ar('صافي أسطول السيارات (Fleet Net)'), color='#10B981')

ax2.set_title(ar('هيكل الأصول التشغيلية وتطور بنودها عبر السنوات'), fontproperties=prop_title, pad=12, color='#0F172A')
ax2.set_ylabel(ar('مليون ريال قطري (Million QAR)'), fontproperties=prop_bold)
ax2.legend(loc='upper left', prop=prop, frameon=True, facecolor='white')
for idx, tot in enumerate(assets):
    ax2.annotate(f'{tot:.2f}M', xy=(idx, tot), xytext=(0, 4), textcoords='offset points', ha='center', fontweight='bold', fontsize=10)

# 3. Liabilities Structure 2026 (Donut chart)
cred_labels = [
    ar('المانع للسيارات (6.12M - 80.2%)'),
    ar('تأمينات ودفعات العملاء (1.37M - 17.9%)'),
    ar('شانجان إيلاف أوتو (0.08M - 1.1%)'),
    ar('التزامات أخرى (0.07M - 0.9%)')
]
cred_sizes = [6.118, 1.366, 0.081, 0.065]
colors = ['#DC2626', '#3B82F6', '#8B5CF6', '#94A3B8']
wedges, texts = ax3.pie(cred_sizes, labels=cred_labels, colors=colors, startangle=140,
                        textprops={'fontproperties': prop_bold}, wedgeprops=dict(width=0.45, edgecolor='white', linewidth=2))
ax3.set_title(ar('توزيع هيكل الدائنين والالتزامات القائمة كما في 2026'), fontproperties=prop_title, pad=12, color='#0F172A')

# 4. Cash Flow & Installments Paid
cf_years = ['2023', '2024', '2025', '2026']
cash_balances = [0.57, 1.22, 1.79, 1.64]
installments_paid_cum = [0.10, 0.95, 2.62, 3.29]

ax4.plot(cf_years, cash_balances, marker='o', linewidth=3.5, color='#0284C7', label=ar('رصيد الصندوق الدفتري (Book Cash)'))
ax4.plot(cf_years, installments_paid_cum, marker='s', linewidth=3.5, color='#DC2626', linestyle='--', label=ar('مسدد تراكمي أقساط السيارات (Installments Paid)'))
ax4.set_title(ar('مسار السيولة النقدية مقابل سداد أقساط تمويل السيارات'), fontproperties=prop_title, pad=12, color='#0F172A')
ax4.set_ylabel(ar('مليون ريال قطري (Million QAR)'), fontproperties=prop_bold)
ax4.legend(loc='center left', prop=prop, frameon=True, facecolor='white')
for i, txt in enumerate(cash_balances):
    ax4.annotate(f'{txt:.2f}M', (cf_years[i], cash_balances[i]), textcoords='offset points', xytext=(0,8), ha='center', fontweight='bold', color='#0284C7')
for i, txt in enumerate(installments_paid_cum):
    ax4.annotate(f'{txt:.2f}M', (cf_years[i], installments_paid_cum[i]), textcoords='offset points', xytext=(0,-16), ha='center', fontweight='bold', color='#DC2626')

plt.tight_layout(pad=3.0)
img_path = '/home/ubuntu/fleetifyapp/reports/financial_charts_2023_2026.png'
plt.savefig(img_path, dpi=200, facecolor=fig.get_facecolor(), edgecolor='none')
plt.close()
print('Chart image generated with Amiri Arabic font successfully:', img_path)
