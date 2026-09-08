export interface TextBlock {
  text: string;
  /** 0-based character offset of this block's start in the original input. */
  start: number;
}

/** Like String#split(delimiter), but keeps each piece's original character offset. */
export function splitWithOffsets(input: string, delimiter: RegExp): TextBlock[] {
  const flags = delimiter.flags.includes("g") ? delimiter.flags : `${delimiter.flags}g`;
  const global = new RegExp(delimiter.source, flags);
  const blocks: TextBlock[] = [];
  let cursor = 0;
  for (const match of input.matchAll(global)) {
    const index = match.index ?? input.length;
    blocks.push({ text: input.slice(cursor, index), start: cursor });
    cursor = index + match[0].length;
  }
  blocks.push({ text: input.slice(cursor), start: cursor });
  return blocks;
}
