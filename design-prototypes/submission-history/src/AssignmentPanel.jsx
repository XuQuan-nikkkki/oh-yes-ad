import React, { useState } from 'react';
import { Button, Form, Input, Modal, Select, Timeline } from 'antd';
import { SwapOutlined } from '@ant-design/icons';

export default function AssignmentPanel({ initialAssignee, onChange }) {
  const [assignee, setAssignee] = useState(initialAssignee);
  const [open, setOpen] = useState(false);
  const [form] = Form.useForm();
  const [changes, setChanges] = useState([{ from: null, to: initialAssignee, by: '子璇', at: '2026-09-01 09:00', remarks: '' }]);
  const save = async () => {
    const values = await form.validateFields();
    setChanges(old => [{ from: assignee, to: values.to, by: '子璇', at: new Date().toLocaleString('zh-CN', { hour12: false }), remarks: values.remarks?.trim() }, ...old]);
    setAssignee(values.to);
    onChange(values.to);
    setOpen(false);
  };
  return <>
    <div className="summary"><div><h3>执行人交接</h3><span className="muted">当前执行人：{assignee}</span></div><Button type="primary" icon={<SwapOutlined />} onClick={() => { form.resetFields(); setOpen(true); }}>交接执行人</Button></div>
    <Timeline items={changes.map((change, i) => ({ color: i === 0 ? 'blue' : 'gray', content: <div><div><b>{change.by}</b>　{change.from ? <>将执行人从 <b>{change.from}</b> 交接给 <b>{change.to}</b></> : <>首次指派给 <b>{change.to}</b></>}</div><small className="muted">{change.at}</small>{change.remarks && <p style={{ margin: '4px 0 0' }}>{change.remarks}</p>}</div> }))} />
    <Modal title="交接执行人" open={open} onCancel={() => setOpen(false)} onOk={save} okText="确认交接" cancelText="取消" width={520}>
      <Form form={form} layout="vertical">
        <Form.Item label="当前执行人"><Input value={assignee} disabled /></Form.Item>
        <Form.Item name="to" label="交接给" rules={[{ required: true, message: '请选择新执行人' }]}><Select placeholder="请选择新执行人" options={['林悦', '陈曦', '子璇'].filter(name => name !== assignee).map(name => ({ label: name, value: name }))} /></Form.Item>
        <Form.Item name="remarks" label="备注（可选）"><Input.TextArea rows={3} maxLength={500} showCount placeholder="可记录交接事项、背景或其他信息" /></Form.Item>
      </Form>
    </Modal>
  </>;
}
