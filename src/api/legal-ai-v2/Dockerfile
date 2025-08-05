# استخدام Python 3.11 كصورة أساسية
FROM python:3.11-slim

# تحديد متغيرات البيئة
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV PYTHONPATH=/app

# تحديد مجلد العمل
WORKDIR /app

# تثبيت متطلبات النظام
RUN apt-get update && apt-get install -y \
    gcc \
    g++ \
    curl \
    && rm -rf /var/lib/apt/lists/*

# نسخ ملف المتطلبات
COPY requirements.txt .

# تثبيت المكتبات Python
RUN pip install --no-cache-dir --upgrade pip
RUN pip install --no-cache-dir -r requirements.txt

# نسخ ملفات التطبيق
COPY . .

# إنشاء مستخدم غير جذر للأمان
RUN useradd --create-home --shell /bin/bash app
RUN chown -R app:app /app
USER app

# كشف المنفذ
EXPOSE 8000

# فحص صحة الحاوية
HEALTHCHECK --interval=30s --timeout=30s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8000/api/legal-ai/health || exit 1

# أمر التشغيل
CMD ["python", "-m", "uvicorn", "api_endpoints:app", "--host", "0.0.0.0", "--port", "8000"]

