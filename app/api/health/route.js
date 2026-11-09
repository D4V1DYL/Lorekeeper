import { dmStatus } from '@/lib/dm';
export const dynamic = 'force-dynamic';
export function GET() {
  return Response.json({ ok: true, ...dmStatus() });
}
