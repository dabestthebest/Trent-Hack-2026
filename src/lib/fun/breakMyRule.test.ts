import { describe, expect, it } from "vitest";

import { judge, PUZZLES } from "./breakMyRule";

const [digits, delivery, login] = PUZZLES;

describe("Break My Rule", () => {
  it("finds the tests that split each pair of rules", () => {
    if (!digits || !delivery || !login) throw new Error("missing puzzle");
    expect([
      judge(digits, "123"),
      judge(digits, "112"),
      judge(digits, "1123"),
      judge(digits, "x"),
    ]).toEqual(["same", "split", "split", "invalid"]);
    expect([
      judge(delivery, "19.99"),
      judge(delivery, "20"),
      judge(delivery, "£20.00"),
      judge(delivery, "20.01"),
    ]).toEqual(["same", "split", "split", "same"]);
    expect([
      judge(login, "Password123"),
      judge(login, "Abc"),
      judge(login, "abcdefghij"),
      judge(login, ""),
    ]).toEqual(["same", "split", "split", "invalid"]);
  });
});
