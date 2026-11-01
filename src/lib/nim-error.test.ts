import { describe, expect, it } from "vitest";
import { getNimErrorMessage } from "./nim-error";

describe("NVIDIA NIM error messages", () => {
  it("explains rejected credentials or unavailable model access", () => {
    expect(getNimErrorMessage(401, false)).toContain("credentials or model access");
    expect(getNimErrorMessage(403, false)).toContain("credentials or model access");
  });

  it("explains a model identifier that NIM cannot find", () => {
    expect(getNimErrorMessage(404, false)).toContain("exact model ID");
  });

  it("explains quota limits and temporary provider outages", () => {
    expect(getNimErrorMessage(429, false)).toContain("rate limit or quota");
    expect(getNimErrorMessage(503, false)).toContain("temporarily unavailable");
  });

  it("warns when a failed reply may follow a saved action", () => {
    expect(getNimErrorMessage(401, true)).toContain("A change may already have been saved");
  });
});
