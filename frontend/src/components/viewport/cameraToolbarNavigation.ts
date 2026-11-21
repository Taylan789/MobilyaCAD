export type ToolbarDirection = "next" | "previous";

export function getNextToolbarIndex(
  currentIndex: number,
  enabledIndices: readonly number[],
  direction: ToolbarDirection
): number {
  if (enabledIndices.length === 0) return currentIndex;

  const currentPosition = enabledIndices.indexOf(currentIndex);
  const step = direction === "next" ? 1 : -1;
  const origin = currentPosition >= 0
    ? currentPosition
    : direction === "next"
      ? -1
      : 0;
  const nextPosition = (origin + step + enabledIndices.length) % enabledIndices.length;

  return enabledIndices[nextPosition];
}
