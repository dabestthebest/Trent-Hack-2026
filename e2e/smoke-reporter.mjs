import { writeFileSync } from "node:fs";

export default class SmokeReporter {
  results = [];
  onTestEnd(test, result) {
    const attachment = result.attachments.find(a => a.name === "smoke-result");
    const data = attachment?.body ? JSON.parse(attachment.body.toString()) : { check: test.title, viewport: test.parent.project()?.name };
    this.results.push({ ...data, status: result.status === "passed" ? "pass" : "fail", failureMessage: result.errors.map(e => e.message?.replace(/\u001b\[[0-9;]*m/g, "")).join("\n") });
  }
  onEnd() {
    writeFileSync(new URL("./smoke-results.json", import.meta.url), JSON.stringify(this.results.sort((a, b) => a.check.localeCompare(b.check) || a.viewport.localeCompare(b.viewport)), null, 2) + "\n");
  }
}
