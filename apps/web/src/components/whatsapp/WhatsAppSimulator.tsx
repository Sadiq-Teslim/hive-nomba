import { useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { WhatsappIcon } from "@hugeicons/core-free-icons";
import { PERSONAS } from "./personas";
import type { Persona } from "./types";
import { useChats } from "./useChats";
import { ChatList } from "./ChatList";
import { ChatWindow } from "./ChatWindow";

export function WhatsAppSimulator({ onOpenDashboard }: { onOpenDashboard: () => void }) {
  const { threads, typing, sendMessage, resetThread } = useChats();
  // Desktop opens the first chat by default; mobile starts on the list.
  const isDesktop = typeof window !== "undefined" && window.matchMedia("(min-width: 768px)").matches;
  const [selected, setSelected] = useState<Persona | null>(isDesktop ? PERSONAS[0] : null);

  return (
    <div className="h-screen w-full bg-[#0a0f13]">
      <div className="mx-auto flex h-full max-w-6xl overflow-hidden md:h-screen md:border-x md:border-wa-divider">
        {/* Left: chat list (hidden on mobile when a chat is open) */}
        <div className={`${selected ? "hidden md:flex" : "flex"} h-full w-full flex-col md:w-[38%] md:min-w-[320px] md:border-r md:border-wa-divider`}>
          <ChatList
            personas={PERSONAS}
            threads={threads}
            selectedPhone={selected?.phone ?? null}
            onSelect={setSelected}
            onOpenDashboard={onOpenDashboard}
          />
        </div>

        {/* Right: conversation (or empty state on desktop) */}
        <div className={`${selected ? "flex" : "hidden md:flex"} h-full w-full flex-col md:flex-1`}>
          {selected ? (
            <ChatWindow
              persona={selected}
              messages={threads[selected.phone] ?? []}
              typing={Boolean(typing[selected.phone])}
              onSend={(text, img) => sendMessage(selected, text, img)}
              onBack={() => setSelected(null)}
              onReset={() => resetThread(selected)}
            />
          ) : (
            <EmptyState />
          )}
        </div>
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 bg-wa-bg px-8 text-center">
      <div className="flex h-24 w-24 items-center justify-center rounded-full bg-wa-accent/10">
        <HugeiconsIcon icon={WhatsappIcon} size={48} className="text-wa-accent" />
      </div>
      <h2 className="text-2xl font-light text-wa-text">Hive Simulator</h2>
      <p className="max-w-sm text-sm text-wa-sub">
        Pick a chat to test Hive. Message as <b className="text-wa-text">Bella</b> to run the business, or as a{" "}
        <b className="text-wa-text">customer</b> to shop and pay — all through real WhatsApp-style conversations.
      </p>
    </div>
  );
}
