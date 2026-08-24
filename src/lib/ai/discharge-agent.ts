import { GoogleGenAI, Type, Schema } from '@google/genai';
import { anonymizeForLLM } from './anonymizer';
import { withLLMErrorHandling } from './error-handler';

function getGenAIClient(): GoogleGenAI | null {
  if (process.env.GEMINI_API_KEY) {
    return new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  }
  return null;
}

const postVisitDischargeSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    simplifiedDiagnosis: { type: Type.STRING },
    medicationInstructions: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          medicationName: { type: Type.STRING },
          purpose: { type: Type.STRING },
          timingAndDosage: { type: Type.STRING },
        },
        required: ['medicationName', 'purpose', 'timingAndDosage'],
      },
    },
    homeCareSteps: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
    },
    warningSignsToReturn: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
    },
    followUpRecommendation: { type: Type.STRING },
  },
  required: [
    'simplifiedDiagnosis',
    'medicationInstructions',
    'homeCareSteps',
    'warningSignsToReturn',
  ],
};

export interface PostVisitDischargeResult {
  simplifiedDiagnosis: string;
  medicationInstructions: Array<{
    medicationName: string;
    purpose: string;
    timingAndDosage: string;
  }>;
  homeCareSteps: string[];
  warningSignsToReturn: string[];
  followUpRecommendation?: string;
}

export async function generateLocalizedDischargeSummary(
  physicianNotes: string,
  targetLanguage: 'en' | 'ta' | 'hi' = 'en',
  patientInfo?: { name?: string }
) {
  const languageMap = { en: 'English', ta: 'Tamil', hi: 'Hindi' };

  return withLLMErrorHandling<PostVisitDischargeResult>(async () => {
    const { anonymizedText } = anonymizeForLLM(physicianNotes, patientInfo);
    const ai = getGenAIClient();

    if (!ai) {
      // Mock discharge summary for development/testing if API key is not configured
      const sampleTamil = targetLanguage === 'ta';
      const sampleHindi = targetLanguage === 'hi';

      return {
        simplifiedDiagnosis: sampleTamil
          ? 'வழக்கமான உடல் நலம் மற்றும் ஆரம்ப நிலை சிகிச்சை'
          : sampleHindi
          ? 'सामान्य स्वास्थ्य जांच और प्रारंभिक उपचार'
          : 'General Clinical Assessment and Initial Care',
        medicationInstructions: [
          {
            medicationName: sampleTamil ? 'பரிந்துரைக்கப்பட்ட மாத்திரை' : sampleHindi ? 'निर्धारित दवा' : 'Prescribed Medication',
            purpose: sampleTamil ? 'வலி நிவாரணம்' : sampleHindi ? 'दर्द से राहत' : 'Symptom relief',
            timingAndDosage: sampleTamil ? 'உணவுக்குப் பிறகு தினமும் 1 முறை' : sampleHindi ? 'भोजन के बाद दिन में 1 बार' : '1 tablet daily after food',
          },
        ],
        homeCareSteps: sampleTamil
          ? ['போதுமான அளவு தண்ணீர் குடிக்கவும்', 'நன்றாக ஓய்வெடுக்கவும்']
          : sampleHindi
          ? ['पर्याप्त पानी पिएं', 'पर्याप्त आराम करें']
          : ['Stay adequately hydrated', 'Get sufficient rest and monitor symptoms'],
        warningSignsToReturn: sampleTamil
          ? ['கடுமையான காய்ச்சல் அல்லது மூச்சுத் திணறல் ஏற்பட்டால் உடனடியாக மருத்துவரை அணுகவும்']
          : sampleHindi
          ? ['यदि तेज बुखार या सांस लेने में तकलीफ हो तो तुरंत अस्पताल जाएं']
          : ['Seek immediate emergency medical care if you experience severe shortness of breath or high fever'],
        followUpRecommendation: sampleTamil ? '7 நாட்களுக்குப் பிறகு மீண்டும் பரிசோதிக்கவும்' : sampleHindi ? '7 दिनों के बाद फॉलो-अप करें' : 'Follow up in 7 days if symptoms persist',
      };
    }

    const systemInstruction = `
      You are an expert patient advocate and healthcare communicator.
      Translate the physician's clinical notes into clear, 4th-grade reading level discharge instructions.
      Produce the output translated directly into ${languageMap[targetLanguage]}.
      Ensure all medication schedules, care steps, and emergency warning signs are simple, direct, unambiguous, and easy to follow.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Physician Clinical Notes: ${anonymizedText}`,
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
        responseSchema: postVisitDischargeSchema,
        temperature: 0.2,
      },
    });

    const parsed = JSON.parse(response.text || '{}');
    return parsed as PostVisitDischargeResult;
  });
}
