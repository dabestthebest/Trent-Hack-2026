import config from "./playwright.config.mjs";

export default {
  ...config,
  testMatch: "final-smoke.spec.mjs",
  reporter: [["list"], ["./smoke-reporter.mjs"]],
};
