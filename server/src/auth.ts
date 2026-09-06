import bcrypt from 'bcryptjs';
import { createHash, randomBytes } from 'node:crypto';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from './lib.js';

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: { sub: string };
    user: { sub: string };
  }
}

declare module 'fastify' {
  interface FastifyInstance {
    authenticate: (
      req: FastifyRequest,
      reply: FastifyReply,
    ) => Promise<void>;
  }
}

const emailSchema = z.string().trim().toLowerCase().email('ایمیل معتبر نیست');
const passwordSchema = z.string().min(6, 'رمز عبور حداقل ۶ کاراکتر');

function signAccess(app: FastifyInstance, userId: string): string {
  return app.jwt.sign({ sub: userId }, { expiresIn: '30d' });
}

function newRefreshToken(): { token: string; hash: string } {
  const token = randomBytes(32).toString('hex');
  const hash = createHash('sha256').update(token).digest('hex');
  return { token, hash };
}

export async function authRoutes(app: FastifyInstance): Promise<void> {
  app.post('/register', async (req, reply) => {
    const parsed = z
      .object({
        email: emailSchema,
        password: passwordSchema,
        displayName: z.string().trim().min(1).max(60).optional(),
      })
      .safeParse(req.body);
    if (!parsed.success)
      return reply.code(400).send({ error: parsed.error.issues[0]?.message ?? 'ورودی نامعتبر' });
    const { email, password, displayName } = parsed.data;

    const exists = await prisma.user.findUnique({ where: { email } });
    if (exists) return reply.code(409).send({ error: 'این ایمیل قبلا ثبت شده' });

    const passHash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { email, passHash, displayName: displayName ?? email.split('@')[0] ?? 'کاربر' },
    });
    // لیست پیش‌فرض شخصی
    await prisma.list.create({
      data: { userId: user.id, title: 'شخصی', color: '#7c3aed' },
    });

    const accessToken = signAccess(app, user.id);
    const { token: refreshToken, hash } = newRefreshToken();
    await prisma.refreshToken.create({
      data: {
        tokenHash: hash,
        userId: user.id,
        expiresAt: new Date(Date.now() + 365 * 24 * 3600 * 1000),
      },
    });
    return reply.send({
      user: { id: user.id, email: user.email, displayName: user.displayName },
      accessToken,
      refreshToken,
    });
  });

  app.post('/login', async (req, reply) => {
    const parsed = z
      .object({ email: emailSchema, password: z.string().min(1, 'رمز عبور لازم است') })
      .safeParse(req.body);
    if (!parsed.success)
      return reply.code(400).send({ error: parsed.error.issues[0]?.message ?? 'ورودی نامعتبر' });
    const { email, password } = parsed.data;

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return reply.code(401).send({ error: 'ایمیل یا رمز عبور اشتباه است' });
    const ok = await bcrypt.compare(password, user.passHash);
    if (!ok) return reply.code(401).send({ error: 'ایمیل یا رمز عبور اشتباه است' });

    const accessToken = signAccess(app, user.id);
    const { token: refreshToken, hash } = newRefreshToken();
    await prisma.refreshToken.create({
      data: {
        tokenHash: hash,
        userId: user.id,
        expiresAt: new Date(Date.now() + 365 * 24 * 3600 * 1000),
      },
    });
    return reply.send({
      user: { id: user.id, email: user.email, displayName: user.displayName },
      accessToken,
      refreshToken,
    });
  });

  app.post('/refresh', async (req, reply) => {
    const parsed = z.object({ refreshToken: z.string().min(10) }).safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: 'توکن نامعتبر' });
    const hash = createHash('sha256').update(parsed.data.refreshToken).digest('hex');
    const row = await prisma.refreshToken.findUnique({ where: { tokenHash: hash } });
    if (!row || row.expiresAt.getTime() < Date.now()) {
      if (row) await prisma.refreshToken.delete({ where: { id: row.id } });
      return reply.code(401).send({ error: 'نشست منقضی شده، دوباره وارد شو' });
    }
    return reply.send({ accessToken: signAccess(app, row.userId) });
  });

  app.post('/logout', { onRequest: [app.authenticate] }, async (req, reply) => {
    const parsed = z.object({ refreshToken: z.string().min(10) }).safeParse(req.body ?? {});
    if (parsed.success) {
      const hash = createHash('sha256').update(parsed.data.refreshToken).digest('hex');
      await prisma.refreshToken.deleteMany({ where: { tokenHash: hash } });
    }
    return reply.send({ ok: true });
  });

  app.get('/me', { onRequest: [app.authenticate] }, async (req, reply) => {
    const user = await prisma.user.findUnique({ where: { id: req.user.sub } });
    if (!user) return reply.code(401).send({ error: 'کاربر یافت نشد' });
    return reply.send({
      user: { id: user.id, email: user.email, displayName: user.displayName },
    });
  });
}
