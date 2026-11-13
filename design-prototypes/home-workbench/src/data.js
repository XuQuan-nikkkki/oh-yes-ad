export const TODAY = '2026-09-10';
export const projects = [
 {id:'wusu',name:'乌苏·卡瓦斯产品策略',status:'结算中',brief:'包装设计需求单'},
 {id:'momoyo',name:'MOMOYO 2026年护航',status:'推进中',brief:'秋季传播需求单'},
 {id:'royal',name:'皇家伯爵3款杯样',status:'推进中',brief:'杯样深化需求单'},
 {id:'ningji',name:'柠季品牌形象升级',status:'推进中',brief:'品牌提案需求单'},
 {id:'rio',name:'RIO 元乐享品牌项目',status:'推进中',brief:'品牌传播需求单'},
];
export const initialItems = [
 {id:1,title:'包装视觉深化设计',project:'wusu',type:'设计',draftDate:'2026-09-05',revisionDate:'2026-09-07',due:'2026-09-09',status:'进行中',desc:'完成包装主视觉深化，统一字体、版式和信息层级。提交可供团队评审的设计链接。',versions:[]},
 {id:2,title:'秋季主视觉文案',project:'momoyo',type:'文案',draftDate:TODAY,revisionDate:'2026-09-11',due:'2026-09-14',status:'进行中',desc:'围绕秋季上新，完成主标题、副标题及社交平台传播文案。',versions:[]},
 {id:3,title:'杯样设计修改',project:'royal',type:'设计',draftDate:'2026-09-08',revisionDate:TODAY,due:'2026-09-12',status:'进行中',desc:'根据上一版反馈调整杯样设计，保持三款杯样的视觉一致性。',versions:[{n:1,title:'第一版杯样设计',date:'2026-09-08 16:30',links:['https://example.com/cup-design-v1'],text:'',feedback:'整体方向认可，请继续优化品牌识别和侧面排版。',adjustments:['放大正面品牌标识','调整侧面文字间距'],source:'',final:false}]},
 {id:4,title:'品牌提案排版',project:'ningji',type:'设计',draftDate:'2026-09-08',revisionDate:'2026-09-09',due:'2026-09-11',status:'进行中',desc:'整理品牌提案版式，统一封面、章节页和方案展示页。',versions:[]},
 {id:5,title:'杯样定稿文件',project:'royal',type:'设计',draftDate:'2026-09-08',due:'2026-09-12',status:'进行中',desc:'整理最终版设计链接与源文件，供后续交付使用。',versions:[{n:1,title:'定稿前检查版',date:'2026-09-09 14:00',links:['https://example.com/cup-final-review'],feedback:'请核对三款杯样的最终尺寸，并补充源文件链接。',adjustments:['核对杯样尺寸'],source:'',final:false}]},
 {id:6,title:'秋季传播延展文案',project:'momoyo',type:'文案',due:'2026-09-16',status:'进行中',desc:'补充秋季传播延展场景的短文案。',versions:[]},
 {id:7,title:'品牌资料整理',project:'ningji',type:'设计',due:'2026-09-08',status:'已完成',desc:'整理现有品牌资料。',versions:[{n:1,title:'资料汇总',date:'2026-09-08 12:00',links:['https://example.com/brand'],source:'https://example.com/source',final:true}]},
 {id:8,title:'客户会议安排确认',project:'rio',type:'项目管理',submissionRequired:false,due:TODAY,status:'进行中',desc:'确认客户会议时间和参与人员。本工作项只设置截止日期，无需提交内容。',versions:[]},
];
export const milestones = [
 {id:1,date:'2026-09-12',title:'杯样深化设计定稿',project:'royal',type:'外提',people:'陈宇豪、Johnny',internalParticipants:[{name:'陈宇豪'},{name:'Johnny'}],clientParticipants:[{name:'客户代表'}],method:'现场会议',location:'客户会议室',desc:'向客户提交三款杯样的深化设计定稿，确认最终视觉和制作信息。'},
 {id:2,date:'2026-09-15',title:'秋季传播提案',project:'momoyo',type:'内提',people:'小花、Johnny',internalParticipants:[{name:'小花'},{name:'Johnny'}],method:'线上会议',desc:'内部评审秋季传播主题、主视觉及文案方向。'},
 {id:3,date:'2026-09-18',title:'品牌提案确认',project:'ningji',type:'外提',people:'小花、陈宇豪',internalParticipants:[{name:'小花'},{name:'陈宇豪'}],location:'客户会议室',desc:'客户确认品牌提案方向。'},
];
export const initialLogs = [
 {id:1,project:'wusu',date:'2026-09-07',start:'09:00',hours:7,note:'包装视觉深化'},
 {id:2,project:'momoyo',date:'2026-09-08',start:'09:00',hours:6,note:'秋季主视觉文案'},
 {id:3,project:'royal',date:'2026-09-09',start:'10:00',hours:5,note:'杯样设计修改'},
 {id:4,project:'royal',date:TODAY,start:'09:00',hours:4.5,note:'杯样定稿整理'},
];
export const getProject = id => projects.find(p=>p.id===id);
