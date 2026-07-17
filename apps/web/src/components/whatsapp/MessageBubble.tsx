import { HugeiconsIcon } from "@hugeicons/react";
import {
  Clock01Icon,
  Tick02Icon,
  TickDouble02Icon,
  ArrowTurnBackwardIcon,
  LinkSquare02Icon,
} from "@hugeicons/core-free-icons";
import type { ChatMessage } from "./types";

const time = (ts: number) =>
  new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

const URL_RE = /(https?:\/\/[^\s]+)/g;

function Linkified({ text }: { text: string }) {
  const parts = text.split(URL_RE);
  return (
    <>
      {parts.map((part, i) =>
        URL_RE.test(part) ? (
          <a
            key={i}
            href={part}
            target="_blank"
            rel="noreferrer"
            className="text-wa-tick underline underline-offset-2 break-all"
          >
            {part}
          </a>
        ) : (
          <span key={i}>{part}</span>
        ),
      )}
    </>
  );
}

function Ticks({ status }: { status: ChatMessage["status"] }) {
  if (status === "sending") return <HugeiconsIcon icon={Clock01Icon} size={14} className="text-wa-sub" />;
  if (status === "read")
    return <HugeiconsIcon icon={TickDouble02Icon} size={16} className="text-wa-tick" strokeWidth={2} />;
  return <HugeiconsIcon icon={Tick02Icon} size={16} className="text-wa-sub" strokeWidth={2} />;
}

export function MessageBubble({
  msg,
  onQuickReply,
}: {
  msg: ChatMessage;
  onQuickReply?: (label: string) => void;
}) {
  const mine = msg.from === "me";
  return (
    <div data-role={msg.from} className={`flex flex-col px-[4%] ${mine ? "items-end" : "items-start"}`}>
      <div
        className={`relative my-[1px] max-w-[78%] animate-bubbleIn overflow-hidden rounded-lg text-[14.2px] leading-[19px] shadow-sm sm:max-w-[65%] ${
          mine
            ? "wa-tail-out rounded-tr-none bg-wa-out text-wa-text"
            : "wa-tail-in rounded-tl-none bg-wa-in text-wa-text"
        }`}
      >
        <div className="px-2 py-1.5">
          {msg.imageDataUrl && (
            <img src={msg.imageDataUrl} alt="attachment" className="mb-1 max-h-60 w-full rounded-md object-cover" />
          )}
          {msg.text && (
            <span className="whitespace-pre-wrap break-words align-bottom">
              <Linkified text={msg.text} />
            </span>
          )}
          <span className="float-right ml-2 mt-1 flex translate-y-[3px] items-center gap-1 text-[11px] text-wa-sub">
            {time(msg.ts)}
            {mine && <Ticks status={msg.status} />}
          </span>
        </div>

        {/* URL call-to-action button (e.g. "Pay Now") - attached to the bubble */}
        {msg.cta && (
          <a
            href={msg.cta.url}
            target="_blank"
            rel="noreferrer"
            className="flex items-center justify-center gap-2 border-t border-white/10 py-2.5 text-[15px] font-medium text-wa-tick transition-colors hover:bg-white/5"
          >
            <HugeiconsIcon icon={LinkSquare02Icon} size={18} strokeWidth={2} />
            {msg.cta.label}
          </a>
        )}
      </div>

      {/* Quick-reply buttons - full-width pills below the bubble */}
      {msg.buttons && msg.buttons.length > 0 && (
        <div className="mt-1 flex w-[78%] flex-col gap-1 sm:w-[65%]">
          {msg.buttons.map((label) => (
            <button
              key={label}
              onClick={() => onQuickReply?.(label)}
              className="flex items-center justify-center gap-2 rounded-lg bg-wa-in py-2.5 text-[15px] font-medium text-wa-tick shadow-sm transition-colors hover:bg-white/5"
            >
              <HugeiconsIcon icon={ArrowTurnBackwardIcon} size={17} strokeWidth={2} />
              {label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
