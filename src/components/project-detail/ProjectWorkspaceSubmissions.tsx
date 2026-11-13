"use client";

import { useMemo, useState } from "react";
import { Empty, Drawer, Image, Input, Tag } from "antd";
import { FileTextOutlined, RightOutlined, SearchOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import { imageThumbnail } from "@/components/ImageAttachmentPicker";
import type { ProjectBrief, ProjectBriefWorkItem } from "./ProjectBriefProgressContent";
import type { WorkItemSubmission, WorkItemSubmissionResource } from "./WorkItemSubmissions";
import styles from "./ProjectWorkspaceSubmissions.module.css";

type Brief = ProjectBrief & { workItems: ProjectBriefWorkItem[] };
type Selection = { briefId: string; workItemId: string } | null;

const latestAt = (item: ProjectBriefWorkItem) => Math.max(0, ...(item.submissions ?? []).map((version) => dayjs(version.submittedAt).valueOf() || 0));
const formatDate = (value: string) => dayjs(value).format("YYYY-MM-DD HH:mm");
const resourceName = (resource: WorkItemSubmissionResource) => {
  if (resource.name?.trim()) return resource.name.trim();
  try {
    return decodeURIComponent(new URL(resource.url, "http://local").pathname.split("/").filter(Boolean).pop() || "文件");
  } catch {
    return resource.url;
  }
};
const resourceCount = (version: WorkItemSubmission, kind: "OUTPUT" | "SOURCE") => (version.resources ?? []).filter((resource) => resource.kind === kind).length;
const imageCount = (version: WorkItemSubmission) => (version.feedback?.images?.length ?? 0) + (version.feedback?.adjustmentItems ?? []).reduce((count, item) => count + (item.images?.length ?? 0), 0);

function Resources({ resources }: { resources: WorkItemSubmissionResource[] }) {
  return <div className={styles.resources}>{resources.map((resource) => <a key={resource.id} href={resource.url} target="_blank" rel="noreferrer" title={resourceName(resource)}>
    <FileTextOutlined /><span>{resourceName(resource)}</span>
  </a>)}</div>;
}

function FeedbackImages({ images }: { images?: Array<{ id: string; url: string; name?: string | null }> }) {
  if (!images?.length) return null;
  return <Image.PreviewGroup><div className={styles.images}>{images.map((image) =>
    <Image key={image.id} src={imageThumbnail(image.url)} preview={{ src: image.url }} alt={image.name || "反馈图片"} />
  )}</div></Image.PreviewGroup>;
}

function feedbackLabel(version: WorkItemSubmission) {
  if (!version.feedback) return "暂无反馈";
  const parts = ["已有反馈"];
  const adjustments = version.feedback.adjustmentItems?.length ?? 0;
  const pictures = imageCount(version);
  if (adjustments) parts.push(`${adjustments} 个调整项`);
  if (pictures) parts.push(`${pictures} 张图片`);
  return parts.join(" · ");
}

export default function ProjectWorkspaceSubmissions({ briefs }: { briefs: ProjectBrief[] }) {
  const [search, setSearch] = useState("");
  const [selection, setSelection] = useState<Selection>(null);
  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(null);
  const orderedBriefs = useMemo<Brief[]>(() => briefs.map((brief) => ({
    ...brief,
    workItems: [...(brief.workItems ?? [])].sort((left, right) => latestAt(right) - latestAt(left)),
  })).sort((left, right) => Math.max(0, ...right.workItems.map(latestAt)) - Math.max(0, ...left.workItems.map(latestAt)) || dayjs(right.createdAt).valueOf() - dayjs(left.createdAt).valueOf()), [briefs]);
  const query = search.trim().toLowerCase();
  const visibleBriefs = orderedBriefs.map((brief) => ({
    ...brief,
    workItems: query ? brief.workItems.filter((item) => `${brief.title} ${item.title} ${(item.submissions ?? []).map((version) => version.versionTitle ?? "").join(" ")}`.toLowerCase().includes(query)) : brief.workItems,
  })).filter((brief) => brief.workItems.length || (!query && !brief.workItems.length));
  const selectedBrief = orderedBriefs.find((brief) => brief.id === selection?.briefId);
  const selectedItem = selectedBrief?.workItems.find((item) => item.id === selection?.workItemId);
  const versions = [...(selectedItem?.submissions ?? [])].sort((left, right) => right.versionNumber - left.versionNumber || dayjs(right.submittedAt).valueOf() - dayjs(left.submittedAt).valueOf());
  const selectedVersion = versions.find((version) => version.id === selectedVersionId) ?? versions[0];
  const selectItem = (brief: Brief, item: ProjectBriefWorkItem) => { setSelection({ briefId: brief.id, workItemId: item.id }); setSelectedVersionId(null); };

  return <>
    <div className={styles.heading}><small>项目执行 / 项目提交内容</small><h2>项目提交内容</h2><p>按需求单和工作项归拢提交；每组按最近提交时间排列，工作项内按版本倒序查看提交与反馈。</p></div>
    <Input className={styles.search} prefix={<SearchOutlined />} placeholder="搜索需求单、工作项或版本标题" value={search} onChange={(event) => setSearch(event.target.value)} allowClear />
    <div className={styles.groups}>{visibleBriefs.length ? visibleBriefs.map((brief) => {
      const count = brief.workItems.reduce((total, item) => total + (item.submissions?.length ?? 0), 0);
      return <section className={styles.group} key={brief.id} aria-label={`需求单 ${brief.title}`}>
        <div className={styles.groupHeading}><div><small>需求单</small><h3>{brief.title}</h3></div><span>{brief.workItems.length} 个工作项 · {count} 版提交</span></div>
        {brief.workItems.length ? brief.workItems.map((item) => {
          const latest = [...(item.submissions ?? [])].sort((left, right) => right.versionNumber - left.versionNumber)[0];
          const final = item.submissions?.find((version) => version.isFinal);
          return latest ? <button type="button" className={styles.item} key={item.id} onClick={() => selectItem(brief, item)}>
            <span className={styles.itemMain}><span className={styles.itemTitle}><strong>{item.title}</strong>{final && <Tag color="green">最终版 V{final.versionNumber}</Tag>}{final && item.sourceFilePolicy === "REQUIRED" && !resourceCount(final, "SOURCE") && <Tag color="orange">待补源文件</Tag>}</span>
              <small>{item.submissions?.length} 版提交 · 最新 V{latest.versionNumber} · {feedbackLabel(latest)}{final && ` · ${resourceCount(final, "SOURCE")} 个源文件`}</small></span>
            <span className={styles.itemSide}><small>{latest.submittedBy.name} · {formatDate(latest.submittedAt)}</small><span>查看版本 <RightOutlined /></span></span>
          </button> : <div className={`${styles.item} ${styles.emptyItem}`} key={item.id}><span className={styles.itemMain}><strong>{item.title}</strong><small>尚未提交</small></span></div>;
        }) : <div className={styles.emptyBrief}>暂无工作项</div>}
      </section>;
    }) : <Empty description="没有匹配的提交内容" />}</div>
    <Drawer title={selectedItem ? <span>{selectedItem.title} <small className={styles.drawerPath}>/ {selectedBrief?.title}</small></span> : "提交内容"}
      open={Boolean(selectedItem)} onClose={() => setSelection(null)} width={880} className={styles.drawer} destroyOnHidden>
      {selectedVersion && <div className={styles.detail}>
        <section className={styles.versionList}><div className={styles.versionListHeading}><strong>提交版本</strong><span>共 {versions.length} 版 · 从新到旧</span></div>
          <div className={styles.versionOptions}>{versions.map((version) => <button key={version.id} type="button" className={version.id === selectedVersion.id ? styles.selectedVersion : ""}
            aria-pressed={version.id === selectedVersion.id} onClick={() => setSelectedVersionId(version.id)}><b>V{version.versionNumber}</b><span>{version.versionTitle || `V${version.versionNumber} 提交`}</span>{version.isFinal && <Tag color="green">最终版</Tag>}<small>{formatDate(version.submittedAt)}</small></button>)}</div>
        </section>
        <section className={styles.card}><div className={styles.versionHeader}><div><small>需求单 · {selectedBrief?.title}</small><h3>{selectedVersion.versionTitle || `V${selectedVersion.versionNumber} 提交`}</h3><span>V{selectedVersion.versionNumber} · {selectedVersion.submittedBy.name} 提交于 {formatDate(selectedVersion.submittedAt)}</span></div>{selectedVersion.isFinal && <Tag color="green">最终版</Tag>}</div></section>
        <section className={styles.card}><h4>本版提交</h4>{selectedVersion.contentText && <p className={styles.copy}>{selectedVersion.contentText}</p>}
          {resourceCount(selectedVersion, "OUTPUT") > 0 && <><div className={styles.subheading}>成品</div><Resources resources={(selectedVersion.resources ?? []).filter((resource) => resource.kind === "OUTPUT")} /></>}
          {selectedVersion.isFinal && <div className={styles.finalSources}><div className={styles.subheading}>源文件 <span>{selectedItem?.sourceFilePolicy === "REQUIRED" ? "必交" : "选交"}</span></div>
            {resourceCount(selectedVersion, "SOURCE") > 0 ? <Resources resources={(selectedVersion.resources ?? []).filter((resource) => resource.kind === "SOURCE")} /> : <p>{selectedItem?.sourceFilePolicy === "REQUIRED" ? "最终版尚未提交源文件" : "暂未提交源文件"}</p>}</div>}
          {!selectedVersion.contentText && !resourceCount(selectedVersion, "OUTPUT") && <p className={styles.muted}>本版没有正文或成品。</p>}
        </section>
        <section className={styles.card}><h4>本版反馈</h4>{selectedVersion.feedback ? <>
          {selectedVersion.feedback.content && <p className={styles.copy}>{selectedVersion.feedback.content}</p>}
          <FeedbackImages images={selectedVersion.feedback.images} />
          {!!selectedVersion.feedback.adjustmentItems?.length && <><div className={styles.subheading}>调整项 · {selectedVersion.feedback.adjustmentItems.length}</div><div className={styles.adjustments}>{selectedVersion.feedback.adjustmentItems.map((item, index) => <article key={item.id}><div><span>{index + 1}</span><strong>{item.title}</strong></div>{item.content && <p>{item.content}</p>}<FeedbackImages images={item.images} /></article>)}</div></>}
        </> : <p className={styles.muted}>暂无反馈</p>}</section>
      </div>}
    </Drawer>
  </>;
}
