import { writeFileSync } from "node:fs";
import SmokeReporter from "./smoke-reporter.mjs";

export default class FinalKReporter extends SmokeReporter {
  onEnd() {
    writeFileSync(new URL("./final-k-results.json", import.meta.url), JSON.stringify(
      this.results.sort((a, b) => a.check.localeCompare(b.check)), null, 2,
    ) + "\n");
  }
}
