
import { GoogleGenAI, Type } from "@google/genai";
import { Flashcard, QuizQuestion, StudyPlanItem } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

export const getBriefIntro = async (pdfBase64: string): Promise<string> => {
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: [
      {
        parts: [
          { inlineData: { data: pdfBase64, mimeType: 'application/pdf' } },
          { text: 'Provide a professional 2-sentence executive summary of this academic material.' }
        ]
      }
    ]
  });
  return response.text || "No summary available.";
};

export const getBriefDescription = async (pdfBase64: string): Promise<string> => {
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: [
      {
        parts: [
          { inlineData: { data: pdfBase64, mimeType: 'application/pdf' } },
          { text: 'Provide a structured bulleted outline of the key learning objectives and topics in this document.' }
        ]
      }
    ]
  });
  return response.text || "No detailed description available.";
};

export const generateFlashcards = async (pdfBase64: string): Promise<Flashcard[]> => {
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: [
      {
        parts: [
          { inlineData: { data: pdfBase64, mimeType: 'application/pdf' } },
          { text: 'Generate 5 high-impact study flashcards covering core definitions and concepts from this PDF.' }
        ]
      }
    ],
    config: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            question: { type: Type.STRING },
            answer: { type: Type.STRING }
          },
          required: ['question', 'answer']
        }
      }
    }
  });
  return JSON.parse(response.text || '[]');
};

export const generateQuiz = async (pdfBase64: string): Promise<QuizQuestion[]> => {
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: [
      {
        parts: [
          { inlineData: { data: pdfBase64, mimeType: 'application/pdf' } },
          { text: 'Generate a rigorous 5-question multiple choice assessment based on this content.' }
        ]
      }
    ],
    config: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            question: { type: Type.STRING },
            options: { type: Type.ARRAY, items: { type: Type.STRING } },
            correctAnswer: { type: Type.NUMBER, description: 'index of correct option starting from 0' },
            explanation: { type: Type.STRING }
          },
          required: ['question', 'options', 'correctAnswer', 'explanation']
        }
      }
    }
  });
  return JSON.parse(response.text || '[]');
};

export const askPdfQuestion = async (pdfBase64: string, question: string, chatHistory: any[]): Promise<string> => {
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: [
      {
        parts: [
          { inlineData: { data: pdfBase64, mimeType: 'application/pdf' } },
          { text: `System: You are a professional academic assistant. Use the provided PDF context to answer the user question accurately and concisely. Question: ${question}` }
        ]
      }
    ]
  });
  return response.text || "I was unable to locate a specific answer within the document text.";
};

export const askSenseiQuestion = async (question: string, history: { role: string; text: string }[]): Promise<string> => {
  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: history.map(h => ({ role: h.role === 'user' ? 'user' : 'model', parts: [{ text: h.text }] })).concat([
      { role: 'user', parts: [{ text: question }] }
    ]),
    config: {
      systemInstruction: 'You are "AcademiSync AI", a professional academic advisor and learning assistant. Your tone is helpful, precise, and encouraging. Provide clear, structured explanations to help students master complex subjects.'
    }
  });
  return response.text || "I am currently experiencing a processing error. Please rephrase your question.";
};

export const generateStudyPlan = async (
  pdfBase64: string, 
  totalDays: number = 30, 
  availableHoursPerDay: number = 4,
  prioritize: string = "",
  avoid: string = ""
): Promise<StudyPlanItem[]> => {
  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: [
      {
        parts: [
          { inlineData: { data: pdfBase64, mimeType: 'application/pdf' } },
          { 
            text: `Analyze this syllabus and generate a professional academic roadmap for exactly ${totalDays} days. 
            Available Capacity: ${availableHoursPerDay} hours/day.
            
            Priorities: ${prioritize || "None"}
            Exclusions: ${avoid || "None"}

            Requirements:
            1. Provide structured milestones (weekly and key daily targets).
            2. Specifically tailor the plan for mid-semester and end-semester examinations if mentioned in syllabus.
            3. Include dedicated revision slots and exam-oriented preparation blocks.
            4. Balance the daily workload to be realistic.
            5. Return exactly one list of major study milestones/blocks.`
          }
        ]
      }
    ],
    config: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            weekNumber: { type: Type.NUMBER },
            dayNumber: { type: Type.NUMBER, description: 'Optional specific day of the plan' },
            topic: { type: Type.STRING },
            objective: { type: Type.STRING },
            isRevision: { type: Type.BOOLEAN },
            isExamPrep: { type: Type.BOOLEAN },
            intensity: { type: Type.STRING, enum: ['Low', 'Medium', 'High'] }
          },
          required: ['weekNumber', 'topic', 'objective', 'isRevision', 'intensity', 'isExamPrep']
        }
      }
    }
  });
  return JSON.parse(response.text || '[]');
};
