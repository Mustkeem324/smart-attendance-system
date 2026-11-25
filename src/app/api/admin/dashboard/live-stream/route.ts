import { NextRequest } from 'next/server';
import { getAuthSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const session = await getAuthSession(req);
  if (!session) {
    return new Response('Unauthorized', { status: 401 });
  }

  const allowedRoles = ['SUPER_ADMIN', 'COMPANY_ADMIN', 'HR_MANAGER', 'TEAM_MANAGER', 'SALES_MANAGER'];
  if (!allowedRoles.includes(session.user.role)) {
    return new Response('Forbidden', { status: 403 });
  }

  const { organizationId } = session.user;
  const encoder = new TextEncoder();

  let isClosed = false;

  const stream = new ReadableStream({
    async start(controller) {
      let lastEventTime = new Date();

      // Send initial handshake
      controller.enqueue(
        encoder.encode(`data: ${JSON.stringify({ type: 'CONNECTED', timestamp: new Date().toISOString() })}\n\n`)
      );

      const interval = setInterval(async () => {
        if (isClosed) {
          clearInterval(interval);
          return;
        }

        try {
          // Poll for recent events or attendance records created/updated in the last interval
          const recentEvents = await prisma.attendanceEvent.findMany({
            where: {
              attendanceRecord: { organizationId },
              timestamp: { gt: lastEventTime },
            },
            include: {
              employee: {
                select: { firstName: true, lastName: true, employeeCode: true, department: true, branch: true },
              },
            },
            orderBy: { timestamp: 'asc' },
          });

          if (recentEvents.length > 0) {
            lastEventTime = new Date();
            for (const event of recentEvents) {
              controller.enqueue(
                encoder.encode(
                  `data: ${JSON.stringify({
                    type: 'ATTENDANCE_EVENT',
                    event: {
                      id: event.id,
                      eventType: event.eventType,
                      timestamp: event.timestamp,
                      employeeName: `${event.employee.firstName} ${event.employee.lastName}`,
                      employeeCode: event.employee.employeeCode,
                      department: event.employee.department.name,
                      branch: event.employee.branch.name,
                      isWithinGeofence: event.isWithinGeofence,
                      photo: event.photo,
                    },
                  })}\n\n`
                )
              );
            }
          } else {
            // Heartbeat
            controller.enqueue(encoder.encode(`: ping\n\n`));
          }
        } catch (e) {
          console.error('SSE Error:', e);
        }
      }, 3000); // Check every 3 seconds

      req.signal.addEventListener('abort', () => {
        isClosed = true;
        clearInterval(interval);
        try {
          controller.close();
        } catch {}
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  });
}
