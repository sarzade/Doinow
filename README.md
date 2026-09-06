# دوینو (Doinow)

برنامه مدیریت کارهای روزانه — فارسی و راست‌چین، شبیه Any.do، اختصاصی تو.
`com.doinow.app` — خروجی اندروید (APK) با Capacitor، بیلد خودکار در گیت‌هاب.

## ساختار

```
doinow/
├── client/   → فرانت (React + Vite + TS + Tailwind + Zustand) + android/
├── server/   → بک‌اند اختصاصی (Node + Fastify + Prisma + SQLite)
├── infra/    → Caddyfile برای api.doinow.ir
└── .github/workflows/ → بیلد APK + دیپلوی سرور
```

## اجرای لوکال (الان)

پیش‌نیاز: Node 20+

**۱. سرور:**

```bash
cd server
npm install
npx prisma migrate dev   # فقط بار اول
npm run dev              # http://localhost:3000 (health: /health)
```

**۲. کلاینت:**

```bash
cd client
npm install
npm run dev              # http://localhost:5173
```

مرورگر را باز کن، ثبت‌نام کن (اولین کاربر)، تسک بساز. فرانت از پروکسی Vite به
`localhost:3000` وصل می‌شود؛ نیازی به تنظیم `VITE_API_URL` در لوکال نیست.

## بیلد APK از گیت‌هاب

1. سکرت `VITE_API_URL` را در Settings → Secrets بده (مثلا `https://api.doinow.ir/api/v1`).
2. پوش به `main` → ورک‌فلو `Android APK` اجرا می‌شود.
3. فایل `Doinow-debug-apk` را از Artifacts دانلود و روی گوشی نصب کن.

لوکال هم می‌توانی خروجی وب را بسازی و سینک کنی:

```bash
cd client
npm run build
npx cap sync android
```

## بردن روی سرور (بعدا)

1. DNS: رکورد `A` برای `api.doinow.ir` به آی‌پی VPS.
2. روی VPS (اوبونتو + داکر): `git clone` در `/opt/doinow`، ساخت `server/.env`
   از روی `.env.example` با `JWT_SECRET` واقعی و `DATABASE_URL=file:/data/prod.db`.
3. `docker compose up -d --build` — Caddy خودش HTTPS می‌گیرد.
4. ورک‌فلو `deploy-server` را فعال کن (کامنت‌های `on:` را بردار) و سکرت‌های
   `VPS_HOST / VPS_USER / VPS_SSH_KEY` را بده.

## نکات

- تقویم: ذخیره میلادی (استاندارد)، نمایش اصلی شمسی + زیرنویس میلادی.
- آفلاین: تغییرات بدون اینترنت در صف می‌ماند و با وصل شدن سینک می‌شود.
- بکاپ: از تنظیمات اپ «دانلود بکاپ» بگیر (JSON).
- دیتابیس لوکال: `server/prisma/dev.db` (کامیت نمی‌شود).
