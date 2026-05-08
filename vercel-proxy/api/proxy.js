export const config = { runtime: 'edge' };

// URL do backend local exposto via ngrok.
// Para mudar: editar esta linha e fazer `vercel deploy --prod` na pasta vercel-proxy/
const UPSTREAM = 'https://synergistic-hemathermal-myesha.ngrok-free.dev';

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
