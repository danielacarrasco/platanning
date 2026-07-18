import OpenAI from "openai";
import { NextRequest, NextResponse } from "next/server";
import { AiInsights } from "@/lib/db/repo";
import { buildDataPacket, getAiPrivacyMode, COACH_SYSTEM_PROMPT, type CoachAdvice } from "@/lib/aiCoach";

const ADVICE_SCHEMA = {
  type: "object",
  properties: {
    summary: { type: "string" },
    what_went_well: { type: "array", items: { type: "string" } },
    what_needs_attention: { type: "array", items: { type: "string" } },
    questions_for_user: { type: "array", items: { type: "string" } },
    recommended_actions: {
      type: "array",
      items: {
        type: "object",
        properties: {
          action: { type: "string" },
          why: { type: "string" },
          impact: { type: "string" },
          difficulty: { type: "string", enum: ["easy", "medium", "hard"] },
        },
        required: ["action", "why", "impact", "difficulty"],
        additionalProperties: false,
      },
    },
    next_fortnight_suggestion: {
      type: "object",
      properties: {
        fun_money: { type: "number" },
        hobbies: { type: "number" },
        card_payment_target: { type: "number" },
        holiday_contribution: { type: "number" },
        buffer_contribution: { type: "number" },
      },
      required: ["fun_money", "hobbies", "card_payment_target", "holiday_contribution", "buffer_contribution"],
      additionalProperties: false,
    },
    learned_insights_to_save: { type: "array", items: { type: "string" } },
  },
  required: [
    "summary",
    "what_went_well",
    "what_needs_attention",
    "questions_for_user",
    "recommended_actions",
    "next_fortnight_suggestion",
    "learned_insights_to_save",
  ],
  additionalProperties: false,
} as const;

export async function POST(request: NextRequest) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      {
        error:
          "No OPENAI_API_KEY configured. Set it in your environment to enable the AI Coach — everything else in this app works without it.",
      },
      { status: 501 }
    );
  }

  const body = await request.json().catch(() => ({}));
  const question = typeof body.question === "string" ? body.question : "Review my fortnight.";
  const saveInsights = body.saveInsights !== false;

  const packet = buildDataPacket(question, getAiPrivacyMode());

  const client = new OpenAI({ apiKey });
  const model = process.env.OPENAI_MODEL || "gpt-4o-mini";
  try {
    const response = await client.chat.completions.create({
      model,
      max_completion_tokens: 2048,
      messages: [
        { role: "system", content: COACH_SYSTEM_PROMPT },
        { role: "user", content: JSON.stringify(packet) },
      ],
      response_format: {
        type: "json_schema",
        json_schema: { name: "coach_advice", strict: true, schema: ADVICE_SCHEMA },
      },
    });

    const choice = response.choices[0];
    if (choice?.finish_reason === "content_filter") {
      return NextResponse.json({ error: "The AI coach declined to respond to this request." }, { status: 422 });
    }
    const message = choice?.message;
    if (message?.refusal) {
      return NextResponse.json({ error: message.refusal }, { status: 422 });
    }
    if (!message?.content) {
      return NextResponse.json({ error: "No response text returned." }, { status: 502 });
    }
    const advice = JSON.parse(message.content) as CoachAdvice;

    if (saveInsights) {
      for (const insight of advice.learned_insights_to_save ?? []) {
        AiInsights.create(insight, "ai");
      }
    }

    return NextResponse.json({ packet, advice });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error calling the AI coach.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
