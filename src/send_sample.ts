import { broadcast } from "./nonprofit_broadcast.js";

const result = await broadcast({
  messageId: "campaign-spring-2026-final",
  organizationId: "river-town-food-bank",
  kind: "campaign_report",
  campaignName: "Spring pantry drive",
  summary: "Members funded 840 pantry boxes for neighborhood pickup.",
  raised: 16800,
});

console.log(JSON.stringify(result, null, 2));
