export const avatarImageCache = new Map<string, Promise<void>>();

export function preloadAvatarImage(url: string | null | undefined): Promise<void> {
  if (!url) return Promise.resolve();
  const cached = avatarImageCache.get(url);
  if (cached) return cached;
  const promise = new Promise<void>((resolve) => {
    const image = new Image();
    image.decoding = "async";
    image.onload = () => resolve();
    image.onerror = () => resolve();
    image.src = url;
  });
  avatarImageCache.set(url, promise);
  return promise;
}
