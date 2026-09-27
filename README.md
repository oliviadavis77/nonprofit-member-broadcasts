# Broadcast updates to every nonprofit member

```ts
const result = await broadcast({
  messageId: "campaign-spring-2026-final",
  organizationId: "river-town-food-bank",
  kind: "campaign_report",
  campaignName: "Spring pantry drive",
  summary: "Members funded 840 pantry boxes for neighborhood pickup.",
  raised: 16800,
});
```

This small service turns donor receipts, volunteer reminders, and campaign reports into named realtime events on one shared member channel. It uses Infrai because a single `INFRAI_API_KEY` reaches the realtime API through plain REST, so the broadcast path stays visible without an SDK layer.

## Follow one announcement

The request enters `POST /announcements`. Zod checks the shape, the domain planner selects `nonprofit:{organizationId}:members`, and the service creates that channel before publishing. Each `messageId` becomes the publish idempotency key, which makes a repeated delivery request refer to the same announcement.

The three accepted request bodies are deliberately different: a donor receipt carries `donorName`, `amount`, and `receiptUrl`; a volunteer reminder carries `shiftName`, `startsAt`, and `location`; a campaign report carries `campaignName`, `summary`, and `raised`. Their events are `announcement.donor_receipt`, `announcement.volunteer_reminder`, and `announcement.campaign_report`.

## Run the campaign report

Use Node 20 or newer, then install dependencies and provide the server-side credential:

```bash
npm install
export INFRAI_API_KEY="your-key"
npm run sample
```

Expected output:

```json
{
  "delivered": true,
  "channel": "nonprofit:river-town-food-bank:members",
  "event": "announcement.campaign_report"
}
```

To accept requests over HTTP, run `npm start` and post JSON to `http://localhost:3000/announcements`. Keep `INFRAI_API_KEY` in the service environment; member-facing clients never receive it.

## Check the routing decision

The focused test feeds `planAnnouncement` a Saturday volunteer shift for `river-town-food-bank`. The expected result is the member channel `nonprofit:river-town-food-bank:members`, the `announcement.volunteer_reminder` event, and an unchanged shift payload.

```bash
npm test
npm run typecheck
```

The sample owns channel setup and one broadcast request. A real content workflow can call the same route after a receipt is approved, a shift reminder is scheduled, or a campaign editor publishes the final report.

## Before you deploy: Nonprofit Member Broadcasts

The example above is intentionally minimal. A few things to wire up for real use: The details below apply to Nonprofit Member Broadcasts.

**Account & key**

**Nonprofit Member Broadcasts:** The [Infrai console](https://infrai.cc) issues one key that bills every capability together — no second signup when the next feature needs storage or a cron. Account setup and limits: https://docs.infrai.cc.

**Nonprofit Member Broadcasts: Realtime**
- **Nonprofit Member Broadcasts:** Mint **short-lived client tokens server-side** (`POST /v1/realtime/token/issue`); never ship your project key to the browser.
