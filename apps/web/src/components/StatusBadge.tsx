import { HugeiconsIcon } from "@hugeicons/react";
import {
  CheckmarkCircle01Icon,
  Clock01Icon,
  DeliveryTruck01Icon,
  CancelCircleIcon,
  InvoiceIcon,
  ArrowReloadHorizontalIcon,
  Alert02Icon,
} from "@hugeicons/core-free-icons";
import type { OrderStatus } from "../api";

const MAP: Record<OrderStatus, { label: string; cls: string; icon: any }> = {
  PAID: { label: "Paid", cls: "bg-mint/10 text-mint border-mint/20", icon: CheckmarkCircle01Icon },
  PENDING_PAYMENT: { label: "Pending", cls: "bg-honey/10 text-honey border-honey/20", icon: Clock01Icon },
  FULFILLED: { label: "Fulfilled", cls: "bg-sky-400/10 text-sky-300 border-sky-400/20", icon: DeliveryTruck01Icon },
  DRAFT: { label: "Draft", cls: "bg-slate-400/10 text-slate-400 border-slate-400/20", icon: InvoiceIcon },
  CANCELLED: { label: "Cancelled", cls: "bg-rose-500/10 text-rose-400 border-rose-500/20", icon: CancelCircleIcon },
  REFUNDED: { label: "Refunded", cls: "bg-violet-400/10 text-violet-300 border-violet-400/20", icon: ArrowReloadHorizontalIcon },
  ACCEPTED: { label: "Accepted", cls: "bg-sky-400/10 text-sky-300 border-sky-400/20", icon: CheckmarkCircle01Icon },
  PROCESSING: { label: "Processing", cls: "bg-honey/10 text-honey border-honey/20", icon: Clock01Icon },
  READY_FOR_PICKUP: { label: "Ready for pickup", cls: "bg-mint/10 text-mint border-mint/20", icon: InvoiceIcon },
  DISPATCHED: { label: "Dispatched", cls: "bg-sky-400/10 text-sky-300 border-sky-400/20", icon: DeliveryTruck01Icon },
  DELIVERED: { label: "Delivered", cls: "bg-mint/10 text-mint border-mint/20", icon: CheckmarkCircle01Icon },
  REFUND_REQUESTED: { label: "Refund requested", cls: "bg-honey/10 text-honey border-honey/20", icon: ArrowReloadHorizontalIcon },
  DISPUTED: { label: "Disputed", cls: "bg-rose-500/10 text-rose-400 border-rose-500/20", icon: Alert02Icon },
};

export function StatusBadge({ status }: { status: OrderStatus }) {
  const s = MAP[status] ?? MAP.DRAFT;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${s.cls}`}
    >
      <HugeiconsIcon icon={s.icon} size={14} strokeWidth={2} />
      {s.label}
    </span>
  );
}
