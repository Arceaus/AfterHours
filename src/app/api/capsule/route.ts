import { NextRequest, NextResponse } from "next/server";

interface CapsuleRequestBody {
  question: string;
  excerpts: {
    id: string;
    entryDate: string;
    title?: string;
    excerpt: string;
  }[];
}

export async function POST(req: NextRequest) {
  try {
    const apiKey =
      process.env.GEMINI_API_KEY ||
      process.env.GOOGLE_GENERATIVE_AI_API_KEY ||
      process.env.GOOGLE_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        {
          available: false,
          error: "No server AI key configured. Local retrieval is active.",
        },
        { status: 200 }
      );
    }

    const body: CapsuleRequestBody = await req.json();
    const { question, excerpts } = body;

    if (!question || !Array.isArray(excerpts) || excerpts.length === 0) {
      return NextResponse.json(
        {
          available: true,
          answer: "No relevant diary entries were found to synthesize an answer from.",
          usedAI: false,
        },
        { status: 200 }
      );
    }

    // Limit to top 5 excerpts to keep prompt minimal and private
    const contextualEvidence = excerpts
      .slice(0, 5)
      .map(
        (e, i) =>
          `[Memory ${i + 1} | Date: ${e.entryDate} | Title: "${e.title || "Untitled"}"]\n${e.excerpt}`
      )
      .join("\n\n");

    const systemPrompt = `You are the thoughtful, quiet diary memory reflection guide for AFTERTHOUGHT.
The user is asking a question about their own past diary entries.

STRICT CONSTRAINTS:
1. Answer using ONLY the supplied diary excerpts provided below.
2. DO NOT fabricate, assume, or invent memories, people, dates, or feelings that are not explicitly in the excerpts.
3. DO NOT make psychological claims, evaluate their character, or diagnose moods.
4. Reference the specific dates of the memories in your response.
5. If the provided excerpts do not answer what the user asked, say honestly: "I couldn't find an entry in your records that clearly mentions that."
6. Maintain a calm, restrained, and warm tone. Keep your answer concise (2-4 sentences).`;

    const userPrompt = `User question: "${question}"

Supplied Evidence from User's Diary:
${contextualEvidence}

Reflect on what the user actually wrote based strictly on the evidence above:`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              role: "user",
              parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }],
            },
          ],
          generationConfig: {
            temperature: 0.2,
            maxOutputTokens: 300,
          },
        }),
      }
    );

    if (!response.ok) {
      return NextResponse.json(
        {
          available: true,
          error: "AI synthesis service temporarily unavailable. Reverting to local synthesis.",
          usedAI: false,
        },
        { status: 200 }
      );
    }

    const data = await response.json();
    const answerText =
      data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ||
      "Unable to synthesize a reflection from the selected excerpts.";

    return NextResponse.json({
      available: true,
      answer: answerText,
      usedAI: true,
    });
  } catch (err) {
    // Avoid logging sensitive diary content
    return NextResponse.json(
      {
        available: false,
        error: "An error occurred during reflection. Showing local retrieval results.",
        usedAI: false,
      },
      { status: 200 }
    );
  }
}
