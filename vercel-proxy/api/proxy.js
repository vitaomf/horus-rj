export const config = { runtime: 'edge' };

// UPSTREAM_URL definido por variavel de ambiente no Vercel:
//   Production  → porta 7291 (main)
//   Preview/dev → porta 7292 (beta)
// Fallback: producao
const UPSTREAM = process.env.UPSTREAM_URL ||
  'https://synergistic-hemathermal-myesha.ngrok-free.dev';

export default async function handler(req) {
  const url = new URL(req.url);
  const originalPath = url.searchParams.get('__path') || '/';
  const qs = new URLSearchParams(url.searchParams);
  qs.delete('__path');
  const queryString = qs.toString();
  const target = UPSTREAM + originalPath + (queryString ? '?' + queryString : '');

  const headers = new Headers(req.headers);
  headers.set('ngrok-skip-browser-warning', '1');
  headers.set('host', new URL(UPSTREAM).host);
  headers.delete('x-forwarded-host');
  headers.delete('x-vercel-id');

  const upstream = await fetch(target, {
    method: req.method,
    headers,
    body: ['GET', 'HEAD'].includes(req.method) ? undefined : req.body,
    redirect: 'follow',
  });

  return new Response(upstream.body, {
    status: upstream.status,
    headers: new Headers(upstream.headers),
  });
}
