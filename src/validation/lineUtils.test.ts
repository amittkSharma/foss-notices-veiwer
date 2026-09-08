import { describe, expect, it } from "vitest";
import { offsetToLineColumn } from "./lineUtils";

describe("offsetToLineColumn", () => {
  it("returns line 1 column 1 for the start of the text", () => {
    expect(offsetToLineColumn("abc\ndef", 0)).toEqual({ line: 1, column: 1 });
  });

  it("counts columns within the first line", () => {
    expect(offsetToLineColumn("abc\ndef", 2)).toEqual({ line: 1, column: 3 });
  });

  it("advances the line and resets the column after a newline", () => {
    expect(offsetToLineColumn("abc\ndef", 4)).toEqual({ line: 2, column: 1 });
    expect(offsetToLineColumn("abc\ndef", 6)).toEqual({ line: 2, column: 3 });
  });

  it("counts every newline crossed for offsets several lines in", () => {
    expect(offsetToLineColumn("a\nb\nc\nd", 6)).toEqual({ line: 4, column: 1 });
  });

  it("clamps to the end of the text for an out-of-range offset", () => {
    expect(offsetToLineColumn("abc", 100)).toEqual({ line: 1, column: 4 });
  });
});
