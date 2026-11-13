import { useState } from "react";
import { Button, Modal, Progress, Segmented, Tag, message } from "antd";
import { EditOutlined, InfoCircleOutlined } from "@ant-design/icons";
import { finance, money, project } from "./data";
import "./QuotePreview.css";

// 2026-09-13 只读核对当前项目 v1 成本测算与目标报价参考。
// 这是本机静态设计原型；正式页须从服务端按角色过滤敏感字段。
const estimate = {
  version: 1, owner: "子璇", duration: 40, clientBudget: 125000, agencyFeeRate: 0,
  members: [
    { name: "Johnny", function: "设计组", allocation: 2, laborCost: 1042.34 },
    { name: "子璇", function: "项目组", allocation: 40, laborCost: 6961.75 },
    { name: "晓臻", function: "设计组", allocation: 95, laborCost: 19154.85 },
    { name: "煎饼", function: "设计组", allocation: 10, laborCost: 3211.7 },
    { name: "张弛", function: "品牌组", allocation: 2, laborCost: 251.54 },
  ],
  outsource: [{type:"3D渲染",amount:1400}],
  executionTypes: finance.reimbursementCategories.map(({name,color})=>({name,color})),
};
const reference = {
  mode:"目标报价", targetPrice:125000, targetProfit:65171.34,
  plannedLabor:30622.18, suggestedLabor:30622.18,
  rent:3682.8, plannedMiddle:21823.68, suggestedMiddle:21823.68,
  execution:2300, outsource:1400, agency:0,
  outsourceRemark:"萌萌外包3D渲染，2个产品（瓶&罐）",
};
const section = (label, title, right) => <div className="quote-section-head"><div><span>{label}</span><h3>{title}</h3></div>{right}</div>;
const action = name => Modal.info({title:name,content:`请在正式页面中办理“${name}”。`,okText:"知道了"});

function Estimate({ financeRole }) {
  return <div className="quote-stack">
    <div className="quote-summary-grid quote-estimate-summary"><div><span>客户报价(不含税)</span><strong>{money(estimate.clientBudget)}</strong></div><div><span>预估时长</span><strong>{estimate.duration}</strong><small>个工作日</small></div></div>
    <section className="quote-panel quote-members">
      {section("人员配置", "预估投入", <span className="quote-subtle">各成员的占比独立填写，不要求合计为 100%</span>)}
      <div className={`quote-member-row quote-member-head ${financeRole?"finance":""}`}><span>参与人员</span><span>人员职能</span><span>投入精力</span>{financeRole&&<span>人力成本</span>}</div>
      {estimate.members.map(member=><div className={`quote-member-row ${financeRole?"finance":""}`} key={member.name}><strong>{member.name}</strong><Tag>{member.function}</Tag><div className="quote-allocation"><Progress percent={member.allocation} showInfo={false} size="small"/><b>{member.allocation}%</b></div>{financeRole&&<strong className="quote-cost">{money(member.laborCost)}</strong>}</div>)}
      {financeRole&&<div className="quote-member-total"><span>人力成本总计</span><strong>{money(finance.labor)}</strong></div>}
    </section>
    <section className="quote-fee-section">
      <h3>费用信息</h3>
      <div className="quote-info-grid">
        <div className="quote-info-row"><div className="quote-info-row-title">中介费用</div><div className="quote-info-cells two"><div><span>中介费率</span><strong>—</strong></div><div><span>预估中介费</span><strong>—</strong></div></div></div>
        <div className="quote-info-row"><div className="quote-info-row-title">外包费用</div><div className="quote-info-cells three"><div><span>外包费用</span><strong>{money(1400)}</strong></div><div><span>外包费用明细</span><strong>3D渲染：1400 元</strong></div><div><span>外包费用备注</span><strong>—</strong></div></div></div>
        <div className="quote-info-row"><div className="quote-info-row-title">执行费用</div><div className="quote-info-cells one"><div><span>执行费用类别</span><div className="quote-info-tags">{estimate.executionTypes.map(type=><Tag key={type.name} color={type.color}>{type.name}</Tag>)}</div></div></div></div>
      </div>
    </section>
  </div>;
}

function Reference({ financeRole }) {
  const totalCost=reference.plannedLabor+reference.rent+reference.plannedMiddle+reference.execution+reference.outsource+reference.agency;
  const rows=[
    ["外包成本",reference.outsource,reference.outsourceRemark],
    ["人力成本",reference.plannedLabor,"来自人员投入测算"],
    ["租金成本",reference.rent,"按项目预估时长计算"],
    ["执行费用成本",reference.execution,<div className="quote-reference-tags">{finance.reimbursementCategories.map(item=><span key={item.name}>{item.name} {money(item.budget)}</span>)}</div>],
    ["中台成本",reference.plannedMiddle,"按项目预估时长计算"],
    ["中介费",reference.agency,"费率 0%"],
  ];
  return <div className="quote-stack">
    <section className="quote-panel">
      {section("财务编制 · 基于成本测算 v1", "报价参考", financeRole?<Button type="primary" icon={<EditOutlined/>} onClick={()=>action("更新报价参考")}>更新报价参考</Button>:<Tag color="blue">目标报价模式</Tag>)}
      <div className="quote-reference-intro"><div><span>项目经理预估</span><strong>40 个工作日 · 5 位参与人员</strong></div><div className="quote-reference-arrow">→</div><div><span>财务报价参考</span><strong>目标报价模式</strong></div></div>
      <div className="quote-summary-grid"><div><span>客户报价（不含税）</span><strong>{money(estimate.clientBudget)}</strong><small>来自成本测算</small></div><div><span>财务建议报价</span><strong>{money(reference.targetPrice)}</strong><small>目标报价</small></div><div><span>预估时长</span><strong>40 个工作日</strong><small>与成本测算一致</small></div></div>
    </section>
    {financeRole?<>
      <section className="quote-panel">
        {section("财务建议", "成本与利润", <span className="quote-subtle"><InfoCircleOutlined/> 按现有角色权限显示成本明细</span>)}
        <div className="quote-finance-metrics"><div><span>预计总成本</span><strong>{money(totalCost)}</strong></div><div><span>建议人力成本</span><strong>{money(reference.suggestedLabor)}</strong><small>计划 {money(reference.plannedLabor)}</small></div><div><span>建议中台成本</span><strong>{money(reference.suggestedMiddle)}</strong><small>计划 {money(reference.plannedMiddle)}</small></div><div><span>目标利润</span><strong>{money(reference.targetProfit)}</strong><small>目标利润率 {(reference.targetProfit/reference.targetPrice*100).toFixed(1)}%</small></div></div>
      </section>
      <section className="quote-panel quote-reference-detail">
        {section("费用构成", "报价参考明细")}
        <div className="quote-reference-row quote-reference-head"><span>类别</span><span>金额</span><span>备注</span></div>
        {rows.map(([label,amount,remark])=><div className="quote-reference-row" key={label}><strong>{label}</strong><b>{money(amount)}</b><span>{remark}</span></div>)}
        <div className="quote-reference-row quote-reference-total"><strong>盈亏平衡</strong><b>{money(totalCost)}</b><span>总费用占报价 {(totalCost/reference.targetPrice*100).toFixed(1)}%</span></div>
      </section>
    </>:<section className="quote-panel quote-reference-pm"><strong>财务已形成目标报价参考</strong><p>报价明细涉及人员薪酬推算，项目经理视图仅展示报价结果。具体费用和利润由财务查看与调整。</p></section>}
  </div>;
}

export default function QuotePreview({ financeRole=false }) {
  const [view,setView]=useState("estimate");
  const [syncOpen,setSyncOpen]=useState(false);
  const syncText=["#成本测算","",project.name,"",`预计时长：${estimate.duration}个工作日`,`客户报价(不含税)：${money(estimate.clientBudget)}`,"","人员配置：",...estimate.members.map(member=>`- ${member.name} ${member.allocation}%`),"",`外包费用：${estimate.outsource.map(item=>`${item.type} ${money(item.amount)}`).join("、")}`,`执行费用需求：${estimate.executionTypes.map(type=>type.name).join("、")}`].join("\n");
  const copySync=async()=>{try{await navigator.clipboard.writeText(syncText);message.success("已复制同步信息");setSyncOpen(false)}catch{message.error("复制失败，请手动复制弹窗内容")}};
  return <div className="quote-preview"><div className="quote-tabs"><Segmented value={view} onChange={setView} options={[{label:"成本测算",value:"estimate"},{label:"报价参考",value:"reference"}]}/>{view==="estimate"&&!financeRole&&<div className="quote-tab-actions"><Button onClick={()=>setSyncOpen(true)}>生成同步信息</Button><Button type="primary" onClick={()=>action("更新成本测算")}>更新成本测算</Button></div>}</div>{view==="estimate"?<Estimate financeRole={financeRole}/>:<Reference financeRole={financeRole}/>}<Modal title="生成同步信息" open={syncOpen} onCancel={()=>setSyncOpen(false)} footer={<><Button onClick={()=>setSyncOpen(false)}>关闭</Button><Button type="primary" onClick={copySync}>复制内容</Button></>} width={680}><pre className="quote-sync-content">{syncText}</pre></Modal></div>;
}
