import fs from 'fs';
import path from 'path';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'الطريقة غير مسموحة، استخدم POST' });
  }

  const { degree, level, subject, lessonTitle } = req.body;
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return res.status(500).json({ error: 'مفتاح API مفقود' });
  }

  // 1. جلب البيانات الرسمية (شبكة التقييم والأهداف)
  let subjectCriteria = "استخدم المعايير التقييمية الرسمية للمادة.";
  let lessonObjectives = "أهداف الدرس المحددة في البرنامج.";

  try {
    const criteriaPath = path.join(process.cwd(), 'evaluation_criteria.json');
    const criteriaData = JSON.parse(fs.readFileSync(criteriaPath, 'utf8'));
    if (criteriaData[subject]) {
      subjectCriteria = JSON.stringify(criteriaData[subject]);
    }

    const currPath = path.join(process.cwd(), 'curriculum.json');
    const currData = JSON.parse(fs.readFileSync(currPath, 'utf8'));
    if (currData[degree]?.[level]?.[subject]?.[lessonTitle]) {
      lessonObjectives = currData[degree][level][subject][lessonTitle].الأهداف_المميزة.join('، ');
    }
  } catch (error) {
    console.error("خطأ في قراءة ملفات البيانات:", error);
  }

  const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

  // 2. صياغة الطلب الصارم مع إضافة أمر بناء جدول التقييم (Grading Grid)
  const payload = {
    system_instruction: {
      parts: [
        {
          text: `أنت خبير تقييم وامتحانات تونسي في محرك EDUGPT (قسم Leader Prep). مهمتك تصميم اختبارات تقييمية دقيقة للمرحلة الابتدائية. يجب أن يعتمد الاختبار على "وضعية مشكل دالة" تتفرع منها تعليمات متدرجة. يُمنع صياغة أسئلة مباشرة مجردة. يجب ربط كل تعليمة بمعيار تقييم رسمي تونسي، ويجب توفير جدول إسناد أعداد جاهز للطباعة أسفل الاختبار.`
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
            2. يجب أن تتوزع التعليمات وجدول إسناد الأعداد بناءً على المعايير الرسمية التالية: "${subjectCriteria}".

            أرجع النتيجة بصيغة JSON حصراً، ويجب أن يحتوي على المفاتيح التالية فقط:
            - test_context: (نص السند أو وضعية المشكل الأساسية).
            - instructions: (مصفوفة التعليمات: "question" نص التعليمة، "targeted_criterion" اسم المعيار، "suggested_score" العدد).
            - excellence_question: (تعليمة التميز: "question"، "targeted_criterion"، "suggested_score").
            - grading_grid: (كائن يمثل جدول إسناد الأعداد، يحتوي على "criteria_rows" وهي مصفوفة، كل عنصر فيها يحتوي على "criterion_name" اسم المعيار المستعمل، و "score_levels" وهي مصفوفة تمثل مستويات التملك والأعداد المحتملة مثل ["0", "0.5", "1", "1.5", "2"]).`
          }
        ]
      }
    ],
    generationConfig: {
      responseMimeType: "application/json",
      temperature: 0.2 // لضمان صرامة المعايير وتجنب الارتجال
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
