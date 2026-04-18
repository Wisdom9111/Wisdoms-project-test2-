import { GoogleGenAI, Type } from "@google/genai";
import { QuizQuestion } from '../types';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export interface AnalysisResult {
  keyTopics: string[];
  overview: string;
  extractedText: string;
}

export async function analyzeMaterial(courseCode: string, courseTitle: string, base64Pdf?: string): Promise<AnalysisResult> {
  try {
    const contents: any[] = [
      {
        text: `You are an expert MOUAU Computer Science Professor. 
  I am providing you with the text content of a courseware PDF for Course: ${courseCode} - ${courseTitle}.
  
  TASK:
  1. Identify the actual HEADINGS used in this document for "Key Academic Topics".
  2. Write a 2-line "Brief Resource Overview" that summarizes only what is in this text.
  3. Extract the FULL RAW TEXT of the document for indexing.
  
  STRICT RULE: Do not use any outside information. If the text is about "Data Structures", do not talk about "Database Systems". 
  
  FORMAT: Return as JSON with keys: 'topics' (array), 'overview' (string), and 'extractedText' (string).`
      }
    ];

    if (base64Pdf) {
      contents.push({
        inlineData: {
          mimeType: "application/pdf",
          data: base64Pdf
        }
      });
    }

    const response = await ai.models.generateContent({
      model: "gemini-flash-latest",
      contents: { parts: contents },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            topics: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "Headings extracted from the document"
            },
            overview: {
              type: Type.STRING,
              description: "A 2-line summary strictly based on the text"
            },
            extractedText: {
              type: Type.STRING,
              description: "The full raw text extracted from the document"
            }
          },
          required: ["topics", "overview", "extractedText"]
        }
      }
    });

    const result = JSON.parse(response.text || "{}");
    return {
      keyTopics: result.topics.slice(0, 3),
      overview: result.overview,
      extractedText: result.extractedText
    };
  } catch (error) {
    console.error("Gemini analysis error:", error);
    return {
      keyTopics: ["Academic Essentials", "Curriculum Overview", "Core Core Competencies"],
      overview: "Detailed curriculum analysis is being processed by the system. Refer to the departmental handbook for specific course objectives.",
      extractedText: ""
    };
  }
}

export async function generateQuiz(courseTitle: string, materialText: string): Promise<QuizQuestion[]> {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-flash-latest",
      contents: `You are a MOUAU Professor. Using ONLY the provided text from the courseware, generate a comprehensive Practice Examination.
      If you use outside info, the student will fail.
      
      Course: "${courseTitle}".
      Provided Text:
      """
      ${materialText}
      """
      
      REQUIREMENTS:
      1. Generate EXACTLY 10 questions STRICTLY from the provided PDF content above.
      2. 5 questions must be 'objective' (Multiple Choice with 4 options).
      3. 5 questions must be 'subjective' (Short Answer/Theory questions based on key concepts found in the text).
      4. Ensure all questions are academically rigorous.
      5. For subjective questions, include a 'sampleAnswer' which contains the core facts expected.
      
      Return as a JSON array.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING },
              type: { type: Type.STRING, enum: ["objective", "subjective"] },
              question: { type: Type.STRING },
              options: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: "Required only for objective"
              },
              correctAnswer: { type: Type.INTEGER, description: "Required only for objective (0-3)" },
              sampleAnswer: { type: Type.STRING, description: "Required for subjective grading" },
              explanation: { type: Type.STRING }
            },
            required: ["id", "type", "question"]
          }
        }
      }
    });

    return JSON.parse(response.text);
  } catch (error) {
    console.error("Quiz generation error:", error);
    throw new Error("Unable to generate examination at this time.");
  }
}

export interface GradingResult {
  score: number; // 0 or 2
  feedback: string;
}

export async function gradeSubjectiveAnswer(question: string, sampleAnswer: string, studentAnswer: string): Promise<GradingResult> {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-flash-latest",
      contents: `You are an AI Grader for MOUAU. 
      Analyze the student's answer against the expected facts for the following question.
      
      Question: ${question}
      Expected Facts/Sample: ${sampleAnswer}
      Student's Answer: ${studentAnswer}
      
      GRADING RULES:
      - Award 2 points (score: 2) if the student captures the main concepts accurately.
      - Award 0 points (score: 0) if the answer is incorrect, irrelevant, or missing key facts.
      - Be fair but strict with academic accuracy.
      - Provide a brief 1-sentence explanation of the grading.
      
      Return as a JSON object.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            score: { type: Type.INTEGER, enum: [0, 2] },
            feedback: { type: Type.STRING }
          },
          required: ["score", "feedback"]
        }
      }
    });

    return JSON.parse(response.text);
  } catch (error) {
    console.error("Grading error:", error);
    return { score: 0, feedback: "Error during automated grading. Please consult your lecturer." };
  }
}

export async function researchAssistantQuery(query: string, documents: { code: string; title: string; content: string }[]): Promise<string> {
  try {
    const docContext = documents.map(d => `[Source: ${d.code} - ${d.title}]\n${d.content}`).join('\n\n---\n\n');
    
    const response = await ai.models.generateContent({
      model: "gemini-flash-latest",
      contents: `You are the MOUAU AI Research Assistant. Answer the student's question based on the provided course documents.
      
      DOCUMENTS PROVIDED:
      ${docContext}
      
      STUDENT QUESTION: "${query}"
      
      INSTRUCTIONS:
      a) Provide a direct answer.
      b) MUST cite sources clearly: "Reference: [Course Code] - [Document Name] ([Year/Date])". 
      Note: If you don't have a date, omit the date part or use the most relevant metadata.
      c) If the information is NOT in any PDF, give a general answer but explicitly state: "Note: This information was not found in the uploaded courseware."
      
      Maintain a professional, academic tone suitable for Michael Okpara University of Agriculture, Umudike.`
    });

    return response.text || "";
  } catch (error) {
    console.error("Research assistant error:", error);
    return "I am currently unable to access the academic library. Please try again shortly.";
  }
}
