import { describe, expect, it } from "vitest";
import { DEFAULT_SETTINGS } from "../lib/core/types";
import { HORIZON_DAYS, istInstant, upcomingReminders } from "./schedule";

describe("reminder times (India time)", () => {
  it("converts India wall-clock time to the right instant", () => {
    expect(istInstant("2026-11-12", "21:00").toISOString()).toBe("2026-11-12T15:30:00.000Z");
    expect(istInstant("2026-11-12", "04:00").toISOString()).toBe("2026-11-11T22:30:00.000Z");
  });
  it("schedules daily 9 pm and 4 pm, Thursday 8 pm and Friday 10 am, for 4 weeks", () => {
    const now = new Date("2026-11-12T05:00:00Z"); // Thu 10:30 IST
    const occ = upcomingReminders(DEFAULT_SETTINGS, now, "2026-11-12");
    const daily = occ.filter((o) => o.kind === "dailyMenu");
    expect(daily[0].at.toISOString()).toBe("2026-11-12T15:30:00.000Z");
    expect(daily).toHaveLength(HORIZON_DAYS + 1);
    expect(occ.filter((o) => o.kind === "dinnerCheck")[0].at.toISOString()).toBe("2026-11-12T10:30:00.000Z");
    const plan = occ.filter((o) => o.kind === "planWeek");
    expect(plan[0].date).toBe("2026-11-12"); // Thursday
    expect(plan[0].at.toISOString()).toBe("2026-11-12T14:30:00.000Z");
    const grocery = occ.filter((o) => o.kind === "groceryOrder");
    expect(grocery[0].date).toBe("2026-11-13"); // Friday 10:00 IST
    expect(grocery[0].at.toISOString()).toBe("2026-11-13T04:30:00.000Z");
    expect(new Set(occ.map((o) => o.id)).size).toBe(occ.length);
    expect(occ.length).toBeLessThan(100); // well under Android's 500-alarm limit
  });
  it("skips times already past today and respects edited settings", () => {
    const now = new Date("2026-11-12T16:00:00Z"); // 21:30 IST, after 9 pm
    const occ = upcomingReminders({ ...DEFAULT_SETTINGS, dailyMenuTime: "21:45" }, now, "2026-11-12");
    expect(occ[0].kind).toBe("dailyMenu");
    expect(occ[0].at.toISOString()).toBe("2026-11-12T16:15:00.000Z");
  });
});
