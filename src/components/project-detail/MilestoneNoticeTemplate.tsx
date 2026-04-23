"use client";

import { useEffect, useMemo, useState } from "react";
import { Button, Checkbox, Input, Modal, Space, message } from "antd";
import dayjs from "dayjs";
import DetailPageContainer from "@/components/DetailPageContainer";
import { copyTextToClipboard } from "@/lib/copyToClipboard";

type MilestoneParticipant = {
  id: string;
  name: string;
};

type MilestoneOption = {
  id?: string;
  value?: string | null;
  color?: string | null;
} | null;

type MilestoneNoticeSource = {
  id: string;
  name: string;
  type?: string | null;
  typeOption?: MilestoneOption;
  startAt?: string | null;
  endAt?: string | null;
  date?: string | null;
  location?: string | null;
  method?: string | null;
  methodOption?: MilestoneOption;
  internalParticipants?: MilestoneParticipant[];
  clientParticipants?: MilestoneParticipant[];
  vendorParticipants?: MilestoneParticipant[];
};

type MilestoneNoticeItem = {
  id: string;
  name: string;
  type?: string | null;
  typeOption?: MilestoneOption;
  location?: string | null;
  method?: string | null;
  methodOption?: MilestoneOption;
  internalParticipants?: MilestoneParticipant[];
  clientParticipants?: MilestoneParticipant[];
  vendorParticipants?: MilestoneParticipant[];
  start: dayjs.Dayjs;
  end: dayjs.Dayjs;
};

type Props = {
  projectId?: string;
  buttonText?: string;
  status?: string | null;
  statusOptionValue?: string | null;
  milestones?: MilestoneNoticeSource[];
};

const MilestoneNoticeTemplate = ({
  projectId,
  buttonText = "生成通知模板",
  status,
  statusOptionValue,
  milestones = [],
}: Props) => {
  const [messageApi, contextHolder] = message.useMessage();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fetchedStatus, setFetchedStatus] = useState<string | null>(null);
  const [fetchedStatusOptionValue, setFetchedStatusOptionValue] = useState<
    string | null
  >(null);
  const [fetchedMilestones, setFetchedMilestones] = useState<MilestoneNoticeSource[]>([]);
  const [showNextWeekMilestones, setShowNextWeekMilestones] = useState(false);
  const [showFollowingMilestones, setShowFollowingMilestones] = useState(false);
  const [availabilityChecked, setAvailabilityChecked] = useState(false);
  const effectiveStatus = status ?? fetchedStatus;
  const effectiveStatusOptionValue = statusOptionValue ?? fetchedStatusOptionValue;
  const effectiveMilestones =
    milestones.length > 0 ? milestones : fetchedMilestones;
  const hasMilestonesProp = milestones.length > 0;

  const hasUpcomingMilestones = useMemo(() => {
    const today = dayjs().startOf("day");
    return effectiveMilestones.some((milestone) => {
      const startRaw = milestone.startAt ?? milestone.date ?? milestone.endAt;
      if (!startRaw) return false;
      const start = dayjs(startRaw);
      if (!start.isValid()) return false;
      return !start.isBefore(today, "day");
    });
  }, [effectiveMilestones]);

  const disableByNoMilestones = availabilityChecked && !hasUpcomingMilestones;
  const resolvedButtonText = disableByNoMilestones ? "后续无里程碑" : buttonText;

  const milestoneNoticeTemplate = useMemo(() => {
    const newLine = "\n";
    const weekDays = ["周一", "周二", "周三", "周四", "周五", "周六", "周天"];
    const statusText = effectiveStatusOptionValue ?? effectiveStatus ?? "";
    const needInfo = !["已结案", "暂停"].includes(statusText);
    if (!needInfo) return "";

    const today = dayjs().startOf("day");
    const day = today.day();
    const monday =
      day === 0 ? today.subtract(6, "day") : today.subtract(day - 1, "day");
    const friday = monday.add(4, "day");
    const sunday = monday.add(6, "day");
    const nextSunday = monday.add(13, "day");

    const mondayDisplay = monday.format("MM月DD日");
    const fridayDisplay =
      monday.month() === friday.month()
        ? friday.format("DD日")
        : friday.format("MM月DD日");
    const title = `本周${mondayDisplay}-${fridayDisplay}工作安排：`;

    const normalizedMilestones: MilestoneNoticeItem[] = effectiveMilestones
      .flatMap((milestone) => {
        const startRaw = milestone.startAt ?? milestone.date ?? milestone.endAt;
        if (!startRaw) return [];
        const start = dayjs(startRaw);
        if (!start.isValid()) return [];
        const endRaw = milestone.endAt ?? milestone.startAt ?? milestone.date;
        const end = endRaw ? dayjs(endRaw) : start;
        const validEnd = end.isValid() ? end : start;
        return [{
          id: milestone.id,
          name: milestone.name,
          type: milestone.type,
          typeOption: milestone.typeOption,
          location: milestone.location,
          method: milestone.method,
          methodOption: milestone.methodOption,
          internalParticipants: milestone.internalParticipants,
          clientParticipants: milestone.clientParticipants,
          vendorParticipants: milestone.vendorParticipants,
          start,
          end: validEnd,
        }];
      })
      .filter((item) => !item.start.isBefore(monday, "day"))
      .sort((left, right) => left.start.valueOf() - right.start.valueOf());

    const filteredMilestones = normalizedMilestones.filter((item) => {
      const inThisWeek = !item.start.isAfter(sunday, "day");
      const inNextWeek =
        item.start.isAfter(sunday, "day") && !item.start.isAfter(nextSunday, "day");
      const inFollowingWeeks = item.start.isAfter(sunday, "day");

      if (inThisWeek) return true;
      if (showFollowingMilestones && inFollowingWeeks) return true;
      if (showNextWeekMilestones && inNextWeek) return true;
      return false;
    });

    const details = filteredMilestones
      .map((milestone, index) => {
        const isoDay = milestone.start.day() === 0 ? 7 : milestone.start.day();
        const dayText = weekDays[isoDay - 1] ?? "周天";
        const weekGap = Math.max(
          0,
          milestone.start.startOf("day").diff(monday.startOf("day"), "week"),
        );
        const dayDisplay =
          weekGap === 0
            ? `【${dayText}】`
            : weekGap === 1
              ? `【下${dayText}】`
              : weekGap === 2
                ? `【下下${dayText}】`
                : `【${milestone.start.format("M月D日")} ${dayText}】`;

        const name = milestone.name?.trim() ?? "";
        const type = milestone.typeOption?.value ?? milestone.type ?? "";
        const indexDisplay =
          filteredMilestones.length > 1 ? `${index + 1} -` : "";
        const firstLine = `${indexDisplay}${dayDisplay}${name}${type ? `-${type}` : ""}`;

        const startTime = milestone.start.format("HH:mm");
        const endTime = milestone.end.format("HH:mm");
        const isTimeInvalid = startTime === "00:00" && endTime === "00:00";
        const timeRange =
          startTime !== endTime ? `${startTime}-${endTime}` : startTime;
        const timeContent = isTimeInvalid ? "" : timeRange;

        const address = milestone.location ?? "";
        const method = milestone.methodOption?.value ?? milestone.method ?? "";
        const clients = (milestone.clientParticipants ?? [])
          .map((item) => item.name)
          .filter((value): value is string => Boolean(value))
          .join("、");
        const colleagues = (milestone.internalParticipants ?? [])
          .map((item) => item.name)
          .filter((value): value is string => Boolean(value))
          .join("、");
        const vendors = (milestone.vendorParticipants ?? [])
          .map((item) => item.name)
          .filter((value): value is string => Boolean(value))
          .join("、");
        const membersContent = [clients, colleagues, vendors]
          .filter((value) => value !== "")
          .join("、");

        const detailLines = [
          ["时间", timeContent],
          ["地点", address],
          ["方式", method],
          ["参与人员", membersContent],
          ["TODO", `${newLine}  - `],
        ]
          .filter((item) => item[1] !== "")
          .map((item) => `- ${item[0]}：${item[1]}`)
          .join(newLine);

        return `${firstLine}${newLine}${detailLines}`;
      })
      .join(`${newLine}${newLine}`);

    if (!details) return "";
    return `${title}${newLine}${details}`;
  }, [
    effectiveMilestones,
    effectiveStatus,
    effectiveStatusOptionValue,
    showFollowingMilestones,
    showNextWeekMilestones,
  ]);

  const handleOpen = async () => {
    setOpen(true);

    if (!projectId || hasMilestonesProp) return;
    if (availabilityChecked) return;

    try {
      setLoading(true);
      const res = await fetch(`/api/projects/${projectId}`);
      if (!res.ok) {
        messageApi.error("获取项目里程碑失败");
        return;
      }
      const detail = (await res.json()) as {
        status?: string | null;
        statusOption?: { value?: string | null } | null;
        milestones?: MilestoneNoticeSource[];
      };
      setFetchedStatus(detail.status ?? null);
      setFetchedStatusOptionValue(detail.statusOption?.value ?? null);
      setFetchedMilestones(Array.isArray(detail.milestones) ? detail.milestones : []);
      setAvailabilityChecked(true);
    } catch {
      messageApi.error("获取项目里程碑失败");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (hasMilestonesProp) {
      setAvailabilityChecked(true);
      return;
    }
    if (!projectId) {
      setAvailabilityChecked(true);
      return;
    }

    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch(`/api/projects/${projectId}`);
        if (!res.ok) {
          if (!cancelled) setAvailabilityChecked(true);
          return;
        }
        const detail = (await res.json()) as {
          status?: string | null;
          statusOption?: { value?: string | null } | null;
          milestones?: MilestoneNoticeSource[];
        };
        if (cancelled) return;
        setFetchedStatus(detail.status ?? null);
        setFetchedStatusOptionValue(detail.statusOption?.value ?? null);
        setFetchedMilestones(Array.isArray(detail.milestones) ? detail.milestones : []);
      } finally {
        if (!cancelled) {
          setAvailabilityChecked(true);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [hasMilestonesProp, projectId]);

  const handleCopyTemplate = async () => {
    if (!milestoneNoticeTemplate) return;
    try {
      await copyTextToClipboard(milestoneNoticeTemplate);
      messageApi.success("通知模板已复制");
    } catch {
      messageApi.error("复制失败，请手动复制");
    }
  };

  return (
    <>
      {contextHolder}
      <Button
        disabled={disableByNoMilestones}
        onClick={() => void handleOpen()}
      >
        {resolvedButtonText}
      </Button>
      <Modal
        title="生成里程碑通知"
        open={open}
        onCancel={() => setOpen(false)}
        destroyOnHidden
        width={760}
        footer={
          <Space>
            <Button onClick={() => setOpen(false)}>关闭</Button>
            <Button
              type="primary"
              disabled={!milestoneNoticeTemplate || loading}
              onClick={() => {
                void handleCopyTemplate();
              }}
            >
              复制内容
            </Button>
          </Space>
        }
      >
        <DetailPageContainer>
          <Space size={16} wrap>
            <Checkbox
              checked={showNextWeekMilestones}
              onChange={(event) => setShowNextWeekMilestones(event.target.checked)}
            >
              显示下周里程碑
            </Checkbox>
            <Checkbox
              checked={showFollowingMilestones}
              onChange={(event) => setShowFollowingMilestones(event.target.checked)}
            >
              显示后续里程碑
            </Checkbox>
          </Space>
          <Input.TextArea
            value={milestoneNoticeTemplate}
            readOnly
            autoSize={{ minRows: 14, maxRows: 24 }}
            placeholder={loading ? "里程碑加载中..." : "当前无可生成的里程碑通知内容"}
          />
        </DetailPageContainer>
      </Modal>
    </>
  );
};

export default MilestoneNoticeTemplate;
