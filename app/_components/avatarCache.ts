import type { Avatar } from "@/lib/avatar-catalog";

let cataloguePromise: Promise<Avatar[]> | null = null;
const imagePromises = new Map<string, Promise<void>>();

export function getAvatarCatalogue(): Promise<Avatar[]> {
  if (!cataloguePromise) {
    cataloguePromise = fetch("/api/customization", { credentials: "include" })
      .then((response) => {
        if (!response.ok) throw new Error("Failed to load avatar catalogue");
        return response.json();
      })
      .then((data) => data.avatars ?? [])
      .catch((error) => {
        cataloguePromise = null;
        throw error;
      });
  }
  return cataloguePromise;
}

export function preloadAvatarImage(url: string | null | undefined): Promise<void> {
  if (!url) return Promise.resolve();
  const existing = imagePromises.get(url);
  if (existing) return existing;
  const promise = new Promise<void>((resolve) => {
    const image = new Image();
    image.decoding = "async";
    image.onload = () => resolve();
    image.onerror = () => resolve();
    image.src = url;
  });
  imagePromises.set(url, promise);
  return promise;
}

export function primeAvatarCatalogue(avatars: Avatar[]) {
  for (const avatar of avatars) preloadAvatarImage(avatar.imageUrl);
}
