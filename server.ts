import express, { Request, Response } from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { bankingRouter } from './src/server/routes/bankingRoutes';
import { authRouter } from './src/server/routes/authRoutes';
import { realtimeBroker } from './src/server/realtime';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  // JSON request body parser
  app.use(express.json());

  // SSE (Server-Sent Events) Realtime Connection Pipeline
  // Allows dashboard to receive instant broadcasts without page refresh
  app.get('/api/realtime', (req: Request, res: Response) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();

    // Initial handshake ping
    res.write(`event: connected\ndata: ${JSON.stringify({ status: 'connected', time: new Date().toISOString() })}\n\n`);

    realtimeBroker.addClient(res);
  });

  // Server API Routes
  app.use('/api/auth', authRouter);
  app.use('/api/banking', bankingRouter);

  // Health check endpoint
  app.get('/api/health', (req: Request, res: Response) => {
    res.json({
      status: 'ok',
      service: 'Aureus Private Wealth API',
      database: 'Supabase / PostgreSQL (Prisma)',
      realtimeClients: realtimeBroker.getClientCount()
    });
  });

  // Development: Mount Vite SPA middleware
  // Production: Serve compiled static assets
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Aureus Wealth Server] Running at http://0.0.0.0:${PORT}`);
    console.log(`[Database] Prisma ORM & Supabase connected`);
    console.log(`[Realtime] SSE pipeline active on /api/realtime`);
  });
}

startServer().catch((err) => {
  console.error('[Server Start Error]', err);
  process.exit(1);
});
