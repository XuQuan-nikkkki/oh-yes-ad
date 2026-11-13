import { useState } from "react";
import { Button, Dropdown, Modal, Progress, Segmented, Tag } from "antd";
import { CalendarOutlined, EditOutlined, MoreOutlined, PlusOutlined, RightOutlined } from "@ant-design/icons";
import { money } from "./data";
import "./PaymentsPreview.css";

// 2026-09-13 对当前项目合同、计划、节点及节点历史作只读核对。
const snapshots = {
  receivable: {
    label: "项目收款", counterparty: "大理啤酒", contractName: "客户合同", contractAmount: 151500,
    contractFields: [["签约主体", "来福豪斯"], ["合同金额（含税）", money(151500)], ["税费金额", money(1500)]],
    planStatus: "草稿", planAmount: 151500, actualAmount: 0,
    planFields: [["服务内容", "包装设计"], ["跟进人", "子璇"], ["有供应商付款", "是"], ["备注", "—"]],
    node: { stage: "一期款", conditionLabel: "关键交付物", condition: "方案验收", planned: 151500, date: "2027/01/02", actual: 0, note: "—", dateChanges: 1 },
  },
  payable: {
    label: "项目付款", counterparty: "萌萌", contractName: "供应商合同", contractAmount: 1500,
    contractFields: [["供应商", "萌萌"], ["签约主体", "来福豪斯"], ["服务内容", "V8产品创新包装设计"], ["合同金额（含税）", money(1500)]],
    planAmount: 1400, actualAmount: 0,
    planFields: [["供应商", "萌萌"], ["签约主体", "来福豪斯"], ["服务内容", "V8产品创新包装设计"], ["跟进人", "子璇"], ["有客户收款", "是"], ["备注", "—"]],
    node: { stage: "一期款", conditionLabel: "付款条件", condition: "渲染完成", planned: 1400, date: "2026/08/28", actual: 0, note: "—", adjustments: 0 },
  },
};

function Action({ children, onClick, primary = false, icon }) {
  return <Button type={primary ? "primary" : "default"} size="small" icon={icon} onClick={onClick}>{children}</Button>;
}
function Fields({ items }) {
  return <div className="payments-fields">{items.map(([label, value]) => <div key={label}><span>{label}</span><strong>{value}</strong></div>)}</div>;
}
function SectionHeader({ eyebrow, title, aside, action }) {
  return <div className="payments-section-head"><div><span>{eyebrow}</span><h3>{title}</h3></div><div className="payments-section-actions">{aside}{action}</div></div>;
}
export default function PaymentsPreview() {
  const [side, setSide] = useState("receivable");
  const [expanded, setExpanded] = useState(true);
  const [activity, setActivity] = useState(false);
  const current = snapshots[side];
  const node = current.node;
  const receipt = side === "receivable";
  const previewAction = name => Modal.info({ title: name, content: `请在正式页面中办理“${name}”。`, okText: "知道了" });
  const changeSide = next => { setSide(next); setExpanded(true); setActivity(false); };
  return <div className="payments-preview">
    <div className="payments-tabs"><Segmented value={side} onChange={changeSide} options={[{label:"项目收款",value:"receivable"},{label:"项目付款",value:"payable"}]} /><span>合同 · 计划 · 节点</span></div>

    <section className="payments-section payments-contract">
      <SectionHeader eyebrow="01 / 合同" title={current.contractName} aside={<Tag color={receipt ? "blue" : "purple"}>{current.counterparty}</Tag>} action={<Action icon={<EditOutlined/>} onClick={() => previewAction(`编辑${current.contractName}`)}>编辑合同</Action>} />
      <Fields items={current.contractFields} />
    </section>

    <section className="payments-section payments-plan">
      <SectionHeader eyebrow="02 / 计划" title={receipt ? "收款计划" : "付款计划"} aside={current.planStatus && <Tag color="default">{current.planStatus}</Tag>} action={<Action icon={<EditOutlined/>} onClick={() => previewAction(`修改${receipt ? "收款" : "付款"}计划`)}>修改计划</Action>} />
      <div className="payments-plan-metrics">
        <div><span>{receipt ? "客户合同金额" : "供应商合同金额"}</span><strong>{money(current.contractAmount)}</strong><small>含税</small></div>
        <div><span>{receipt ? "预收金额合计" : "预付金额总计"}</span><strong>{money(current.planAmount)}</strong><small>1 个计划节点</small></div>
        <div><span>{receipt ? "实收金额总计" : "实付金额总计"}</span><strong>{money(current.actualAmount)}</strong><small>{receipt ? "待收" : "待付"} {money(current.planAmount - current.actualAmount)}</small></div>
        {receipt && <div><span>坏账总计</span><strong>{money(0)}</strong><small>核销 0 · 收回 0</small></div>}
      </div>
      <div className="payments-plan-progress"><div><span>{receipt ? "收款进度" : "付款进度"}</span><b>0%</b></div><Progress percent={0} showInfo={false} size="small" /><small>{receipt ? "已收 0% · 坏账 0% · 待收 100%" : "已付 0% · 待付 100%"}</small></div>
      <Fields items={current.planFields} />
    </section>

    <section className="payments-section payments-nodes">
      <SectionHeader eyebrow="03 / 节点" title={receipt ? "收款节点" : "付款节点"} aside={<span className="payments-count">共 1 个节点</span>} action={<Action primary icon={<PlusOutlined/>} onClick={() => previewAction(`新增${receipt ? "收款" : "付款"}节点`)}>新增节点</Action>} />
      <div className="payments-node">
        <button className="payments-node-head" onClick={() => {setExpanded(!expanded);setActivity(false)}} aria-expanded={expanded}>
          <span className="payments-node-title"><RightOutlined className={expanded ? "open" : ""}/><strong>{node.stage}</strong><Tag color="gold">未{receipt ? "收" : "付"}款</Tag></span>
          <span><small>计划金额</small><b>{money(node.planned)}</b></span>
          <span><small>计划日期</small><b>{node.date}</b></span>
          <span><small>实际{receipt ? "已收" : "已付"}</small><b>{money(node.actual)}</b></span>
        </button>
        {expanded && <div className="payments-node-body">
          <div className="payments-node-details"><Fields items={[[node.conditionLabel,node.condition],[receipt ? "预收日期" : "预付日期",node.date],["备注",node.note],...(receipt ? [["开票状态","未开票"]] : [])]} /></div>
          <div className="payments-node-progress"><span>{receipt ? "收款进度" : "付款进度"}</span><Progress percent={0} size="small" /><strong>{receipt ? "待收" : "待付"} {money(node.planned - node.actual)}</strong></div>
          <div className="payments-record-grid">
            <div><div className="payments-record-title"><strong>实际{receipt ? "收款" : "付款"}记录</strong><span>0 条</span></div><p>暂无实际{receipt ? "收款" : "付款"}记录</p></div>
            <div><div className="payments-record-title"><strong>{receipt ? "坏账记录" : "付款调整记录"}</strong><span>0 条</span></div><p>暂无{receipt ? "坏账" : "付款调整"}记录</p></div>
          </div>
          {receipt && <div className="payments-date-change"><CalendarOutlined/><span>预收日期调整 1 次</span><button onClick={() => setActivity(!activity)}>{activity ? "收起记录" : "查看记录"} <RightOutlined className={activity ? "open" : ""}/></button></div>}
          {activity && (receipt ? <div className="payments-activity"><time>2026/07/27 · 子璇</time><strong>预收日期从 2026/10/07 调整为 2027/01/02</strong><p>目前暂未推进纸箱设计，开票时间后推，预计9月开票</p></div> : <div className="payments-activity"><strong>暂无付款或调整动态</strong><p>实际付款和金额调整发生后，会按时间显示在这里。</p></div>)}
          <div className="payments-node-actions"><Button type="primary" onClick={() => previewAction(receipt ? "登记收款" : "登记付款")}>{receipt ? "登记收款" : "登记付款"}</Button><Button onClick={() => previewAction(receipt ? "调整预收日期" : "调整预付金额")}>{receipt ? "调整预收日期" : "调整金额"}</Button>{receipt && <Button onClick={() => previewAction("登记坏账")}>登记坏账</Button>}<Dropdown menu={{items:[{key:"edit",label:"编辑节点"},{key:"delete",label:"删除节点",danger:true}],onClick:({key}) => previewAction(key === "edit" ? "编辑节点" : "删除节点")}}><Button icon={<MoreOutlined/>}>更多操作</Button></Dropdown><Button type="link" onClick={() => setActivity(!activity)}>{activity ? "收起节点动态" : "查看节点动态"}</Button></div>
        </div>}
      </div>
    </section>
  </div>;
}
