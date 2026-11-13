"use client";

import { ImageAttachmentPicker, imageThumbnail, type ImageDraft } from "@/components/ImageAttachmentPicker";
import { useMemo, useState, type ReactNode } from "react";
import {
  EditOutlined,
  LinkOutlined,
  PlusOutlined,
} from "@ant-design/icons";
import {
  Alert,
  Button,
  Checkbox,
  Collapse,
  Empty,
  Form,
  Image,
  Input,
  Modal,
  Select,
  Space,
  Steps,
  Tag,
  Tooltip,
  Typography,
  message,
} from "antd";
import dayjs from "dayjs";
import { startImageUpload } from "@/lib/image-upload-client";
import { openFeedbackPrint } from "@/lib/feedback-print";

export type WorkItemSubmissionResource = {
  id: string;
  kind: "OUTPUT" | "SOURCE";
  url: string;
  name?: string | null;
  mimeType?: string | null;
  thumbnailUrl?: string | null;
  sortOrder: number;
  uploadedBy?: { id: string; name: string } | null;
  updatedAt?: string;
};

export type WorkItemAdjustmentItem = {
  id: string;
  title: string;
  content?: string | null;
  sortOrder: number;
  images?: Array<{
    id: string;
    url: string;
    name?: string | null;
    sortOrder: number;
  }>;
};

export type WorkItemSubmission = {
  id: string;
  versionNumber: number;
  versionTitle?: string | null;
  contentText?: string | null;
  isFinal: boolean;
  submittedBy: { id: string; name: string };
  submittedAt: string;
  updatedAt?: string;
  resources?: WorkItemSubmissionResource[];
  feedback?: {
    id: string;
    content?: string | null;
    recordedBy: { id: string; name: string };
    recordedAt: string;
    updatedAt?: string;
    images?: Array<{
      id: string;
      url: string;
      name?: string | null;
      sortOrder: number;
    }>;
    adjustmentItems?: WorkItemAdjustmentItem[];
  } | null;
  adjustmentChecks?: Array<{
    id: string;
    adjustmentItemId: string;
    checkedBy: { id: string; name: string };
    checkedAt: string;
  }>;
};

type WorkItemForSubmissions = {
  id: string;
  type: string;
  sourceFilePolicy?: "REQUIRED" | "OPTIONAL";
  submissions?: WorkItemSubmission[];
};

type ResourceDraft = {
  url: string;
  name?: string;
  mimeType?: string;
  thumbnailUrl?: string;
};

type FeedbackDraft = {
  feedbackContent?: string;
  feedbackImages?: ImageDraft[];
  adjustmentItems?: Array<{
    id?: string;
    title?: string;
    content?: string;
    images?: ImageDraft[];
  }>;
};

type ModalState =
  | { kind: "submit" }
  | { kind: "edit"; submission: WorkItemSubmission }
  | { kind: "source"; submission: WorkItemSubmission }
  | { kind: "feedback"; submission: WorkItemSubmission }
  | null;

const resourceName = (resource: { url: string; name?: string | null }) => {
  if (resource.name?.trim()) return resource.name.trim();
  try {
    const pathname = new URL(resource.url, "http://local").pathname;
    return decodeURIComponent(pathname.split("/").filter(Boolean).pop() ?? resource.url);
  } catch {
    return resource.url;
  }
};

const ResourceGrid = ({
  resources,
}: {
  resources: WorkItemSubmissionResource[];
}) => (
  <div className="submission-resource-grid">
    {resources.map((resource) => (
      <a
        className="submission-resource-card"
        href={resource.url}
        target="_blank"
        rel="noreferrer"
        title={resource.name || resourceName(resource)}
        key={resource.id}
      >
        <span className="submission-resource-name">
          {resource.name || resourceName(resource)}
        </span>
        <LinkOutlined />
      </a>
    ))}
  </div>
);

const ResourceFields = ({
  name,
  label,
  required,
}: {
  name: string;
  label: string;
  required?: boolean;
}) => (
  <Form.List name={name}>
    {(fields, { add, remove }) => (
      <Form.Item label={label} required={required}>
        <div className="submission-link-list">
          {fields.map(({ key, ...field }, index) => (
            <div className="submission-link-row" key={key}>
              <Form.Item
                {...field}
                name={[field.name, "name"]}
                rules={[{ required: true, whitespace: true, message: "请输入内容名称" }]}
                noStyle
              >
                <Input placeholder="内容名称（必填）" aria-label="内容名称" />
              </Form.Item>
              <Form.Item
                {...field}
                name={[field.name, "url"]}
                rules={[
                  {
                    required,
                    type: "url",
                    message: required ? "请输入有效链接" : "链接格式不正确",
                  },
                ]}
                noStyle
              >
                <Input placeholder="粘贴文件或在线文档链接" />
              </Form.Item>
              <Button
                type="text"
                danger
                aria-label={`删除第 ${index + 1} 条链接`}
                onClick={() => remove(field.name)}
              >
                删除
              </Button>
            </div>
          ))}
          <Button
            className="submission-add-link"
            type="dashed"
            icon={<PlusOutlined />}
            onClick={() => add({ url: "", name: "" })}
            block
          >
            添加一条{label}
          </Button>
        </div>
      </Form.Item>
    )}
  </Form.List>
);

export const useWorkItemSubmissionManager = ({
  workItem,
  canManage,
  canSubmit = canManage,
  onChanged,
}: {
  workItem: WorkItemForSubmissions;
  canManage: boolean;
  canSubmit?: boolean;
  onChanged?: () => Promise<void> | void;
}): { extra: ReactNode; content: ReactNode; modal: ReactNode } => {
  const [messageApi, contextHolder] = message.useMessage();
  const [modal, setModal] = useState<ModalState>(null);
  const [feedbackStep, setFeedbackStep] = useState(0);
  const [activeAdjustment, setActiveAdjustment] = useState(0);
  const [saving, setSaving] = useState(false);
  const [readingImages, setReadingImages] = useState(false);
  const [form] = Form.useForm();
  const submissions = useMemo(
    () => [...(workItem.submissions ?? [])].sort((a, b) => b.versionNumber - a.versionNumber),
    [workItem.submissions],
  );
  const finalSubmission = submissions.find((item) => item.isFinal);
  const outputResources = (submission: WorkItemSubmission) =>
    (submission.resources ?? []).filter((item) => item.kind === "OUTPUT");
  const sourceResources = (submission: WorkItemSubmission) =>
    (submission.resources ?? []).filter((item) => item.kind === "SOURCE");

  const closeModal = () => {
    setModal(null);
    form.resetFields();
  };

  const openSubmit = () => {
    const previousAdjustments = submissions[0]?.feedback?.adjustmentItems ?? [];
    form.setFieldsValue({
      versionTitle: "",
      contentText: "",
      resources: workItem.type === "DESIGN" ? [{ url: "", name: "" }] : [],
      adjustmentCheckIds: previousAdjustments.map((item) => item.id),
    });
    setModal({ kind: "submit" });
  };

  const openEdit = (submission: WorkItemSubmission) => {
    form.setFieldsValue({
      versionTitle: submission.versionTitle ?? "",
      contentText: submission.contentText ?? "",
      resources: outputResources(submission).map((item) => ({
        url: item.url,
        name: item.name ?? "",
        mimeType: item.mimeType ?? "",
        thumbnailUrl: item.thumbnailUrl ?? "",
      })),
    });
    setModal({ kind: "edit", submission });
  };

  const openSource = (submission: WorkItemSubmission) => {
    form.setFieldsValue({
      resources: sourceResources(submission).map((item) => ({
        url: item.url,
        name: item.name ?? "",
        mimeType: item.mimeType ?? "",
        thumbnailUrl: item.thumbnailUrl ?? "",
      })),
    });
    setModal({ kind: "source", submission });
  };

  const openFeedback = (submission: WorkItemSubmission) => {
    const feedback = submission.feedback;
    setFeedbackStep(0);
    setActiveAdjustment(0);
    form.setFieldsValue({
      feedbackContent: feedback?.content ?? "",
      feedbackImages: (feedback?.images ?? []).map((item) => ({
        url: item.url,
        name: item.name ?? "",
      })),
      adjustmentItems: (feedback?.adjustmentItems ?? []).map((item) => ({
        id: item.id,
        title: item.title,
        content: item.content ?? "",
        images: (item.images ?? []).map((image) => ({
          url: image.url,
          name: image.name ?? "",
        })),
      })),
    });
    setModal({ kind: "feedback", submission });
  };

  const request = async (url: string, method: "POST" | "PATCH" | "PUT", body: unknown) => {
    const response = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!response.ok) throw new Error((await response.text()) || "保存失败");
  };

  const saveModal = async () => {
    if (!modal || saving || readingImages) return;
    setSaving(true);
    try {
      if (modal.kind === "feedback") {
        const values = form.getFieldsValue(true) as FeedbackDraft;
        const items = values.adjustmentItems ?? [];
        const missingIndex = items.findIndex((item) => !item.title?.trim());
        if (missingIndex >= 0) {
          setFeedbackStep(1);
          setActiveAdjustment(missingIndex);
          const fieldName = ["adjustmentItems", missingIndex, "title"];
          form.setFields([{ name: fieldName, errors: ["请输入调整项标题"] }]);
          messageApi.warning(`请填写调整项 ${missingIndex + 1} 的标题`);
          return;
        }
        const uploadImages = (images: ImageDraft[]) => Promise.all(images.map(async (image) => {
          if (!image.file) return { url: image.url, name: image.name };
          image.upload ??= startImageUpload(image.file);
          try {
            return { url: await image.upload.promise, name: image.name };
          } catch {
            throw new Error(`${image.name || "图片"}上传失败，请返回图片处重试或移除后保存`);
          }
        }));
        const [images, uploadedItems] = await Promise.all([
          uploadImages(values.feedbackImages ?? []),
          Promise.all(items.map(async (item) => ({ ...item, images: await uploadImages(item.images ?? []) }))),
        ]);
        await request(
          `/api/work-items/${workItem.id}/submissions/${modal.submission.id}/feedback`,
          "PUT",
          {
            feedback: {
              content: values.feedbackContent,
              images,
              adjustmentItems: uploadedItems,
            },
          },
        );
      } else {
        const values = await form.validateFields();
        const resources = (values.resources ?? []).filter(
          (item: ResourceDraft) => item?.url?.trim(),
        );
        if (modal.kind === "submit") {
          await request(`/api/work-items/${workItem.id}/submissions`, "POST", {
            versionTitle: values.versionTitle,
            contentText: values.contentText,
            resources,
            adjustmentCheckIds: values.adjustmentCheckIds ?? [],
          });
        } else {
          await request(
            `/api/work-items/${workItem.id}/submissions/${modal.submission.id}`,
            "PATCH",
            {
              mode: modal.kind === "source" ? "source" : "content",
              versionTitle: values.versionTitle,
              contentText: values.contentText,
              resources,
            },
          );
        }
      }
      messageApi.success("已保存");
      closeModal();
      await onChanged?.();
    } catch (error) {
      const validationMessage =
        error &&
        typeof error === "object" &&
        "errorFields" in error &&
        Array.isArray(error.errorFields)
          ? error.errorFields
              .flatMap((field) =>
                field &&
                typeof field === "object" &&
                "errors" in field &&
                Array.isArray(field.errors)
                  ? field.errors
                  : [],
              )
              .find((item): item is string => typeof item === "string")
          : null;
      messageApi.error(
        validationMessage ||
          (error instanceof Error ? error.message : "保存失败"),
      );
    } finally {
      setSaving(false);
    }
  };

  const setFinal = async (submissionId?: string) => {
    try {
      await request(
        `/api/work-items/${workItem.id}/final-submission`,
        "PATCH",
        { submissionId: submissionId ?? null },
      );
      messageApi.success(submissionId ? "已更新最终版" : "已清空最终版");
      await onChanged?.();
    } catch (error) {
      messageApi.error(error instanceof Error ? error.message : "更新最终版失败");
    }
  };

  const finalExtra = (
    <Space wrap>
      {submissions.length ? (
        <span className="submission-final-select">
          <Typography.Text>最终版：</Typography.Text>
          <Select
            size="small"
            value={finalSubmission?.id}
            allowClear
            placeholder="待定"
            options={submissions.map((submission) => ({
              value: submission.id,
              label: `V${submission.versionNumber}${submission.versionTitle?.trim() ? ` · ${submission.versionTitle.trim()}` : ""}`,
            }))}
            onChange={(value) => void setFinal(value)}
            disabled={!canManage}
          />
        </span>
      ) : null}
      {canSubmit ? (
        finalSubmission ? (
          <Tooltip title="已有最终版，如需继续提交，请先清空最终版">
            <span>
              <Button
                variant="text"
                color="primary"
                disabled
                icon={<PlusOutlined />}
                styles={{ root: { padding: 6 } }}
              >
                新增提交内容
              </Button>
            </span>
          </Tooltip>
        ) : (
          <Button
            variant="text"
            color="primary"
            icon={<PlusOutlined />}
            onClick={openSubmit}
            styles={{ root: { padding: 6 } }}
          >
            新增提交内容
          </Button>
        )
      ) : null}
    </Space>
  );

  const content = submissions.length ? (
    <Collapse
      className="work-item-submission-versions"
      accordion
      defaultActiveKey={[submissions[0].id]}
      items={submissions.map((submission, index) => {
        const outputs = outputResources(submission);
        const sources = sourceResources(submission);
        const feedback = submission.feedback;
        const adjustmentItems = feedback?.adjustmentItems ?? [];
        return {
          key: submission.id,
          label: (
            <div className="submission-version-label">
              <Space size={8} wrap>
                <Typography.Text strong>V{submission.versionNumber}</Typography.Text>
                {submission.versionTitle?.trim() ? (
                  <Typography.Text>{submission.versionTitle.trim()}</Typography.Text>
                ) : null}
                {submission.isFinal ? (
                  <>
                    <Tag color="green">最终版</Tag>
                    {workItem.sourceFilePolicy === "REQUIRED" && !sources.length ? (
                      <Tag color="orange">待补源文件</Tag>
                    ) : null}
                  </>
                ) : index === 0 ? (
                  <Tag color="blue">最新</Tag>
                ) : null}
              </Space>
              <Typography.Text type="secondary" className="submission-version-meta">
                {outputs.length ? `${outputs.length} 个成品 · ` : ""}
                {feedback ? "1 条反馈" : "0 条反馈"}　提交：
                {submission.submittedBy.name} · {dayjs(submission.submittedAt).format("MM/DD HH:mm")}
              </Typography.Text>
            </div>
          ),
          children: (
            <div className="submission-version-body">
              <section className="submission-content-column">
                <div className="submission-section-heading">
                  <Typography.Title level={5}>提交内容</Typography.Title>
                  {canManage ? (
                    <Button type="link" size="small" icon={<EditOutlined />} onClick={() => openEdit(submission)}>
                      编辑
                    </Button>
                  ) : null}
                </div>
                {submission.contentText ? (
                  <Typography.Paragraph
                    className="submission-copy-content"
                    ellipsis={{ rows: 8, expandable: "collapsible", symbol: "展开全文" }}
                  >
                    {submission.contentText}
                  </Typography.Paragraph>
                ) : null}
                {outputs.length ? <ResourceGrid resources={outputs} /> : null}
                {!submission.contentText && !outputs.length ? (
                  <Typography.Text type="secondary">本次未附正文或成品资源。</Typography.Text>
                ) : null}

                {submission.isFinal ? (
                  <div className="submission-source-section">
                    <div className="submission-section-heading">
                      <Typography.Text strong>源文件</Typography.Text>
                      {canManage ? (
                        <Button type="link" size="small" onClick={() => openSource(submission)}>
                          {sources.length ? "更新源文件" : "提交源文件"}
                        </Button>
                      ) : null}
                    </div>
                    {sources.length ? (
                      <ResourceGrid resources={sources} />
                    ) : workItem.sourceFilePolicy === "REQUIRED" ? (
                      <Alert type="warning" showIcon title="最终版尚未提交源文件" />
                    ) : (
                      <Typography.Text type="secondary">暂未提交（选交）</Typography.Text>
                    )}
                  </div>
                ) : null}
              </section>

              <section className="submission-feedback-column">
                <div className="submission-section-heading">
                  <Typography.Title level={5}>本版反馈</Typography.Title>
                  <Space size={4} wrap>
                  {feedback ? (
                    <Button type="link" size="small" onClick={() => {
                      try { openFeedbackPrint(submission); }
                      catch (error) { messageApi.error(error instanceof Error ? error.message : "打开导出页面失败"); }
                    }}>导出 PDF</Button>
                  ) : null}
                  {canManage ? (
                    <Button
                      type="link"
                      size="small"
                      icon={feedback ? <EditOutlined /> : <PlusOutlined />}
                      onClick={() => openFeedback(submission)}
                    >
                      {feedback ? "编辑反馈" : "添加反馈"}
                    </Button>
                  ) : null}
                  </Space>
                </div>
                {!feedback ? (
                  <Empty
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                    description="暂无反馈"
                  />
                ) : (
                  <div className="submission-feedback-scroll">
                    {feedback.content ? (
                      <Typography.Paragraph className="submission-feedback-summary">
                        {feedback.content}
                      </Typography.Paragraph>
                    ) : null}
                    {feedback.images?.length ? (
                      <Image.PreviewGroup>
                        <div className="submission-feedback-images">
                          {feedback.images.map((image) => (
                            <Image key={image.id} src={imageThumbnail(image.url)} preview={{ src: image.url }} alt={image.name || ""} />
                          ))}
                        </div>
                      </Image.PreviewGroup>
                    ) : null}
                    {adjustmentItems.length ? (
                      <div className="submission-adjustment-display">
                        <Typography.Text type="secondary">调整项</Typography.Text>
                        {adjustmentItems.map((item, itemIndex) => (
                          <div key={item.id} className="submission-adjustment-item">
                            <div className="submission-adjustment-heading">
                              <span className="submission-adjustment-number">{itemIndex + 1}</span>
                              <Typography.Text strong className="submission-adjustment-title">{item.title}</Typography.Text>
                            </div>
                            {item.content ? <Typography.Paragraph>{item.content}</Typography.Paragraph> : null}
                            {item.images?.length ? (
                              <Image.PreviewGroup>
                                <div className="submission-feedback-images">
                                  {item.images.map((image) => (
                                    <Image key={image.id} src={imageThumbnail(image.url)} preview={{ src: image.url }} alt={image.name || ""} />
                                  ))}
                                </div>
                              </Image.PreviewGroup>
                            ) : null}
                          </div>
                        ))}
                      </div>
                    ) : null}
                    <Typography.Text type="secondary" className="submission-feedback-meta">
                      {feedback.recordedBy.name} · {dayjs(feedback.recordedAt).format("MM/DD HH:mm")}
                    </Typography.Text>
                  </div>
                )}
              </section>
            </div>
          ),
        };
      })}
    />
  ) : (
    <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无提交记录" />
  );

  const previousAdjustments = submissions[0]?.feedback?.adjustmentItems ?? [];

  const modalNode = (
    <>
      {contextHolder}
      <Modal
        open={Boolean(modal)}
        title={
          modal?.kind === "submit"
            ? "新增提交"
            : modal?.kind === "edit"
              ? `编辑 V${modal.submission.versionNumber}`
              : modal?.kind === "source"
                ? "提交源文件"
                : modal?.kind === "feedback"
                  ? `${modal.submission.feedback ? "编辑" : "添加"} V${modal.submission.versionNumber} 反馈`
                  : ""
        }
        onCancel={() => { if (!saving && !readingImages) closeModal(); }}
        closable={!saving && !readingImages}
        mask={{ closable: !saving && !readingImages }}
        keyboard={!saving && !readingImages}
        width={modal?.kind === "feedback" ? 900 : 720}
        styles={
          modal?.kind === "feedback"
            ? { body: { maxHeight: "calc(85vh - 150px)", overflowY: "auto" } }
            : undefined
        }
        footer={
          modal?.kind === "feedback" && feedbackStep === 0 ? (
            <Space>
              <Button disabled={readingImages || saving} onClick={closeModal}>取消</Button>
              <Button type="primary" disabled={readingImages} onClick={() => setFeedbackStep(1)}>
                下一步
              </Button>
            </Space>
          ) : (
            <Space>
              {modal?.kind === "feedback" ? (
                <Button disabled={saving || readingImages} onClick={() => setFeedbackStep(0)}>上一步</Button>
              ) : (
                <Button disabled={readingImages || saving} onClick={closeModal}>取消</Button>
              )}
              <Button type="primary" loading={saving} disabled={readingImages} onClick={() => void saveModal()}>
                保存
              </Button>
            </Space>
          )
        }
        forceRender
      >
        <Form form={form} disabled={saving || readingImages} layout="vertical" className="submission-modal-form">
          {modal?.kind === "source" ? (
            <ResourceFields
              name="resources"
              label="源文件链接"
              required={workItem.sourceFilePolicy === "REQUIRED"}
            />
          ) : modal?.kind === "feedback" ? (
            <div className="feedback-wizard">
              <Steps
                size="small"
                current={feedbackStep}
                onChange={(step) => { if (!saving && !readingImages) setFeedbackStep(step); }}
                items={[{ title: "反馈说明" }, { title: "调整项" }]}
              />
              {feedbackStep === 0 ? (
                <div className="feedback-overview-form">
                  <Form.Item name="feedbackContent" label="反馈说明">
                    <Input.TextArea
                      autoSize={{ minRows: 3, maxRows: 7 }}
                      placeholder="记录整体评价、方向或背景说明"
                    />
                  </Form.Item>
                  <Form.Item name="feedbackImages" label="反馈图片（可选）">
                    <ImageAttachmentPicker disabled={saving} onReadingChange={setReadingImages} hint="支持选择或在此粘贴图片，每张最多 20 MB；选择后自动上传，保存时关联图片。" />
                  </Form.Item>
                </div>
              ) : (
                <Form.List name="adjustmentItems">
                  {(fields, { add, remove }) => {
                    const activeField = fields[activeAdjustment] ?? fields[0];
                    const addItem = () => {
                      add({ title: "", content: "", images: [] });
                      setActiveAdjustment(fields.length);
                    };
                    return (
                      <div className="adjustment-editor">
                        <aside>
                          <div className="adjustment-editor-nav-title">
                            <Typography.Text strong>调整项</Typography.Text>
                            <Button size="small" type="text" icon={<PlusOutlined />} onClick={addItem} />
                          </div>
                          {fields.length ? (
                            <Form.Item noStyle shouldUpdate>
                              {({ getFieldValue }) => fields.map((field, index) => {
                                const title = String(getFieldValue(["adjustmentItems", field.name, "title"]) ?? "").trim();
                                const label = title || `调整项 ${index + 1}`;
                                return (
                                  <button
                                    type="button"
                                    className={index === activeAdjustment ? "is-active" : ""}
                                    key={field.key}
                                    title={label}
                                    onClick={() => setActiveAdjustment(index)}
                                  >
                                    {label}
                                  </button>
                                );
                              })}
                            </Form.Item>
                          ) : (
                            <Typography.Text type="secondary">暂无调整项</Typography.Text>
                          )}
                          <Button type="dashed" icon={<PlusOutlined />} onClick={addItem} block>
                            新增调整项
                          </Button>
                        </aside>
                        <div className="adjustment-editor-body">
                          {activeField ? (
                            <>
                              <Form.Item name={[activeField.name, "id"]} hidden>
                                <Input />
                              </Form.Item>
                              <div className="adjustment-editor-heading">
                                <Typography.Text strong>调整项 {activeAdjustment + 1}</Typography.Text>
                                <Button
                                  type="text"
                                  danger
                                  onClick={() => {
                                    remove(activeField.name);
                                    setActiveAdjustment(Math.max(0, activeAdjustment - 1));
                                  }}
                                >
                                  删除
                                </Button>
                              </div>
                              <Form.Item
                                name={[activeField.name, "title"]}
                                label="标题"
                                rules={[{ required: true, whitespace: true, message: "请输入调整项标题" }]}
                              >
                                <Input placeholder="概括这一项需要调整的内容" />
                              </Form.Item>
                              <Form.Item name={[activeField.name, "content"]} label="调整内容（可选）">
                                <Input.TextArea
                                  autoSize={{ minRows: 3, maxRows: 7 }}
                                  placeholder="补充具体修改要求"
                                />
                              </Form.Item>
                              <Form.Item name={[activeField.name, "images"]} label="关联图片（可选）">
                                <ImageAttachmentPicker key={activeField.key} disabled={saving} onReadingChange={setReadingImages} hint="支持选择或在此粘贴图片，每张最多 20 MB；选择后自动上传，保存时关联图片。" />
                              </Form.Item>
                            </>
                          ) : (
                            <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="可以只保存反馈说明，也可以新增调整项" />
                          )}
                        </div>
                      </div>
                    );
                  }}
                </Form.List>
              )}
            </div>
          ) : modal ? (
            <>
              <Form.Item name="versionTitle" label="版本标题">
                <Input placeholder="例如：客户修改版（版本号自动递增）" maxLength={255} />
              </Form.Item>
              {workItem.type === "COPY" ? (
                <Form.Item
                  name="contentText"
                  label="文案正文"
                  rules={[{ required: true, whitespace: true, message: "请输入文案正文" }]}
                >
                  <Input.TextArea autoSize={{ minRows: 6, maxRows: 16 }} />
                </Form.Item>
              ) : null}
              {workItem.type === "DESIGN" ? (
                <ResourceFields name="resources" label="内容链接" required />
              ) : workItem.type !== "COPY" ? (
                <ResourceFields name="resources" label="提交链接（可选）" />
              ) : null}
              {modal.kind === "submit" && previousAdjustments.length ? (
                <Form.Item
                  name="adjustmentCheckIds"
                  label="上一版调整项确认"
                  rules={[{ required: true, message: "请确认上一版全部调整项" }]}
                >
                  <Checkbox.Group className="submission-adjustment-checks">
                    {previousAdjustments.map((item) => (
                      <Checkbox key={item.id} value={item.id}>
                        {item.title}
                      </Checkbox>
                    ))}
                  </Checkbox.Group>
                </Form.Item>
              ) : null}
            </>
          ) : null}
        </Form>
      </Modal>
    </>
  );

  return { extra: finalExtra, content, modal: modalNode };
};
