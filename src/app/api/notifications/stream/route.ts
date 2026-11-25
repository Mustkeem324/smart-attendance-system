export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { getAuthSession } from '@/lib/auth';
import { fetchRichUserNotifications } from '@/lib/notifications';

export async function GET(req: NextRequest) {
  const session = await getAuthSession(req);
  if (!session) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const encoder = new TextEncoder();
  let closed = false;

  const stream = new ReadableStream({
    async start(controller) {
      const sendEvent = (eventName: string, data: unknown) => {
        if (closed) return;
        try {
          controller.enqueue(
            encoder.encode(`event: ${eventName}\ndata: ${JSON.stringify(data)}\n\n`)
          );
        } catch {
          closed = true;
        }
      };

      let lastSignature = '';

      const pushSnapshot = async (isInitial: boolean) => {
        try {
          const snapshot = await fetchRichUserNotifications({
            organizationId: session.user.organizationId,
            userId: session.user.id,
            role: session.user.role,
            limit: 30,
          });
          const topId = snapshot.notifications[0]?.id || '';
          const signature = `${snapshot.unreadCount}:${snapshot.totalCount}:${topId}`;
          if (isInitial || signature !== lastSignature) {
            lastSignature = signature;
            sendEvent(isInitial ? 'init' : 'update', {
              unreadCount: snapshot.unreadCount,
              urgentCount: snapshot.urgentCount,
              notifications: snapshot.notifications.slice(0, 20),
              timestamp: new Date().toISOString(),
            });
          } else {
            sendEvent('heartbeat', { ts: Date.now(), unreadCount: snapshot.unreadCount });
          }
        } catch (err) {
          // Keep stream resilient across transient DB blips
          sendEvent('heartbeat', { ts: Date.now() });
        }
      };

      await pushSnapshot(true);

      const pollTimer = setInterval(() => {
        if (closed) {
          clearInterval(pollTimer);
          return;
        }
        pushSnapshot(false);
      }, 3000);

      // Clean 50s lifecycle so serverless runtimes recycle SSE smoothly
      const maxLifetimeTimer = setTimeout(() => {
        closed = true;
        clearInterval(pollTimer);
        try {
          controller.close();
        } catch {}
      }, 50000);

      req.signal.addEventListener('abort', () => {
        closed = true;
        clearInterval(pollTimer);
        clearTimeout(maxLifetimeTimer);
        try {
          controller.close();
        } catch {}
      });
    },
    cancel() {
      closed = true;
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
