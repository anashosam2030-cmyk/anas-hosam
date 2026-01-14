
import { GoogleGenAI, Type } from "@google/genai";
import { Task } from "../types";

export const generateTask = async (language: 'EN' | 'AR' = 'EN'): Promise<Partial<Task>> => {
  // Always use strictly process.env.API_KEY
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const prompt = language === 'AR' 
    ? "قم بتوليد مهمة إبداعية وممتعة في العالم الحقيقي ليقوم بها شخص ما الآن. يجب أن تتضمن العثور على شيء ما أو إظهاره (مثل: 'صوّر كتابك المدرسي صفحة 10'، 'صوّر دفتر الواجبات'، 'أرني شيئاً أحمر'). اجعل العنوان والوصف باللغة العربية."
    : "Generate a futuristic, fun, and creative real-world mission task for someone to do right now. It must involve finding or showing an object (e.g., 'Take a photo of textbook page 10', 'Photo of homework notebook', 'Show me something red'). Keep it short and engaging.";

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            description: { type: Type.STRING }
          },
          required: ["title", "description"]
        }
      }
    });

    // Access .text property directly
    const text = response.text || "{}";
    return JSON.parse(text);
  } catch (error) {
    console.error("Error generating task text:", error);
    return language === 'AR' 
      ? { title: "مسح عصبي", description: "أظهر للجهاز أي غرض من حولك للمعايرة." }
      : { title: "Neural Scan", description: "Show the AI any object in your vicinity for calibration." };
  }
};

export const verifyTaskProof = async (taskDescription: string, base64Image: string, language: 'EN' | 'AR' = 'EN'): Promise<{ success: boolean; feedback: string }> => {
  // Always use strictly process.env.API_KEY
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  try {
    const cleanBase64 = base64Image.split(',')[1] || base64Image;
    const langInstructions = language === 'AR' 
      ? "تحدث باللغة العربية." 
      : "Respond in English.";

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      // Ensure contents is an object with parts for multi-modal input
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: "image/jpeg",
              data: cleanBase64
            }
          },
          {
            text: `The user was assigned this task: "${taskDescription}". Looking at this image, did they complete it? Respond in JSON format with a boolean 'success' and a short 'feedback' string. ${langInstructions}`
          }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            success: { type: Type.BOOLEAN },
            feedback: { type: Type.STRING }
          },
          required: ["success", "feedback"]
        }
      }
    });

    // Access .text property directly
    const text = response.text || "{}";
    return JSON.parse(text);
  } catch (error) {
    console.error("Verification error:", error);
    return { 
      success: true, 
      feedback: language === 'AR' ? "الاتصال العصبي غير مستقر، تم قبول البيانات افتراضياً." : "Neural link unstable, data accepted by default." 
    };
  }
};
