export type SubmissionResourceInput = {
  url: string;
  name: string | null;
  mimeType: string | null;
  thumbnailUrl: string | null;
};

const optionalString = (value: unknown, maxLength: number) =>
  typeof value === "string" && value.trim()
    ? value.trim().slice(0, maxLength)
    : null;

const isSafeResourceUrl = (value: string) => {
  if (value.startsWith("/")) return true;
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
};

export const parseSubmissionResources = (
  value: unknown,
): SubmissionResourceInput[] | null => {
  if (!Array.isArray(value)) return null;

  const resources: SubmissionResourceInput[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object") return null;
    const record = item as Record<string, unknown>;
    if (
      typeof record.url !== "string" ||
      !record.url.trim() ||
      !isSafeResourceUrl(record.url.trim())
    ) {
      return null;
    }
    resources.push({
      url: record.url.trim(),
      name: optionalString(record.name, 255),
      mimeType: optionalString(record.mimeType, 120),
      thumbnailUrl:
        typeof record.thumbnailUrl === "string" &&
        record.thumbnailUrl.trim() &&
        isSafeResourceUrl(record.thumbnailUrl.trim())
          ? record.thumbnailUrl.trim()
          : null,
    });
  }

  return resources;
};

export type FeedbackInput = {
  content: string | null;
  images: Array<{ url: string; name: string | null }>;
  adjustmentItems: Array<{
    id: string | null;
    title: string;
    content: string | null;
    images: Array<{ url: string; name: string | null }>;
  }>;
};

const parseImages = (
  value: unknown,
): Array<{ url: string; name: string | null }> | null => {
  if (!Array.isArray(value)) return null;
  const images: Array<{ url: string; name: string | null }> = [];
  for (const item of value) {
    if (!item || typeof item !== "object") return null;
    const record = item as Record<string, unknown>;
    if (
      typeof record.url !== "string" ||
      !record.url.trim() ||
      !isSafeResourceUrl(record.url.trim())
    ) {
      return null;
    }
    images.push({
      url: record.url.trim(),
      name: optionalString(record.name, 255),
    });
  }
  return images;
};

export const parseFeedbackInput = (value: unknown): FeedbackInput | null => {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  const images = parseImages(record.images);
  if (!images || !Array.isArray(record.adjustmentItems)) return null;

  const adjustmentItems: FeedbackInput["adjustmentItems"] = [];
  for (const item of record.adjustmentItems) {
    if (!item || typeof item !== "object") return null;
    const adjustment = item as Record<string, unknown>;
    const title = optionalString(adjustment.title, 255);
    const adjustmentImages = parseImages(adjustment.images);
    if (!title || !adjustmentImages) return null;
    adjustmentItems.push({
      id: optionalString(adjustment.id, 64),
      title,
      content: optionalString(adjustment.content, 20_000),
      images: adjustmentImages,
    });
  }

  const content = optionalString(record.content, 20_000);
  if (!content && images.length === 0 && adjustmentItems.length === 0) {
    return null;
  }

  return { content, images, adjustmentItems };
};
