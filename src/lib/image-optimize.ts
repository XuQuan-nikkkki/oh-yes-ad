export function fittedImageSize(width: number, height: number) {
  const scale = Math.min(1, 3200 / Math.max(width, height));
  return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) };
}

/** Keep the selected file untouched; upload a smaller copy only when beneficial. */
export async function optimizeImage(file: File): Promise<Blob> {
  let bitmap: ImageBitmap | undefined;
  try {
    bitmap = await createImageBitmap(file);
    if (bitmap.width * bitmap.height > 100_000_000) throw new Error("图片像素过大，请缩小后重试");
    const size = fittedImageSize(bitmap.width, bitmap.height);
    // Small files already suitable for display need no extra encoding.
    if (size.width === bitmap.width && size.height === bitmap.height && (file.type === "image/png" || file.size < 512 * 1024)) return file;
    const canvas = document.createElement("canvas");
    canvas.width = size.width;
    canvas.height = size.height;
    const context = canvas.getContext("2d");
    if (!context) return file;
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = "high";
    context.drawImage(bitmap, 0, 0, size.width, size.height);
    const type = file.type === "image/png" ? "image/png" : "image/webp";
    const result = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, 0.9));
    return result && result.size < file.size ? result : file;
  } catch (error) {
    if (error instanceof Error && error.message === "图片像素过大，请缩小后重试") throw error;
    throw new Error("图片无法读取，请选择有效的 JPG、PNG 或 WebP 图片");
  } finally { bitmap?.close(); }
}
