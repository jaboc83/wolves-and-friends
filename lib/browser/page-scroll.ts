// Normalizes scroll offsets reported by different browser scrolling elements.
type ScrollElement = { scrollTop: number } | null | undefined;

export function pageScrollTop(
  windowScrollY: number,
  pageYOffset: number,
  scrollingElement: ScrollElement,
  documentElementScrollTop: number,
  bodyScrollTop: number,
) {
  return Math.max(
    windowScrollY || 0,
    pageYOffset || 0,
    scrollingElement?.scrollTop || 0,
    documentElementScrollTop || 0,
    bodyScrollTop || 0,
  );
}
