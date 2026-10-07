export function listenToMediaQuery(query: MediaQueryList, listener: () => void) {
  if (typeof query.addEventListener === 'function') {
    query.addEventListener('change', listener)
    return () => query.removeEventListener('change', listener)
  }
  // Older Safari exposes the original MediaQueryList listener API.
  query.addListener(listener)
  return () => query.removeListener(listener)
}
