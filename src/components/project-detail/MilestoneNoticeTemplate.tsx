"use client";

import { useMemo, useState } from "react";
import { Button, Checkbox, Input, Modal, Space, message } from "antd";
import dayjs from "dayjs";
import DetailPageContainer from "@/components/DetailPageContainer";

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
  status?: string | null;
  statusOptionValue?: string | null;
  milestones?: MilestoneNoticeSource[];
};

const MilestoneNoticeTemplate = ({
  status,
  statusOptionValue,
  milestones = [],
}: Props) => {
  const [messageApi, contextHolder] = message.useMessage();
  const [open, setOpen] = useState(false);
  const [showNextWeekMilestones, setShowNextWeekMilestones] = useState(false);
  const [showFollowingMilestones, setShowFollowingMilestones] = useState(false);

  const milestoneNoticeTemplate = useMemo(() => {
    const newLine = "\n";
    const weekDays = ["周一", "周二", "周三", "周四", "周五", "周六", "周天"];
    const statusText = statusOptionValue ?? status ?? "";
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

    const normalizedMilestones: MilestoneNoticeItem[] = milestones
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
      const inFollowingWeeks = item.start.isAfter(nextSunday, "day");

      if (inThisWeek) return true;
      if (showNextWeekMilestones && inNextWeek) return true;
      if (showFollowingMilestones && inFollowingWeeks) return true;
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
          ["描述", " "],
          ["地点", address],
          ["方式", method],
          ["参与人员", membersContent],
          ["备注", " "],
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
    milestones,
    showFollowingMilestones,
    showNextWeekMilestones,
    status,
    statusOptionValue,
  ]);

  const handleCopyTemplate = async () => {
    if (!milestoneNoticeTemplate) return;
    try {
      await navigator.clipboard.writeText(milestoneNoticeTemplate);
      messageApi.success("通知模板已复制");
    } catch {
      messageApi.error("复制失败，请手动复制");
    }
  };

  return (
    <>
      {contextHolder}
      <Button onClick={() => setOpen(true)}>生成通知模板</Button>
      <Modal
        title="生成通知模板"
        open={open}
        onCancel={() => setOpen(false)}
        destroyOnHidden
        width={760}
        footer={
          <Space>
            <Button onClick={() => setOpen(false)}>关闭</Button>
            <Button
              type="primary"
              disabled={!milestoneNoticeTemplate}
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
            placeholder="当前无可生成的里程碑通知内容"
          />
        </DetailPageContainer>
      </Modal>
    </>
  );
};

export default MilestoneNoticeTemplate;
