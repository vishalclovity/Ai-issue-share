// src/App.js
import { useEffect, useState } from "react";
import { view } from "@forge/bridge";
import ChatInterface from "./components/ChatInterface";
import { getIssueShareContent } from "./content/backlog-management.content";
import "./index.css";

export default function GlobalApp() {
  const [locale, setLocale] = useState("");
  const [content, setContent] = useState(getIssueShareContent(""));
  const [showChat, setShowChat] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const ctx = await view.getContext();
        const loc = ctx?.locale || "en_US";
        setLocale(loc);
        setContent(getIssueShareContent(loc));
        console.info('[AI Issue Share][UI] Context loaded:', { cloudId: ctx?.cloudId, locale: loc });
      } catch (e) {
        console.error('[AI Issue Share][UI] Context init failed:', e?.message || e);
      }
    })();
  }, []);

  if (!locale || !content) {
    return <div className="min-h-screen flex items-center justify-center text-base">Loading…</div>;
  }

  return (
    <ChatInterface
      showChat={showChat}
      onOpenChat={() => setShowChat(true)}
      onBack={() => setShowChat(false)}
      content={content}
      locale={locale}
    />
  );
}
