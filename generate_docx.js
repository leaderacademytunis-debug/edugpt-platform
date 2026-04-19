const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  Header, Footer, AlignmentType, BorderStyle, WidthType, ShadingType,
  VerticalAlign, PageNumber, TableLayoutType
} = require('docx');
const fs   = require('fs');
const path = require('path');

const PW=11906, PH=16838;
const MAR={top:900,right:850,bottom:900,left:850};
const CW=PW-MAR.right-MAR.left;

const nb =()=>({style:BorderStyle.NONE,size:0,color:'FFFFFF'});
const sb =(c='CCCCCC',s=5)=>({style:BorderStyle.SINGLE,size:s,color:c});
const ab =(c,s=5)=>{const b=sb(c,s);return{top:b,bottom:b,left:b,right:b};};
const nba=()=>{const b=nb();return{top:b,bottom:b,left:b,right:b,insideH:b,insideV:b};};

function R(text,o={}){
  return new TextRun({text,font:'Arial',size:o.sz||22,
    bold:o.bold||false,color:o.col||'111111',italic:o.it||false,rtl:true});
}
function P(children,o={}){
  const runs=typeof children==='string'?[R(children,o)]:children;
  return new Paragraph({alignment:o.align||AlignmentType.RIGHT,
    spacing:{before:o.sb||40,after:o.sa||40},bidi:true,children:runs});
}
function C(children,o={}){
  return new TableCell({children:Array.isArray(children)?children:[children],
    borders:o.brd||ab('CCCCCC',4),
    shading:o.bg?{fill:o.bg,type:ShadingType.CLEAR}:undefined,
    width:o.w?{size:o.w,type:WidthType.DXA}:undefined,
    margins:{top:80,bottom:80,left:120,right:120},
    verticalAlign:o.va||VerticalAlign.TOP,columnSpan:o.span});
}
function T(rows,colWidths,w){
  return new Table({width:{size:w||CW,type:WidthType.DXA},
    columnWidths:colWidths,layout:TableLayoutType.FIXED,rows});
}
const SP=(h=80)=>new Paragraph({spacing:{before:h,after:0},bidi:true,children:[]});

function SecHead(text,bg,tc){
  return new Paragraph({alignment:AlignmentType.CENTER,spacing:{before:160,after:80},
    shading:{fill:bg,type:ShadingType.CLEAR},border:{bottom:sb(tc,10)},
    bidi:true,children:[R(text,{sz:26,bold:true,col:tc})]});
}

// ─── Shared header/footer builder ─────────────────────────────
function buildHeader(school,region){
  const HC=Math.floor(CW/3);
  return new Header({children:[
    T([new TableRow({children:[
      C([P('الجمهورية التونسية',{bold:true,sz:18,col:'0F6E56',align:AlignmentType.RIGHT}),
         P(region,{sz:14,col:'888888',align:AlignmentType.RIGHT,sa:0})],{brd:nba(),w:HC}),
      C([P('EDUGPT',{bold:true,sz:28,col:'1D9E75',align:AlignmentType.CENTER}),
         P('المساعد البيداغوجي الذكي',{sz:14,col:'5DCAA5',align:AlignmentType.CENTER,sa:0})],{brd:nba(),w:HC}),
      C([P('وزارة التربية',{bold:true,sz:18,col:'0F6E56',align:AlignmentType.LEFT}),
         P('2025-2026',{sz:14,col:'888888',align:AlignmentType.LEFT,sa:0})],{brd:nba(),w:HC}),
    ]})],[HC,HC,HC],CW),
    new Paragraph({spacing:{before:40,after:0},border:{bottom:sb('1D9E75',12)},bidi:true,children:[]}),
  ]});
}

function buildFooter(school){
  return new Footer({children:[
    new Paragraph({alignment:AlignmentType.CENTER,spacing:{before:60},
      border:{top:sb('1D9E75',8)},bidi:true,
      children:[R(school+' — الصفحة ',{sz:16,col:'555555'}),
        new TextRun({children:[PageNumber.CURRENT],font:'Arial',size:16,color:'1D9E75'}),
        R(' — EDUGPT · وزارة التربية التونسية 2025-2026',{sz:16,col:'888888'})]}),
  ]});
}

// ─── META TABLE (shared) ──────────────────────────────────────
function buildMetaTable(rows4col){
  const Q=Math.floor(CW/4);
  const lbl=(t)=>C([P(t,{bold:true,sz:19,col:'534AB7',align:AlignmentType.CENTER})],
    {bg:'EEEDFE',brd:ab('534AB7',4),w:Q,va:VerticalAlign.CENTER});
  const val=(t)=>C([P(t,{sz:19,align:AlignmentType.CENTER})],{brd:ab('CCCCCC',4),w:Q});
  return T(rows4col.map(r=>new TableRow({children:[lbl(r[0]),val(r[1]),lbl(r[2]),val(r[3])]})),[Q,Q,Q,Q]);
}

// ═══════════════════════════════════════════════════════════════
// 1. مذكرة الدرس — بدون شبكة التقييم
// ═══════════════════════════════════════════════════════════════
async function generateLessonDocx(lesson, outPath) {
  const {title,level,subject,duration,date,
    school='المدرسة الابتدائية',teacher='',region='تونس',
    competency='',objectives=[],tools='',steps=[]} = lesson;
  const dur=parseInt(duration)||45;

  const SM=[
    {name:'وضعية الانطلاق',bg:'E1F5EE',tc:'085041',frac:.10},
    {name:'الاكتشاف',       bg:'E6F1FB',tc:'042C53',frac:.15},
    {name:'التعلم المنهجي',bg:'EEEDFE',tc:'26215C',frac:.25},
    {name:'الإدماج',        bg:'FAEEDA',tc:'412402',frac:.20},
    {name:'التقييم',        bg:'FAECE7',tc:'4A1B0C',frac:.10},
    {name:'الدعم',          bg:'FBEAF0',tc:'4B1528',frac:.08},
    {name:'الإثراء',        bg:'EAF3DE',tc:'173404',frac:.07},
  ];

  const pageHeader=buildHeader(school,region);
  const pageFooter=buildFooter(school);

  // Title
  const titleBlock=[
    T([new TableRow({children:[C([
      P('مذكرة درس',{sz:18,col:'5DCAA5',align:AlignmentType.CENTER,sb:60,sa:20}),
      P(title,{sz:44,bold:true,col:'085041',align:AlignmentType.CENTER,sb:20,sa:20}),
      P(`${subject} — ${level}`,{sz:20,col:'0F6E56',align:AlignmentType.CENTER,sb:0,sa:60}),
    ],{brd:ab('1D9E75',10),bg:'E1F5EE',w:CW,va:VerticalAlign.CENTER})]})],[CW]),
    SP(100),
  ];

  // Meta
  const metaTable=buildMetaTable([
    ['المدرسة',school,          'المعلم/ة',teacher||'.....................'],
    ['المادة', subject,         'المستوى', level],
    ['المدة',  duration,        'التاريخ', date],
  ]);

  // Competency
  const L1=Math.floor(CW*.22),L2=CW-L1;
  const compTable=T([
    new TableRow({children:[
      C([P('الكفاية المستهدفة',{bold:true,sz:20,col:'185FA5',align:AlignmentType.CENTER})],{bg:'E6F1FB',brd:ab('185FA5',4),w:L1,va:VerticalAlign.CENTER}),
      C([P(competency,{sz:19})],{brd:ab('CCCCCC',4),w:L2})]}),
    new TableRow({children:[
      C([P('الأهداف',{bold:true,sz:20,col:'185FA5',align:AlignmentType.CENTER})],{bg:'E6F1FB',brd:ab('185FA5',4),w:L1,va:VerticalAlign.CENTER}),
      C(objectives.map(o=>P('• '+o,{sz:19,sb:20,sa:20})),{brd:ab('CCCCCC',4),w:L2})]}),
    new TableRow({children:[
      C([P('الوسائل',{bold:true,sz:20,col:'185FA5',align:AlignmentType.CENTER})],{bg:'E6F1FB',brd:ab('185FA5',4),w:L1,va:VerticalAlign.CENTER}),
      C([P(tools,{sz:19})],{brd:ab('CCCCCC',4),w:L2})]}),
  ],[L1,L2]);

  // Steps table
  const S_GOAL=Math.floor(CW*.13),S_STUD=Math.floor(CW*.26),
        S_TEACH=Math.floor(CW*.33),S_TIME=Math.floor(CW*.08),
        S_STAGE=CW-S_GOAL-S_STUD-S_TEACH-S_TIME;
  const th=(t,w)=>C([P(t,{bold:true,sz:18,col:'FFFFFF',align:AlignmentType.CENTER})],
    {bg:'1D9E75',brd:ab('085041',4),w,va:VerticalAlign.CENTER});
  const stepsHeader=new TableRow({tableHeader:true,children:[
    th('المرحلة',S_STAGE),th('الزمن',S_TIME),
    th('نشاط المعلم',S_TEACH),th('نشاط المتعلم',S_STUD),th('الهدف',S_GOAL),
  ]});
  const stepsRows=steps.map((step,idx)=>{
    const m=SM[idx]||SM[6];
    const mins=m.frac>0?Math.round(dur*m.frac)+' دق':'—';
    const tL=(step.teacher||'').split('\n').map(l=>P(l,{sz:17,sb:18,sa:18}));
    const sL=(step.student||'').split('\n').map(l=>P(l,{sz:17,sb:18,sa:18}));

    // في خطوة التقييم — نضيف جملة الإحالة
    let goalContent;
    if(idx===4){
      goalContent=[
        P(step.goal||'',{sz:17}),
        SP(20),
        P('يُقيَّم أداء التلاميذ وفق شبكة التقييم المرفقة.',
          {sz:16,col:'993C1D',it:true}),
      ];
    } else {
      goalContent=[P(step.goal||'',{sz:17})];
    }

    return new TableRow({children:[
      C([P(String(idx+1),{bold:true,sz:22,col:m.tc,align:AlignmentType.CENTER,sa:4}),
         P(m.name,{bold:true,sz:16,col:m.tc,align:AlignmentType.CENTER,sb:4})],
        {bg:m.bg,brd:ab(m.tc,4),w:S_STAGE,va:VerticalAlign.CENTER}),
      C([P(mins,{sz:17,align:AlignmentType.CENTER})],{brd:ab('CCCCCC',4),w:S_TIME,va:VerticalAlign.CENTER}),
      C(tL,{brd:ab('CCCCCC',4),w:S_TEACH}),
      C(sL,{brd:ab('CCCCCC',4),w:S_STUD}),
      C(goalContent,{brd:ab('CCCCCC',4),w:S_GOAL}),
    ]});
  });
  const stepsTable=T([stepsHeader,...stepsRows],[S_STAGE,S_TIME,S_TEACH,S_STUD,S_GOAL]);

  // Signature
  const SIG=Math.floor(CW/3);
  const sigTable=T([new TableRow({children:[
    C([P('إمضاء المدير/ة',{sz:16,col:'888888',align:AlignmentType.CENTER}),P('',{sz:16,sa:60})],{brd:ab('CCCCCC',3),w:SIG}),
    C([P('إمضاء المعلم/ة',{sz:16,col:'888888',align:AlignmentType.CENTER}),P('',{sz:16,sa:60})],{brd:ab('CCCCCC',3),w:SIG}),
    C([P('خاتم المؤسسة',{sz:16,col:'888888',align:AlignmentType.CENTER}),P('',{sz:16,sa:60})],{brd:ab('CCCCCC',3),w:CW-SIG-SIG}),
  ]})],[SIG,SIG,CW-SIG-SIG]);

  const doc=new Document({
    styles:{default:{document:{run:{font:'Arial',size:22,rtl:true}}}},
    sections:[{
      properties:{page:{size:{width:PW,height:PH},margin:MAR}},
      headers:{default:pageHeader},footers:{default:pageFooter},
      children:[
        ...titleBlock, metaTable, SP(100), compTable, SP(120),
        SecHead('سير الدرس — الخطوات البيداغوجية السبع','E1F5EE','085041'),
        SP(60), stepsTable, SP(140), sigTable, SP(100),
        new Paragraph({alignment:AlignmentType.CENTER,bidi:true,
          children:[R('أُنجزت بمساعدة منصة EDUGPT — وزارة التربية التونسية 2025-2026',{sz:16,col:'999999',it:true})]}),
      ],
    }],
  });
  const buf=await Packer.toBuffer(doc);
  fs.writeFileSync(outPath,buf);
  return outPath;
}

// ═══════════════════════════════════════════════════════════════
// 2. شبكة التقييم — وثيقة مستقلة
// ═══════════════════════════════════════════════════════════════
async function generateEvalDocx(lesson, outPath) {
  const {title,level,subject,date,
    school='المدرسة الابتدائية',teacher='',region='تونس',
    evalGrid=[]} = lesson;

  const pageHeader=buildHeader(school,region);
  const pageFooter=buildFooter(school);

  // Title
  const titleBlock=[
    T([new TableRow({children:[C([
      P('شبكة تقييم',{sz:18,col:'888880',align:AlignmentType.CENTER,sb:60,sa:20}),
      P(title,{sz:38,bold:true,col:'444441',align:AlignmentType.CENTER,sb:20,sa:20}),
      P(`${subject} — ${level}`,{sz:20,col:'5F5E5A',align:AlignmentType.CENTER,sb:0,sa:60}),
    ],{brd:ab('888780',8),bg:'F1EFE8',w:CW,va:VerticalAlign.CENTER})]})],[CW]),
    SP(80),
  ];

  // Meta
  const metaTable=buildMetaTable([
    ['المدرسة',school,  'المعلم/ة',teacher||'.....................'],
    ['المادة', subject, 'المستوى', level],
    ['التاريخ',date,    'عدد التلاميذ','........'],
  ]);

  // Eval colours
  const EC=[
    {bg:'FAECE7',tc:'712B13',hbg:'993C1D'},
    {bg:'FAEEDA',tc:'633806',hbg:'BA7517'},
    {bg:'EAF3DE',tc:'27500A',hbg:'3B6D11'},
  ];

  // ── Criteria header row ───────────────────────────────────────
  const EC_W=[Math.floor(CW/3),Math.floor(CW/3),CW-Math.floor(CW/3)-Math.floor(CW/3)];
  const evalHeader=new TableRow({tableHeader:true,children:
    evalGrid.map((e,i)=>C([
      P(e.label,{bold:true,sz:22,col:'FFFFFF',align:AlignmentType.CENTER,sa:6}),
    ],{bg:EC[i].hbg,brd:ab(EC[i].tc,5),w:EC_W[i],va:VerticalAlign.CENTER}))});

  // ── Indicators row ────────────────────────────────────────────
  const evalItems=new TableRow({children:
    evalGrid.map((e,i)=>C(
      e.items.map(it=>P('• '+it,{sz:19,col:EC[i].tc,sb:24,sa:24})),
      {bg:EC[i].bg,brd:ab(EC[i].tc,5),w:EC_W[i]}))});

  const evalTable=T([evalHeader,evalItems],EC_W);

  // ── Students table ────────────────────────────────────────────
  // Columns RTL: اسم التلميذ | مع1 | مع2 | مع3 | ملاحظة
  const ST_NAME=Math.floor(CW*.35);
  const ST_M=Math.floor(CW*.16);
  const ST_OBS=CW-ST_NAME-ST_M*3;

  const stuHeader=new TableRow({tableHeader:true,children:[
    C([P('اسم التلميذ/ة',{bold:true,sz:18,col:'FFFFFF',align:AlignmentType.CENTER})],
      {bg:'444441',brd:ab('2C2C2A',4),w:ST_NAME,va:VerticalAlign.CENTER}),
    C([P('مع1',{bold:true,sz:18,col:'FFFFFF',align:AlignmentType.CENTER})],
      {bg:'993C1D',brd:ab('712B13',4),w:ST_M,va:VerticalAlign.CENTER}),
    C([P('مع2',{bold:true,sz:18,col:'FFFFFF',align:AlignmentType.CENTER})],
      {bg:'BA7517',brd:ab('633806',4),w:ST_M,va:VerticalAlign.CENTER}),
    C([P('مع3',{bold:true,sz:18,col:'FFFFFF',align:AlignmentType.CENTER})],
      {bg:'3B6D11',brd:ab('27500A',4),w:ST_M,va:VerticalAlign.CENTER}),
    C([P('ملاحظة',{bold:true,sz:18,col:'FFFFFF',align:AlignmentType.CENTER})],
      {bg:'444441',brd:ab('2C2C2A',4),w:ST_OBS,va:VerticalAlign.CENTER}),
  ]});

  // 20 empty student rows
  const stuRows=Array(20).fill(null).map((_,i)=>new TableRow({children:[
    C([P(String(i+1)+'.  ',{sz:18})],{brd:ab('CCCCCC',3),w:ST_NAME}),
    C([P('',{sz:18})],{brd:ab('CCCCCC',3),w:ST_M}),
    C([P('',{sz:18})],{brd:ab('CCCCCC',3),w:ST_M}),
    C([P('',{sz:18})],{brd:ab('CCCCCC',3),w:ST_M}),
    C([P('',{sz:18})],{brd:ab('CCCCCC',3),w:ST_OBS}),
  ]}));

  const stuTable=T([stuHeader,...stuRows],[ST_NAME,ST_M,ST_M,ST_M,ST_OBS]);

  // Legend
  const legendRow=new TableRow({children:[
    C([P('مع1 = الملاءمة (الحد الأدنى)',{sz:17,col:'712B13'})],{bg:'FAECE7',brd:ab('993C1D',3),w:Math.floor(CW/3)}),
    C([P('مع2 = الانسجام (المستوى المتوسط)',{sz:17,col:'633806'})],{bg:'FAEEDA',brd:ab('BA7517',3),w:Math.floor(CW/3)}),
    C([P('مع3 = الثراء (المستوى المتقدم)',{sz:17,col:'27500A'})],{bg:'EAF3DE',brd:ab('3B6D11',3),w:CW-2*Math.floor(CW/3)}),
  ]});
  const legendTable=T([legendRow],[Math.floor(CW/3),Math.floor(CW/3),CW-2*Math.floor(CW/3)]);

  const doc=new Document({
    styles:{default:{document:{run:{font:'Arial',size:22,rtl:true}}}},
    sections:[{
      properties:{page:{size:{width:PW,height:PH},margin:MAR}},
      headers:{default:pageHeader},footers:{default:pageFooter},
      children:[
        ...titleBlock, metaTable, SP(120),
        SecHead('معايير التقييم ومؤشراتها','F1EFE8','444441'),
        SP(60), evalTable, SP(120),
        SecHead('قائمة التلاميذ وتقييماتهم','E1F5EE','085041'),
        SP(60), stuTable, SP(100), legendTable, SP(100),
        new Paragraph({alignment:AlignmentType.CENTER,bidi:true,
          children:[R('شبكة التقييم — EDUGPT — وزارة التربية التونسية 2025-2026',{sz:16,col:'999999',it:true})]}),
      ],
    }],
  });
  const buf=await Packer.toBuffer(doc);
  fs.writeFileSync(outPath,buf);
  return outPath;
}

// ─── CLI test ──────────────────────────────────────────────────
if(require.main===module){
  const sample={
    title:'النعت والمنعوت',level:'السنة الرابعة من التعليم الأساسي',
    subject:'اللغة العربية',duration:'45 دقيقة',date:'17 أفريل 2026',
    school:'المدرسة الابتدائية النموذجية — تونس',teacher:'محمد الشابي',region:'تونس العاصمة',
    competency:'يوظّف المتعلم النعت توظيفاً سليماً في وضعيات تواصلية متنوعة.',
    objectives:['يتعرف على النعت والمنعوت في جمل مختلفة.',
      'يطبّق حكم المطابقة بين النعت ومنعوته.','يُنتج أمثلة من إنشائه.'],
    tools:'كتاب القراءة — بطاقات مصورة — سبورة — كراسات الأنشطة — ورقة عمل',
    steps:[
      {teacher:'- يطرح سؤالاً تحفيزياً.\n- يكتب الإجابات على السبورة.',student:'- يتذكر صفات الأشياء.\n- يشارك شفهياً.',goal:'استدراج مفهوم الوصف.'},
      {teacher:'- يقدّم نصاً.\n- يطرح أسئلة ملاحظة.',student:'- يقرأ ويلاحظ.\n- يضع خطاً تحت الكلمات الوصفية.',goal:'ملاحظة النعت في سياق حقيقي.'},
      {teacher:'- يُرسّخ التعريف والحكم.\n- يكتب الملخص مع التلاميذ.',student:'- يستنتج القاعدة.\n- يدوّن الملخص في الكراسة.',goal:'فهم القاعدة وضبط توظيفها.'},
      {teacher:'- يوزّع ورقة عمل.\n- يتجول ويصحّح.',student:'- يُنجز فردياً ثم في ثنائيات.',goal:'توظيف المكتسبات تطبيقياً.'},
      {teacher:'- يطرح 3 أسئلة تقييمية.\n- يستعمل بطاقة الملاحظة.',student:'- يُجيب شفهياً.\n- يُعطي أمثلة.',goal:'التثبّت من مدى الاستيعاب.'},
      {teacher:'- يقدّم بطاقات دعم للمتعثرين.',student:'- يُنجز أنشطة مبسّطة.',goal:'مساعدة المتعثرين تدريجياً.'},
      {teacher:'- يُكلّف المتقدمين بفقرة وصفية.',student:'- يُنجز بشكل مستقل.',goal:'تعميق المفهوم في سياقات جديدة.'},
    ],
    evalGrid:[
      {label:'مع1 — الملاءمة',items:['يتعرّف على النعت في جملة بسيطة.','يحدد موضعه بعد المنعوت.','يُميّز الصفة من الأسماء.']},
      {label:'مع2 — الانسجام',items:['يُطبّق حكم المطابقة.','يُوظّف في جمل من إنشائه.','يُعرب إعراباً صحيحاً.']},
      {label:'مع3 — الثراء',  items:['يُنتج فقرة وصفية بنعوت متنوعة.','يُميّز النعت الحقيقي من السببي.','يُوظّف في وضعيات جديدة.']},
    ],
  };
  Promise.all([
    generateLessonDocx(sample, path.join(__dirname,'lesson.docx')),
    generateEvalDocx(sample,   path.join(__dirname,'eval_grid.docx')),
  ]).then(paths=>{
    paths.forEach(p=>console.log('OK → '+p));
  }).catch(e=>{console.error(e);process.exit(1);});
}

module.exports={generateLessonDocx, generateEvalDocx};
