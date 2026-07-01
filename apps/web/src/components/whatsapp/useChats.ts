import { useCallback, useEffect, useRef, useState } from "react";
import type { ChatMessage, Persona } from "./types";
import { PERSONAS, greetingFor } from "./personas";

type Threads = Record<string, ChatMessage[]>;

const STORAGE_KEY = "hive_wa_threads_v1";
const uid = () => Math.random().toString(36).slice(2, 10);

function loadThreads(): Threads {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as Threads;
  } catch {
    /* ignore */
  }
  // Seed each chat with the contact's greeting so it never starts empty.
  const seeded: Threads = {};
  for (const p of PERSONAS) {
    seeded[p.phone] = [{ id: uid(), from: "hive", text: greetingFor(p), ts: Date.now() }];
  }
  return seeded;
}

export function useChats() {
  const [threads, setThreads] = useState<Threads>(loadThreads);
  const [typing, setTyping] = useState<Record<string, boolean>>({});
  const threadsRef = useRef(threads);
  threadsRef.current = threads;

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(threads));
    } catch {
      /* ignore quota */
    }
  }, [threads]);

  const patchMessage = useCallback((phone: string, id: string, patch: Partial<ChatMessage>) => {
    setThreads((t) => ({
      ...t,
      [phone]: (t[phone] ?? []).map((m) => (m.id === id ? { ...m, ...patch } : m)),
    }));
  }, []);

  const append = useCallback((phone: string, msg: ChatMessage) => {
    setThreads((t) => ({ ...t, [phone]: [...(t[phone] ?? []), msg] }));
  }, []);

  const sendMessage = useCallback(
    async (persona: Persona, text: string, imageDataUrl?: string) => {
      const trimmed = text.trim();
      if (!trimmed && !imageDataUrl) return;

      const myMsg: ChatMessage = {
        id: uid(),
        from: "me",
        text: trimmed,
        ts: Date.now(),
        status: "sending",
        imageDataUrl,
      };
      append(persona.phone, myMsg);
      setTyping((t) => ({ ...t, [persona.phone]: true }));

      // Mark delivered shortly after "send".
      setTimeout(() => patchMessage(persona.phone, myMsg.id, { status: "sent" }), 250);

      try {
        const body: Record<string, unknown> = { phone: persona.phone, text: trimmed };
        if (imageDataUrl) {
          const [meta, base64] = imageDataUrl.split(",");
          const mimeType = meta.slice(meta.indexOf(":") + 1, meta.indexOf(";"));
          body.image = { base64, mimeType };
        }

        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = (await res.json()) as {
          reply: string;
          cta?: { label: string; url: string };
          buttons?: string[];
        };

        patchMessage(persona.phone, myMsg.id, { status: "read" });
        append(persona.phone, {
          id: uid(),
          from: "hive",
          text: data.reply,
          ts: Date.now(),
          cta: data.cta,
          buttons: data.buttons,
        });
      } catch (e) {
        patchMessage(persona.phone, myMsg.id, { status: "sent" });
        append(persona.phone, {
          id: uid(),
          from: "hive",
          text: "⚠️ Couldn't reach Hive. Make sure the API is running on :4000, then try again.",
          ts: Date.now(),
        });
      } finally {
        setTyping((t) => ({ ...t, [persona.phone]: false }));
      }
    },
    [append, patchMessage],
  );

  const resetThread = useCallback((persona: Persona) => {
    setThreads((t) => ({
      ...t,
      [persona.phone]: [{ id: uid(), from: "hive", text: greetingFor(persona), ts: Date.now() }],
    }));
  }, []);

  return { threads, typing, sendMessage, resetThread };
}
