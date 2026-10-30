import { describe, expect, it } from "vitest";
import { NECROKIT_CORE_VERSION } from "./index.js";

describe("NecroKit core scaffold", () => {
  it("exposes a version for the shared foundation", () => {
    expect(NECROKIT_CORE_VERSION).toBe("0.1.0");
  });
});
