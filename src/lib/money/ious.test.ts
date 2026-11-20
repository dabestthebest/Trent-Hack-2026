import { describe, expect, it } from "vitest";

import { describeIou, iouTotals, owedMessage, reminderText, type Iou } from "./ious";

const crisps: Iou = {
  id: "1",
  direction: "owed",
  who: "Sam",
  kind: "money",
  amountPence: 80,
  what: "crisps",
  settled: false,
};
const lift: Iou = {
  id: "2",
  direction: "owe",
  who: "Alex",
  kind: "favour",
  amountPence: 0,
  what: "a lift to the station",
  settled: false,
};
const tenner: Iou = {
  id: "3",
  direction: "owe",
  who: "Jess",
  kind: "money",
  amountPence: 1000,
  what: "pizza",
  settled: false,
};

describe("IOUs", () => {
  it("totals only what's still open", () => {
    expect(iouTotals([crisps, lift, tenner, { ...tenner, id: "4", settled: true }])).toEqual({
      owedToMePence: 80,
      iOwePence: 1000,
      favoursOwedToMe: 0,
      favoursIOwe: 1,
    });
  });

  it("describes money and favours both ways", () => {
    expect(describeIou(crisps)).toBe("Sam owes you £0.80 for crisps");
    expect(describeIou(lift)).toBe("You owe Alex a lift to the station");
    expect(describeIou(tenner)).toBe("You owe Jess £10.00 for pizza");
    expect(describeIou({ ...lift, direction: "owed", what: "" })).toBe("Alex owes you a favour");
  });

  it("writes friendly messages", () => {
    expect(reminderText(crisps)).toBe(
      "Hey Sam! Quick one: you owe me £0.80 for crisps. No rush 😄",
    );
    expect(owedMessage(lift)).toBe("Hey Alex! Not forgotten I owe you a lift to the station 🙏");
  });
});
