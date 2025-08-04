#!/bin/bash

# FleetifyApp Legal AI API Startup Script

echo "🚀 بدء تشغيل FleetifyApp Legal AI API..."
echo "=================================="

# التحقق من Python
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 غير مثبت"
    exit 1
fi

echo "✅ Python 3 متوفر"

# التحقق من pip
if ! command -v pip3 &> /dev/null; then
    echo "❌ pip3 غير مثبت"
    exit 1
fi

echo "✅ pip3 متوفر"

# الانتقال لمجلد API
cd "$(dirname "$0")"

# تثبيت المتطلبات
echo "📦 تثبيت المتطلبات..."
pip3 install -r requirements.txt

if [ $? -ne 0 ]; then
    echo "❌ فشل في تثبيت المتطلبات"
    exit 1
fi

echo "✅ تم تثبيت المتطلبات بنجاح"

# إنشاء مجلد البيانات
mkdir -p data
echo "✅ تم إنشاء مجلد البيانات"

# تعيين متغيرات البيئة الافتراضية
export FLASK_ENV=production
export FLASK_DEBUG=False

# عرض معلومات التشغيل
echo ""
echo "🌐 معلومات الخادم:"
echo "   العنوان: http://localhost:5001"
echo "   الصحة: http://localhost:5001/health"
echo "   الإحصائيات: http://localhost:5001/stats"
echo ""
echo "🔧 الإعدادات:"
echo "   البيئة: $FLASK_ENV"
echo "   التصحيح: $FLASK_DEBUG"
echo "   OpenAI API: ${OPENAI_API_KEY:+✅ متوفر}${OPENAI_API_KEY:-❌ غير متوفر}"
echo ""
echo "📝 للإيقاف: اضغط Ctrl+C"
echo "=================================="
echo ""

# تشغيل API
python3 fleetify_legal_api.py

