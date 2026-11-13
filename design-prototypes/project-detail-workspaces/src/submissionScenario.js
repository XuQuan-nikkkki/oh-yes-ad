// 独立的复杂场景样例：不属于页面显示的真实项目，也不写入正式数据。
const version = (number, submittedAt, submittedBy, title, feedback = null, extra = {}) => ({
  number,
  submittedAt,
  submittedBy,
  title,
  text: extra.text ?? "",
  outputs: extra.outputs ?? [`${title}.pdf`],
  sources: extra.sources ?? [],
  isFinal: extra.isFinal ?? false,
  feedback,
});

const shortFeedback = (content) => ({ content, images: [], adjustments: [] });

export const complexSubmissionBriefs = [
  {
    id: "launch",
    title: "上市传播",
    workItems: [
      { id: "social", title: "社媒预热内容", versions: [
        version(1, "2026-09-06 14:20", "内容设计 A", "预热脚本初稿", shortFeedback("方向可以，开场需要更快进入产品卖点。")),
        version(2, "2026-09-13 09:30", "内容设计 A", "预热脚本调整版", null),
      ] },
    ],
  },
  {
    id: "packaging",
    title: "包装深化",
    workItems: [
      { id: "can", title: "罐身设计延展", versions: [
        version(1, "2026-09-05 18:10", "设计师 B", "罐身延展 V1", shortFeedback("请统一两种口味的品牌识别位置。")),
        version(2, "2026-09-12 17:40", "设计师 B", "罐身延展 V2", shortFeedback("层级已清楚，进入最终文件整理。"), { isFinal: true, sources: ["罐身可编辑文件.ai"] }),
      ] },
      { id: "carton", title: "纸箱样稿", versions: [
        version(1, "2026-09-07 11:00", "设计师 C", "纸箱结构初稿", shortFeedback("侧面的产品信息还需要调整。")),
        version(2, "2026-09-10 16:15", "设计师 C", "纸箱展开稿", shortFeedback("结构可继续，印刷标注请补齐。")),
      ] },
    ],
  },
  {
    id: "visual",
    title: "视觉概念",
    workItems: [
      { id: "keyvisual", title: "主视觉方案", versions: [
        version(1, "2026-09-02 10:00", "设计师 A", "主视觉方向 V1", shortFeedback("保留目前的主题方向，继续探索版式。")),
        version(2, "2026-09-06 15:25", "设计师 A", "主视觉方向 V2", {
          content: "整体方向接近预期，但目前画面的视觉重心仍有些分散。产品和品牌名称应该在第一眼进入视线，活动信息可以在第二层阅读。现在标题、辅助线条和背景纹理的对比度比较接近，缩小到手机预览尺寸后，识别顺序不够稳定。请先在缩略图状态确认信息层级，再看完整画面里的质感。\n\n两种画幅不要简单等比缩放：横版需要更宽的叙事空间，竖版则要重新安排标题与产品的位置。横版中产品可以略向右移，让左侧标题获得连续的留白；竖版需要避免标题压在产品轮廓和高亮区域上。两版可以有不同的裁切，但品牌名称、产品、活动主题三者的阅读顺序应一致。\n\n另外，系列中的两种口味目前像是两套不同的活动视觉。建议统一标题基线、色块面积和装饰元素的密度，只保留口味识别需要的变化。包装落到货架展示时，消费者先识别这是同一个系列，再看具体口味；请用货架缩略图检查这一点，不要只看单张大图。\n\n请结合下面的标注图逐项核对留白、文字对齐和元素密度。图中的圈选位置只是指出问题区域，不要求机械照搬标注尺寸。调整完成后请同时提交横版、竖版及缩略对比图，方便下一轮直接核对，不必再单独解释哪些地方发生了变化。",
          images: ["整版标注图 01", "竖版对比图 02"],
          adjustments: [
            { title: "主次层级", content: "放大产品与品牌名称的相对占比，活动时间和辅助文字退到第二层。", images: ["主视觉标注 A"] },
            { title: "竖版布局", content: "竖版的标题不要压在产品图上，留出稳定的阅读路径。", images: ["竖版标注 B", "竖版参考 C"] },
            { title: "系列一致性", content: "两种口味的色块、标题基线和留白规则保持一致。", images: [] },
          ],
        }, { outputs: ["主视觉横版 V2.jpg", "主视觉竖版 V2.jpg"] }),
        version(3, "2026-09-11 13:50", "设计师 A", "主视觉方向 V3", shortFeedback("这版的主次关系明确，竖版还有一处文字间距需要微调。"), { isFinal: true, sources: ["主视觉横版源文件.ai", "主视觉竖版源文件.ai"] }),
      ] },
      { id: "illustration", title: "包装插画方向", versions: [
        version(1, "2026-09-04 09:45", "插画师 A", "插画草图", shortFeedback("可以继续深化第二个方向。")),
        version(2, "2026-09-09 19:15", "插画师 A", "插画深化稿", shortFeedback("线条密度降低一些，避免缩小时丢失细节。")),
      ] },
    ],
  },
  {
    id: "strategy",
    title: "品牌策略",
    workItems: [
      { id: "positioning", title: "品牌定位梳理", versions: [
        version(1, "2026-09-01 16:40", "策略同事 A", "定位初稿", shortFeedback("请补充目标人群的选择依据。")),
        version(2, "2026-09-08 12:30", "策略同事 A", "定位调整版", shortFeedback("核心表述可以，案例还需要更贴近本项目。")),
      ] },
      { id: "naming", title: "系列命名方向", versions: [
        version(1, "2026-09-03 17:20", "策略同事 B", "命名提案", null, { text: "本版提交三组系列命名方向及各自的使用场景。", outputs: [] }),
      ] },
    ],
  },
  {
    id: "preparation",
    title: "前期资料准备",
    workItems: [{ id: "archive", title: "资料归档", versions: [] }],
  },
];
