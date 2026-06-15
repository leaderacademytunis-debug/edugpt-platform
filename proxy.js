import fs from 'fs';
import path from 'path';

export default async function handler(req, res) {
  // 1. التأكد من أن الطلب سليم وقادم عبر طريقة POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'الطريقة غير مسموحة' });
  }

  // 2. استلام المعطيات القادمة من موقعك (الدرجة، السنة، المادة، الدرس، المدة)
  // ملاحظة هندسية: تأكد أن هذه الأسماء تطابق تماماً ما ترسله واجهة موقعك
  const { degree, level, subject, lessonTitle, duration } = req.body;

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'مفتاح API مفقود' });
  }

  /* =========================================================
     الجزء الهندسي الذكي: البحث الديناميكي الآلي
     ========================================================= */
  
  let officialCompetency = "الالتزام بالتوجيهات البيداغوجية الرسمية.";
  let officialObjectives = "توليد أهداف دقيقة تناسب مستوى الدرس.";

  try {
    // أ. تحديد مكان ملف البيانات وقراءته من الذاكرة
    const curriculumPath = path.join(process.cwd(), 'curriculum.json');
    const curriculumString = fs.readFileSync(curriculumPath, 'utf8');
    const curriculumData = JSON.parse(curriculumString);

    // ب. السير في شجرة البيانات خطوة بخطوة للتأكد من وجود المادة والدرس
    // تخيرنا استخدام هذا الترتيب: الدرجة -> السنة -> المادة -> نوع النشاط -> اسم الدرس
    if (
      curriculumData[degree] &&
      curriculumData[degree][level] &&
      curriculumData[degree][level][subject] &&
      curriculumData[degree][level][subject][lessonTitle]
    ) {
      // ج. إذا عثر الكود على الدرس، يسحب الكفاية والأهداف الرسمية فوراً
      const lessonInfo = curriculumData[degree][level][subject][lessonTitle];
      officialCompetency = lessonInfo.الكفاية_الرسمية;
      // تحويل مصفوفة الأهداف إلى نص مقروء يفهمه الذكاء الاصطناعي
      officialObjectives = lessonInfo.الأهداف_المميزة.join('، ');
    }
  } catch (error) {
    console.error("فشل قراءة ملف البرامج الرسمية:", error);
    // لن نقوم بإيقاف السيرفر، سنعتمد على القيم الافتراضية في حال حدوث خطأ في القراءة
  }

  /* ========================================================= */

  const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

  // 3. صياغة الطلب النهائي وحقن البيانات المستخرجة ديناميكياً
  const payload = {
    system_instruction: {
      parts: [
        {
          text: "أنت متفقد بيداغوجي تونسي خبير ومساعد ذكي في منصة Leader Inclusion. مهمتك صياغة جذاذات دروس دقيقة وعملية تعتمد على البرامج الرسمية لوزارة التربية التونسية. يُمنع منعاً باتاً استخدام عبارات عامة أو إنشائية. يجب كتابة المسائل الرياضية، النصوص، والحوارات الفعليّة بالأرقام والكلمات كما تُقال في القسم تماماً."
        }
      ]
    },
    contents: [
      {
        role: "user",
        parts: [
          {
            text: `قم بإنشاء جذاذة بيداغوجية كاملة لدرس "${lessonTitle}" لمستوى "${level}" (${degree}) في مادة "${subject}" بمدة "${duration}". 
            
            ضوابط صارمة يجب الالتزام بها حرفياً:
            1. الكفاية الرسمية المستهدفة: "${officialCompetency}"
            2. الأهداف الرسمية المميزة: "${officialObjectives}"

            يجب أن يكون الناتج بصيغة JSON حصراً، ويحتوي على المفاتيح التالية فقط لتطابق الجدول:
            - objectives: (مصفوفة من الأهداف الدقيقة المترتبة عن الهدف الرسمي)
            - starting_phase: (نص وضعية الانطلاق الفعلية)
            - exploration: (وضعية المشكل أو الاستكشاف مع المحتوى الفعلي)
            - systematic_learning: (التعلم المنهجي: الخلاصة والقاعدة المستنتجة)
            - integration: (تمرين تطبيقي ملموس)
            - evaluation: (سؤال أو نشاط التقييم)
            - support: (نشاط مخصص للمتعثرين بيداغوجياً)
            - enrichment: (وضعية متقدمة للإثراء وتميز الفائقين)`
          }
        ]
      }
    ],
    generationConfig: {
      responseMimeType: "application/json",
      temperature: 0.3
    }
  };

  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (data.candidates && data.candidates[0].content) {
      const jsonString = data.candidates[0].content.parts[0].text;
      const parsedData = JSON.parse(jsonString);
      return res.status(200).json(parsedData);
    } else {
      return res.status(500).json({ error: 'لم يتم إرجاع نتيجة صالحة من النموذج اللغوي' });
    }
  } catch (error) {
    console.error("خطأ أثناء الاتصال بـ Gemini API:", error);
    return res.status(500).json({ error: 'حدث خطأ في الخادم الخلفي' });
  }
}
