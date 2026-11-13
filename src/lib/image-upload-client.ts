import { optimizeImage } from "./image-optimize";
export type UploadTask = {
  status: "queued" | "optimizing" | "uploading" | "done" | "error";
  promise: Promise<string>;
  url?: string;
  error?: string;
  retry: () => void;
};
let revision = 0;
const listeners = new Set<() => void>();
export const subscribeUploads = (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; };
export const uploadSnapshot = () => revision;
const notify = () => { revision++; listeners.forEach((listener) => listener()); };
let active = 0;
const queue: (() => void)[] = [];
function schedule<T>(run: () => Promise<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    queue.push(() => {
      active++;
      void run().then(resolve, reject).finally(() => { active--; queue.shift()?.(); });
    });
    if (active < 2) queue.shift()?.();
  });
}

export function startImageUpload(file: File): UploadTask {
  const task: UploadTask = { status: "error", promise: Promise.resolve(""), retry };
  let uploadFile: Blob | undefined;
  function retry() {
    if (["queued", "optimizing", "uploading", "processing", "done"].includes(task.status)) return;
    task.status = "queued";
    task.error = undefined;
    task.promise = schedule(async () => {
      task.status = "optimizing"; notify();
      uploadFile ??= await optimizeImage(file);
      task.status = "uploading"; notify();
      const prepare = await fetch("/api/images", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "prepare", size: uploadFile.size, contentType: uploadFile.type }),
        signal: AbortSignal.timeout(30_000),
      });
      if (!prepare.ok) throw new Error((await prepare.text()) || "无法准备图片上传");
      const { uploadUrl, url } = await prepare.json() as { uploadUrl: string; url: string };
      const direct = await fetch(uploadUrl, {
        method: "PUT", headers: { "Content-Type": uploadFile.type }, body: uploadFile,
        credentials: "omit", signal: AbortSignal.timeout(300_000),
      });
      if (!direct.ok) throw new Error("图片上传失败，请重试");
      task.url = url;
      task.status = "done"; notify();
      return url;
    }).catch((error: unknown) => {
      task.status = "error";
      task.error = error instanceof Error ? error.message : "图片上传失败，请检查网络后重试";
      notify();
      throw new Error(task.error);
    });
    // Upload starts before save; failures remain visible without unhandled rejections.
    void task.promise.catch(() => undefined);
    notify();
  }
  retry();
  return task;
}
