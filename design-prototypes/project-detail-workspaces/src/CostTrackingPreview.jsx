import { Progress, Table, Tag } from "antd";

const formatNumber = value => Number(value).toLocaleString("zh-CN", { maximumFractionDigits: 2 });
const formatSigned = value => `${value < 0 ? "-" : ""}${formatNumber(Math.abs(value))}`;

const rows = [
  { key: "income-section", section: "收入明细" },
  { key: "income", label: "收入", amount: 151500, remark: "" },
  { key: "tax", label: "税费", amount: -1500, remark: "" },
  { key: "net-income", label: "净收入", amount: 150000, remark: "", emphasis: true },
  { key: "cost-section", section: "成本明细（系统自动计算）" },
  { key: "agency", label: "中介费", amount: 0, ratio: "0%", remark: "中介费率 0%" },
  { key: "outsource", label: "外包成本", amount: 0, ratio: "0%", remark: "王泽萌-V8产品创新包装设计（1,400 元）" },
  { key: "labor", label: "人力成本", amount: -27368.47, ratio: "-18.2%", remark: "-" },
  { key: "rent", label: "租金成本", amount: -2672.51, ratio: "-1.8%", remark: "-" },
  { key: "middle", label: "中台成本", amount: -60015.12, ratio: "-40%", remark: "中台均值 / 基准天数 * 实际工作日 = 16,367.76 / 30 * 110" },
  { key: "execution", label: "执行费用成本", amount: 0, ratio: "0%", remark: "共计 0 元 / 预算 2,300 元" },
  { key: "total-cost", label: "总费用成本", amount: -90056.1, ratio: "-60%", bar: 60, tone: "cost", remark: "" },
  { key: "profit-section", section: "利润分配" },
  { key: "project-profit", label: "项目利润", amount: 59943.9, ratio: "40%", bar: 40, tone: "profit", remark: "-" },
  { key: "bonus", label: "项目奖金", amount: -4795.51, ratio: "-3.2%", remark: "级别：C · 奖金比例：8%" },
  { key: "fund", label: "基金", amount: -10000, ratio: "-6.7%", remark: "" },
  { key: "final-profit", label: "最终利润", amount: 45148.39, ratio: "30.1%", bar: 30.1, tone: "profit", remark: "" },
];

const columns = [
  {
    title: "类别", dataIndex: "label", key: "label", width: 138,
    onCell: record => record.section ? { colSpan: 5 } : {},
    render: (_, record) => record.section
      ? <span className="cost-preview-section-label">{record.section}</span>
      : <span className={`cost-preview-label ${record.emphasis || record.tone ? "is-emphasis" : ""}`}><i aria-hidden="true" />{record.label}</span>,
  },
  {
    title: "金额", dataIndex: "amount", key: "amount", align: "right", width: 116,
    onCell: record => record.section ? { colSpan: 0 } : {},
    render: (value, record) => record.section ? null : <span className={`cost-preview-amount ${record.tone || ""}`}>{formatSigned(value)}</span>,
  },
  {
    title: "占比", dataIndex: "ratio", key: "ratio", align: "right", width: 76,
    onCell: record => record.section ? { colSpan: 0 } : {},
    render: (value, record) => <span className={`cost-preview-ratio ${record.tone || ""}`}>{value ?? ""}</span>,
  },
  {
    title: "金额占比（相对净收入 150,000 元）", dataIndex: "bar", key: "bar", width: 185,
    onCell: record => record.section ? { colSpan: 0 } : {},
    render: (value, record) => value == null ? null : <Progress percent={value} showInfo={false} size={{ height: 6 }} strokeColor={record.tone === "cost" ? "#D15651" : "#6F9838"} railColor="#edf0f2" />,
  },
  {
    title: "备注", dataIndex: "remark", key: "remark", width: 244,
    onCell: record => record.section ? { colSpan: 0 } : {},
    render: (value, record) => record.key === "bonus" ? <Tag color="orange">{value}</Tag> : <span className="cost-preview-remark">{value || ""}</span>,
  },
];

const metrics = [
  { label: "收入", amount: 151500, tone: "income", subtitle: "税费 1,500 元" },
  { label: "总费用", amount: 90056.1, tone: "cost", percent: 60 },
  { label: "项目利润", amount: 59943.9, tone: "profit", percent: 40 },
  { label: "最终利润", amount: 45148.39, tone: "profit", percent: 30.1 },
];

export default function CostTrackingPreview() {
  return <div className="cost-preview">
    <div className="cost-preview-period">
      <div><span>预计工作日</span><strong>40 天</strong></div>
      <div><span>实际工作日</span><strong>110 天</strong></div>
      <Tag color="orange">已超期 70 天</Tag>
    </div>
    <div className="cost-preview-metrics">
      {metrics.map(item => <div className="cost-preview-metric" key={item.label}>
        <span>{item.label}</span><strong className={item.tone}>{formatNumber(item.amount)} 元</strong>
        {item.percent == null ? <small>{item.subtitle}</small> : <div className="cost-preview-metric-progress"><Progress percent={item.percent} showInfo={false} size={{ height: 6 }} strokeColor={item.tone === "cost" ? "#D15651" : "#6F9838"} railColor="#edf0f2" /><b>{item.percent}%</b></div>}
      </div>)}
    </div>
    <section className="panel cost-preview-panel">
      <div className="cost-preview-heading"><div><h3>实时成本明细</h3><span>收入、成本与利润分配</span></div><Tag>系统自动计算</Tag></div>
      <Table className="cost-preview-table" rowKey="key" columns={columns} dataSource={rows} pagination={false} size="small" tableLayout="fixed" scroll={{ x: 760 }} rowClassName={record => record.section ? "cost-preview-section-row" : record.tone ? `cost-preview-${record.tone}-row` : ""} />
    </section>
  </div>;
}
