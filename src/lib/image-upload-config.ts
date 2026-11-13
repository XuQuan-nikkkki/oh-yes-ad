export const MAX_IMAGE_BYTES = 20 * 1024 * 1024;
export const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
export const IMAGE_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
export function validImageUpload(size: unknown, contentType: unknown): boolean {
  return typeof size === "number" && Number.isSafeInteger(size) && size > 0 && size <= MAX_IMAGE_BYTES && typeof contentType === "string" && IMAGE_TYPES.includes(contentType);
}
