export type CharacterId = "xia" | "qin" | "lu";
export type ChatMessage = { role: "user" | "assistant"; content: string; createdAt?: string };
export type CharacterConfig = { id: CharacterId; name: string; place: string; tone: string; opener: string; memoryHint: string; systemPrompt: string };
export type ChatRequest = { characterId: CharacterId; message: string; history?: ChatMessage[]; memory?: string; articleContext?: { title: string; summary: string } };
export type ChatResponse = { reply: string; memory: string; memoryUpdated: boolean; mode: "ai" | "fallback" };
