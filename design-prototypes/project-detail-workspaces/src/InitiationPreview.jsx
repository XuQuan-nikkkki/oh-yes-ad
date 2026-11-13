import { useState } from "react";
import { Button, Modal, Progress, Segmented, Tag, message } from "antd";
import { finance, money, project } from "./data";
import "./InitiationPreview.css";

// 2026-09-13 从当前项目的立项申请 v1、财务结构及系统设置只读核对。
// URL 仅切换设计评审视角；正式页面继续沿用原有角色权限。
const members = [
  { name: "Johnny", function: "设计组", color: "#722ed1", allocation: 2, labor: 1042.34 },
  { name: "子璇", function: "项目组", color: "#d4380d", allocation: 40, labor: 6961.75 },
  { name: "晓臻", function: "设计组", color: "#722ed1", allocation: 95, labor: 19154.85 },
  { name: "煎饼", function: "设计组", color: "#722ed1", allocation: 10, labor: 3211.7 },
  { name: "张弛", function: "品牌组", color: "#722ed1", allocation: 2, labor: 251.54 },
];
const outsourceRemark = "萌萌外包3D渲染，2个产品（瓶&罐）";
const contractExTax = finance.structureContractWithTax / 1.01;
const benchmark = contractExTax * .53;
const profit = finance.structureContractWithTax - finance.totalCost;
const costRatio = Math.round(finance.totalCost / finance.structureContractWithTax * 100);
const profitRatio = profit / finance.structureContractWithTax * 100;
const categories = finance.reimbursementCategories;
const action = name => Modal.info({ title: name, content: `请在正式页面中办理“${name}”。`, okText: "知道了" });

function Application({ financeRole }) {
  return <div className="init-stack">
    <div className="init-metrics two"><div><span>报价金额（含税）</span><strong>{money(finance.initiationQuoteWithTax)}</strong><small>创建人：子璇</small></div><div><span>预估时长</span><strong>{finance.duration}</strong><small>个工作日</small></div></div>
    <section className="init-panel init-members"><h3>人员配置</h3>
      <div className={`init-member-row head ${financeRole ? "finance" : ""}`}><span>姓名</span><span>职能</span><span>占比</span>{financeRole && <span>人力成本</span>}</div>
      {members.map(item => <div className={`init-member-row ${financeRole ? "finance" : ""}`} key={item.name}><strong>{item.name}</strong><Tag color={item.color}>{item.function}</Tag><div className="init-allocation"><Progress percent={item.allocation} size="small" showInfo={false}/><b>{item.allocation}%</b></div>{financeRole && <b className="init-amount">{money(item.labor)}</b>}</div>)}
      {financeRole && <div className="init-member-total"><span>人力成本总计</span><strong>{money(finance.labor)}</strong></div>}
    </section>
    <section className="init-fees"><h3>费用信息</h3><div className="init-fee-grid">
      <div className="init-fee-title">中介费用</div><div className="init-fee-cells two"><div><span>中介费率</span><strong>—</strong></div><div><span>中介费</span><strong>—</strong></div></div>
      <div className="init-fee-title">外包费用</div><div className="init-fee-cells three"><div><span>外包费用</span><strong>{money(finance.outsource)}</strong></div><div><span>外包费用明细</span><strong>3D渲染：{money(finance.outsource)}</strong></div><div><span>外包费用备注</span><strong>{outsourceRemark}</strong></div></div>
      <div className="init-fee-title">执行费用</div><div className="init-fee-cells"><div><span>执行费用类别</span><div className="init-tags">{categories.map(item => <Tag key={item.name} color={item.color}>{item.name}</Tag>)}</div></div></div>
    </div></section>
  </div>;
}

const composition = [
  { name: "外包", amount: finance.outsource, color: "#2563EB" },
  { name: "人力", amount: finance.labor, color: "#7C3AED" },
  { name: "租金", amount: finance.rent, color: "#06B6D4" },
  { name: "中台", amount: finance.middle, color: "#14B8A6" },
  { name: "执行", amount: finance.execution, color: "#EC4899" },
  { name: "中介", amount: 0, color: "#64748B" },
];
const structureRows = [
  { section: "收入" },
  { name: "收入(含税)", amount: finance.structureContractWithTax, remark: `不含税：${money(contractExTax)}`, tone: "income" },
  { section: "成本明细" },
  { name: "中介费", amount: 0, remark: `合同金额（含税）${money(finance.structureContractWithTax)} × 费率 0%` },
  { name: "外包成本", amount: finance.outsource, remark: <>3D渲染：{money(finance.outsource)}<br/>{outsourceRemark}</> },
  { name: "人力成本", amount: finance.labor, remark: `人力成本率 ${Math.round(finance.labor / finance.structureContractWithTax * 100)}%` },
  { name: "租金成本", amount: finance.rent, remark: "—" },
  { name: "中台成本", amount: finance.middle, remark: "—" },
  { name: "执行费用成本", amount: finance.execution, remark: categories.map(item => <div key={item.name}>{item.name}：{money(item.budget)}</div>) },
  { name: "成本合计", amount: finance.totalCost, remark: "", total: true },
];
function Structure() {
  return <div className="init-stack"><section className="init-panel init-structure">
    <div className="init-structure-top"><div><span>合同金额（含税）</span><strong className="income">{money(finance.structureContractWithTax)}</strong><small>成本基准参考：{money(benchmark)} <span title="不含税金额 × 成本基准参考系数 53%">ⓘ</span></small></div><div><span>费用</span><strong className="cost">−{money(finance.totalCost)}</strong><div className="init-progress"><Progress percent={costRatio} showInfo={false} size="small" strokeColor="#C35D56"/><b>{costRatio}%</b></div></div><div><span>利润</span><strong className="profit">+{money(profit)}</strong><div className="init-progress"><Progress percent={profitRatio} showInfo={false} size="small" strokeColor="#6F9838"/><b>{profitRatio.toFixed(1)}%</b></div></div></div>
    <div className="init-composition"><span>成本构成（占总成本比）</span><div className="init-composition-bar">{composition.filter(item => item.amount).map(item => <i key={item.name} style={{width:`${item.amount / finance.totalCost * 100}%`,background:item.color}} title={`${item.name} ${money(item.amount)}`}/>)}</div><div className="init-composition-legend">{composition.map(item => <span key={item.name}><i style={{background:item.color}}/>{item.name} {Math.round(item.amount / finance.totalCost * 100)}%</span>)}</div></div>
    <div className="init-structure-table"><div className="init-structure-row head"><span>名称</span><span>金额（元）</span><span>备注</span></div>{structureRows.map((row, index) => row.section ? <div className="init-structure-row section" key={row.section}>{row.section}</div> : <div className={`init-structure-row ${row.total ? "total" : ""}`} key={row.name}><strong>{!row.total && index > 2 ? "• " : ""}{row.name}</strong><b className={row.tone}>{Number(row.amount).toLocaleString("zh-CN",{maximumFractionDigits:2})}</b><span>{row.remark}</span></div>)}</div>
  </section></div>;
}

export default function InitiationPreview({ financeRole = false }) {
  const [view, setView] = useState("application");
  const [syncOpen, setSyncOpen] = useState(false);
  const syncText = ["#立项申请", "", project.name, "", `报价金额：${money(finance.initiationQuoteWithTax)}`, `预计时长：${finance.duration}个工作日`, "", "人员配置：", ...members.map(item => `- ${item.name} ${item.allocation}%`), "", "外包费用：3D渲染：1400元", `执行费用需求：${categories.map(item => item.name).join("、")}`, "", "申请链接：", window.location.href].join("\n");
  const copySync = async () => { try { await navigator.clipboard.writeText(syncText); message.success("已复制同步信息"); setSyncOpen(false); } catch { message.error("复制失败，请手动复制弹窗内容"); } };
  return <div className="init-preview"><div className="init-tabs"><Segmented value={view} onChange={setView} options={[{label:"立项申请",value:"application"},{label:"项目财务结构",value:"structure"}]}/><div className="init-actions">{view === "application" && !financeRole ? <><Button onClick={() => setSyncOpen(true)}>生成同步信息</Button><Button type="primary" onClick={() => action("更新立项申请")}>更新立项申请</Button></> : view === "structure" && financeRole ? <><Button onClick={() => action("下载表格")}>下载表格</Button><Button type="primary" onClick={() => action("更新财务结构")}>更新财务结构</Button></> : null}</div></div>{view === "application" ? <Application financeRole={financeRole}/> : <Structure/>}<Modal title="生成同步信息" open={syncOpen} width={680} onCancel={() => setSyncOpen(false)} footer={<><Button onClick={() => setSyncOpen(false)}>关闭</Button><Button type="primary" onClick={copySync}>复制内容</Button></>}><pre className="init-sync-content">{syncText}</pre></Modal></div>;
}
