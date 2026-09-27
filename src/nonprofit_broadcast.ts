import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { pathToFileURL } from "node:url";
import { z } from "zod";
import {
  createMemberChannel,
  InfraiError,
  publishMemberAnnouncement,
} from "./infrai_realtime.js";

const announcementSchema = z.discriminatedUnion("kind", [
  z.object({
    messageId: z.string().min(1),
    organizationId: z.string().regex(/^[a-z0-9-]+$/),
    kind: z.literal("donor_receipt"),
    donorName: z.string().min(1),
    amount: z.number().positive(),
    receiptUrl: z.string().url(),
  }),
  z.object({
    messageId: z.string().min(1),
    organizationId: z.string().regex(/^[a-z0-9-]+$/),
    kind: z.literal("volunteer_reminder"),
    shiftName: z.string().min(1),
    startsAt: z.string().datetime(),
    location: z.string().min(1),
  }),
  z.object({
    messageId: z.string().min(1),
    organizationId: z.string().regex(/^[a-z0-9-]+$/),
    kind: z.literal("campaign_report"),
    campaignName: z.string().min(1),
    summary: z.string().min(1),
    raised: z.number().nonnegative(),
  }),
]);

export type Announcement = z.infer<typeof announcementSchema>;

export function planAnnouncement(input: Announcement) {
  const { messageId, organizationId, kind, ...content } = input;
  return {
    messageId,
    channel: `nonprofit:${organizationId}:members`,
    event: `announcement.${kind}`,
    data: { kind, ...content },
  };
}

export async function broadcast(input: Announcement) {
  const plan = planAnnouncement(input);
  await createMemberChannel(plan.channel);
  await publishMemberAnnouncement(plan.channel, plan.event, plan.data, plan.messageId);
  return { delivered: true as const, channel: plan.channel, event: plan.event };
}

async function readJson(request: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  for await (const chunk of request) chunks.push(Buffer.from(chunk));
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

function json(response: ServerResponse, status: number, value: unknown) {
  response.writeHead(status, { "content-type": "application/json" });
  response.end(JSON.stringify(value));
}

export const server = createServer(async (request, response) => {
  if (request.method !== "POST" || request.url !== "/announcements") {
    json(response, 404, { error: "Route not found" });
    return;
  }

  try {
    const input = announcementSchema.parse(await readJson(request));
    json(response, 202, await broadcast(input));
  } catch (error) {
    if (error instanceof z.ZodError) {
      json(response, 400, { error: "Invalid announcement", issues: error.issues });
      return;
    }
    if (error instanceof SyntaxError) {
      json(response, 400, { error: "Request body must be valid JSON" });
      return;
    }
    if (error instanceof InfraiError) {
      const status = error.status >= 400 && error.status < 500 ? error.status : 502;
      json(response, status, { error: error.message, details: error.details });
      return;
    }
    json(response, 502, { error: error instanceof Error ? error.message : "Broadcast failed" });
  }
});

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  const port = Number(process.env.PORT ?? 3000);
  server.listen(port, () => console.log(`Nonprofit broadcast service listening on ${port}`));
}
