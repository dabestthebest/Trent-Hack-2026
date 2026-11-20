import config from "./playwright.config.mjs";

export default {
  ...config,
  testMatch: "final-k.spec.mjs",
  projects: config.projects.filter(project => project.name === "mobile-375x812"),
  reporter: [["list"], ["./final-k-reporter.mjs"]],
};
