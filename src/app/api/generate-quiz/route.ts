import { NextResponse } from "next/server";
import OpenAI from "openai";

const apiKey = process.env.NEBIUS_API_KEY;
const client = new OpenAI({
  baseURL: "https://api.studio.nebius.ai/v1",
  apiKey: apiKey || "dummy_key",
});

export async function POST(req: Request) {
  try {
    const { text, types } = await req.json();
    
    // Limit text to ~45k chars to avoid context overflow
    const truncatedText = text.substring(0, 45000);

    const prompt = `
      You are a Nurse Educator. Create a quiz from the text provided.
      Requested Question Types: ${types.join(", ")}.
      
      CRITICAL RULES:
      1. Output ONLY valid JSON. No markdown.
      2. For Multiple Choice 'correctAnswer': MUST be the EXACT string from the 'options' array. DO NOT use "A", "B", "C".
      3. For FRQ: You MUST provide a 'modelAnswer' field.
      
      Correct Multiple Choice Example:
      {
        "id": "1",
        "type": "multiple_choice",
        "question": "What is the periosteum?",
        "options": ["Inner layer", "Outer membrane", "Bone marrow"],
        "correctAnswer": "Outer membrane" 
      }

      Required JSON Structure:
      {
        "questions": [
          {
            "id": "1",
            "type": "multiple_choice",
            "question": "...",
            "options": ["..."],
            "correctAnswer": "EXACT OPTION STRING"
          },
          {
            "id": "2",
            "type": "frq",
            "question": "Describe...",
            "modelAnswer": "The correct answer is..."
          },
          {
            "id": "3",
            "type": "matching",
            "question": "Match...",
            "pairs": [{ "left": "...", "right": "..." }]
          },
          {
            "id": "4",
            "type": "sata",
            "question": "Select all...",
            "options": ["..."],
            "correctAnswers": ["Option 1", "Option 3"]
          }
        ]
      }

      Text to quiz:
      ${truncatedText}
    `;

    const completion = await client.chat.completions.create({
      model: "meta-llama/Llama-3.3-70B-Instruct",
      messages: [
        { role: "system", content: "You are a helpful assistant that outputs only raw JSON." },
        { role: "user", content: prompt }
      ],
      temperature: 0.1,
      max_tokens: 4000,
      response_format: { type: "json_object" }
    });

    let content = completion.choices[0].message.content;
    if (!content) throw new Error("Empty response");

    // Clean up potential markdown residue
    content = content.replace(/``````/g, "").trim();
    
    return NextResponse.json(JSON.parse(content));

  } catch (e: any) {
    console.error("API Error:", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
