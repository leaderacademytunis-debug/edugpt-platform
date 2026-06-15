import fs from 'fs';
import path from 'path';

export default async function handler(req, res) {
  // 1. التأكد من نوع الطلب
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'الطريقة غير مسموحة، استخدم POST' });
  }

  // 2. استلام المعطيات من واجهة قسم الاختبارات
  const { degree, level, subject, lessonTitle } = req.body;
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return res.status(500).json({ error: 'مفتاح API مفقود' });
  }

  /* =========================================================
     الجزء الهندسي: سحب المعايير والأهداف آلياً
     ========================================================= */
  let subjectCriteria = "استخدم المعايير التقييمية الرسمية للمادة.";
  let lessonObjectives = "أهداف الدرس المحددة في البرنامج.";

  try {
    // أ. قراءة شبكة التقييم الخاصة بالمادة
    const criteriaPath = path.join(process.cwd(), 'evaluation_criteria.json');
    const criteriaData = JSON.parse(fs.readFileSync(criteriaPath, 'utf8'));
    if (criteriaData[subject]) {
      subjectCriteria = JSON.stringify(criteriaData[subject]);
    }

    // ب. قراءة أهداف الدرس لضمان أن الاختبار لا يخرج عن الموضوع
    const currPath = path.join(process.cwd(), 'curriculum.json');
    const currData = JSON.parse(fs.readFileSync(currPath, 'utf8'));
    if (currData[degree]?.[level]?.[subject]?.[lessonTitle]) {
      lessonObjectives = currData[degree][level][subject][lessonTitle].الأهداف_المميزة.join('، ');
    }
  } catch (error) {
    console.error("خطأ في قراءة ملفات البيانات:", error);
  }
  /* ========================================================= */

  const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

  // 3. صياغة الطلب الصارم الموجه لبناء الاختبارات
  const payload = {
    system_instruction: {
      parts: [
        {
          text: `أنت خبير تقييم وامتحانات تونسي في محرك EDUGPT (قسم Leader Prep). مهمتك تصميم اختبارات تقييمية دقيقة للمرحلة الابتدائية. يجب أن يعتمد الاختبار على "وضعية مشكل دالة" (سند شامل) تتفرع منها تعليمات متدرجة. يُمنع صياغة أسئلة مباشرة مجردة. يجب ربط كل تعليمة بمعيار تقييم رسمي تونسي.`
        }
      ]
    },
    contents: [
      {
        role: "user",
        parts: [
          {
            text: `قم بتصميم اختبار لدرس "${lessonTitle}" لمستوى "${level}".
            
            الضوابط البيداغوجية:
            1. يجب أن يقيس الاختبار هذه الأهداف حصراً: "${lessonObjectives}".
            2. يجب أن تتوزع التعليمات لتقيس المعايير الرسمية التالية: "${subjectCriteria}".

            أرجع النتيجة بصيغة JSON حصراً، ويجب أن يحتوي على المفاتيح التالية فقط لتطابق جدول الواجهة الأمامية:
            - test_context: (نص السند أو وضعية المشكل الأساسية، يجب أن يكون واقعياً ومناسباً لعمر التلميذ، بالأرقام والمعطيات).
            - instructions: (مصفوفة تحتوي على التعليمات الأساسية، كل تعليمة هي كائن يحتوي على: "question" نص التعليمة، "targeted_criterion" اسم المعيار الذي تقيسه، "suggested_score" العدد المقترح للتعليمة).
            - excellence_question: (كائن يحتوي على تعليمة التميز: "question" سؤال مركب، "targeted_criterion" معيار التميز، "suggested_score" العدد المقترح).`
          }
        ]
      }
    ],
    generationConfig: {
      responseMimeType: "application/json",
      temperature: 0.2 // درجة حرارة منخفضة جداً لضمان صرامة المعايير وتجنب الهلوسة
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
    console.error("Error calling Gemini API:", error);
    return res.status(500).json({ error: 'حدث خطأ في الخادم' });
  }
}
