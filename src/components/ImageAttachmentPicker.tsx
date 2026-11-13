"use client";

import { useRef, useState, useSyncExternalStore } from "react";
import { Button, Image, Space, Typography, message } from "antd";
import { MAX_IMAGE_BYTES, IMAGE_TYPES } from "@/lib/image-upload-config";
import { CloseOutlined, PlusOutlined } from "@ant-design/icons";

import { startImageUpload, subscribeUploads, uploadSnapshot, type UploadTask } from "@/lib/image-upload-client";

export type ImageDraft = { url: string; name?: string; file?: File; upload?: UploadTask };
export const imageThumbnail = (url: string) => url;

export function ImageAttachmentPicker({ value = [], onChange, disabled = false, onReadingChange, hint = "支持选择或在此粘贴图片，每张最多 20 MB。" }: {
  hint?: string;
  value?: ImageDraft[];
  onChange?: (value: ImageDraft[]) => void;
  disabled?: boolean;
  onReadingChange?: (reading: boolean) => void;
}) {
  useSyncExternalStore(subscribeUploads, uploadSnapshot, () => 0);
  const input = useRef<HTMLInputElement>(null);
  const [reading, setReading] = useState(false);
  const [messageApi, contextHolder] = message.useMessage();
  const addFiles = async (files: File[]) => {
    if (disabled || reading) return;
    if (value.length + files.length > 20) { messageApi.warning("每组最多 20 张图片"); return; }
    setReading(true);
    onReadingChange?.(true);
    try {
      const additions: ImageDraft[] = [];
      for (const file of files) {
        if (!IMAGE_TYPES.includes(file.type) || file.size > MAX_IMAGE_BYTES) {
          messageApi.warning(`${file.name}：请选择 20 MB 以内的 JPG、PNG 或 WebP 图片`);
          continue;
        }
        const url = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(String(reader.result));
          reader.onerror = () => reject(new Error("无法读取图片"));
          reader.readAsDataURL(file);
        });
        additions.push({ url, name: file.name, file, upload: startImageUpload(file) });
      }
      if (additions.length) onChange?.([...value, ...additions]);
    } catch { messageApi.error("图片读取失败，请重新选择"); }
    finally { setReading(false); onReadingChange?.(false); }
  };
  return (
    <div tabIndex={0} aria-label="图片上传区域，可粘贴截图" onPaste={(event) => {
      const files = Array.from(event.clipboardData.files);
      if (files.length) { event.preventDefault(); void addFiles(files); }
    }}>
      {contextHolder}
      <Space wrap align="start">
        {value.map((image, index) => (
          <div key={`${index}-${image.name}`} style={{ width: 102 }}>
            <div style={{ position: "relative", width: 102, height: 102 }}>
              <Image width={102} height={102} style={{ objectFit: "contain", borderRadius: 8, border: "1px solid #e8ebf0", background: "#fafafa" }} src={imageThumbnail(image.url)} preview={{ src: image.url }} alt={image.name || "图片附件"} />
              <Button
                shape="circle"
                size="small"
                icon={<CloseOutlined style={{ fontSize: 10, display: "flex", alignItems: "center", justifyContent: "center", lineHeight: 1 }} />}
                styles={{ icon: { display: "flex", alignItems: "center", justifyContent: "center", margin: 0, lineHeight: 1 } }}
                aria-label={`移除${image.name || "图片"}`}
                title="移除图片"
                disabled={disabled || reading}
                style={{ position: "absolute", top: 4, right: 4, zIndex: 1, width: 24, minWidth: 24, height: 24, padding: 0, display: "inline-flex", alignItems: "center", justifyContent: "center", lineHeight: 1, boxShadow: "0 1px 4px rgb(0 0 0 / 12%)" }}
                onClick={(event) => {
                  event.stopPropagation();
                  onChange?.(value.filter((_, i) => i !== index));
                }}
              />
            </div>
            {image.upload ? (
              image.upload.status === "error" ? <Button type="link" danger size="small" disabled={disabled} title={image.upload.error} onClick={() => image.upload?.retry()}>上传失败，重试</Button> :
              <Typography.Text type="secondary" style={{ display: "block", fontSize: 12 }}>{({ queued: "等待上传", optimizing: "优化图片中…", uploading: "上传中…", done: "已上传" } as const)[image.upload.status]}</Typography.Text>
            ) : null}
            <Typography.Text ellipsis style={{ display: "block", width: 102 }} title={image.name}>{image.name || "图片"}</Typography.Text>
          </div>
        ))}
        <Button
          type="dashed"
          aria-label="添加图片"
          title="添加图片"
          icon={<PlusOutlined style={{ fontSize: 24 }} />}
          loading={reading}
          disabled={disabled || value.length >= 20}
          style={{ width: 102, height: 102, borderRadius: 8, background: "#fafafa" }}
          onClick={() => input.current?.click()}
        />
      </Space>
      <input ref={input} type="file" accept="image/jpeg,image/png,image/webp" multiple hidden style={{ display: "none" }} disabled={disabled || reading} onChange={(event) => {
        const files = Array.from(event.target.files ?? []);
        event.target.value = "";
        void addFiles(files);
      }} />
      <Typography.Text type="secondary" style={{ display: "block", marginTop: 8 }}>{hint}</Typography.Text>
    </div>
  );
}
