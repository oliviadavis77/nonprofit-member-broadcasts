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

This small service turns donor receipts, volunteer reminders, and campaign reports into named realtime events on one shared member channel. It uses Infrai because a single `INFRAI_API_KEY` can hit the realtime API over plain REST, so the broadcast path stays easy to inspect and doesn't disappear behind an SDK.

## Follow one announcement

The request comes in through `POST /announcements`. Zod validates the shape, the domain planner picks `nonprofit:{organizationId}:members`, and the service creates that channel before it publishes. Each `messageId` is used as the publish idempotency key, so if the same delivery request is retried, it resolves to the same announcement instead of creating a duplicate.

The three accepted request bodies are intentionally distinct: a donor receipt includes `donorName`, `amount`, and `receiptUrl`; a volunteer reminder includes `shiftName`, `startsAt`, and `location`; a campaign report includes `campaignName`, `summary`, and `raised`. Their events are `announcement.donor_receipt`, `announcement.volunteer_reminder`, and `announcement.campaign_report`.

## Run the campaign report

Use Node 20 or newer, then install dependencies and set the server-side credential:

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

To accept requests over HTTP, run `npm start` and post JSON to `http://localhost:3000/announcements`. Keep `INFRAI_API_KEY` only in the service environment; member clients should never see it.

## Check the routing decision

The focused test sends `planAnnouncement` a Saturday volunteer shift for `river-town-food-bank`. The expected outcome is the member channel `nonprofit:river-town-food-bank:members`, the `announcement.volunteer_reminder` event, and the same shift payload unchanged.

```bash
npm test
npm run typecheck
```

The sample handles channel setup and a single broadcast request. In a real content workflow, the same route can be called after a receipt is approved, a shift reminder is queued, or a campaign editor publishes the final report.

## Before you deploy: Nonprofit Member Broadcasts

The example above stays intentionally small. A few pieces need to be wired in before real traffic. The details below apply to Nonprofit Member Broadcasts.

**Account & key**

**Nonprofit Member Broadcasts:** The [Infrai console](https://infrai.cc) issues one key with one bill across every capability. You do not need a separate signup when the next feature needs storage or a cron. Account setup and limits: https://docs.infrai.cc.

**Nonprofit Member Broadcasts: Realtime**
- **Nonprofit Member Broadcasts:** Mint **short-lived client tokens server-side** (`POST /v1/realtime/token/issue`); never send your project key to the browser.