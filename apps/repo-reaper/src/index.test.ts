import { describe, expect, it } from "vitest";
import { APP_NAME } from "./index.js";

describe("Repo Reaper scaffold", () => {
  it("has the planned application identity", () => {
    expect(APP_NAME).toBe("Repo Reaper");
  });
});
