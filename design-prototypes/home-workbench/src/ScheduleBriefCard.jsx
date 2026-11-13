import React, { useState } from 'react';
import { Button, Collapse, Dropdown, Tag, Tooltip } from 'antd';
import { CheckOutlined, DownOutlined, EditOutlined, MoreOutlined, RightOutlined } from '@ant-design/icons';

const briefStatuses = ['草稿', '进行中', '暂停', '已完成'];
const workStatuses = ['待推进', '进行中', '暂停', '已完成'];
const statusColors = { 草稿: 'default', 待推进: 'default', 进行中: 'green', 暂停: 'gold', 已完成: 'blue' };
const statusRails = { 草稿: '#bfbfbf', 进行中: '#22c55e', 暂停: '#eab308', 已完成: '#1677ff' };
const typeColors = { 设计: 'blue', 文案: 'orange', 项目管理: 'purple', 新媒体: 'cyan' };

function StatusControl({ value, values, onChange, ariaLabel }) {
  return <Dropdown trigger={['click']} menu={{
    selectedKeys: [value],
    items: values.map(status => ({
      key: status,
      label: <span className="schedule-status-option"><i style={{ background: statusRails[status] || '#bfbfbf' }} />{status}{value === status && <CheckOutlined />}</span>,
    })),
    onClick: ({ key, domEvent }) => { domEvent.stopPropagation(); onChange(key); },
  }}>
    <Button type="text" size="small" aria-label={ariaLabel} className="schedule-status-button" onClick={event => event.stopPropagation()}>
      <Tag color={statusColors[value] || 'default'}>{value} <DownOutlined /></Tag>
    </Button>
  </Dropdown>;
}

export default function ScheduleBriefCard({ project, brief, workItems, selectedId, expandedId, onExpand, onBriefStatus, onWorkStatus, onEditBrief, onEditWorkItem, details }) {
  const [open, setOpen] = useState(true);
  const assignedCount = workItems.length;
  return <div className="schedule-brief-card" style={{ '--brief-status-rail': statusRails[brief.status] || '#bfbfbf' }}>
    <Collapse activeKey={open ? ['brief'] : []} onChange={keys => setOpen(keys.includes('brief'))} bordered={false} items={[{
      key: 'brief',
      label: <div className="schedule-brief-heading"><span className="schedule-brief-title">{brief.title}</span><StatusControl value={brief.status} values={briefStatuses} onChange={onBriefStatus} ariaLabel={`修改需求单状态：${brief.status}`} /></div>,
      extra: <div className="schedule-brief-extra" onClick={event => event.stopPropagation()}><span>负责人：—</span><span>已指派 <b>{assignedCount}</b> / {workItems.length}</span><Tooltip title={`所属项目：${project.name}`}><Button type="text" size="small" aria-label="需求单信息" icon={<RightOutlined />} /></Tooltip><Dropdown trigger={['click']} menu={{ items: [{ key: 'edit', label: '修改需求', icon: <EditOutlined /> }], onClick: ({ domEvent }) => { domEvent.stopPropagation(); onEditBrief(); } }}><Button type="text" aria-label="更多需求单操作" icon={<MoreOutlined />} /></Dropdown></div>,
      children: <div className="schedule-brief-body"><div className="schedule-brief-summary"><div><h3>需求描述</h3><p>{brief.description}</p></div><div className="schedule-brief-counts"><div><strong>{workItems.length}</strong><span>工作项</span></div><div><strong>{assignedCount} / {workItems.length}</strong><span>已分配执行人</span></div></div></div><div className="schedule-work-items"><Collapse bordered={false} activeKey={expandedId === null ? [] : [expandedId]} onChange={keys => onExpand(keys.at(-1) ?? null)} items={workItems.map((item, index) => ({
        key: item.id,
        label: <div className="schedule-work-row"><div className="schedule-work-title"><span className="schedule-work-index">{index + 1}</span><b>{item.title}</b><Tag color={typeColors[item.type] || 'default'}>{item.type}</Tag></div><div className="schedule-work-meta"><span>状态：<StatusControl value={item.status} values={workStatuses} onChange={status => onWorkStatus(item, status)} ariaLabel={`修改工作项状态：${item.status}`} /></span><span>审核人：—</span><span>执行人：小花</span><Dropdown trigger={['click']} menu={{ items: [{ key: 'edit', label: '修改工作项', icon: <EditOutlined /> }], onClick: ({ domEvent }) => { domEvent.stopPropagation(); onEditWorkItem(item); } }}><Button type="text" aria-label={`更多工作项操作：${item.title}`} icon={<MoreOutlined />} onClick={event => event.stopPropagation()} /></Dropdown></div></div>,
        children: selectedId === item.id ? details : null,
      }))} /></div></div>,
    }]} />
  </div>;
}
