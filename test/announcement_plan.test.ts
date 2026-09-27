import assert from "node:assert/strict";
import test from "node:test";
import { planAnnouncement } from "../src/nonprofit_broadcast.js";

test("routes a volunteer reminder to every member on the nonprofit channel", () => {
  const plan = planAnnouncement({
    messageId: "shift-42-reminder",
    organizationId: "river-town-food-bank",
    kind: "volunteer_reminder",
    shiftName: "Saturday packing line",
    startsAt: "2026-09-05T09:00:00.000Z",
    location: "Warehouse 2",
  });

  assert.deepEqual(plan, {
    messageId: "shift-42-reminder",
    channel: "nonprofit:river-town-food-bank:members",
    event: "announcement.volunteer_reminder",
    data: {
      kind: "volunteer_reminder",
      shiftName: "Saturday packing line",
      startsAt: "2026-09-05T09:00:00.000Z",
      location: "Warehouse 2",
    },
  });
});
