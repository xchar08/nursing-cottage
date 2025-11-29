import { NextResponse } from "next/server";
import OpenAI from "openai";

const apiKey = process.env.CEREBRAS_API_KEY;
const client = new OpenAI({
  baseURL: "https://api.cerebras.ai/v1",
  apiKey: apiKey || "dummy_key",
});

// 1. Helper to generate the list of topics
async function extractTopics(text: string, mode: string): Promise<string[]> {
  try {
    const completion = await client.chat.completions.create({
      model: "llama-3.3-70b",
      messages: [
        { role: "system", content: "You are a curriculum planner." },
        { role: "user", content: `
          Analyze the following text and identify 4 to 6 DISTINCT, high-level topics.
          Return ONLY a JSON object with an array of strings.
          
          Example: { "topics": ["Anatomy", "Physiology", "Pathology"] }
          
          TEXT: ${text.substring(0, 15000)}
        `}
      ],
      response_format: { type: "json_object" },
      temperature: 0.1,
    });

    const content = completion.choices[0].message.content || "{}";
    const parsed = JSON.parse(content);
    return parsed.topics || [];
  } catch (e) {
    console.error("Topic extraction failed:", e);
    return ["General Knowledge"]; // Fallback
  }
}

// 2. Helper to generate questions for a SPECIFIC topic
async function generateQuestionsForTopic(text: string, topic: string, types: string[], mode: string) {
  const isPractical = mode === 'practical';
  
  const systemPersona = isPractical 
      ? "You are a Clinical Instructor. Create NCLEX-style application questions."
      : "You are a Professor. Create definition and concept checks.";

  const prompt = `
    ${systemPersona}
    
    Your Goal: Create 3 to 4 TOUGH questions specifically covering the topic: "${topic}".
    Source Material: Use the provided text.
    Question Types: ${types.join(", ")}.
    
    CRITICAL RULES:
    1. QUESTIONS MUST BE ABOUT "${topic}".
    2. Output valid JSON.
    3. 5 Options for Multiple Choice.
    4. For FRQ, provide 'modelAnswer'.

    Required JSON Structure:
    {
      "questions": [
        {
          "id": "1",
          "type": "multiple_choice",
          "question": "...",
          "options": ["A", "B", "C", "D", "E"],
          "correctAnswer": "A"
        }
      ]
    }

    TEXT:
    ${text}
  `;

  try {
    const completion = await client.chat.completions.create({
      model: "llama-3.3-70b",
      messages: [
        { role: "system", content: "Output JSON only." },
        { role: "user", content: prompt }
      ],
      response_format: { type: "json_object" },
      temperature: 0.3,
    });

    let content = completion.choices[0].message.content || "{}";
    content = content.replace(/``````/g, "").trim();
    const data = JSON.parse(content);
    return data.questions || [];
  } catch (e) {
    console.error(`Failed to generate for topic ${topic}:`, e);
    return []; 
  }
}

// --- MAIN HANDLER ---
export async function POST(req: Request) {
  try {
    const { text, types, mode } = await req.json();
    const truncatedText = text.substring(0, 40000); // Reduced slightly to save tokens

    // Step 1: Get the Topics
    console.log("🔍 Extracting topics...");
    // We limit topics to 5 max to prevent hitting total timeouts
    const allTopics = await extractTopics(truncatedText, mode);
    const topics = allTopics.slice(0, 5); 
    console.log("✅ Topics found:", topics);

    // Step 2: Generate Questions SEQUENTIALLY to avoid Rate Limits (429)
    console.log(`🚀 Processing ${topics.length} topics sequentially...`);
    
    const results = [];
    for (const topic of topics) {
      console.log(`   -> Generating for: ${topic}`);
      const questions = await generateQuestionsForTopic(truncatedText, topic, types, mode);
      results.push(questions);
      
      // Optional: Tiny pause between requests just to be safe
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    // Step 3: Flatten and ID the results
    let allQuestions = results.flat();

    // Re-index IDs to be sequential (1, 2, 3...)
    allQuestions = allQuestions.map((q, index) => ({
      ...q,
      id: (index + 1).toString()
    }));

    console.log(`🏁 Generated ${allQuestions.length} total questions.`);

    return NextResponse.json({ questions: allQuestions });

  } catch (e: any) {
    console.error("Quiz Gen Error:", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
