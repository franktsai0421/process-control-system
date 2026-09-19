import { env } from 'cloudflare:workers';
import { identity, demoEnabled, publicUntil } from '@/lib/process-state';

export async function GET(request: Request) {
  const id = new URL(request.url).searchParams.get('id') || '';
  if (!/^[a-f0-9]{64}$/.test(id))
    return new Response('Not found', { status: 404 });
  // Large-snapshot D1 envelopes retain the current account metadata for auth.
  const row = await env.DB.prepare(
    'SELECT revision,"values" FROM shared_state WHERE id=1',
  ).first<{ revision: number; values: string }>();
  if (!row) return new Response('Unavailable', { status: 503 });
  const user = await identity(request, {
    revision: row.revision,
    values: JSON.parse(row.values),
  });
  if (
    !demoEnabled(request) &&
    Date.now() >= publicUntil &&
    user?.role !== 'admin'
  )
    return new Response('Forbidden', { status: 403 });
  const image = await env.STATE_ARCHIVE.get(`delivery/media/${id}`, {
    range: request.headers,
  });
  if (!image) return new Response('Not found', { status: 404 });
  const headers: Record<string, string> = {
    'Content-Type':
      image.httpMetadata?.contentType || 'application/octet-stream',
    'Cache-Control': 'private, max-age=28800, immutable',
    'X-Content-Type-Options': 'nosniff',
    'Accept-Ranges': 'bytes',
  };
  if (image.range) {
    const range = image.range;
    const offset =
      'suffix' in range
        ? Math.max(0, image.size - range.suffix)
        : range.offset || 0;
    const length =
      'suffix' in range
        ? image.size - offset
        : (range.length ?? image.size - offset);
    headers['Content-Range'] =
      `bytes ${offset}-${offset + length - 1}/${image.size}`;
    headers['Content-Length'] = String(length);
  }
  return new Response(image.body, { status: image.range ? 206 : 200, headers });
}
