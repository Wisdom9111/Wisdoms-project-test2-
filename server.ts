import express from 'express';
import 'dotenv/config';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import { put, del } from '@vercel/blob';
import { handleUpload, type HandleUploadBody } from '@vercel/blob/client';
import multer from 'multer';
import cors from 'cors';
import { GoogleGenAI, Type } from "@google/genai";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize AI SDK
const ai = process.env.GEMINI_API_KEY ? new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY }) : null;

async function startServer() {
  console.log('Initializing MOUAU CMS Server...');
  const app = express();
  const PORT = 3000;

  // Basic middleware
  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // API Route for Sending Email (Nodemailer)
  app.post('/api/send-email', async (req, res) => {
    if (!process.env.MOUAU_PORTAL_KEY) {
      return res.status(500).json({ error: 'MOUAU_PORTAL_KEY (Gmail App Password) is missing.' });
    }

    const { email, code, type } = req.body;

    if (!email || !code) {
      return res.status(400).json({ error: 'Email and verification code are required' });
    }

    const isReset = type === 'reset';
    const subject = isReset 
      ? 'Your MOUAU Password Reset Code' 
      : 'Your MOUAU Portal Verification Code';
    const introText = isReset
      ? 'You recently requested to reset your password for the MOUAU Courseware Portal.'
      : 'You recently requested to register for the MOUAU Courseware Management System.';
    const footerText = isReset
      ? 'Please enter this exact code securely to create a new password.'
      : 'Please enter this exact code in the portal to complete your registration securely.';

    try {
      const transporter = await import('nodemailer').then(m => m.default.createTransport({
        service: 'gmail',
        auth: {
          user: 'mouau.portal.verify@gmail.com',
          pass: process.env.MOUAU_PORTAL_KEY,
        },
      }));

      const info = await transporter.sendMail({
        from: '"MOUAU Portal" <mouau.portal.verify@gmail.com>',
        to: email,
        subject: subject,
        html: `
          <div style="font-family: Arial, sans-serif; padding: 20px; max-w: 600px; margin: 0 auto;">
            <h2 style="color: #006837;">MOUAU Courseware Portal Verification</h2>
            <p style="color: #444; font-size: 16px;">${introText}</p>
            <div style="background-color: #f8fafc; padding: 20px; text-align: center; border-radius: 8px; margin: 30px 0; border: 1px solid #e2e8f0;">
              <p style="margin: 0; font-size: 14px; color: #64748b; text-transform: uppercase; letter-spacing: 1px; font-weight: bold;">Your Verification Code</p>
              <p style="margin: 10px 0 0; font-size: 32px; font-family: monospace; font-weight: bold; color: #1a1a1a;">${code}</p>
            </div>
            <p style="color: #444; font-size: 14px;">${footerText}</p>
            <hr style="border: 0; border-top: 1px solid #eee; margin: 30px 0;" />
            <p style="font-size: 12px; color: #888;">If you did not request this, please ignore this email securely.</p>
          </div>
        `,
      });

      return res.status(200).json({ success: true, messageId: info.messageId });
    } catch (error: any) {
      console.error('Email sending error:', error);
      return res.status(500).json({ error: error.message || 'Error sending email' });
    }
  });

  // API Route for Vercel Blob Signature (Secure handleUpload flow)
  app.post('/api/upload', async (req, res) => {
    const body = req.body as HandleUploadBody;
    try {
      const jsonResponse = await handleUpload({
        body,
        request: req,
        onBeforeGenerateToken: async (pathname) => {
          // In a real app, verify user session here
          // For now, allow academic document types
          return {
            allowedContentTypes: [
              'application/pdf', 
              'application/msword', 
              'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
            ],
            tokenPayload: JSON.stringify({
              timestamp: Date.now(),
            }),
          };
        },
        onUploadCompleted: async ({ blob, tokenPayload }) => {
          console.log('Vercel Blob upload completed:', blob.url);
        },
      });

      return res.status(200).json(jsonResponse);
    } catch (error: any) {
      console.error('Blob handleUpload error:', error);
      return res.status(400).json({ error: error.message });
    }
  });

  app.get('/api/test', (req, res) => {
    res.json({ message: 'Server is reachable' });
  });

  // API Route for Vercel Blob Deletion
  app.post('/api/delete', async (req, res) => {
    const { url } = req.body;
    try {
      if (!process.env.BLOB_READ_WRITE_TOKEN) {
        return res.status(500).json({ error: 'Server configuration error' });
      }
      if (!url) {
        return res.status(400).json({ error: 'URL is required' });
      }

      await del(url, {
        token: process.env.BLOB_READ_WRITE_TOKEN
      });

      res.status(200).json({ message: 'Blob deleted successfully' });
    } catch (error: any) {
      console.error('Delete error:', error);
      res.status(500).json({ error: error.message || 'Error deleting blob' });
    }
  });

  // AI Summary endpoint
  app.post('/api/ai-summary', async (req, res) => {
    if (!ai) return res.status(500).json({ error: 'Gemini API not configured on server' });

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

      // 2. Pass to Gemini API
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

      // Handle both getter/method depending on version of SDK
      const textResponse = response.text || "";
      const result = JSON.parse(textResponse || "{}");
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
  });

  // AI Chat endpoint
  app.post('/api/ai-chat', async (req, res) => {
    if (!ai) return res.status(500).json({ error: 'Gemini API not configured on server' });

    const { query, libraryContext } = req.body;

    if (!query) {
      return res.status(400).json({ error: 'Query is required' });
    }

    try {
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: `You are Demic_AI, an expert academic assistant for Michael Okpara University of Agriculture, Umudike (MOUAU).

STUDENT OUESTION: "${query}"

MOUAU COURSE LIBRARY CONTEXT:
${libraryContext}

INSTRUCTIONS:
1. Provide a direct, helpful, and academic answer to the student's question.
2. If the student's question directly relates to any of the courses listed in the MOUAU COURSE LIBRARY CONTEXT above, you MUST explicitly recommend that they read that document (e.g., "For more details, please refer to the uploaded document: [Course Code] - [Course Title] uploaded by [Lecturer Name]").
3. If the question is general or not found in the library, answer the question accurately using your general academic knowledge, but briefly mention that there are currently no specific lecture notes on this exact topic in the library.
4. Keep the response concise, formatted beautifully in Markdown, and easy to read.
5. End your response with the exact signature phrase: "Generated by Demic_AI" on a new line.`
      });

      const textResponse = response.text || "";
      return res.status(200).json({ answer: textResponse });

    } catch (error: any) {
      const isInvalidKey = error?.status === 400 || error?.message?.includes('API key') || error?.message?.includes('API_KEY_INVALID');
      
      if (!isInvalidKey) {
        console.error("AI Chat Error:", error);
      } else {
        console.warn("AI Chat Warning: Missing or Invalid API Key.");
      }

      const errorMessage = isInvalidKey
        ? "⚠️ **API Configuration Error**\nYour Gemini API key is either invalid or missing. If you have deployed this project to Vercel, please navigate to your Vercel Dashboard -> Settings -> Environment Variables, and ensure `GEMINI_API_KEY` is set perfectly with no extra spaces or quotes."
        : "Sorry, I am currently unreachable due to a technical error. Please try again later.";
        
      // Ensure we always return 200 inside chat so it displays cleanly as the AI's response instead of failing
      return res.status(200).json({ answer: errorMessage });
    }
  });

  // AI Document-Specific Chat endpoint
  app.post('/api/ai-doc-chat', async (req, res) => {
    if (!ai) return res.status(500).json({ error: 'Gemini API not configured on server' });

    const { fileUrl, courseCode, courseTitle, query, history, libraryContext } = req.body;

    if (!fileUrl || !query) {
      return res.status(400).json({ error: 'File URL and query are required' });
    }

    try {
      // 1. Fetch file with a strict timeout so Vercel doesn't kill the function with 504
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000); // 4 seconds max download time
      
      let base64Data = null;
      try {
        const fileResponse = await fetch(fileUrl, { signal: controller.signal });
        if (fileResponse.ok) {
          const arrayBuffer = await fileResponse.arrayBuffer();
          base64Data = Buffer.from(arrayBuffer).toString('base64');
        }
      } catch (fetchErr) {
        console.warn("Could not fetch PDF in time, falling back to library context.", fetchErr);
      } finally {
        clearTimeout(timeoutId);
      }

      const historyText = (history || []).map((msg: any) => `${msg.role === 'user' ? 'Student' : 'Demic_AI'}: ${msg.text}`).join('\n\n');

      const parts: any[] = [
        {
          text: `You are Demic_AI, an expert academic assistant for MOUAU.
I am providing you with context about the current course document: ${courseCode} - ${courseTitle}.

MOUAU COURSE LIBRARY (Other documents uploaded by lecturers):
${libraryContext || "(No other materials linked)"}

CHAT HISTORY:
${historyText || "(No previous history)"}

STUDENT QUESTION: "${query}"

INSTRUCTIONS:
1. Answer the student's question accurately. If I attached the PDF document, use it as your strict primary source of truth.
2. If the answer exists in the current document context, answer it directly and thoroughly without explaining that you read it in the document. Do not start sentences with "According to the document". Just give the facts directly as the tutor.
3. If the answer is NOT in the current document, OR if another document in the MOUAU COURSE LIBRARY represents the subject better, you MUST reference that specific course code and title (e.g., "This isn't fully covered in your current document, but you can find this detailed in [Course Code] - [Course Title]").
4. If it's a general question not found anywhere, answer it correctly acting as a brilliant tutor. Do not mention that the lecture notes aren't available unless specifically asked "is this in the document".
5. Keep your answer direct, helpful, and concise. Format beautifully in markdown.
6. End your response with the exact signature: "Generated by Demic_AI" on a new line.`
        }
      ];

      // Only attach the huge PDF if we successfully fetched it
      if (base64Data) {
        parts.push({
          inlineData: {
            mimeType: "application/pdf",
            data: base64Data
          }
        });
      }

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: { parts }
      });

      const textResponse = response.text || "";
      return res.status(200).json({ answer: textResponse });

    } catch (error: any) {
      const isInvalidKey = error?.status === 400 || error?.message?.includes('API key') || error?.message?.includes('API_KEY_INVALID');
      if (!isInvalidKey) console.error("AI Doc Chat Error:", error);
      else console.warn("AI Doc Chat Warning: Missing or Invalid API Key.");

      return res.status(200).json({ 
        answer: isInvalidKey 
          ? "⚠️ **API Configuration Error**\nYour Gemini API key is missing or invalid. Please check Vercel environment variables." 
          : "Sorry, I encountered an error while processing this request. Please try again."
      });
    }
  });

  // Health check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok' });
  });

  // Vite middleware setup
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // Production serving
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer().catch(err => {
  console.error('CRITICAL: Server failed to start:', err);
  process.exit(1);
});
