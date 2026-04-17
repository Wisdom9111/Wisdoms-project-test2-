import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export interface AnalysisResult {
  keyTopics: string[];
  overview: string;
}

export async function analyzeMaterial(courseCode: string, courseTitle: string): Promise<AnalysisResult> {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Drafting course details for a university portal at MOUAU (Michael Okpara University of Agriculture, Umudike). 
      Course: ${courseCode} - ${courseTitle}.
      Please generate 3 relevant key academic topics for this course and a professional 2-line summary/overview of what students will learn. 
      Return the output as a clean JSON object.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            keyTopics: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "3 key topics extracted from the material content"
            },
            overview: {
              type: Type.STRING,
              description: "A professional 2-line summary of the content"
            }
          },
          required: ["keyTopics", "overview"]
        }
      }
    });

    const result = JSON.parse(response.text);
    return {
      keyTopics: result.keyTopics.slice(0, 3),
      overview: result.overview
    };
  } catch (error) {
    console.error("Gemini analysis error:", error);
    return {
      keyTopics: ["Contact Dept for details", "Syllabus Review", "Academic Excellence"],
      overview: "Detailed course overview pending academic validation from the department office."
    };
  }
}
