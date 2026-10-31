import { NextRequest, NextResponse } from "next/server";

interface ExcerptInput {
  id: string;
  entryDate: string;
  title?: string;
  excerpt: string;
}

interface UniverseExtractRequestBody {
  excerpts: ExcerptInput[];
  consentGiven: boolean;
}

export async function POST(req: NextRequest) {
  try {
    const apiKey =
      process.env.GEMINI_API_KEY ||
      process.env.GOOGLE_GENERATIVE_AI_API_KEY ||
      process.env.GOOGLE_API_KEY;

    const body: UniverseExtractRequestBody = await req.json();
    const { excerpts, consentGiven } = body;

    if (!consentGiven) {
      return NextResponse.json(
        {
          error: "Explicit consent is required for AI-assisted memory universe extraction.",
        },
        { status: 400 }
      );
    }

    if (!Array.isArray(excerpts) || excerpts.length === 0) {
      return NextResponse.json(
        {
          entities: [],
          connections: [],
          message: "No excerpts provided for extraction.",
        },
        { status: 200 }
      );
    }

    if (!apiKey) {
      return NextResponse.json(
        {
          available: false,
          entities: [],
          connections: [],
          error: "No server AI key configured. Local heuristic extraction is active.",
        },
        { status: 200 }
      );
    }

    // Cap to 10 excerpts to protect user privacy and avoid prompt bloating
    const limitedExcerpts = excerpts.slice(0, 10);

    const formattedEvidence = limitedExcerpts
      .map(
        (e) =>
          `[Entry ID: "${e.id}" | Date: ${e.entryDate} | Title: "${e.title || "Untitled"}"]\n${e.excerpt}`
      )
      .join("\n\n");

    const systemPrompt = `You are the thoughtful, privacy-focused Memory Universe Entity & Connection Extractor for AFTERTHOUGHT.
Your role is to help users notice people, places, recurring topics, projects, and thematic connections in their actual diary entries.

STRICT PRINCIPLES & BOUNDARIES:
1. Grounded strictly in text: Extract ONLY entities and connections explicitly mentioned in the excerpts.
2. DO NOT invent people, places, or personal relationships (e.g. do not assume someone is a "partner" or "sister" unless explicitly written).
3. DO NOT geocode, track location, or infer home cities.
4. DO NOT diagnose or make psychological claims about emotions or priorities.
5. Provide the exact short supporting excerpt for each entity and connection.
6. Structured JSON output: You MUST respond strictly in valid JSON matching this exact schema:
{
  "entities": [
    {
      "displayName": "Name or topic as written",
      "entityType": "person" | "place" | "topic" | "project",
      "confidence": 0.85,
      "excerpt": "Short verbatim sentence where this appeared",
      "entryId": "Entry ID where this appeared"
    }
  ],
  "connections": [
    {
      "sourceEntryId": "Entry ID 1",
      "targetEntryId": "Entry ID 2",
      "connectionType": "person" | "place" | "topic" | "project" | "theme",
      "explanation": "Cautious explanation: e.g., Both entries mention working on the portfolio project.",
      "excerptSource": "Verbatim excerpt from entry 1",
      "excerptTarget": "Verbatim excerpt from entry 2"
    }
  ]
}`;

    const userPrompt = `Excerpts from user's diary entries:\n\n${formattedEvidence}\n\nPlease extract candidates for the Memory Universe:`;

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

    const geminiPayload = {
      contents: [
        {
          role: "user",
          parts: [
            { text: `${systemPrompt}\n\n${userPrompt}` }
          ],
        },
      ],
      generationConfig: {
        temperature: 0.2,
        responseMimeType: "application/json",
      },
    };

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(geminiPayload),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.warn("Gemini Universe extraction failed:", response.status, errText);
      return NextResponse.json(
        {
          available: false,
          entities: [],
          connections: [],
          error: `AI provider error (${response.status}). Using local heuristic extractor.`,
        },
        { status: 200 }
      );
    }

    const data = await response.json();
    const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!rawText) {
      return NextResponse.json(
        {
          available: true,
          entities: [],
          connections: [],
          error: "Empty response from AI provider.",
        },
        { status: 200 }
      );
    }

    let parsedResult;
    try {
      parsedResult = JSON.parse(rawText);
    } catch {
      const cleanJson = rawText.replace(/^```json\s*/, "").replace(/\s*```$/, "");
      parsedResult = JSON.parse(cleanJson);
    }

    return NextResponse.json(
      {
        available: true,
        entities: parsedResult.entities || [],
        connections: parsedResult.connections || [],
        usedAI: true,
      },
      { status: 200 }
    );
  } catch (err: any) {
    console.error("Universe extract route error:", err);
    return NextResponse.json(
      {
        available: false,
        entities: [],
        connections: [],
        error: err?.message || "Internal server error during extraction",
      },
      { status: 500 }
    );
  }
}

