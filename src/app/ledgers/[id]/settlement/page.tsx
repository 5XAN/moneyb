"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import type { MemberWithBalance, SettlementTransaction } from "@/types";

export default function SettlementPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();

  const [data, setData] = useState<{ balances: MemberWithBalance[]; transactions: SettlementTransaction[] } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/ledgers/${id}/settlement`)
      .then((r) => r.json() as Promise<{ balances: MemberWithBalance[]; transactions: SettlementTransaction[] }>)
      .then((d) => { setData(d); setLoading(false); });
  }, [id]);

  if (loading) return <div className="text-center text-gray-400 py-20">計算中…</div>;
  if (!data) return <div className="text-center text-red-400 py-20">結算失敗</div>;

  const { balances, transactions } = data;
  const isSettled = transactions.length === 0;

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => router.back()} className="text-gray-400 hover:text-gray-600">←</button>
        <h1 className="text-xl font-bold">結算建議</h1>
      </div>

      {/* 結算狀態 */}
      {isSettled ? (
        <div className="bg-green-50 border border-green-200 rounded-xl p-6 text-center mb-6">
          <p className="text-4xl mb-2">🎉</p>
          <p className="text-green-700 font-semibold">帳目已結清！</p>
          <p className="text-green-600 text-sm mt-1">所有人收支平衡，無需轉帳</p>
        </div>
      ) : (
        <div className="mb-6">
          <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-4">
            <p className="text-amber-700 text-sm">
              💡 以下是讓帳目結清所需的 <strong>最少轉帳次數</strong> ({transactions.length} 筆)
            </p>
          </div>
          <div className="space-y-3">
            {transactions.map((t, i) => (
              <div key={i} className="bg-white rounded-xl border border-gray-200 p-4">
                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-red-500">{t.fromName}</span>
                      <span className="text-gray-400 text-sm">→</span>
                      <span className="font-semibold text-green-600">{t.toName}</span>
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {t.fromName} 轉帳給 {t.toName}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-lg">NT$ {t.amount.toLocaleString()}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 各人明細 */}
      <div>
        <h2 className="font-semibold text-gray-700 mb-3">各成員帳目明細</h2>
        <div className="space-y-2">
          {balances.map((b) => (
            <div key={b.id} className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-medium">{b.name}</p>
                  <div className="flex gap-3 mt-1 text-xs text-gray-400">
                    <span>付出 NT$ {b.totalPaid.toLocaleString()}</span>
                    <span>應付 NT$ {b.totalOwed.toLocaleString()}</span>
                  </div>
                </div>
                <div className="text-right">
                  <span className={`font-bold text-sm ${
                    b.netBalance > 0.009 ? "text-green-600" :
                    b.netBalance < -0.009 ? "text-red-500" : "text-gray-500"
                  }`}>
                    {b.netBalance > 0.009
                      ? `應收回 NT$ ${b.netBalance.toLocaleString()}`
                      : b.netBalance < -0.009
                      ? `應付出 NT$ ${Math.abs(b.netBalance).toLocaleString()}`
                      : "✓ 已結清"}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
