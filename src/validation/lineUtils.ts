export interface LineColumn {
  line: number;
  column: number;
}

/** Converts a 0-based character offset into a 1-indexed line/column pair. */
export function offsetToLineColumn(text: string, offset: number): LineColumn {
  let line = 1;
  let column = 1;
  const end = Math.min(offset, text.length);
  for (let i = 0; i < end; i += 1) {
    if (text[i] === "\n") {
      line += 1;
      column = 1;
    } else {
      column += 1;
    }
  }
  return { line, column };
}
