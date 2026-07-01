import { useEffect, useState } from "react";
import App from "./App";
import { WhatsAppSimulator } from "./components/whatsapp/WhatsAppSimulator";
import { Landing } from "./components/landing/Landing";

const getRoute = () => window.location.hash.replace(/^#\/?/, "") || "home";

export default function Root() {
  const [route, setRoute] = useState(getRoute());

  useEffect(() => {
    const onHash = () => {
      setRoute(getRoute());
      window.scrollTo(0, 0);
    };
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  const go = (r: string) => {
    window.location.hash = r;
  };

  if (route === "whatsapp" || route === "simulator") {
    return <WhatsAppSimulator onOpenDashboard={() => go("dashboard")} />;
  }
  if (route === "dashboard") {
    return <App onOpenSimulator={() => go("whatsapp")} />;
  }
  return <Landing onTryDemo={() => go("whatsapp")} onOpenDashboard={() => go("dashboard")} />;
}
