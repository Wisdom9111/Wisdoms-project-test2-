import 'dotenv/config';
import { GoogleGenAI } from "@google/genai";

console.log("Length:", process.env.GEMINI_API_KEY?.length);
console.log("Starts with:", process.env.GEMINI_API_KEY?.substring(0, 4));

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
async function run() {
  try {
    const res = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: "Hello"
    });
    console.log("OK:", res.text);
  } catch (e) {
    console.error("FAIL:", e);
  }
}
run();
