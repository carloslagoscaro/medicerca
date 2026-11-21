import { onRequestGet as compareGet, onRequestPost as comparePost } from '../functions/api/compare.js';
import { onRequestGet as nearbyGet, onRequestPost as nearbyPost } from '../functions/api/nearby.js';

const SECURITY_HEADERS = {
  'x-content-type-options': 'nosniff',
  'referrer-policy': 'strict-origin-when-cross-origin',
  'permissions-policy': 'geolocation=(self)'
};

function json(value, status = 200) {
  return new Response(JSON.stringify(value), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      ...SECURITY_HEADERS
    }
  });
}

function contextFor(request, env, ctx) {
  return {
    request,
    env,
    params: {},
    waitUntil: (promise) => ctx.waitUntil(promise)
  };
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (url.pathname === '/api/health') {
      return json({ ok: true, time: new Date().toISOString() });
    }

    if (url.pathname === '/api/compare') {
      const context = contextFor(request, env, ctx);
      const response =
        request.method === 'POST' ? await comparePost(context) : await compareGet(context);
      return withSecurityHeaders(response);
    }

    if (url.pathname === '/api/nearby') {
      const context = contextFor(request, env, ctx);
      const response =
        request.method === 'GET' ? await nearbyGet(context) : await nearbyPost(context);
      return withSecurityHeaders(response);
    }

    if (url.pathname.startsWith('/api/')) {
      return json({ error: 'Ruta no encontrada.' }, 404);
    }

    const response = await env.ASSETS.fetch(request);
    if (url.pathname.endsWith('/') || url.pathname.endsWith('.html')) {
      return withSecurityHeaders(response);
    }
    return response;
  }
};

function withSecurityHeaders(response) {
  const headers = new Headers(response.headers);
  for (const [key, value] of Object.entries(SECURITY_HEADERS)) headers.set(key, value);
  const body = [204, 205, 304].includes(response.status) ? null : response.body;
  return new Response(body, {
    status: response.status,
    statusText: response.statusText,
    headers
  });
}
