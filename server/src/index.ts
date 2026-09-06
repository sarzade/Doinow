import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import Fastify from 'fastify';
import type { FastifyError } from 'fastify';
import { authRoutes } from './auth.js';
import { dataRoutes } from './routes.js';

const PORT = Number(process.env['PORT'] ?? 3000);
const JWT_SECRET = process.env['JWT_SECRET'] ?? '';

if (JWT_SECRET.length < 32) {
  console.error('JWT_SECRET باید حداقل ۳۲ کاراکتر باشد (.env را ببین)');
  process.exit(1);
}

const app = Fastify({ logger: true });

await app.register(cors, { origin: true });
await app.register(jwt, { secret: JWT_SECRET });

app.get('/health', async () => ({ ok: true, app: 'doinow', time: new Date().toISOString() }));

app.decorate('authenticate', async (req, reply) => {
  try {
    await req.jwtVerify();
  } catch {
    return reply.code(401).send({ error: 'نشست منقضی شده، دوباره وارد شو' });
  }
});

await app.register(authRoutes, { prefix: '/api/v1/auth' });
await app.register(dataRoutes, { prefix: '/api/v1' });

app.setErrorHandler((err: FastifyError, _req, reply) => {
  app.log.error(err);
  const status = err.statusCode ?? 500;
  void reply.code(status).send({ error: 'خطای داخلی سرور' });
});

await app.listen({ port: PORT, host: '0.0.0.0' });
console.log(`Doinow server listening on :${PORT}`);
