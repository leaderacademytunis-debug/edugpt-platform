// هذه الأدوات (fs و path) تُشبه يدي وعيني الخادم، تسمح له بفتح وقراءة الملفات
import fs from 'fs';
import path from 'path';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'الطريقة غير مسموحة، استخدم POST' });
  }

  // هنا نستلم المعلومات التي اختارها المستخدم من الموقع
  const { lessonTitle, level, subject, duration } = req.body;
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return res.status(500).json({ error: 'مفتاح API مفقود' });
  }

  /* =========================================================
     الجزء الهندسي الجديد: قراءة البرامج الرسمية وحقنها
     ========================================================= */
  
  // 1. نحدد مكان ملف JSON الذي أنشأناه للتو ونقرأه
  const curriculumPath = path.join(process.cwd(), 'curriculum.json');
  const curriculumString = fs.readFileSync(curriculumPath, 'utf8');
  const curriculumData = JSON.parse(curriculumString); // تحويل النص إلى بيانات حقيقية

  // 2. نبحث عن الكفاية الرسمية للدرس المطلوب
  // نضع قيمة افتراضية أولاً في حال كان الدرس غير موجود في الملف
  let officialCompetency = "الالتزام بتوجيهات وزارة التربية التونسية."; 
  
  // إذا وجدنا المستوى والمادة والدرس في الملف، نقوم بسحب النص الرسمي
  if (curriculumData[level] && curriculumData[level][subject] && curriculumData[level][subject][lessonTitle]) {
      officialCompetency = curriculumData[level][subject][lessonTitle];
  }

  /* ========================================================= */

  const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

  const payload = {
    system_instruction: {
      parts: [
        {
          text: "أنت متفقد بيداغوجي تونسي خبير ومساعد ذكي في منصة Leader Inclusion. مهمتك صياغة جذاذات دروس دقيقة وعملية. يجب كتابة المسائل الرياضية والأرقام كما سيقولها المعلم."
        }
      ]
    },
    contents: [
      {
        role: "user",
        parts: [
          {
            // هنا يحدث السحر: ندمج المتغير ${officialCompetency} داخل الطلب
            text: `قم بإنشاء جذاذة درس "${lessonTitle}" لمستوى "${level}" في مادة "${subject}" بمدة "${duration}". 
            
            قاعدة هامة جداً: يجب أن يتم بناء محتوى الجذاذة بالكامل ليحقق الكفاية الرسمية التالية: 
            "${officialCompetency}"

            يجب أن يكون الناتج بصيغة JSON حصراً، ويحتوي على المفاتيح التالية فقط:
            - objectives: (مصفوفة من 3 أهداف دقيقة)
            - starting_phase: (نص الوضعية الرياضية للانطلاق)
            - exploration: (نص وضعية المشكل مع المعطيات)
            - systematic_learning: (القاعدة والاستنتاج)
            - integration: (نص تمرين تطبيقي بالأرقام)
            - evaluation: (سؤال التقييم)
            - support: (نشاط للمتعثرين)
            - enrichment: (مسألة للمتميزين)`
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
      return res.status(500).json({ error: 'لم يتم إرجاع نتيجة صالحة' });
    }
  } catch (error) {
    console.error("Error calling API:", error);
    return res.status(500).json({ error: 'حدث خطأ في الخادم' });
  }
}
