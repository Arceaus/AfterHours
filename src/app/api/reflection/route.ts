import { NextRequest, NextResponse } from "next/server";

interface ExcerptInput {
  id: string;
  entryDate: string;
  title?: string;
  excerpt: string;
}

interface ReflectionRequestBody {
  type: "question" | "perspective" | "monthly" | "pattern" | "connection";
  prompt: string;
  excerpts: ExcerptInput[];
  context?: {
    topic?: string;
    periodA?: { label: string; start: string; end: string };
    periodB?: { label: string; start: string; end: string };
    monthLabel?: string;
  };
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
          error: "No server AI key configured. Local reflection synthesis is active.",
        },
        { status: 200 }
      );
    }

    const body: ReflectionRequestBody = await req.json();
    const { type, prompt, excerpts, context } = body;

    if (!prompt || !Array.isArray(excerpts) || excerpts.length === 0) {
      return NextResponse.json(
        {
          available: true,
          error: "Insufficient excerpts to generate grounded reflection.",
          usedAI: false,
        },
        { status: 200 }
      );
    }

    // Limit to top 8 excerpts to keep prompt privacy-focused and compact
    const limitedExcerpts = excerpts.slice(0, 8);
    const validIdSet = new Set(limitedExcerpts.map((e) => e.id));

    const formattedEvidence = limitedExcerpts
      .map(
        (e) =>
          `[Entry ID: "${e.id}" | Date: ${e.entryDate} | Title: "${e.title || "Untitled"}"]\n${e.excerpt}`
      )
      .join("\n\n");

    const systemPrompt = `You are the thoughtful, quiet diary reflection companion for AFTERTHOUGHT.
The user is reflecting on their personal diary.

CORE PHILOSOPHY & CONSTRAINTS:
1. Grounded strictly in evidence: You must base your reflection ONLY on the excerpts provided below.
2. DO NOT fabricate, assume, diagnose psychological conditions, judge decisions, or invent memories.
3. Distinguish evidence from interpretation: Use cautious language like "Your entries mention...", "You noted...", "The writing does not establish why...".
4. Never make definitive claims about personality or internal emotional states.
5. The user is the authority on their own experiences.
6. Structured JSON output: You MUST respond strictly in valid JSON matching this exact schema:
{
  "summary": "Concise 1-2 sentence overview of what was explicitly documented",
  "observations": ["Observation 1 grounded in specific dates", "Observation 2"],
  "limitations": "Honest statement of what cannot be determined from the available records",
  "reflectionQuestions": ["A gentle question for the user to reflect on", "Optional second question"],
  "evidenceIds": ["List of Entry IDs explicitly referenced above"]
}`;

    const userPrompt = `Reflection Type: ${type}
User inquiry or topic: "${prompt}"
${context?.topic ? `Topic: ${context.topic}` : ""}
${context?.monthLabel ? `Month: ${context.monthLabel}` : ""}
${context?.periodA ? `Period A: ${context.periodA.label} vs Period B: ${context.periodB?.label}` : ""}

Supplied Evidence Excerpts:
${formattedEvidence}

Generate a calm, grounded reflection in JSON:`;

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
            maxOutputTokens: 600,
            responseMimeType: "application/json",
          },
        }),
      }
    );

    if (!response.ok) {
      return NextResponse.json(
        {
          available: true,
          error: "AI reflection service temporarily unavailable. Reverting to local synthesis.",
          usedAI: false,
        },
        { status: 200 }
      );
    }

    const data = await response.json();
    const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();

    if (!rawText) {
      return NextResponse.json(
        {
          available: true,
          error: "AI produced an empty response. Reverting to local synthesis.",
          usedAI: false,
        },
        { status: 200 }
      );
    }

    let parsed: any;
    try {
      parsed = JSON.parse(rawText);
    } catch {
      return NextResponse.json(
        {
          available: true,
          error: "Failed to parse structured response. Reverting to local synthesis.",
          usedAI: false,
        },
        { status: 200 }
      );
    }

    // Strict validation of referenced evidence IDs (Section 9)
    const returnedEvidenceIds: string[] = Array.isArray(parsed.evidenceIds)
      ? parsed.evidenceIds.filter((id: string) => validIdSet.has(id))
      : Array.from(validIdSet);

    const verifiedEvidence = limitedExcerpts
      .filter((e) => returnedEvidenceIds.includes(e.id))
      .map((e) => ({
        entryId: e.id,
        entryDate: e.entryDate,
        title: e.title || "Untitled",
        excerpt: e.excerpt,
      }));

    return NextResponse.json({
      available: true,
      usedAI: true,
      structured: {
        summary: parsed.summary || "Reflection synthesized from your preserved memories.",
        observations: Array.isArray(parsed.observations) ? parsed.observations : [],
        limitations:
          parsed.limitations ||
          "This reflection is grounded only in what was written down and does not represent your complete inner life.",
        reflectionQuestions: Array.isArray(parsed.reflectionQuestions)
          ? parsed.reflectionQuestions
          : [],
        evidence: verifiedEvidence.length > 0 ? verifiedEvidence : limitedExcerpts,
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        available: false,
        error: "An unexpected error occurred during reflection synthesis.",
        usedAI: false,
      },
      { status: 200 }
    );
  }
}
