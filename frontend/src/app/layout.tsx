import type { Metadata } from "next";
import "./globals.css";
import Sidebar from "@/components/layout/Sidebar";
import AIAssistantDrawer from "@/components/ai/AIAssistantDrawer";

export const metadata: Metadata = {
  title: "Trading Lab",
  description: "Dashboard temps réel — Suivi stratégies algorithmiques",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body className="flex h-screen overflow-hidden bg-bg text-text">
        <Sidebar />
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
        <AIAssistantDrawer />
      </body>
    </html>
  );
}
