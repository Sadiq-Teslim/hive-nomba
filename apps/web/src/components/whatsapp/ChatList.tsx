import { HugeiconsIcon } from "@hugeicons/react";
import { DashboardSquare01Icon, MoreVerticalIcon, Search01Icon, Camera01Icon } from "@hugeicons/core-free-icons";
import type { ChatMessage, Persona } from "./types";

const time = (ts: number) =>
  new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

interface Props {
  personas: Persona[];
  threads: Record<string, ChatMessage[]>;
  selectedPhone: string | null;
  onSelect: (p: Persona) => void;
  onOpenDashboard: () => void;
}

export function ChatList({ personas, threads, selectedPhone, onSelect, onOpenDashboard }: Props) {
  return (
    <div className="flex h-full flex-col bg-wa-panel">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 text-wa-text">
        <div className="flex items-center gap-2">
          <span className="text-lg font-semibold">Chats</span>
          <span className="rounded bg-wa-accent/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-wa-accent">
            Simulator
          </span>
        </div>
        <div className="flex items-center gap-5 text-wa-sub">
          <HugeiconsIcon icon={Camera01Icon} size={20} />
          <button onClick={onOpenDashboard} title="Open dashboard" className="hover:text-wa-text">
            <HugeiconsIcon icon={DashboardSquare01Icon} size={20} />
          </button>
          <HugeiconsIcon icon={MoreVerticalIcon} size={20} />
        </div>
      </header>

      {/* Search */}
      <div className="px-3 pb-2">
        <div className="flex items-center gap-3 rounded-lg bg-wa-input px-3 py-1.5">
          <HugeiconsIcon icon={Search01Icon} size={17} className="text-wa-sub" />
          <span className="text-sm text-wa-sub">Search or start new chat</span>
        </div>
      </div>

      {/* Chats */}
      <div className="flex-1 overflow-y-auto">
        {personas.map((p) => {
          const thread = threads[p.phone] ?? [];
          const last = thread[thread.length - 1];
          const active = selectedPhone === p.phone;
          return (
            <button
              key={p.id}
              onClick={() => onSelect(p)}
              className={`flex w-full items-center gap-3 px-3 py-3 text-left transition-colors hover:bg-white/5 ${
                active ? "bg-white/5" : ""
              }`}
            >
              <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-xl ${p.avatarColor}`}>
                {p.avatarText}
              </div>
              <div className="min-w-0 flex-1 border-b border-wa-divider pb-3">
                <div className="flex items-center justify-between">
                  <span className="truncate font-medium text-wa-text">{p.chatName}</span>
                  {last && <span className="ml-2 shrink-0 text-[11px] text-wa-sub">{time(last.ts)}</span>}
                </div>
                <div className="flex items-center justify-between">
                  <span className="truncate text-sm text-wa-sub">
                    {last ? `${last.from === "me" ? "You: " : ""}${last.text || "📷 Photo"}` : p.tagline}
                  </span>
                </div>
                <span className="mt-0.5 inline-block rounded bg-white/5 px-1.5 py-0.5 text-[10px] text-wa-sub">
                  {p.tagline}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
