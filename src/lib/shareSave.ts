type ShareableNavigator = Navigator & {
  canShare?: (data: ShareData) => boolean;
  share?: (data: ShareData) => Promise<void>;
};

export async function shareOrDownload(blob: Blob, filename: string): Promise<'shared' | 'downloaded'> {
  const nav = navigator as ShareableNavigator;
  const file = new File([blob], filename, { type: blob.type });
  if (nav.share && nav.canShare && nav.canShare({ files: [file] })) {
    try {
      await nav.share({ files: [file], title: 'Speed Paint', text: 'スピードペイント動画を作りました' });
      return 'shared';
    } catch (err) {
      if ((err as DOMException)?.name === 'AbortError') return 'shared';
      // Fall through to download
    }
  }
  triggerDownload(blob, filename);
  return 'downloaded';
}

export function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
