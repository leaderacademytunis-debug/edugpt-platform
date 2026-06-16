export default async function handler(req, res) {
  const { lesson } = req.body;
  const apiKey = process.env.GEMINI_API_KEY;

  const prompt = `
    أنت متفقد تربوي تونسي خبير. قم بنقد الجذاذة التالية بصرامة:
    ${lesson}
    أعطني التقرير في نقاط محددة:
    1. نقاط القوة.
    2. ملاحظات للتحسين (خاصة في التوافق مع الكفايات).
    3. درجة من 10.
  `;

  // هنا نرسل هذا الطلب لـ Gemini ونعيد النتيجة
  // (نفس طريقة fetch التي استخدمناها سابقاً)
}
