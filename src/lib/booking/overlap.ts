export function rangesOverlap(
  leftStart: Date,
  leftEnd: Date,
  rightStart: Date,
  rightEnd: Date,
): boolean {
  return leftStart.getTime() < rightEnd.getTime() && leftEnd.getTime() > rightStart.getTime();
}
