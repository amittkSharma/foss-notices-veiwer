import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { parseGenerateLicenseFileText } from "./generateLicenseFile";

const fixturePath = path.resolve(process.cwd(), "fixtures/generate-license-file-sample.txt");
const raw = readFileSync(fixturePath, "utf-8");

describe("parseGenerateLicenseFileText", () => {
  const doc = parseGenerateLicenseFileText(raw);

  it("ignores the tool's credit header and footer", () => {
    expect(doc.source).toBe("generate-license-file");
    expect(doc.components.some((c) => c.name.includes("generate-license-file"))).toBe(false);
  });

  it("expands a shared license block into one component per dependency", () => {
    const names = doc.components.map((c) => c.name);
    expect(names).toEqual(["left-pad", "express", "body-parser", "some-apache-lib"]);
  });

  it("parses the name@version dependency line, including for grouped packages", () => {
    const express = doc.components.find((c) => c.name === "express");
    expect(express?.version).toBe("4.19.2");
    const bodyParser = doc.components.find((c) => c.name === "body-parser");
    expect(bodyParser?.version).toBe("1.20.2");
  });

  it("guesses the SPDX id from the embedded license text", () => {
    const leftPad = doc.components.find((c) => c.name === "left-pad");
    expect(leftPad?.licenses[0]?.id).toBe("MIT");

    const apacheLib = doc.components.find((c) => c.name === "some-apache-lib");
    expect(apacheLib?.licenses[0]?.id).toBe("Apache-2.0");
  });

  it("attaches a trailing 'With the following notices' block as a copyright entry", () => {
    const apacheLib = doc.components.find((c) => c.name === "some-apache-lib");
    expect(apacheLib?.copyrights[0]?.text).toContain("Example Corp");

    const leftPad = doc.components.find((c) => c.name === "left-pad");
    expect(leftPad?.copyrights).toHaveLength(0);
  });
});
