# دليل النشر والتشغيل - المستشار القانوني الذكي v2.0

## متطلبات النظام

### الحد الأدنى للمتطلبات
- **المعالج**: 2 CPU cores
- **الذاكرة**: 4GB RAM
- **التخزين**: 20GB مساحة حرة
- **نظام التشغيل**: Ubuntu 20.04+ أو أي توزيعة Linux حديثة

### المتطلبات الموصى بها
- **المعالج**: 4+ CPU cores
- **الذاكرة**: 8GB+ RAM
- **التخزين**: 50GB+ SSD
- **الشبكة**: اتصال إنترنت مستقر

### المتطلبات البرمجية
- Python 3.11+
- Docker 20.10+ (اختياري)
- Docker Compose 2.0+ (اختياري)
- Redis 6.0+
- PostgreSQL 13+ (Supabase)

## طرق النشر

### 1. النشر المباشر (Direct Deployment)

#### الخطوة 1: إعداد البيئة

```bash
# تحديث النظام
sudo apt update && sudo apt upgrade -y

# تثبيت Python 3.11
sudo apt install python3.11 python3.11-venv python3.11-dev -y

# تثبيت Redis
sudo apt install redis-server -y
sudo systemctl enable redis-server
sudo systemctl start redis-server

# تثبيت أدوات إضافية
sudo apt install git curl wget nginx -y
```

#### الخطوة 2: تحضير المشروع

```bash
# إنشاء مستخدم للتطبيق
sudo useradd -m -s /bin/bash legalai
sudo su - legalai

# استنساخ المشروع
git clone https://github.com/khamis1992/fleetifyapp.git
cd fleetifyapp/src/api/legal-ai-v2

# إنشاء البيئة الافتراضية
python3.11 -m venv venv
source venv/bin/activate

# تثبيت المتطلبات
pip install --upgrade pip
pip install -r requirements.txt
```

#### الخطوة 3: إعداد التكوين

```bash
# إنشاء ملف البيئة
cat > .env << EOF
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
REDIS_HOST=localhost
REDIS_PORT=6379
DEBUG=false
HOST=0.0.0.0
PORT=8000
ENCRYPTION_KEY=$(python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())")
EOF

# تأمين الملف
chmod 600 .env
```

#### الخطوة 4: اختبار التشغيل

```bash
# تشغيل الاختبارات
python run_tests.py

# تشغيل الخادم للاختبار
python api_endpoints.py

# في terminal آخر، اختبار الاتصال
curl http://localhost:8000/api/legal-ai/health
```

#### الخطوة 5: إعداد خدمة النظام

```bash
# إنشاء ملف الخدمة
sudo tee /etc/systemd/system/legal-ai.service << EOF
[Unit]
Description=Legal AI Service
After=network.target redis.service

[Service]
Type=simple
User=legalai
Group=legalai
WorkingDirectory=/home/legalai/fleetifyapp/src/api/legal-ai-v2
Environment=PATH=/home/legalai/fleetifyapp/src/api/legal-ai-v2/venv/bin
ExecStart=/home/legalai/fleetifyapp/src/api/legal-ai-v2/venv/bin/python api_endpoints.py
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
EOF

# تفعيل وتشغيل الخدمة
sudo systemctl daemon-reload
sudo systemctl enable legal-ai
sudo systemctl start legal-ai

# فحص الحالة
sudo systemctl status legal-ai
```

### 2. النشر باستخدام Docker

#### الخطوة 1: إعداد Docker

```bash
# تثبيت Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# تثبيت Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# إعادة تسجيل الدخول لتفعيل مجموعة docker
exit
# سجل دخول مرة أخرى
```

#### الخطوة 2: إعداد المشروع

```bash
# استنساخ المشروع
git clone https://github.com/khamis1992/fleetifyapp.git
cd fleetifyapp/src/api/legal-ai-v2

# إعداد متغيرات البيئة
cp .env.example .env
# عدل الملف حسب بيئتك
nano .env
```

#### الخطوة 3: بناء وتشغيل الحاويات

```bash
# بناء الصورة
docker build -t legal-ai:v2.0 .

# تشغيل الخدمات
docker-compose up -d

# فحص الحالة
docker-compose ps
docker-compose logs legal-ai
```

#### الخطوة 4: اختبار النشر

```bash
# اختبار صحة الخدمة
curl http://localhost:8000/api/legal-ai/health

# اختبار حالة النظام
curl http://localhost:8000/api/legal-ai/status
```

### 3. النشر السحابي

#### AWS EC2

```bash
# إنشاء instance
aws ec2 run-instances \
  --image-id ami-0c02fb55956c7d316 \
  --instance-type t3.medium \
  --key-name your-key-pair \
  --security-group-ids sg-xxxxxxxxx \
  --subnet-id subnet-xxxxxxxxx

# الاتصال بالـ instance
ssh -i your-key.pem ubuntu@your-instance-ip

# اتبع خطوات النشر المباشر أو Docker
```

#### Google Cloud Platform

```bash
# إنشاء VM instance
gcloud compute instances create legal-ai-vm \
  --image-family=ubuntu-2004-lts \
  --image-project=ubuntu-os-cloud \
  --machine-type=e2-medium \
  --zone=us-central1-a

# الاتصال بالـ VM
gcloud compute ssh legal-ai-vm --zone=us-central1-a

# اتبع خطوات النشر
```

## إعداد Nginx كـ Reverse Proxy

### إعداد Nginx

```bash
# تثبيت Nginx
sudo apt install nginx -y

# إنشاء تكوين الموقع
sudo tee /etc/nginx/sites-available/legal-ai << EOF
server {
    listen 80;
    server_name your-domain.com;

    location /api/legal-ai/ {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        
        # WebSocket support
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Static files (if needed)
    location /static/ {
        alias /home/legalai/fleetifyapp/src/api/legal-ai-v2/static/;
        expires 30d;
    }
}
EOF

# تفعيل الموقع
sudo ln -s /etc/nginx/sites-available/legal-ai /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### إعداد SSL مع Let's Encrypt

```bash
# تثبيت Certbot
sudo apt install certbot python3-certbot-nginx -y

# الحصول على شهادة SSL
sudo certbot --nginx -d your-domain.com

# تجديد تلقائي
sudo crontab -e
# أضف هذا السطر:
# 0 12 * * * /usr/bin/certbot renew --quiet
```

## المراقبة والسجلات

### إعداد السجلات

```bash
# إنشاء مجلد السجلات
sudo mkdir -p /var/log/legal-ai
sudo chown legalai:legalai /var/log/legal-ai

# إعداد logrotate
sudo tee /etc/logrotate.d/legal-ai << EOF
/var/log/legal-ai/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    create 0644 legalai legalai
    postrotate
        systemctl reload legal-ai
    endscript
}
EOF
```

### مراقبة الأداء

```bash
# تثبيت htop لمراقبة النظام
sudo apt install htop -y

# مراقبة استخدام الذاكرة
free -h

# مراقبة استخدام القرص
df -h

# مراقبة العمليات
ps aux | grep legal-ai
```

### فحص الحالة التلقائي

```bash
# إنشاء سكريبت فحص الحالة
cat > /home/legalai/health_check.sh << 'EOF'
#!/bin/bash

HEALTH_URL="http://localhost:8000/api/legal-ai/health"
RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" $HEALTH_URL)

if [ $RESPONSE -eq 200 ]; then
    echo "$(date): Service is healthy"
else
    echo "$(date): Service is unhealthy (HTTP $RESPONSE)"
    # إعادة تشغيل الخدمة
    sudo systemctl restart legal-ai
    echo "$(date): Service restarted"
fi
EOF

chmod +x /home/legalai/health_check.sh

# إضافة إلى crontab للفحص كل 5 دقائق
crontab -e
# أضف: */5 * * * * /home/legalai/health_check.sh >> /var/log/legal-ai/health_check.log 2>&1
```

## النسخ الاحتياطي والاستعادة

### النسخ الاحتياطي

```bash
# سكريبت النسخ الاحتياطي
cat > /home/legalai/backup.sh << 'EOF'
#!/bin/bash

BACKUP_DIR="/home/legalai/backups"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR

# نسخ احتياطي للكود
tar -czf $BACKUP_DIR/code_$DATE.tar.gz \
    /home/legalai/fleetifyapp/src/api/legal-ai-v2 \
    --exclude='venv' \
    --exclude='__pycache__' \
    --exclude='*.pyc'

# نسخ احتياطي للتكوين
cp /home/legalai/fleetifyapp/src/api/legal-ai-v2/.env $BACKUP_DIR/env_$DATE

# نسخ احتياطي للسجلات
tar -czf $BACKUP_DIR/logs_$DATE.tar.gz /var/log/legal-ai/

# حذف النسخ القديمة (أكثر من 30 يوم)
find $BACKUP_DIR -name "*.tar.gz" -mtime +30 -delete
find $BACKUP_DIR -name "env_*" -mtime +30 -delete

echo "$(date): Backup completed"
EOF

chmod +x /home/legalai/backup.sh

# جدولة النسخ الاحتياطي اليومي
crontab -e
# أضف: 0 2 * * * /home/legalai/backup.sh >> /var/log/legal-ai/backup.log 2>&1
```

## التحديث والصيانة

### تحديث النظام

```bash
# سكريبت التحديث
cat > /home/legalai/update.sh << 'EOF'
#!/bin/bash

cd /home/legalai/fleetifyapp/src/api/legal-ai-v2

# إيقاف الخدمة
sudo systemctl stop legal-ai

# تحديث الكود
git pull origin main

# تفعيل البيئة الافتراضية
source venv/bin/activate

# تحديث المتطلبات
pip install -r requirements.txt

# تشغيل الاختبارات
python run_tests.py

# إعادة تشغيل الخدمة
sudo systemctl start legal-ai

# فحص الحالة
sleep 5
curl http://localhost:8000/api/legal-ai/health

echo "$(date): Update completed"
EOF

chmod +x /home/legalai/update.sh
```

### صيانة قاعدة البيانات

```bash
# تنظيف التخزين المؤقت
redis-cli FLUSHDB

# فحص اتصال قاعدة البيانات
python -c "
from real_database_connector import DatabaseConnector
from real_database_connector import DatabaseConfig
config = DatabaseConfig('url', 'key', 'localhost', 6379)
connector = DatabaseConnector(config)
print('Database connection:', connector.test_connection())
"
```

## استكشاف الأخطاء

### مشاكل شائعة

#### الخدمة لا تبدأ

```bash
# فحص السجلات
sudo journalctl -u legal-ai -f

# فحص المنافذ
sudo netstat -tlnp | grep 8000

# فحص الأذونات
ls -la /home/legalai/fleetifyapp/src/api/legal-ai-v2/
```

#### بطء في الاستجابة

```bash
# فحص استخدام الموارد
htop

# فحص اتصال قاعدة البيانات
redis-cli ping

# فحص السجلات للأخطاء
tail -f /var/log/legal-ai/app.log
```

#### أخطاء في معالجة النصوص العربية

```bash
# فحص التشفير
locale

# تثبيت دعم اللغة العربية
sudo apt install language-pack-ar -y
```

## الأمان

### تأمين الخادم

```bash
# تحديث النظام
sudo apt update && sudo apt upgrade -y

# إعداد جدار الحماية
sudo ufw enable
sudo ufw allow ssh
sudo ufw allow 80
sudo ufw allow 443

# تأمين SSH
sudo sed -i 's/#PasswordAuthentication yes/PasswordAuthentication no/' /etc/ssh/sshd_config
sudo systemctl restart ssh
```

### تأمين التطبيق

```bash
# تشفير ملف البيئة
chmod 600 .env

# إعداد كلمات مرور قوية
# تحديث ENCRYPTION_KEY في .env

# تفعيل HTTPS فقط في الإنتاج
# تحديث DEBUG=false في .env
```

---

*آخر تحديث: أغسطس 2025*
*الإصدار: 2.0.0*

