import React from "react";

export function interleave(
  arr: React.ReactNode[],
  x: React.ReactNode,
): React.ReactNode[] {
  return arr
    .flatMap((e, i) => [
      e,
      i < arr.length - 1 && (
        <React.Fragment key={`sep-${i}`}>{x}</React.Fragment>
      ),
    ])
    .filter(Boolean);
}
