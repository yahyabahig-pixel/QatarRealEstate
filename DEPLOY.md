# دليل نشر موقع المدينة للعقارات على السيرفر
# AL-Madenah Real Estate — Server Deployment Guide

> الدليل ده مكتوب لمن سينشر المشروع على سيرفر إنتاج (VPS).
> المشروع كامل يعمل بـ Docker — لا يحتاج تثبيت .NET ولا Node ولا SQL Server يدويًا.

---

## 1) المتطلبات

- سيرفر Linux (Ubuntu 22.04 أو أحدث مُجرَّب) بمواصفات 2 vCPU / 4GB RAM أو أعلى
- **Docker + Docker Compose** مثبّتين:
  ```bash
  curl -fsSL https://get.docker.com | sh
  ```
- وصول للريبو الخاص على GitHub (لازم صاحب المشروع يضيفك Collaborator)

## 2) تنزيل المشروع

```bash
git clone https://github.com/yahyabahig-pixel/QatarRealEstate.git /opt/qre
cd /opt/qre
```

## 3) ملف الإعدادات `.env` (أهم خطوة)

الأسرار **غير موجودة في الريبو عمدًا**. انسخ القالب واملأه:

```bash
cp .env.example .env
nano .env
```

القيم المطلوبة (كل التفاصيل مشروحة داخل الملف نفسه):

| المتغير | القيمة |
|---|---|
| `PUBLIC_ORIGIN` | `http://IP_السيرفر` مبدئيًا، وبعد ربط الدومين `https://www.domain.com` |
| `SA_PASSWORD` | ولّده: `openssl rand -base64 24 \| tr -d '/+=' \| head -c 24` |
| `JWT_SECRET` | ولّده: `openssl rand -base64 48` |
| `MAIN_ADMIN_EMAIL` | إيميل دخول لوحة الأدمن — **خذه من صاحب المشروع** |
| `MAIN_ADMIN_PASSWORD` | باسورد الأدمن — **خذه من صاحب المشروع** (8+ أحرف، كبير وصغير ورقم) |
| `MAIN_ADMIN_NAME` | اسم صاحب الحساب |
| `DB_USER` / `DB_PASSWORD` | اتركهما فاضيين الآن — الخطوة 4 أدناه تُنشئهما. لو بقيا فاضيين سيتصل التطبيق بحساب `sa` وهو ما نتجنّبه |
| `SEED_DATA` | اتركها فاضية. لم تعد تزرع بيانات تجريبية — الأنواع والمميزات والمناطق تُزرع تلقائيًا مرة واحدة في أول تشغيل |
| `VITE_MAPBOX_TOKEN` | اتركها فاضية — الخرائط مجانية (MapLibre) ولا تحتاج توكن |

> حساب الأدمن يُنشأ تلقائيًا في أول تشغيل بالقيم أعلاه. البيانات التجريبية (عقارات/وكلاء ديمو) يمكن حذفها لاحقًا من لوحة الأدمن — أما الأنواع والمميزات والمناطق فهي أساسية للنظام.

## 4) التشغيل الأول

```bash
docker compose up -d --build
```

انتظر دقيقة–دقيقتين (بناء + هجرات قاعدة البيانات + الزرع)، ثم:

- الموقع: `http://IP_السيرفر`
- لوحة الأدمن: `http://IP_السيرفر/admin/login` — بالإيميل والباسورد من `.env`

للاطمئنان: `docker compose ps` (ثلاث خدمات تعمل) و`docker compose logs backend --tail 50`.

> **لا تحتاج تغيير أي شيء بعد أول تشغيل.** الزرع يُسجَّل في قاعدة البيانات ولا يتكرر، فإعادة تشغيل الحاوية لا تُرجع بيانات حذفتها. (هذه كانت المشكلة الأصلية: حذف البيانات التجريبية ثم عودتها مع كل إعادة تشغيل.)

**بيانات تجريبية للعرض فقط** — إن أردت ملء الموقع بعقارات ووكلاء وهميين لعرضه على عميل:

```bash
docker compose run --rm backend seed --demo
```

تُرفض هذه الأوامر في بيئة الإنتاج. احذف ما تريد بعدها من لوحة الأدمن ولن يعود.

## 4.5) حساب قاعدة بيانات خاص بالتطبيق — **لا تتخطَّ هذه الخطوة**

بدون هذه الخطوة يتصل التطبيق بحساب `sa`، وهو حساب يستطيع قراءة وحذف **كل** قواعد البيانات على السيرفر وتغيير إعداداته. التطبيق لا يحتاج شيئًا من ذلك — يحتاج صلاحية كاملة على قاعدته وحدها. ثغرة واحدة أو تسريب لسلسلة الاتصال تسلّم السيرفر كله بدلًا من قاعدة واحدة.

بعد نجاح أول تشغيل:

```bash
./scripts/create-db-user.sh
```

يطبع سطرين (`DB_USER` و`DB_PASSWORD`) — ضعهما في `.env` ثم:

```bash
docker compose up -d --force-recreate backend
```

للتأكد أن التطبيق يستخدم الحساب الجديد فعلًا:

```bash
docker compose exec -T sqlserver bash -c '/opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P "$MSSQL_SA_PASSWORD" -C -h -1 \
  -Q "SET NOCOUNT ON; SELECT DISTINCT login_name FROM sys.dm_exec_sessions WHERE database_id = DB_ID(N'"'"'QatarRealEstate'"'"')"'
```

يجب أن يظهر `qre_app` لا `sa`. حساب `sa` يبقى موجودًا — تحتاجه النسخ الاحتياطية وهذا السكربت نفسه — لكن التطبيق لم يعد يستخدمه.

## 5) ربط الدومين + شهادة SSL مجانية

بعد شراء الدومين وتوجيه A Record إلى IP السيرفر (وانتظار انتشار الـ DNS):

1. في `.env`:
   ```
   SITE_ADDRESS=www.yourdomain.com
   CADDY_TLS=your@email.com
   PUBLIC_ORIGIN=https://www.yourdomain.com
   ```
2. في `docker-compose.yml`: أزل التعليق عن خدمة `caddy:` كاملة، وغيّر عند `frontend:` السطر `ports: ["80:80"]` إلى `expose: ["80"]` (الخطوات مكتوبة تعليقات فوق الخدمة نفسها)
3. أعد البناء — إجباري لأن `PUBLIC_ORIGIN` يُدمج في الواجهة وقت البناء:
   ```bash
   docker compose build frontend && docker compose up -d
   ```

الشهادة تصدر وتتجدد تلقائيًا (Let's Encrypt). بعدها روابط الموقع، ومعاينة اللينك في واتساب (Open Graph)، وفهرسة جوجل — كلها تعمل على الدومين تلقائيًا.

## 6) التحديثات مستقبلًا

```bash
cd /opt/qre && git pull && docker compose build && docker compose up -d
```

## 7) قواعد أمان — التزم بها

- ملف `.env` لا يُرفع على GitHub ولا يُرسل في شات أبدًا
- كل الأسرار تُولَّد جديدة على السيرفر — لا تعيد استخدام قيم التطوير
- النسخ الاحتياطي: البيانات كلها في Docker volumes (`mssql-data` قاعدة البيانات، `caddy_data` الشهادات) — لا تحذفها، وخذ منها Backup دوري
