<div align="center">

# دوینو (Doinow)

**برنامه مدیریت کارهای روزانه — فارسی، راست‌چین، شبیه Any.do، با سرور شخصی خودت**

![Android](https://img.shields.io/badge/Android-APK-3DDC84?style=flat-square&logo=android&logoColor=white)
![iOS](https://img.shields.io/badge/iOS-Capacitor-000000?style=flat-square&logo=ios&logoColor=white)
![CI](https://img.shields.io/badge/CI-GitHub_Actions-2088FF?style=flat-square&logo=githubactions&logoColor=white)
![License](https://img.shields.io/badge/license-MIT-7c3aed?style=flat-square)

</div>

---

## ✨ قابلیت‌ها

- ✅ تسک، لیست، زیرکار، تگ، اولویت و یادداشت
- 🔁 **تکرار پیشرفته** — روزانه / هفتگی (چندروزه، مثل شنبه و چهارشنبه) / ماهانه (روز ماه یا روز هفته‌ای مثل دومین دوشنبه) / سالانه، هر N بار، با ساعت دقیق، تاریخ پایان یا تعداد دفعات، و انتخاب «معوق بماند یا فقط وقوع بعدی» — مثلا *هر دوشنبه ساعت ۱۴:۰۰*
- 📅 تقویم **شمسی** (با زیرنویس میلادی): نمای ماهانه + نمای هفته‌ای ساعتی با خط «الان»
- 🌙 تم تیره پیش‌فرض (روشن هم دارد)
- 📌 روز من، ۷ روز آینده، همه تسک‌ها (امروز / فردا / آینده / یه‌روز / انجام‌شده)
- 🔍 جستجو در عنوان، یادداشت و تگ + مرتب‌سازی و فیلتر
- 📴 **آفلاین-اول** — بدون اینترنت کار می‌کند، با وصل شدن خودکار سینک می‌شود
- 🔔 یادآور محلی (نوتیفیکیشن گوشی)، حتی برای وقوع‌های تکرارشونده
- 💾 بکاپ JSON از داخل تنظیمات اپ
- 🔒 داده‌ها روی **سرور شخصی خودت** — بدون وابستگی به سرویس خارجی

> 📸 اسکرین‌شات‌ها به‌زودی اینجا اضافه می‌شود.

---

## 📲 دانلود و نصب

| پلتفرم | وضعیت | توضیح |
| --- | --- | --- |
| 🤖 اندروید (APK) | ✅ آماده نصب | از صفحه **Releases** گیت‌هاب آخرین نسخه را بگیر: فایل `Doinow-v1.x-debug.apk` را دانلود و روی گوشی نصب کن |
| 🍎 آیفون (IPA) | ⚠️ بدون امضا | در همان صفحه Releases فایل `Doinow-v1.x-ios-simulator.zip` هست — فقط شبیه‌ساز Xcode، روی آیفون واقعی نصب نمی‌شود |

نسخه‌ها خودکار شماره می‌خورند (`v1.0`، `v1.1`، …). با **هر پوش به `main`** هر دو بیلد ساخته می‌شود و وقتی هر دو تمام و سبز شدند، Release جدید خودکار با همان فایل‌ها منتشر می‌شود. اگر فقط بیلد می‌خواهی و Release نه، آخر پیام کامیت بنویس `[skip release]`. اجرای دستی هم از تب **Actions** ← ورک‌فلو **Release** ممکن است (با یادداشت اختیاری).

---

## 🚀 شروع سریع (لوکال)

پیش‌نیاز: **Node 20+**

**۱. سرور** — http://localhost:3000

```bash
cd server
npm install
npx prisma migrate dev   # فقط بار اول
npm run dev
```

**۲. اپ** — http://localhost:5173

```bash
cd client
npm install
npm run dev
```

مرورگر را باز کن، **ثبت‌نام** کن و تسک بساز. در لوکال فرانت از پروکسی Vite به سرور وصل می‌شود و نیازی به تنظیم `VITE_API_URL` نیست.

### دستورهای پرکاربرد

```bash
cd client
npm test            # تست‌ها (vitest)
npm run build       # خروجی وب
npx cap sync        # سینک وب به اندروید و iOS
```

---

## 🔑 سکرت‌های گیت‌هاب

در **Settings → Secrets and variables → Actions** این‌ها را بگذار:

| سکرت | مقدار نمونه | کاربرد |
| --- | --- | --- |
| `VITE_API_URL` | `https://api.doinow.ir/api/v1` | آدرس API که اپ موبایل به آن وصل می‌شود |
| `VPS_HOST` / `VPS_USER` / `VPS_SSH_KEY` | — | دیپلوی خودکار سرور (اختیاری، بعدا) |

---

## 🖥️ بردن سرور روی VPS (بعدا)

1. رکورد `A` برای `api.doinow.ir` به آی‌پی سرور بده.
2. روی اوبونتو + داکر، ریپو را در `/opt/doinow` کلون کن و `server/.env` را از روی `server/.env.example` بساز (`JWT_SECRET` واقعی + `DATABASE_URL=file:/data/prod.db`).
3. اجرا:
   ```bash
   docker compose up -d --build
   ```
   Caddy خودش HTTPS می‌گیرد.
4. برای دیپلوی خودکار، کامنت‌های `on:` در `.github/workflows/deploy-server.yml` را بردار و سکرت‌های VPS را بده.

---

## 🗂️ ساختار ریپو

```
doinow/
├── client/                 # فرانت (React + Vite + TS + Tailwind + Zustand)
│   ├── src/                # صفحات، کامپوننت‌ها، استور، موتور تکرار
│   ├── android/            # پروژه اندروید (com.doinow.app)
│   └── ios/                # پروژه iOS (بدون امضا)
├── server/                 # بک‌اند (Node + Fastify + Prisma + SQLite)
├── infra/Caddyfile         # ریورس‌پراکسی api.doinow.ir
├── docker-compose.yml      # api + caddy برای سرور
└── .github/workflows/      # بیلد APK، بیلد iOS، دیپلوی سرور
```

---

## 🗺️ نقشه راه

- [x] موتور تکرار پیشرفته + تست
- [x] رابط موبایل شبیه Any.do + تم تیره
- [x] تقویم هفته‌ای ساعتی + سورت/فیلتر
- [x] بیلد خودکار APK و iOS در گیت‌هاب
- [ ] امضای IPA با حساب Apple Developer
- [ ] ویجت اندروید و آیکون اختصاصی نهایی
- [ ] اشتراک‌گذاری لیست‌ها

---

## 📄 لایسنس

MIT — استفاده شخصی آزاد است.
</div>
