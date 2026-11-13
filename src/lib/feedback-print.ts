import type { WorkItemSubmission } from "@/components/project-detail/WorkItemSubmissions";

/** Opens a local, authenticated print view without uploading feedback elsewhere. */
export function openFeedbackPrint(submission: WorkItemSubmission) {
  const feedback = submission.feedback;
  if (!feedback) return;
  const popup = window.open("", "_blank");
  if (!popup) throw new Error("请允许打开新窗口后重试导出");
  popup.opener = null;
  const doc = popup.document;
  doc.title = `V${submission.versionNumber}${submission.versionTitle ? `-${submission.versionTitle}` : ""}-本版反馈`;
  doc.documentElement.lang = "zh-CN";
  const style = doc.createElement("style");
  style.textContent = `
    @page { size: A4; margin: 16mm; }
    * { box-sizing: border-box; }
    body { margin: 0; color: #262626; background: #f5f5f5; font: 14px/1.75 -apple-system,BlinkMacSystemFont,"Segoe UI","PingFang SC","Microsoft YaHei",sans-serif; }
    main { max-width: 760px; margin: 24px auto; padding: 40px; background: white; }
    h1 { margin: 0 0 8px; font-size: 22px; }
    .version, footer, .label { color: #888; }
    .version { margin-bottom: 24px; }
    p { white-space: pre-wrap; overflow-wrap: anywhere; margin: 12px 0 20px; orphans: 3; widows: 3; }
    .adjustments { border-top: 1px solid #eee; margin-top: 24px; padding-top: 16px; }
    section { padding: 16px 0; border-bottom: 1px solid #eee; }
    h2 { display: flex; align-items: baseline; gap: 10px; font-size: 16px; margin: 0 0 10px; break-after: avoid; }
    .number { flex: 0 0 24px; text-align: center; line-height: 24px; border-radius: 50%; background: #eaf3ff; color: #1677ff; font-size: 13px; print-color-adjust: exact; }
    .title { min-width: 0; overflow-wrap: anywhere; white-space: pre-wrap; }
    figure { margin: 18px 0; break-inside: avoid; }
    img { display: block; width: auto; max-width: 100%; height: auto; max-height: 235mm; object-fit: contain; }
    footer { margin-top: 24px; font-size: 12px; }
    nav { padding: 16px; text-align: center; background: white; }
    button { margin-left: 12px; padding: 8px 16px; border: 0; border-radius: 6px; background: #1677ff; color: white; cursor: pointer; }
    button:disabled { background: #aaa; cursor: wait; }
    @media print { body { background: white; } main { max-width: none; margin: 0; padding: 0; } nav { display: none; } }
  `;
  doc.head.append(style);
  const el = <K extends keyof HTMLElementTagNameMap>(tag: K, text?: string, className?: string) => {
    const node = doc.createElement(tag);
    if (text !== undefined) node.textContent = text;
    if (className) node.className = className;
    return node;
  };
  const nav = el("nav");
  const status = el("span", "正在加载原图…");
  const button = el("button", "保存为 PDF");
  button.disabled = true;
  button.onclick = () => popup.print();
  nav.append(status, button);
  const main = el("main");
  main.append(el("h1", "本版反馈"), el("div", `V${submission.versionNumber}${submission.versionTitle ? ` · ${submission.versionTitle}` : ""}`, "version"));
  const pending: Promise<void>[] = [];
  const images = (parent: HTMLElement, list: typeof feedback.images) => {
    for (const image of list ?? []) {
      const figure = el("figure");
      const img = el("img");
      img.alt = image.name || "反馈图片";
      figure.append(img);
      parent.append(figure);
      pending.push(new Promise<void>((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error("图片加载超时")), 60000);
        img.onload = () => { clearTimeout(timer); resolve(); };
        img.onerror = () => { clearTimeout(timer); reject(new Error("图片加载失败")); };
        const url = new URL(image.url, window.location.origin);
        if (!["https:", "http:"].includes(url.protocol)) {
          clearTimeout(timer);
          reject(new Error("图片地址不支持"));
          return;
        }
        img.src = url.href;
      }));
    }
  };
  if (feedback.content) main.append(el("p", feedback.content));
  images(main, feedback.images);
  if (feedback.adjustmentItems?.length) {
    const list = el("div", undefined, "adjustments");
    list.append(el("div", "调整项", "label"));
    feedback.adjustmentItems.forEach((item, index) => {
      const section = el("section");
      const heading = el("h2");
      heading.append(el("span", String(index + 1), "number"), el("span", item.title, "title"));
      section.append(heading);
      if (item.content) section.append(el("p", item.content));
      images(section, item.images);
      list.append(section);
    });
    main.append(list);
  }
  main.append(el("footer", `${feedback.recordedBy.name} · ${new Date(feedback.recordedAt).toLocaleString("zh-CN")}`));
  doc.body.replaceChildren(nav, main);
  void Promise.all([...pending, doc.fonts.ready]).then(() => {
    if (popup.closed) return;
    status.textContent = "内容已就绪。点击保存，在打印窗口选择“另存为 PDF”；建议关闭页眉和页脚。";
    button.disabled = false;
  }).catch(() => {
    status.textContent = "部分原图加载失败或超时，请关闭此页后重新导出，避免 PDF 缺少图片。";
  });
}
