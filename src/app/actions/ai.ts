'use server'

import OpenAI from "openai";

const client = new OpenAI({
  baseURL: "https://api.cerebras.ai/v1",
  apiKey: process.env.CEREBRAS_API_KEY,
});

export async function enhanceScannedText(rawText: string) {
  if (!rawText || rawText.trim().length === 0) return "";

  try {
    const completion = await client.chat.completions.create({
      model: "llama-3.3-70b", // UPDATED MODEL ID
      temperature: 0.1, 
      messages: [
        {
          role: "system",
          content: `You are an expert transcriptionist for medical and nursing students.
          
          Your task is to take raw, messy OCR text scanned from handwritten or printed notes and convert it into clean, organized Markdown.
          
          RULES:
          1. Fix typos, spacing errors, and "garbage" characters (e.g., "adiil W" -> ignored, "bid" -> "b.i.d.").
          2. Detect the structure: Use headers (#), bullet points (-), and bold terms (**Term**: Definition).
          3. Preserve medical accuracy: Ensure abbreviations like 'qd', 'q4h', 'SOAP' are correctly transcribed.
          4. Remove artifacts: Delete page numbers, headers/footers, or random symbols (e.g., "|", "{", "}").
          5. Output ONLY the cleaned text. Do not add conversational filler like "Here is the text".`
        },
        {
          role: "user",
          content: `Here is the raw OCR text:\n\n${rawText.substring(0, 50000)}`
        }
      ]
    });

    return completion.choices[0].message.content || rawText;
  } catch (error) {
    console.error("AI Enhancement Failed:", error);
    return rawText; // Fallback to raw text if AI fails
  }
}
