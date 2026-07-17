import { useEffect, useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { Alert02Icon, Store01Icon, WhatsappIcon } from "@hugeicons/core-free-icons";
import { publicApi, type PublicShop } from "../api";

export function ShopEntry({ slug }: { slug: string }) {
  const [shop, setShop] = useState<PublicShop | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    publicApi.shop(slug).then(setShop).catch((e) => setError(e instanceof Error ? e.message : "Store unavailable"));
  }, [slug]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-ink-900 px-5 py-10 text-slate-200">
      <section className="w-full max-w-lg border-y border-ink-500/70 py-10 text-center">
        {error ? (
          <><HugeiconsIcon icon={Alert02Icon} size={36} className="mx-auto text-rose-400" /><h1 className="mt-4 text-xl font-semibold text-white">Store not found</h1><p className="mt-2 text-sm text-slate-500">{error}</p></>
        ) : !shop ? (
          <p className="text-sm text-slate-500">Opening store...</p>
        ) : (
          <>
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-honey/10 text-honey"><HugeiconsIcon icon={Store01Icon} size={30} /></div>
            <h1 className="mt-5 text-3xl font-bold text-white">{shop.businessName}</h1>
            {shop.category && <p className="mt-1 text-sm capitalize text-slate-500">{shop.category}</p>}
            <p className="mx-auto mt-5 max-w-md text-sm leading-6 text-slate-300">{shop.greeting}</p>
            <a href={shop.whatsappUrl} className="mt-7 inline-flex items-center gap-2 rounded-md bg-wa-accent px-5 py-3 text-sm font-bold text-ink-900"><HugeiconsIcon icon={WhatsappIcon} size={19} />Chat with this store</a>
            <p className="mt-4 text-xs text-slate-600">Store code: {shop.storeCode}</p>
          </>
        )}
      </section>
    </main>
  );
}
