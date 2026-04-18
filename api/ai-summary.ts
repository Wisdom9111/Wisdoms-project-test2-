import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { fileUrl, courseCode, courseTitle } = req.body;

  if (!fileUrl) {
    return res.status(400).json({ error: 'File URL is required' });
  }

  try {
    // 1. Fetch the PDF securely from the Blob URL
    const fileResponse = await fetch(fileUrl);
    if (!fileResponse.ok) {
      throw new Error('Failed to fetch document from secure storage');
    }

    const arrayBuffer = await fileResponse.arrayBuffer();
    const base64Data = Buffer.from(arrayBuffer).toString('base64');

    // 2. Pass to Gemini API to extract topics & summary
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: {
        parts: [
          {
            text: `You are an AI Academic Assistant for MOUAU. 
I am providing you with a PDF document for Course: ${courseCode} - ${courseTitle}.
TASK:
1. Identify the key topics or headings taught in this document.
2. Provide a brief 2-3 sentence overview of what a student will learn after finishing this document.
Return ONLY valid JSON.`
          },
          {
            inlineData: {
              mimeType: "application/pdf",
              data: base64Data
            }
          }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            topics: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "3-5 Main headings or topics found in the document"
            },
            overview: {
              type: Type.STRING,
              description: "A brief summary of what the student will learn"
            }
          },
          required: ["topics", "overview"]
        }
      }
    });

    const result = JSON.parse(response.text || "{}");
    return res.status(200).json(result);

  } catch (error: any) {
    console.error("AI Summary Error:", error);
    return res.status(500).json({ 
      error: 'Failed to analyze document format or size exceeded allowed limits.', 
      details: error.message 
    });
  }
}
