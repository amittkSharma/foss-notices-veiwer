import { describe, expect, it } from "vitest";
import { splitWithOffsets } from "./textBlocks";

describe("splitWithOffsets", () => {
  it("splits on every delimiter match and keeps each piece's original offset", () => {
    const input = "aaa\n-----\nbbb\n-----\nccc";
    const blocks = splitWithOffsets(input, /^-{5,}$/m);

    expect(blocks.map((b) => b.text)).toEqual(["aaa\n", "\nbbb\n", "\nccc"]);
    expect(blocks[0]?.start).toBe(0);
    expect(blocks[1]?.start).toBe(input.indexOf("\nbbb"));
    expect(blocks[2]?.start).toBe(input.indexOf("\nccc"));
  });

  it("returns the whole input as a single block when the delimiter never matches", () => {
    const input = "no delimiters here";
    const blocks = splitWithOffsets(input, /^-{5,}$/m);
    expect(blocks).toEqual([{ text: input, start: 0 }]);
  });

  it("adds the global flag even if the delimiter didn't have one", () => {
    const input = "a\n===\nb\n===\nc";
    const blocks = splitWithOffsets(input, /^={3,}$/m);
    expect(blocks.map((b) => b.text)).toEqual(["a\n", "\nb\n", "\nc"]);
  });
});
