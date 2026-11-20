import { describe, expect, it } from "vitest";

import { parseInviteLocal, sanitiseInvite } from "./invite";

const TODAY = "2026-11-20"; // a Friday

describe("parseInviteLocal", () => {
  it("reads the winter ball invite", () => {
    expect(
      parseInviteLocal(
        "winter ball tickets are £55, need names by fri, it's on fri 4th dec!!",
        TODAY,
      ),
    ).toEqual({
      label: "Winter ball",
      amountPence: 5500,
      date: "2026-12-04",
    });
  });

  it("reads 'quid each' and 'the 10th'", () => {
    expect(
      parseInviteLocal("xmas meal at Zizzi on the 10th, it's like 28 quid each", TODAY),
    ).toEqual({
      label: "Christmas meal",
      amountPence: 2800,
      date: "2026-12-10",
    });
  });

  it("reads a UK numeric date and a deposit", () => {
    expect(
      parseInviteLocal("we're doing a ski trip in feb, deposit is £450 due 12/12", TODAY),
    ).toEqual({
      label: "Ski trip deposit",
      amountPence: 45000,
      date: "2026-12-12",
    });
  });

  it("prefers the per-person amount", () => {
    expect(parseInviteLocal("table is £120 total, £24 each, saturday", TODAY).amountPence).toBe(
      2400,
    );
  });

  it("handles pence and relative days", () => {
    const p = parseInviteLocal("pres tmrw then rock city, entry £12.50", TODAY);
    expect(p).toEqual({ label: "Pres", amountPence: 1250, date: "2026-11-21" });
  });

  it("rolls dates into next year", () => {
    expect(parseInviteLocal("gig on 3rd jan, £30", TODAY).date).toBe("2027-01-03");
    expect(parseInviteLocal("gig 3/1, £30", TODAY).date).toBe("2027-01-03");
  });

  it("next weekday means the following week", () => {
    expect(parseInviteLocal("dinner next sat £20", TODAY).date).toBe("2026-11-28");
    expect(parseInviteLocal("dinner sat £20", TODAY).date).toBe("2026-11-21");
    expect(parseInviteLocal("drinks friday £15", TODAY).date).toBe("2026-11-20");
  });

  it("returns nulls when nothing is found", () => {
    expect(parseInviteLocal("hey are you around later?", TODAY)).toEqual({
      label: null,
      amountPence: null,
      date: null,
    });
    expect(parseInviteLocal("   ", TODAY)).toEqual({ label: null, amountPence: null, date: null });
  });
});

describe("sanitiseInvite", () => {
  it("drops impossible values", () => {
    expect(
      sanitiseInvite({ label: "  x ".repeat(30), amountPence: 12.5, date: "2026-02-30" }, TODAY),
    ).toEqual({
      label: Array(20).fill("x").join(" "),
      amountPence: null,
      date: null,
    });
    expect(
      sanitiseInvite({ label: "Ball", amountPence: 5500, date: "2026-11-19" }, TODAY).date,
    ).toBeNull();
    expect(
      sanitiseInvite({ label: "Ball", amountPence: 5500, date: "2028-01-01" }, TODAY).date,
    ).toBeNull();
    expect(sanitiseInvite({ label: "Ball", amountPence: 5500, date: "2026-12-04" }, TODAY)).toEqual(
      {
        label: "Ball",
        amountPence: 5500,
        date: "2026-12-04",
      },
    );
  });
});
