# دليل النشر: نقي (Naqi) على خادم واحد

آخر تحديث: 2026-10-26

## الخلاصة

كل شيء يعمل على خادم VPS واحد عبر Docker Compose: الموقع (Next.js) والخلفية (FastAPI + yt-dlp + FFmpeg) وRedis وPostgres، وأمامها Caddy الذي يصدر شهادات HTTPS تلقائيًا.

تم التحقق في بيئة الاختبار (2026-10-26):

- بناء الواجهة ينجح، واختبارات الخلفية 48/48 تنجح.
- صورة Docker للموقع تُبنى وتعمل.
- الحزمة كاملة خلف Caddy اجتازت سكربت الفحص `scripts/smoke.sh` بنجاح (10 من 10): الصفحة الرئيسية والعربية، تحويل www وhttp، صحة الخلفية، عدم كشف المسارات الداخلية، حماية لوحة الإدارة، CORS، وأن الموقع يستخدم الخلفية الحقيقية لا البيانات التجريبية.
- لم يُختبر: بناء صورة الخلفية داخل Docker (بيئة الاختبار تمنع الوصول إلى مستودعات Debian، فشُغّلت الخلفية مباشرة بدلًا من ذلك)، والتنزيل من منصات حقيقية (بيئة الاختبار لا تصل إلى YouTube وغيره). كلاهما يُختبر على الخادم الحقيقي في الخطوة 6.

## لماذا خادم واحد بدل Vercel + VPS

- خطة Vercel المجانية لا تسمح بالاستخدام التجاري، وموقعنا تجاري.
- مكان واحد للتحديث والمراقبة، وفاتورة واحدة.
- الموقع والخلفية على نفس النطاق الأساسي (`naqi.example` و`api.naqi.example`)، فيعمل ملف تعريف الزائر وحد التنزيلات بلا تعقيد.
- الموقع ما زال يعمل على Vercel إن أردت لاحقًا: اضبط `NEXT_PUBLIC_API_BASE` هناك واحذف خدمة `web` من الملف.

## ما يلزم منك قبل البدء

| البند | الاقتراح | ملاحظة |
| --- | --- | --- |
| نطاق | `naqi.app` أو ما يتوفر | يجب فحص العلامة التجارية للاسم أولًا (راجع brand.md) |
| خادم VPS | 4 أنوية، 8 جيجابايت ذاكرة، Ubuntu 24.04 | الأهم حصة نقل البيانات: كل تنزيل يمر عبر الخادم مرتين (داخل وخارج). Hetzner مثلًا يعطي 20 تيرابايت شهريًا |
| وسيط سكني (Residential proxy) | مزود يدعم الجلسات الثابتة (sticky sessions) | بدونه ستحظر YouTube عنوان الخادم سريعًا |
| بريد للإشعارات (اختياري) | Resend | لإشعارات طلبات الحذف وتوقف منصة |
| Cloudflare Turnstile (اختياري) | مجاني | يحمي نموذج طلب الحذف من الإزعاج |

## شرط قبل الإطلاق العام

الصفحات القانونية (الشروط، الخصوصية، حقوق النشر) تحتاج مراجعة محامٍ قبل فتح الموقع للعامة (راجع parity.md). يمكنك النشر على النطاق للاختبار قبل ذلك، لكن لا تعلن عنه.

## الخطوات

### 1. سجلات DNS

عند مزود النطاق، أضف ثلاثة سجلات A تشير إلى عنوان IP الخاص بالخادم:

```
naqi.example        A   <IP الخادم>
www.naqi.example    A   <IP الخادم>
api.naqi.example    A   <IP الخادم>
```

### 2. تجهيز الخادم

```bash
ssh root@<IP الخادم>
curl -fsSL https://get.docker.com | sh
ufw allow 22 && ufw allow 80 && ufw allow 443 && ufw enable
mkdir -p /opt/naqi
```

### 3. رفع الملفات

انسخ مجلدي `app/api` و`app/web` إلى الخادم بحيث يصبحان `/opt/naqi/api` و`/opt/naqi/web` (ملف Compose يبني الموقع من `../web`):

```bash
scp -r app/api app/web root@<IP الخادم>:/opt/naqi/
```

### 4. الإعدادات

```bash
cd /opt/naqi/api
cp .env.example .env
nano .env
```

القيم التي يجب ملؤها:

- `SECRET_KEY` و`ADMIN_TOKEN`: كل واحدة من `openssl rand -hex 32`.
- `POSTGRES_PASSWORD`: من `openssl rand -hex 16`.
- `API_DOMAIN=api.naqi.example` و`WEB_DOMAIN=naqi.example`.
- `PUBLIC_API_BASE=https://api.naqi.example/v1`.
- `WEB_ORIGINS=["https://naqi.example"]`.
- `PROXY_URL`: رابط الوسيط السكني، مع `{session}` مكان رقم الجلسة.
- `CANARY_URLS`: فيديو عام واحد معروف لكل منصة، يُفحص كل 15 دقيقة لاكتشاف أي عطل مبكرًا.

### 5. التشغيل

```bash
docker compose up -d --build
```

أول تشغيل يستغرق بضع دقائق. Caddy يطلب الشهادات تلقائيًا بعد أن تنتشر سجلات DNS.

### 6. الفحص

```bash
sh scripts/smoke.sh naqi.example api.naqi.example
```

يجب أن تظهر كل الأسطر `ok`. بعدها جرّب يدويًا من المتصفح: الصق رابط فيديو عام من كل منصة، نزّل جودة عالية وصوتًا وجزءًا مقصوصًا، وتأكد أن التنزيل الرابع يظهر رسالة الحد. جرّب أيضًا من iPhone حقيقي.

### 7. المهام الدورية

```bash
crontab -e
```

```
# تحديث yt-dlp ليلًا، ولا يُعتمد إلا إذا نجح الفحص على كل المنصات
0 3 * * * cd /opt/naqi/api && sh scripts/update-ytdlp.sh >> /var/log/naqi-ytdlp.log 2>&1
# نسخة احتياطية يومية لقاعدة البيانات، تُحذف بعد 14 يومًا
30 3 * * * cd /opt/naqi/api && docker compose exec -T postgres pg_dump -U naqi naqi | gzip > /var/backups/naqi-$(date +\%F).sql.gz && find /var/backups -name 'naqi-*.sql.gz' -mtime +14 -delete
```

## التشغيل اليومي

| المهمة | الأمر |
| --- | --- |
| نشر تحديث | ارفع الملفات الجديدة ثم `docker compose up -d --build` ثم `sh scripts/smoke.sh ...` |
| مشاهدة السجلات | `docker compose logs -f api` |
| إيقاف منصة فورًا | `docker compose exec redis redis-cli set kill:youtube admin` (احذف المفتاح للاستئناف) |
| طلبات الحذف الجديدة | راجع قسم Admin في `app/api/README.md` |
| الإحصاءات | `curl -H "Authorization: Bearer $ADMIN_TOKEN" https://api.naqi.example/v1/admin/stats?days=7` |

## الرجوع عن تحديث

قبل كل تحديث احتفظ بنسخة من الصور الحالية:

```bash
docker tag naqi-api:current naqi-api:previous
docker tag naqi-web:current naqi-web:previous
```

وللرجوع:

```bash
docker tag naqi-api:previous naqi-api:current
docker tag naqi-web:previous naqi-web:current
docker compose up -d --no-build
```

## ما تغيّر في الملفات لهذه المرحلة

- `app/web/Dockerfile` و`app/web/.dockerignore`: صورة للموقع.
- `app/web/next.config.mjs`: `output: "standalone"` لصورة Docker صغيرة (لا يؤثر على Vercel).
- `app/api/docker-compose.yml`: خدمة `web` جديدة.
- `app/api/Caddyfile`: النطاق الرئيسي وتحويل www وترويسات أمان.
- `app/api/.env.example`: `WEB_DOMAIN` و`DEMO_URL`.
- `app/api/scripts/smoke.sh`: فحص ما بعد النشر.
