import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export const config = {
  maxDuration: 60, // Set maximum duration for Vercel Serverless Function to allow downloading large PDFs
};

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { fileUrl, courseCode, courseTitle } = req.body;

  if (!fileUrl) {
    return res.status(400).json({ error: 'File URL is required' });
  }

  try {
    // 1. Fetch the PDF securely from the Blob URL with timeout handling
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000); // 8 seconds max download
    
    let base64Data = null;
    try {
      const fileResponse = await fetch(fileUrl, { signal: controller.signal });
      if (!fileResponse.ok) {
        throw new Error('Failed to fetch document from secure storage');
      }
      const arrayBuffer = await fileResponse.arrayBuffer();
      base64Data = Buffer.from(arrayBuffer).toString('base64');
    } finally {
      clearTimeout(timeoutId);
    }
    
    if (!base64Data) {
      throw new Error("Could not download PDF within timeout limits");
    }

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

    const textResponse = response.text || "{}";
    const result = JSON.parse(textResponse);
    return res.status(200).json(result);

  } catch (error: any) {
    const isInvalidKey = error?.status === 400 || error?.message?.includes('API key') || error?.message?.includes('API_KEY_INVALID');
      
    if (!isInvalidKey) {
      console.error("AI Summary Error:", error);
    } else {
      console.warn("AI Summary Warning: Missing or Invalid API Key.");
    }
    
    // Fallback gracefully so we don't break the UI panel
    return res.status(200).json({ 
      topics: isInvalidKey ? ['Configuration Required'] : ['Error Processing Document'],
      overview: isInvalidKey 
        ? "⚠️ Your Gemini API key is missing or invalid on your server (Vercel). Please update your Vercel Environment Variables to include a valid GEMINI_API_KEY."
        : "An unexpected error occurred while analyzing this document. " + error.message
    });
  }
}
