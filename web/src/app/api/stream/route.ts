export const runtime = "nodejs";

export async function GET() {
  const encoder = new TextEncoder();
  let interval: NodeJS.Timeout | null = null;
  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(encoder.encode(`event: connected\ndata: ${JSON.stringify({ ok: true })}\n\n`));
      interval = setInterval(() => {
        controller.enqueue(
          encoder.encode(
            `event: heartbeat\ndata: ${JSON.stringify({ ts: new Date().toISOString() })}\n\n`,
          ),
        );
      }, 10000);
    },
    cancel() {
      if (interval) clearInterval(interval);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      Connection: "keep-alive",
      "Cache-Control": "no-cache, no-transform",
    },
  });
}

