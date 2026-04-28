import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "MoneyB — 分帳工具",
  description: "小團體共用分帳，快速記帳、自動結算",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-TW">
      <body className="min-h-screen bg-gray-50 text-gray-900 antialiased">
        <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
          <div className="max-w-2xl mx-auto px-4 h-14 flex items-center">
            <a href="/" className="flex items-center gap-2 font-bold text-lg text-indigo-600">
              <span className="text-2xl">💰</span>
              <span>MoneyB</span>
            </a>
          </div>
        </header>
        <main className="max-w-2xl mx-auto px-4 py-6">{children}</main>
      </body>
    </html>
  );
}
