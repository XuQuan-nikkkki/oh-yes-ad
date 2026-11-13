import { GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { randomUUID } from "node:crypto";
import { IMAGE_ID, validImageUpload } from "./image-upload-config";

export { MAX_IMAGE_BYTES, IMAGE_ID } from "./image-upload-config";

export function imageStorage() {
  const { R2_BUCKET_NAME, R2_ENDPOINT, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY } = process.env;
  if (!R2_BUCKET_NAME || !R2_ENDPOINT || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY) {
    throw new Error("图片存储尚未配置");
  }
  const endpoint = new URL(R2_ENDPOINT);
  if (endpoint.protocol !== "https:" || !/^[a-f0-9]{32}(\.[a-z0-9-]+)?\.r2\.cloudflarestorage\.com$/.test(endpoint.hostname) || endpoint.pathname !== "/") {
    throw new Error("图片存储地址配置无效");
  }
  return {
    bucket: R2_BUCKET_NAME,
    client: new S3Client({
      region: "auto",
      endpoint: endpoint.origin,
      maxAttempts: 2,
      requestChecksumCalculation: "WHEN_REQUIRED",
      responseChecksumValidation: "WHEN_REQUIRED",
      credentials: { accessKeyId: R2_ACCESS_KEY_ID, secretAccessKey: R2_SECRET_ACCESS_KEY },
    }),
  };
}

export class InvalidImageUpload extends Error {}

export async function createImageUpload(size: number, contentType: string) {
  if (!validImageUpload(size, contentType)) {
    throw new InvalidImageUpload("请选择 20 MB 以内的 JPG、PNG 或 WebP 图片");
  }
  const id = randomUUID();
  const { client, bucket } = imageStorage();
  try {
    const uploadUrl = await getSignedUrl(client, new PutObjectCommand({
      Bucket: bucket,
      Key: `images/${id}/original`,
      ContentType: contentType,
      ContentLength: size,
    }), { expiresIn: 600, signableHeaders: new Set(["content-type", "content-length"]) });
    return { uploadUrl, url: `/api/images/${id}` };
  } finally {
    client.destroy();
  }
}

export async function imageReadUrl(id: string) {
  if (!IMAGE_ID.test(id)) throw new Error("图片标识无效");
  const { client, bucket } = imageStorage();
  try {
    return await getSignedUrl(client, new GetObjectCommand({
      Bucket: bucket,
      Key: `images/${id}/original`,
      ResponseCacheControl: "private, no-store",
    }), { expiresIn: 300 });
  } finally {
    client.destroy();
  }
}
