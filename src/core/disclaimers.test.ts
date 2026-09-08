import { describe, expect, it } from "vitest";
import { ADAPTER_LICENSE_DISCLAIMERS } from "./disclaimers";

describe("ADAPTER_LICENSE_DISCLAIMERS", () => {
  it("defines a disclaimer for every adapter that produces license data from a non-SPDX source shape", () => {
    expect(ADAPTER_LICENSE_DISCLAIMERS.spdx).toBeDefined();
    expect(ADAPTER_LICENSE_DISCLAIMERS.cyclonedx).toBeDefined();
    expect(ADAPTER_LICENSE_DISCLAIMERS["generate-license-file"]).toBeDefined();
    expect(ADAPTER_LICENSE_DISCLAIMERS["black-duck"]).toBeDefined();
  });

  it("defines no disclaimer for 'unknown', a document not produced by any adapter", () => {
    expect(ADAPTER_LICENSE_DISCLAIMERS.unknown).toBeUndefined();
  });
});
