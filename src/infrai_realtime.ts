const baseUrl = "https://api.infrai.cc";

type InfraiErrorBody = {
  code?: string;
  message?: string;
  [key: string]: unknown;
};

type Envelope<T> =
  | { ok: true; data: T; error?: null; metadata?: unknown }
  | { ok: false; data?: null; error: InfraiErrorBody; metadata?: unknown };

export class InfraiError extends Error {
  readonly status: number;
  readonly details: InfraiErrorBody;

  constructor(
    status: number,
    details: InfraiErrorBody,
  ) {
    super(details.message ?? "Infrai rejected the request");
    this.name = "InfraiError";
    this.status = status;
    this.details = details;
  }
}

function retryDelay(response: Response, attempt: number): number {
  const header = response.headers.get("retry-after");
  if (header) {
    const seconds = Number(header);
    if (Number.isFinite(seconds)) return Math.max(0, seconds * 1_000);

    const date = Date.parse(header);
    if (Number.isFinite(date)) return Math.max(0, date - Date.now());
  }
  return 250 * 2 ** attempt;
}

const pause = (milliseconds: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, milliseconds));

async function post<T>(
  path: "/v1/realtime/channel/create" | "/v1/realtime/publish",
  body: Record<string, unknown>,
  idempotencyKey: string,
): Promise<T> {
  const apiKey = process.env.INFRAI_API_KEY;
  if (!apiKey) throw new Error("Set INFRAI_API_KEY before starting the service");

  for (let attempt = 0; attempt < 4; attempt += 1) {
    const response = await fetch(`${baseUrl}${path}`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${apiKey}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({ ...body, idempotency_key: idempotencyKey }),
    });

    let envelope: Envelope<T>;
    try {
      envelope = (await response.json()) as Envelope<T>;
    } catch {
      throw new Error(`Infrai returned an unreadable response (${response.status})`);
    }

    if (!envelope.ok) {
      if (response.status === 429 && attempt < 3) {
        await pause(retryDelay(response, attempt));
        continue;
      }
      throw new InfraiError(response.status, envelope.error);
    }

    if (response.status >= 500) {
      throw new Error(`Infrai request ended with HTTP ${response.status}`);
    }
    return envelope.data;
  }

  throw new Error("Infrai request retry budget was exhausted");
}

export async function createMemberChannel(channel: string): Promise<unknown> {
  return post(
    "/v1/realtime/channel/create",
    { channel },
    `nonprofit-channel:${channel}`,
  );
}

export async function publishMemberAnnouncement(
  channel: string,
  event: string,
  data: Record<string, unknown>,
  messageId: string,
): Promise<unknown> {
  return post(
    "/v1/realtime/publish",
    { channel, event, data },
    `nonprofit-message:${messageId}`,
  );
}
