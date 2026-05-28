"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { characters } from "@/lib/characters";
import type { CharacterId, ChatMessage, ChatResponse } from "@/lib/types";

const articleSeeds = [
  { title: "雨夜、书房与未寄出的信", author: "AO3 外部作品占位", tags: ["Love and Deepspace", "夏以昼", "雨夜"], summary: "AO3 索引与笔记占位。", body: "雨声落在玻璃上，像某种迟来的标点。你把那封信放回书页之间，忽然意识到有些话并不是为了被寄出，而是为了确认自己仍然记得。" },
  { title: "暗红沙发旁的危险谈话", author: "AO3 外部作品占位", tags: ["秦彻", "心理拉扯", "对话"], summary: "阅读后带入人物聊天。", body: "他没有立刻回答，只是把灯调暗了一点。沉默并不总是拒绝，有时它更像一种邀请，等你把真正的问题说出来。" },
  { title: "灯下的人说，请继续", author: "AO3 外部作品占位", tags: ["陆沉", "慢热", "阅读"], summary: "复古阅读页与对话联动。", body: "书页边缘泛着微光，他的声音很轻，像不愿惊动一场正在形成的梦。你读到最后，才发现自己想讨论的不是故事，而是故事留在你心里的回声。" }
];

type Panel = "home" | "characters" | "chat" | "archive" | "reader";
const characterEntries = Object.values(characters);
const historyKey = (id: CharacterId) => `rain-room-chat-${id}`;
const memoryKey = (id: CharacterId) => `rain-room-memory-${id}`;

export default function Home() {
  const [panel, setPanel] = useState<Panel>("home");
  const [activeCharacterId, setActiveCharacterId] = useState<CharacterId>("xia");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [memory, setMemory] = useState("");
  const [input, setInput] = useState("");
  const [query, setQuery] = useState("");
  const [activeArticleIndex, setActiveArticleIndex] = useState(0);
  const [isSending, setIsSending] = useState(false);
  const activeCharacter = characters[activeCharacterId];
  const activeArticle = articleSeeds[activeArticleIndex];

  useEffect(() => {
    const savedMessages = window.localStorage.getItem(historyKey(activeCharacterId));
    const savedMemory = window.localStorage.getItem(memoryKey(activeCharacterId));
    setMessages(savedMessages ? JSON.parse(savedMessages) : []);
    setMemory(savedMemory || activeCharacter.memoryHint);
  }, [activeCharacterId, activeCharacter.memoryHint]);

  const visibleMessages = useMemo(() => messages.length ? messages : [{ role: "assistant" as const, content: activeCharacter.opener }], [activeCharacter.opener, messages]);

  function persist(nextMessages: ChatMessage[], nextMemory = memory, characterId = activeCharacterId) {
    setMessages(nextMessages);
    window.localStorage.setItem(historyKey(characterId), JSON.stringify(nextMessages));
    window.localStorage.setItem(memoryKey(characterId), nextMemory);
    if (characterId === activeCharacterId) setMemory(nextMemory);
  }

  function openCharacter(id: CharacterId) { setActiveCharacterId(id); setPanel("chat"); }

  async function sendMessage(text: string, articleContext?: { title: string; summary: string }, targetCharacterId = activeCharacterId) {
    const trimmed = text.trim();
    if (!trimmed || isSending) return;
    const targetMessages = targetCharacterId === activeCharacterId ? messages : JSON.parse(window.localStorage.getItem(historyKey(targetCharacterId)) || "[]") as ChatMessage[];
    const targetMemory = window.localStorage.getItem(memoryKey(targetCharacterId)) || characters[targetCharacterId].memoryHint;
    const nextMessages = [...targetMessages, { role: "user" as const, content: trimmed, createdAt: new Date().toISOString() }];
    persist(nextMessages, targetMemory, targetCharacterId);
    setInput(""); setIsSending(true);
    try {
      const response = await fetch("/api/chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ characterId: targetCharacterId, message: trimmed, history: nextMessages, memory: targetMemory, articleContext }) });
      if (!response.ok) throw new Error("chat request failed");
      const data = await response.json() as ChatResponse;
      persist([...nextMessages, { role: "assistant", content: data.reply, createdAt: new Date().toISOString() }], data.memory || targetMemory, targetCharacterId);
    } catch {
      persist([...nextMessages, { role: "assistant", content: "连接后端时出了点问题。等服务器恢复后，我会从这里继续听你说。", createdAt: new Date().toISOString() }], targetMemory, targetCharacterId);
    } finally { setIsSending(false); }
  }

  function submitChat(event: FormEvent<HTMLFormElement>) { event.preventDefault(); void sendMessage(input); }
  function openAo3Search(value: string) { window.open(`https://archiveofourown.org/works/search?work_search%5Bquery%5D=${encodeURIComponent(value.trim() || "Love and Deepspace")}`, "_blank", "noopener,noreferrer"); }
  function submitAo3(event: FormEvent<HTMLFormElement>) { event.preventDefault(); openAo3Search(query); }
  function discussArticle(id: CharacterId) { setActiveCharacterId(id); setPanel("chat"); window.setTimeout(() => void sendMessage(`我刚读了《${activeArticle.title}》，想和你聊聊：${activeArticle.summary}`, { title: activeArticle.title, summary: activeArticle.summary }, id), 0); }

  return <main className="app-shell"><section className="room" aria-label="深夜房间"><img className="room-bg" src="/assets/room-background.svg" alt="蓝调雨夜复古书房"/><div className="rain"/><div className="vignette"/>
    <header className="room-status"><span>Rain Room</span><span>the lamp is low</span><span>AO3 archive open</span></header>
    <section className="intro"><p className="kicker">Rain Room · Archive</p><h1>关于爱的一切</h1><p className="lead">和他谈谈，或在雨夜读一篇文。</p><div className="intro-actions"><button className="primary-action" onClick={() => setPanel("characters")}>选择一个人</button><button className="secondary-action" onClick={() => setPanel("archive")}>查找文章</button></div></section>
    <button className="hotspot character-hotspot xia" onClick={() => openCharacter("xia")}><span>夏以昼</span><small>窗边</small></button><button className="hotspot character-hotspot qin" onClick={() => openCharacter("qin")}><span>秦彻</span><small>沙发</small></button><button className="hotspot character-hotspot lu" onClick={() => openCharacter("lu")}><span>陆沉</span><small>书桌</small></button><button className="hotspot archive-hotspot" onClick={() => setPanel("archive")}><span>AO3</span><small>档案</small></button>
    <aside className={`panel characters-panel ${panel === "characters" ? "is-open" : ""}`}><div className="panel-head"><p>At the room tonight</p><button className="icon-button" onClick={() => setPanel("home")}>×</button></div><div className="character-list">{characterEntries.map((c) => <button className="character-card" key={c.id} onClick={() => openCharacter(c.id)}><h3>{c.name}</h3><p>{c.place}</p><p>{c.opener}</p></button>)}</div></aside>
    <aside className={`panel chat-panel ${panel === "chat" ? "is-open" : ""}`}><div className="panel-head"><div><p>{activeCharacter.place} · {activeCharacter.tone}</p><h2>{activeCharacter.name}</h2></div><button className="icon-button" onClick={() => setPanel("home")}>×</button></div><div className="memory-card"><span>长期记忆</span><p>{memory}</p></div><div className="messages">{visibleMessages.map((m,i)=><div className={`message ${m.role === "user" ? "user" : "ai"}`} key={i}>{m.content}</div>)}{isSending && <div className="message ai">灯光微微暗了一下，他正在回答。</div>}</div><form className="composer" onSubmit={submitChat}><input value={input} onChange={(e)=>setInput(e.target.value)} placeholder="写下你想说的话..."/><button disabled={isSending}>{isSending ? "等待" : "发送"}</button></form></aside>
    <aside className={`panel archive-panel ${panel === "archive" ? "is-open" : ""}`}><div className="panel-head"><div><p>Archive table</p><h2>AO3 查找与阅读</h2></div><button className="icon-button" onClick={() => setPanel("home")}>×</button></div><form className="search-box" onSubmit={submitAo3}><input value={query} onChange={(e)=>setQuery(e.target.value)} placeholder="标题、角色、tag"/><button>打开 AO3 搜索</button></form><div className="filter-row">{["Xavier","Sylus","Zayne","Love and Deepspace"].map((tag)=><button key={tag} onClick={() => openAo3Search(tag)}>{tag}</button>)}</div><div className="article-list">{articleSeeds.map((a,i)=><article className="article-card" key={a.title}><h3>{a.title}</h3><p>{a.tags.join(" · ")}</p><button onClick={()=>{setActiveArticleIndex(i);setPanel("reader")}}>在房间里阅读</button></article>)}</div></aside>
    <aside className={`panel reader-panel ${panel === "reader" ? "is-open" : ""}`}><div className="panel-head"><div><p>Reading under the lamp</p><h2>{activeArticle.title}</h2></div><button className="icon-button" onClick={() => setPanel("archive")}>←</button></div><article className="reader-paper"><p className="reader-meta">{activeArticle.author} · {activeArticle.tags.join(" / ")}</p><p>{activeArticle.body}</p></article><div className="reader-actions"><button onClick={() => discussArticle("xia")}>和夏以昼聊这篇</button><button onClick={() => discussArticle("qin")}>和秦彻聊这篇</button><button onClick={() => discussArticle("lu")}>和陆沉聊这篇</button></div></aside>
    <section className="legend"><h2>UI 图例</h2><div className="legend-grid"><div><span className="dot amber"/>人物对话入口</div><div><span className="dot blue"/>AO3 档案入口</div><div><span className="dot red"/>长期记忆区域</div><div><span className="dot ivory"/>阅读纸张</div></div></section>
  </section></main>;
}
