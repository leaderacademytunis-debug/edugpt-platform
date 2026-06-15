export default async function handler(req, res) {
  // 1. التأكد من أن الطلب من نوع POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'الطريقة غير مسموحة، استخدم POST' });
  }

  // 2. استلام المعطيات من واجهة المستخدم (الدرس، المستوى، إلخ)
  const { lessonTitle, level, subject, duration } = req.body;

  // 3. جلب مفتاح API الخاص بـ Gemini من إعدادات Vercel السرية
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return res.status(500).json({ error: 'مفتاح API مفقود' });
  }

  // رابط الاتصال بنموذج Gemini (نستخدم 1.5 Flash لسرعته وكفاءته)
  const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

  // 4. إعداد التعليمات الصارمة وهيكل الطلب
  const payload = {
    system_instruction: {
      parts: [
        {
          text: "أنت متفقد بيداغوجي تونسي خبير ومساعد ذكي في منصة Leader Inclusion. مهمتك صياغة جذاذات دروس دقيقة وعملية وفق البرامج الرسمية التونسية. يُمنع منعاً باتاً استخدام عبارات عامة (مثل: يطرح سؤالاً). يجب كتابة المسائل الرياضية، الأرقام، ونصوص وضعيات الانطلاق حرفياً كما سيقولها المعلم في القسم."
        }
      ]
    },
    contents: [
      {
        role: "user",
        parts: [
          {
            text: `قم بإنشاء جذاذة درس "${lessonTitle}" لمستوى "${level}" في مادة "${subject}" بمدة "${duration}". 
            
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
      // هذه الخطوة السحرية التي تجبر النموذج على إرجاع JSON مرتب
      responseMimeType: "application/json",
      temperature: 0.3 // تقليل الإبداع العشوائي لزيادة الدقة العلمية
    }
  };

  try {
    // 5. إرسال الطلب إلى خوادم Google
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    // 6. استخراج النص وإعادته إلى الواجهة الأمامية
    if (data.candidates && data.candidates[0].content) {
      const jsonString = data.candidates[0].content.parts[0].text;
      const parsedData = JSON.parse(jsonString); // تحويل النص إلى كائن JSON حقيقي
      
      return res.status(200).json(parsedData);
    } else {
      return res.status(500).json({ error: 'لم يتم إرجاع نتيجة صالحة من النموذج' });
    }

  } catch (error) {
    console.error("Error calling Gemini API:", error);
    return res.status(500).json({ error: 'حدث خطأ أثناء الاتصال بالخادم' });
  }
}
