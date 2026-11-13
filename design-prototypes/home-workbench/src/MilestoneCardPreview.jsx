import React from 'react';
import { Card, Tag } from 'antd';
import dayjs from 'dayjs';
import { ScheduleFilled } from '@ant-design/icons';
import { TODAY } from './data';

const peopleText = people => (people || []).map(person => person.title ? `${person.name}（${person.title}）` : person.name).join('、');

export default function MilestoneCardPreview({ milestone, projectName }) {
  const remaining = dayjs(milestone.date).startOf('day').diff(dayjs(TODAY).startOf('day'), 'day');
  const fields = [
    ['项目人员', peopleText(milestone.internalParticipants)],
    ['客户人员', peopleText(milestone.clientParticipants)],
    ['供应商', peopleText(milestone.vendorParticipants)],
    ['方式', milestone.method?.trim()],
    ['地点', milestone.location?.trim()],
    ['详情', milestone.desc?.trim()],
  ].filter(([, value]) => value);

  return <Card className="milestone-detail-card" title={<span>{milestone.title}</span>} extra={<Tag color={milestone.type === '外提' ? 'blue' : 'purple'}>{milestone.type}</Tag>}>
    <p className="milestone-detail-project">{projectName}</p>
    <div className="milestone-detail-fields">{fields.map(([label, value]) => <div className="milestone-detail-field" key={label}><small>{label}：</small><span>{value}</span></div>)}</div>
    <Tag className="milestone-detail-date" color={remaining <= 3 ? 'red' : 'green'} icon={<ScheduleFilled/>}>{dayjs(milestone.date).format('YYYY年MM月DD日 ddd')}{remaining === 0 ? '，今天' : remaining > 0 ? `，还有 ${remaining} 天` : ''}</Tag>
  </Card>;
}
