// GET /api/ai/status — memberi tahu frontend apakah fitur AI opsional aktif.
import { json, type Env } from "../../_lib/claude.ts";

export const onRequestGet: PagesFunction<Env> = ({ env }) => json({ enabled: !!env.ANTHROPIC_API_KEY });
