import { NextResponse } from "next/server";
import OpenAI from "openai";

const apiKey = process.env.CEREBRAS_API_KEY;
const client = new OpenAI({
  baseURL: "https://api.cerebras.ai/v1",
  apiKey: apiKey || "dummy",
});

export async function POST(req: Request) {
  try {
    const { userAnswer, modelAnswer, question } = await req.json();

    const completion = await client.chat.completions.create({
      model: "llama-3.3-70b", // UPDATED MODEL ID
      messages: [
        { role: "system", content: "You are a strict grader. Output ONLY valid JSON." },
        { role: "user", content: `
          Question: ${question}
          Model Answer: ${modelAnswer}
          Student Answer: ${userAnswer}

          Is the student answer conceptually correct based on the model answer? 
          Ignore spelling errors or phrasing differences. 
          If the student says "IDK" or "I don't know", mark it incorrect.
          
          Return strictly:
          {
            "correct": boolean,
            "feedback": "Short 1 sentence explanation of why it is right or wrong."
          }
        `}
      ],
      response_format: { type: "json_object" },
      temperature: 0.1
    });

    const content = completion.choices[0].message.content || "{}";
    return NextResponse.json(JSON.parse(content));
  } catch (e) {
    console.error("Grading error:", e);
    return NextResponse.json({ correct: false, feedback: "Error grading. Please compare with model answer manually." });
  }
}
