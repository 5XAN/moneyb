"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const LEDGER_TYPES: Record<string, { label: string; emoji: string }> = {
  FRIENDS: { label: "朋友", emoji: "👫" },
  CLUB:    { label: "社團", emoji: "🏠" },
  TEAM:    { label: "團隊", emoji: "💼" },
  PROJECT: { label: "專案", emoji: "📋" },
};

interface LedgerSummary {
  id: string;
  name: string;
  type: string;
  createdAt: string;
  memberCount: number;
  totalAmount: number;
}

export default function HomePage() {
  const [ledgers, setLedgers] = useState<LedgerSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [type, setType] = useState("FRIENDS");
  const [submitting, setSubmitting] = useState(false);

  const fetchLedgers = async () => {
    const res = await fetch("/api/ledgers");
    const data = await res.json() as LedgerSummary[];
    setLedgers(data);
    setLoading(false);
  };

  useEffect(() => { fetchLedgers(); }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSubmitting(true);
    await fetch("/api/ledgers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, type }),
    });
    setName("");
    setType("FRIENDS");
    setShowForm(false);
    setSubmitting(false);
    fetchLedgers();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">我的帳本</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition"
        >
          + 新增帳本
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="bg-white rounded-xl border border-gray-200 p-4 mb-6 shadow-sm">
          <h2 className="font-semibold mb-3">建立新帳本</h2>
          <div className="space-y-3">
            <input
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
              placeholder="帳本名稱（例：墾丁旅遊、11 月聚餐）"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
            <select
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
              value={type}
              onChange={(e) => setType(e.target.value)}
            >
              {Object.entries(LEDGER_TYPES).map(([key, val]) => (
                <option key={key} value={key}>{val.emoji} {val.label}</option>
              ))}
            </select>
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 bg-indigo-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition disabled:opacity-50"
              >
                {submitting ? "建立中…" : "建立帳本"}
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-4 py-2 rounded-lg text-sm text-gray-600 border border-gray-300 hover:bg-gray-50 transition"
              >
                取消
              </button>
            </div>
          </div>
        </form>
      )}

      {loading ? (
        <div className="text-center text-gray-400 py-16">載入中…</div>
      ) : ledgers.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-4xl mb-3">🧾</p>
          <p className="text-gray-500 text-sm">還沒有帳本，點右上角新增一個吧！</p>
        </div>
      ) : (
        <div className="space-y-3">
          {ledgers.map((l) => {
            const t = LEDGER_TYPES[l.type] ?? { label: l.type, emoji: "📁" };
            return (
              <Link
                key={l.id}
                href={`/ledgers/${l.id}`}
                className="block bg-white rounded-xl border border-gray-200 p-4 hover:border-indigo-300 hover:shadow-sm transition"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{t.emoji}</span>
                      <span className="font-semibold">{l.name}</span>
                      <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{t.label}</span>
                    </div>
                    <p className="text-xs text-gray-400 mt-1">{l.memberCount} 位成員</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-gray-800">NT$ {l.totalAmount.toLocaleString()}</p>
                    <p className="text-xs text-gray-400">總支出</p>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
