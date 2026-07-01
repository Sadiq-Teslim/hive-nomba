import { useEffect, useRef, useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  ArrowLeft02Icon,
  Video01Icon,
  Call02Icon,
  MoreVerticalIcon,
  Search01Icon,
  SmileIcon,
  Attachment01Icon,
  Camera01Icon,
  SentIcon,
  Mic01Icon,
  ArrowReloadHorizontalIcon,
} from "@hugeicons/core-free-icons";
import type { ChatMessage, Persona } from "./types";
import { MessageBubble } from "./MessageBubble";

const QUICK_EMOJI = ["😀", "😂", "🙂", "😍", "👍", "🙏", "🔥", "🎉", "💰", "🛍️", "👗", "✅", "❤️", "😎", "🤝", "🐝"];

interface Props {
  persona: Persona;
  messages: ChatMessage[];
  typing: boolean;
  onSend: (text: string, imageDataUrl?: string) => void;
  onBack: () => void;
  onReset: () => void;
}

export function ChatWindow({ persona, messages, typing, onSend, onBack, onReset }: Props) {
  const [text, setText] = useState("");
  const [showEmoji, setShowEmoji] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, typing]);

  const submit = () => {
    if (!text.trim()) return;
    onSend(text);
    setText("");
    setShowEmoji(false);
  };

  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => onSend(text, reader.result as string);
    reader.readAsDataURL(file);
    setText("");
    if (fileRef.current) fileRef.current.value = "";
  };

  return (
    <div className="flex h-full flex-col bg-wa-bg">
      {/* Header */}
      <header className="flex items-center gap-3 bg-wa-header px-3 py-2 text-wa-text">
        <button onClick={onBack} className="md:hidden" aria-label="Back">
          <HugeiconsIcon icon={ArrowLeft02Icon} size={22} />
        </button>
        <div className={`flex h-10 w-10 items-center justify-center rounded-full text-lg ${persona.avatarColor}`}>
          {persona.avatarText}
        </div>
        <div className="min-w-0 flex-1 leading-tight">
          <div className="truncate text-[15px] font-medium">{persona.chatName}</div>
          <div className="truncate text-xs text-wa-sub">
            {typing ? <span className="text-wa-accent">typing…</span> : `${persona.subtitle} · online`}
          </div>
        </div>
        <div className="flex items-center gap-4 text-wa-sub">
          <HugeiconsIcon icon={Video01Icon} size={20} className="hidden sm:block" />
          <HugeiconsIcon icon={Call02Icon} size={19} className="hidden sm:block" />
          <HugeiconsIcon icon={Search01Icon} size={19} className="hidden sm:block" />
          <button onClick={onReset} title="Clear chat" className="hover:text-wa-text">
            <HugeiconsIcon icon={ArrowReloadHorizontalIcon} size={18} />
          </button>
          <HugeiconsIcon icon={MoreVerticalIcon} size={20} />
        </div>
      </header>

      {/* Messages */}
      <div ref={scrollRef} className="wa-wallpaper flex-1 overflow-y-auto py-3">
        <div className="mx-auto mb-3 w-fit rounded-md bg-[#182229] px-3 py-1 text-center text-[11px] text-wa-sub shadow">
          🔒 Messages are simulated locally and sent to your Hive API.
        </div>
        {messages.map((m) => (
          <MessageBubble key={m.id} msg={m} onQuickReply={(label) => onSend(label)} />
        ))}
        {typing && (
          <div className="flex justify-start px-[4%]">
            <div className="wa-tail-in relative my-1 rounded-lg rounded-tl-none bg-wa-in px-3 py-3">
              <div className="flex items-center gap-1">
                {[0, 1, 2].map((i) => (
                  <span
                    key={i}
                    className="h-2 w-2 rounded-full bg-wa-sub animate-typing"
                    style={{ animationDelay: `${i * 0.18}s` }}
                  />
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Emoji quick panel */}
      {showEmoji && (
        <div className="grid grid-cols-8 gap-1 bg-wa-header px-3 py-2 text-2xl">
          {QUICK_EMOJI.map((e) => (
            <button key={e} onClick={() => setText((t) => t + e)} className="rounded hover:bg-white/5">
              {e}
            </button>
          ))}
        </div>
      )}

      {/* Input bar */}
      <div className="flex items-end gap-2 bg-wa-panel px-2 py-2">
        <div className="flex flex-1 items-end gap-1 rounded-3xl bg-wa-input px-3 py-1.5">
          <button onClick={() => setShowEmoji((s) => !s)} className="pb-1 text-wa-sub hover:text-wa-text" aria-label="Emoji">
            <HugeiconsIcon icon={SmileIcon} size={22} />
          </button>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                submit();
              }
            }}
            rows={1}
            placeholder="Type a message"
            className="max-h-28 flex-1 resize-none bg-transparent py-1.5 text-[15px] text-wa-text placeholder:text-wa-sub focus:outline-none"
          />
          <button onClick={() => fileRef.current?.click()} className="pb-1 text-wa-sub hover:text-wa-text" aria-label="Attach">
            <HugeiconsIcon icon={Attachment01Icon} size={21} />
          </button>
          <button onClick={() => fileRef.current?.click()} className="pb-1 text-wa-sub hover:text-wa-text sm:hidden" aria-label="Camera">
            <HugeiconsIcon icon={Camera01Icon} size={21} />
          </button>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onFile} />
        </div>
        <button
          onClick={submit}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-wa-accent text-wa-bg transition-transform active:scale-95"
          aria-label={text.trim() ? "Send" : "Voice"}
        >
          <HugeiconsIcon icon={text.trim() ? SentIcon : Mic01Icon} size={21} />
        </button>
      </div>
    </div>
  );
}
