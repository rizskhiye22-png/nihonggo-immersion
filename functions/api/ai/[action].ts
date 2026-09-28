// POST /api/ai/:action — explain | chat | translate | story
import { errorResponse, HttpError, json, rateLimit, readJson, streamText, structured, type Env } from "../../_lib/claude.ts";
import {
  chatPrompt, clampLevel, explainPrompt, explainUser, STORY_SCHEMA, storyPrompt, TRANSLATE_SCHEMA, translatePrompt,
} from "../../_lib/prompts.ts";

const str = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");

type ChatBody = { mode?: string; level?: number; messages?: { role: string; content: string }[] };

export const onRequestPost: PagesFunction<Env, "action"> = async ({ request, env, params }) => {
  try {
    await rateLimit(request, env);
    const action = String(params.action);

    if (action === "explain") {
      const b = await readJson<{ sentence?: string; word?: string; surface?: string; level?: number }>(request);
      const sentence = str(b.sentence, 800);
      if (!sentence) throw new HttpError(400, "Kalimat kosong.");
      const level = clampLevel(b.level);
      return streamText(env, {
        system: explainPrompt(level),
        messages: [{ role: "user", content: explainUser({ sentence, word: str(b.word, 60) || undefined, surface: str(b.surface, 60) || undefined }) }],
        maxTokens: 3000,
      });
    }

    if (action === "chat") {
      const b = await readJson<ChatBody>(request, 120_000);
      const level = clampLevel(b.level);
      const messages = (b.messages ?? [])
        .filter((m) => (m.role === "user" || m.role === "assistant") && typeof m.content === "string" && m.content.trim())
        .slice(-20)
        .map((m) => ({ role: m.role as "user" | "assistant", content: m.content.slice(0, 4000) }));
      // Percakapan harus diawali pesan pengguna
      while (messages.length && messages[0].role !== "user") messages.shift();
      if (!messages.length || messages[messages.length - 1].role !== "user") throw new HttpError(400, "Pesan kosong.");
      return streamText(env, { system: chatPrompt(str(b.mode, 20), level), messages, maxTokens: 4000 });
    }

    if (action === "translate") {
      const b = await readJson<{ lines?: unknown[]; level?: number }>(request);
      const lines = (Array.isArray(b.lines) ? b.lines : []).slice(0, 40).map((l) => str(l, 400));
      if (!lines.length) throw new HttpError(400, "Tidak ada baris untuk diterjemahkan.");
      const out = await structured<{ translations: string[] }>(env, {
        system: translatePrompt(clampLevel(b.level)),
        user: `Terjemahkan ${lines.length} baris berikut (satu terjemahan per baris):\n${JSON.stringify(lines)}`,
        schema: TRANSLATE_SCHEMA,
      });
      const translations = lines.map((_, i) => out.translations?.[i] ?? "");
      return json({ translations });
    }

    if (action === "story") {
      const b = await readJson<{ level?: number; topic?: string }>(request);
      const level = clampLevel(b.level);
      const topic = str(b.topic, 100) || "kehidupan sehari-hari";
      const story = await structured<{ title: string; titleId: string; sentences: { ja: string; id: string }[] }>(env, {
        system: storyPrompt(level),
        user: `Topik cerita: ${topic}`,
        schema: STORY_SCHEMA,
        effort: "medium",
      });
      if (!story.sentences?.length) throw new HttpError(502, "AI tidak menghasilkan cerita. Coba lagi.");
      return json(story);
    }

    throw new HttpError(404, "Aksi AI tidak dikenal.");
  } catch (e) {
    return errorResponse(e);
  }
};
