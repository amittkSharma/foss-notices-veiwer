import { describe, expect, it } from "vitest";
import { guessLicenseIdFromText } from "./licenseTextHeuristics";

describe("guessLicenseIdFromText", () => {
  it.each([
    ["MIT License\n\nPermission is hereby granted, free of charge...", "MIT"],
    ["Apache License\nVersion 2.0, January 2004", "Apache-2.0"],
    ["Permission to use, copy, modify, and/or distribute this software...", "ISC"],
    ["Redistribution and use in source and binary forms... neither the name of...", "BSD-3-Clause"],
    ["Redistribution and use in source and binary forms...", "BSD-2-Clause"],
    ["GNU GENERAL PUBLIC LICENSE\nVersion 3, 29 June 2007", "GPL-3.0"],
    ["GNU GENERAL PUBLIC LICENSE\nVersion 2, June 1991", "GPL-2.0"],
    ["This is free and unencumbered software released into the public domain.", "Unlicense"],
    ["Some entirely made-up license body nobody has seen before.", "Unknown License"],
  ])("classifies %#", (text, expected) => {
    expect(guessLicenseIdFromText(text)).toBe(expected);
  });
});
