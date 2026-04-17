const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  Header, Footer, AlignmentType, BorderStyle, WidthType, ShadingType,
  VerticalAlign, PageNumber, TableLayoutType
} = require('docx');
const fs   = require('fs');
const path = require('path');

const PW  = 11906, PH = 16838;
const MAR = { top:900, right:850, bottom:900, left:850 };
const CW  = PW - MAR.right - MAR.left;

const nb  = () => ({ style:BorderStyle.NONE,   size:0, color:'FFFFFF' });
const sb  = (c='CCCCCC',s=5) => ({ style:BorderStyle.SINGLE, size:s, color:c });
const ab  = (c,s=5) => { const b=sb(c,s); return {top:b,bottom:b,left:b,right:b}; };
const nba = () => { const b=nb(); return {top:b,bottom:b,left:b,right:b,insideH:b,insideV:b}; };

function R(text, o={}) {
  return new TextRun({ text, font:'Arial', size:o.sz||22,
    bold:o.bold||false, color:o.col||'111111', italic:o.it||false, rtl:true });
}
function P(children, o={}) {
  const runs = typeof children==='string' ? [R(children,o)] : children;
  return new Paragraph({ alignment:o.align||AlignmentType.RIGHT,
    spacing:{before:o.sb||40,after:o.sa||40}, bidirectional:true, children:runs });
}
function C(children, o={}) {
  return new TableCell({ children:Array.isArray(children)?children:[children],
    borders:o.brd||ab('CCCCCC',4),
    shading:o.bg?{fill:o.bg,type:ShadingType.CLEAR}:undefined,
    width:o.w?{size:o.w,type:WidthType.DXA}:undefined,
    margins:{top:80,bottom:80,left:120,right:120},
    verticalAlign:o.va||VerticalAlign.TOP, columnSpan:o.span });
}
function T(rows, colWidths, w) {
  return new Table({ width:{size:w||CW,type:WidthType.DXA}, columnWidths:colWidths,
    layout:TableLayoutType.FIXED, bidirectional:true, rows });
}
const SP = (h=80) => new Paragraph({ spacing:{before:h,after:0}, bidirectional:true, children:[] });
function SecHead(text, bg, tc) {
  return new Paragraph({ alignment:AlignmentType.CENTER, spacing:{before:160,after:80},
    shading:{fill:bg,type:ShadingType.CLEAR}, border:{bottom:sb(tc,10)},
    bidirectional:true, children:[R(text,{sz:26,bold:true,col:tc})] });
}

async function generateDocx(lesson, outPath) {
  const { title, level, subject, duration, date,
    school='المدرسة الابتدائية', teacher='', region='تونس',
    competency='', objectives=[], tools='', steps=[], evalGrid=[] } = lesson;
  const dur = parseInt(duration)||45;

  const SM = [
    {name:'وضعية الانطلاق',bg:'E1F5EE',tc:'085041',frac:.10},
    {name:'الاكتشاف',       bg:'E6F1FB',tc:'042C53',frac:.15},
    {name:'التعلم المنهجي',bg:'EEEDFE',tc:'26215C',frac:.25},
    {name:'الإدماج',        bg:'FAEEDA',tc:'412402',frac:.20},
    {name:'التقييم',        bg:'FAECE7',tc:'4A1B0C',frac:.10},
    {name:'الدعم',          bg:'FBEAF0',tc:'4B1528',frac:.08},
    {name:'الإثراء',        bg:'EAF3DE',tc:'173404',frac:.07},
  ];
  const EC = [{bg:'FAECE7',tc:'712B13'},{bg:'FAEEDA',tc:'633806'},{bg:'EAF3DE',tc:'27500A'}];

  // ── HEADER ──────────────────────────────────────────────────
  const HC = Math.floor(CW/3);
  const pageHeader = new Header({ children:[
    T([new TableRow({ children:[
      C([P('الجمهورية التونسية',{bold:true,sz:18,col:'0F6E56',align:AlignmentType.RIGHT}),
         P(region,{sz:14,col:'888888',align:AlignmentType.RIGHT,sa:0})], {brd:nba(),w:HC}),
      C([P('EDUGPT',{bold:true,sz:28,col:'1D9E75',align:AlignmentType.CENTER}),
         P('المساعد البيداغوجي الذكي',{sz:14,col:'5DCAA5',align:AlignmentType.CENTER,sa:0})], {brd:nba(),w:HC}),
      C([P('وزارة التربية',{bold:true,sz:18,col:'0F6E56',align:AlignmentType.LEFT}),
         P('2025-2026',{sz:14,col:'888888',align:AlignmentType.LEFT,sa:0})], {brd:nba(),w:HC}),
    ]})], [HC,HC,HC], CW),
    new Paragraph({spacing:{before:40,after:0},border:{bottom:sb('1D9E75',12)},bidirectional:true,children:[]}),
  ]});

  // ── FOOTER ──────────────────────────────────────────────────
  const pageFooter = new Footer({ children:[
    new Paragraph({alignment:AlignmentType.CENTER,spacing:{before:60},
      border:{top:sb('1D9E75',8)},bidirectional:true,
      children:[R(school+' — الصفحة ',{sz:16,col:'555555'}),
        new TextRun({children:[PageNumber.CURRENT],font:'Arial',size:16,color:'1D9E75'}),
        R(' — EDUGPT · وزارة التربية التونسية 2025-2026',{sz:16,col:'888888'})]}),
  ]});

  // ── TITLE ───────────────────────────────────────────────────
  const titleBlock = [
    T([new TableRow({children:[C([
      P('جذاذة درس رسمية',{sz:18,col:'5DCAA5',align:AlignmentType.CENTER,sb:60,sa:20}),
      P(title,{sz:44,bold:true,col:'085041',align:AlignmentType.CENTER,sb:20,sa:20}),
      P(`${subject} — ${level}`,{sz:20,col:'0F6E56',align:AlignmentType.CENTER,sb:0,sa:60}),
    ],{brd:ab('1D9E75',10),bg:'E1F5EE',w:CW,va:VerticalAlign.CENTER})]})], [CW]),
    SP(100),
  ];

  // ── META TABLE ──────────────────────────────────────────────
  // RTL: each pair is (right-label | right-val | left-label | left-val)
  // Row 3 RTL visual: التاريخ (right) | val | المدة | val (left)
  const Q = Math.floor(CW/4);
  const lbl = (t) => C([P(t,{bold:true,sz:19,col:'534AB7',align:AlignmentType.CENTER})],
                        {bg:'EEEDFE',brd:ab('534AB7',4),w:Q,va:VerticalAlign.CENTER});
  const val = (t)  => C([P(t,{sz:19,align:AlignmentType.CENTER})], {brd:ab('CCCCCC',4),w:Q});
  const metaTable = T([
    new TableRow({children:[lbl('المدرسة'), val(school),                   lbl('المعلم/ة'), val(teacher||'.....................')]}),
    new TableRow({children:[lbl('المادة'),  val(subject),                  lbl('المستوى'),  val(level)]}),
    // RTL: التاريخ | date | المدة | duration
    new TableRow({children:[lbl('التاريخ'), val(date),                     lbl('المدة'),    val(duration)]}),
  ], [Q,Q,Q,Q]);

  // ── COMPETENCY ───────────────────────────────────────────────
  const L1=Math.floor(CW*.22), L2=CW-L1;
  const compTable = T([
    new TableRow({children:[
      C([P('الكفاية المستهدفة',{bold:true,sz:20,col:'185FA5',align:AlignmentType.CENTER})],{bg:'E6F1FB',brd:ab('185FA5',4),w:L1,va:VerticalAlign.CENTER}),
      C([P(competency,{sz:19})],{brd:ab('CCCCCC',4),w:L2})]}),
    new TableRow({children:[
      C([P('الأهداف',{bold:true,sz:20,col:'185FA5',align:AlignmentType.CENTER})],{bg:'E6F1FB',brd:ab('185FA5',4),w:L1,va:VerticalAlign.CENTER}),
      C(objectives.map(o=>P('• '+o,{sz:19,sb:20,sa:20})),{brd:ab('CCCCCC',4),w:L2})]}),
    new TableRow({children:[
      C([P('الوسائل',{bold:true,sz:20,col:'185FA5',align:AlignmentType.CENTER})],{bg:'E6F1FB',brd:ab('185FA5',4),w:L1,va:VerticalAlign.CENTER}),
      C([P(tools,{sz:19})],{brd:ab('CCCCCC',4),w:L2})]}),
  ], [L1,L2]);

  // ── STEPS TABLE ──────────────────────────────────────────────
  // RTL: array index 0 = rightmost column on screen
  // Required order RIGHT→LEFT: المرحلة | الزمن | نشاط المعلم | نشاط المتعلم | الهدف
  const S_STAGE = Math.floor(CW*.14);  // [0] rightmost  = المرحلة
  const S_TIME  = Math.floor(CW*.08);  // [1]             = الزمن
  const S_TEACH = Math.floor(CW*.32);  // [2]             = نشاط المعلم
  const S_STUD  = Math.floor(CW*.28);  // [3]             = نشاط المتعلم
  const S_GOAL  = CW-S_STAGE-S_TIME-S_TEACH-S_STUD; // [4] leftmost = الهدف

  const th=(t,w)=>C([P(t,{bold:true,sz:18,col:'FFFFFF',align:AlignmentType.CENTER})],
                     {bg:'1D9E75',brd:ab('085041',4),w,va:VerticalAlign.CENTER});
  // Header: right→left
  const stepsHeader=new TableRow({tableHeader:true,children:[
    th('المرحلة',    S_STAGE),
    th('الزمن',      S_TIME),
    th('نشاط المعلم',S_TEACH),
    th('نشاط المتعلم',S_STUD),
    th('الهدف',      S_GOAL),
  ]});
  const stepsRows=steps.map((step,idx)=>{
    const m=SM[idx]||SM[6];
    const mins=m.frac>0?Math.round(dur*m.frac)+' دق':'—';
    const tL=(step.teacher||'').split('\n').map(l=>P(l,{sz:17,sb:18,sa:18}));
    const sL=(step.student||'').split('\n').map(l=>P(l,{sz:17,sb:18,sa:18}));
    return new TableRow({children:[
      // [0] RIGHT = المرحلة (coloured)
      C([P(String(idx+1),{bold:true,sz:22,col:m.tc,align:AlignmentType.CENTER,sa:4}),
         P(m.name,       {bold:true,sz:16,col:m.tc,align:AlignmentType.CENTER,sb:4})],
        {bg:m.bg,brd:ab(m.tc,4),w:S_STAGE,va:VerticalAlign.CENTER}),
      // [1] الزمن
      C([P(mins,{sz:17,align:AlignmentType.CENTER})], {brd:ab('CCCCCC',4),w:S_TIME,va:VerticalAlign.CENTER}),
      // [2] نشاط المعلم
      C(tL, {brd:ab('CCCCCC',4),w:S_TEACH}),
      // [3] نشاط المتعلم
      C(sL, {brd:ab('CCCCCC',4),w:S_STUD}),
      // [4] LEFT = الهدف
      C([P(step.goal||'',{sz:17})], {brd:ab('CCCCCC',4),w:S_GOAL}),
    ]});
  });
  const stepsTable=T([stepsHeader,...stepsRows],[S_STAGE,S_TIME,S_TEACH,S_STUD,S_GOAL]);

  // ── EVAL ─────────────────────────────────────────────────────
  // RTL: مع1 (right) | مع2 | مع3 (left)
  const EC1=Math.floor(CW/3), EC2=Math.floor(CW/3), EC3=CW-EC1-EC2;
  const evalHeader=new TableRow({tableHeader:true,children:
    evalGrid.map((e,i)=>C([P(e.label,{bold:true,sz:20,col:EC[i].tc,align:AlignmentType.CENTER})],
      {bg:EC[i].bg,brd:ab(EC[i].tc,5),w:[EC1,EC2,EC3][i],va:VerticalAlign.CENTER}))});
  const evalItems=new TableRow({children:
    evalGrid.map((e,i)=>C(e.items.map(it=>P('• '+it,{sz:19,col:EC[i].tc,sb:24,sa:24})),
      {bg:EC[i].bg,brd:ab(EC[i].tc,5),w:[EC1,EC2,EC3][i]}))});
  const evalTable=T([evalHeader,evalItems],[EC1,EC2,EC3]);

  // ── SIGNATURE ────────────────────────────────────────────────
  const SIG=Math.floor(CW/3);
  const sigTable=T([new TableRow({children:[
    C([P('إمضاء المدير/ة',{sz:16,col:'888888',align:AlignmentType.CENTER}),P('',{sz:16,sa:60})],{brd:ab('CCCCCC',3),w:SIG}),
    C([P('إمضاء المعلم/ة',{sz:16,col:'888888',align:AlignmentType.CENTER}),P('',{sz:16,sa:60})],{brd:ab('CCCCCC',3),w:SIG}),
    C([P('خاتم المؤسسة',  {sz:16,col:'888888',align:AlignmentType.CENTER}),P('',{sz:16,sa:60})],{brd:ab('CCCCCC',3),w:CW-SIG-SIG}),
  ]})],[SIG,SIG,CW-SIG-SIG]);

  // ── BUILD ────────────────────────────────────────────────────
  const doc=new Document({
    styles:{default:{document:{run:{font:'Arial',size:22,rtl:true}}}},
    sections:[{
      properties:{page:{size:{width:PW,height:PH},margin:MAR}},
      headers:{default:pageHeader}, footers:{default:pageFooter},
      children:[
        ...titleBlock, metaTable, SP(100), compTable, SP(120),
        SecHead('سير الدرس — الخطوات البيداغوجية السبع','E1F5EE','085041'),
        SP(60), stepsTable, SP(140),
        SecHead('شبكة التقييم — مع1 / مع2 / مع3','F1EFE8','444441'),
        SP(60), evalTable, SP(140), sigTable, SP(100),
        new Paragraph({alignment:AlignmentType.CENTER,bidirectional:true,
          children:[R('أُنجزت بمساعدة منصة EDUGPT — وزارة التربية التونسية 2025-2026',{sz:16,col:'999999',it:true})]}),
      ],
    }],
  });

  const buf=await Packer.toBuffer(doc);
  fs.writeFileSync(outPath,buf);
  return outPath;
}

if (require.main===module) {
  const sample={
    title:'النعت والمنعوت', level:'السنة الرابعة من التعليم الأساسي',
    subject:'اللغة العربية', duration:'45 دقيقة', date:'17 أفريل 2026',
    school:'المدرسة الابتدائية النموذجية — تونس', teacher:'محمد الشابي', region:'تونس العاصمة',
    competency:'يوظّف المتعلم النعت توظيفاً سليماً في وضعيات تواصلية متنوعة.',
    objectives:['يتعرف على النعت والمنعوت في جمل مختلفة.','يطبّق حكم المطابقة بين النعت ومنعوته.','يُنتج أمثلة من إنشائه.'],
    tools:'كتاب القراءة — بطاقات مصورة — سبورة — كراسات الأنشطة — ورقة عمل',
    steps:[
      {teacher:'- يطرح سؤالاً تحفيزياً:\n"لو أردت وصف كتابك لزميل؟"\n- يكتب الإجابات على السبورة.',student:'- يتذكر صفات الأشياء.\n- يشارك شفهياً.',goal:'استدراج مفهوم الوصف.'},
      {teacher:'- يقدّم نص:\n"رأيت طفلاً صغيراً يحمل كتاباً جديداً"\n- يطرح: "ما الكلمة التي تصف الطفل؟"',student:'- يقرأ ويلاحظ.\n- يضع خطاً تحت الكلمات الوصفية.',goal:'ملاحظة النعت في سياق حقيقي.'},
      {teacher:'- يُرسّخ التعريف والحكم.\n- يكتب الملخص مع التلاميذ.',student:'- يستنتج القاعدة.\n- يدوّن الملخص في الكراسة.',goal:'فهم القاعدة وضبط توظيفها.'},
      {teacher:'- يوزّع ورقة عمل:\n• استخرج النعت\n• أكمل بنعت\n• أعرب.',student:'- يُنجز فردياً ثم في ثنائيات.',goal:'توظيف المكتسبات تطبيقياً.'},
      {teacher:'- يطرح 3 أسئلة تقييمية.\n- يستعمل بطاقة الملاحظة.',student:'- يُجيب شفهياً.\n- يُعطي أمثلة.',goal:'التثبّت من مدى الاستيعاب.'},
      {teacher:'- يقدّم بطاقات دعم للمتعثرين.\n- يُشرف على تعلّم الأقران.',student:'- يُنجز أنشطة مبسّطة.',goal:'مساعدة المتعثرين تدريجياً.'},
      {teacher:'- يُكلّف المتقدمين بفقرة وصفية.',student:'- يُنجز بشكل مستقل.\n- يعرض إنتاجه.',goal:'تعميق المفهوم في سياقات جديدة.'},
    ],
    evalGrid:[
      {label:'مع1 — الملاءمة',items:['يتعرّف على النعت في جملة بسيطة.','يحدد موضعه بعد المنعوت.','يُميّز الصفة من الأسماء.']},
      {label:'مع2 — الانسجام',items:['يُطبّق حكم المطابقة.','يُوظّف في جمل من إنشائه.','يُعرب إعراباً صحيحاً.']},
      {label:'مع3 — الثراء',  items:['يُنتج فقرة وصفية بنعوت متنوعة.','يُميّز النعت الحقيقي من السببي.','يُوظّف في وضعيات جديدة.']},
    ],
  };
  const out=path.join(__dirname,'jadhdha_rtl.docx');
  generateDocx(sample,out).then(p=>console.log('OK → '+p)).catch(e=>{console.error(e);process.exit(1);});
}
module.exports={generateDocx};
