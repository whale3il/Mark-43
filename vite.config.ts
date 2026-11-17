import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, Plugin } from 'vite';

function staffPortalRoutingPlugin(): Plugin {
  const rewriteStaffUrl = (
    req: { url?: string; headers?: Record<string, string | string[] | undefined> },
    next: () => void
  ) => {
    const rawUrl = req.url || '';
    const pathname = rawUrl.split('?')[0];
    const acceptsHtml =
      typeof req.headers?.accept === 'string'
        ? req.headers.accept.includes('text/html') || req.headers.accept.includes('*/*')
        : true;

    // Only rewrite navigation requests under /staff that are NOT static files, Vite internals, or API calls
    const isStaffPath = pathname === '/staff' || pathname.startsWith('/staff/');
    const isAssetOrModule =
      pathname.startsWith('/staff-portal/') ||
      pathname.includes('.') ||
      pathname.startsWith('/@') ||
      pathname.startsWith('/api/');

    if (isStaffPath && !isAssetOrModule && acceptsHtml) {
      const queryIndex = rawUrl.indexOf('?');
      const query = queryIndex >= 0 ? rawUrl.slice(queryIndex) : '';
      req.url = `/staff.html${query}`;
    }
    next();
  };

  return {
    name: 'aureus-staff-portal-routing',
    configureServer(server) {
      server.middlewares.use((req, _res, next) => rewriteStaffUrl(req, next));
    },
    configurePreviewServer(server) {
      server.middlewares.use((req, _res, next) => rewriteStaffUrl(req, next));
    },
  };
}

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss(), staffPortalRoutingPlugin()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    build: {
      rollupOptions: {
        input: {
          main: path.resolve(__dirname, 'index.html'),
          staff: path.resolve(__dirname, 'staff.html'),
        },
      },
    },
    server: {
      port: 3000,
      host: '0.0.0.0',
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});

