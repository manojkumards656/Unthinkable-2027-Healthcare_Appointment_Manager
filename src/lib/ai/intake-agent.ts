import { GoogleGenAI, Type, Schema } from '@google/genai';
import { anonymizeForLLM } from './anonymizer';
import { withLLMErrorHandling } from './error-handler';

function getGenAIClient(): GoogleGenAI | null {
  if (process.env.GEMINI_API_KEY) {
    return new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  }
  return null;
}

const preVisitIntakeSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    chiefComplaint: { type: Type.STRING },
    symptomDurationDays: { type: Type.INTEGER },
    painScaleOneToTen: { type: Type.INTEGER },
    urgencyLevel: {
      type: Type.STRING,
      enum: ['Low', 'Medium', 'High'],
    },
    redFlagAlerts: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
    },
    suggestedDoctorQuestions: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
    },
    formattedClinicalSummary: { type: Type.STRING },
  },
  required: [
    'chiefComplaint',
    'symptomDurationDays',
    'painScaleOneToTen',
    'urgencyLevel',
    'redFlagAlerts',
    'suggestedDoctorQuestions',
    'formattedClinicalSummary',
  ],
};

export interface PreVisitTriageResult {
  chiefComplaint: string;
  symptomDurationDays: number;
  painScaleOneToTen: number;
  urgencyLevel: 'Low' | 'Medium' | 'High';
  redFlagAlerts: string[];
  suggestedDoctorQuestions: string[];
  formattedClinicalSummary: string;
}

export async function processPatientIntake(
  rawInputText: string,
  inputLanguage: 'en' | 'ta' | 'hi' = 'en',
  patientInfo?: { name?: string; email?: string; phone?: string }
) {
  return withLLMErrorHandling<PreVisitTriageResult>(async () => {
    // 1. Scrub PHI
    const { anonymizedText } = anonymizeForLLM(rawInputText, patientInfo);

    const ai = getGenAIClient();
    if (!ai) {
      // Mock triage result for development/testing if API key is not configured
      return {
        chiefComplaint: anonymizedText.slice(0, 80),
        symptomDurationDays: 3,
        painScaleOneToTen: 4,
        urgencyLevel: anonymizedText.toLowerCase().includes('chest') || anonymizedText.toLowerCase().includes('breath') ? 'High' : 'Medium',
        redFlagAlerts: anonymizedText.toLowerCase().includes('chest') ? ['Possible acute cardiopulmonary symptom'] : [],
        suggestedDoctorQuestions: [
          'How does the symptom change with physical exertion?',
          'Have you had similar episodes previously?',
          'Are you currently taking any prescription medications for this?',
        ],
        formattedClinicalSummary: `Patient presents with self-reported symptoms: "${anonymizedText}". Triaged in language ${inputLanguage}. Recommended for routine physician evaluation.`,
      };
    }

    const systemInstruction = `
      You are an expert emergency medicine triage assistant.
      Analyze the incoming patient symptom description provided in English, Tamil, or Hindi.
      Extract key clinical metrics and generate a concise EHR pre-visit summary in English for the doctor.
      Identify any emergency red-flag symptoms (e.g., chest pain, acute dyspnea, sudden neurological deficits, severe unrelenting pain).
      Classify urgency as "Low", "Medium", or "High".
      Suggest 3 pertinent clinical questions the doctor should ask during the visit.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Patient Submission (Language: ${inputLanguage}): ${anonymizedText}`,
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
        responseSchema: preVisitIntakeSchema,
        temperature: 0.1,
      },
    });

    const parsed = JSON.parse(response.text || '{}');
    return parsed as PreVisitTriageResult;
  });
}
