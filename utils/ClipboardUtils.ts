export function copySelectedText(text: string): void {
  if (!text.trim()) return;

  if (navigator.clipboard?.writeText) {
    navigator.clipboard.writeText(text).catch(() => {});
  }
}
