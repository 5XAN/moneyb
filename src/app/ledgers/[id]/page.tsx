"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface Member { id: string; name: string; }
interface ExpenseSplit { id: string; memberId: string; amount: number; member: Member; }
interface Expense {
  id: string; title: string; amount: number; date: string;
  note: string | null; category: string | null; splitMethod: string;
  payer: Member; splits: ExpenseSplit[];
}
interface Ledger { id: string; name: string; type: string; members: Member[]; expenses: Expense[]; }
interface Balance { id: string; name: string; totalPaid: number; totalOwed: number; netBalance: number; }

const SPLIT_METHOD_LABELS: Record<string, string> = {
  EQUAL: "平均分攤", EXACT: "指定金額", RATIO: "指定比例",
};
const CATEGORY_LABELS: Record<string, string> = {
  food: "🍽 餐飲", transport: "🚗 交通", accommodation: "🏨 住宿",
  entertainment: "🎉 娛樂", shopping: "🛒 購物", other: "📦 其他",
};

export default function LedgerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();

  const [ledger, setLedger] = useState<Ledger | null>(null);
  const [balances, setBalances] = useState<Balance[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"expenses" | "members" | "balance">("expenses");

  // 新增成員 state
  const [newMemberName, setNewMemberName] = useState("");
  const [addingMember, setAddingMember] = useState(false);
  const [showMemberForm, setShowMemberForm] = useState(false);

  // 編輯帳本名稱
  const [editingName, setEditingName] = useState(false);
  const [editedName, setEditedName] = useState("");

  const fetchAll = async () => {
    const [ledgerRes, balancesRes] = await Promise.all([
      fetch(`/api/ledgers/${id}`),
      fetch(`/api/ledgers/${id}/balances`),
    ]);
    const ledgerData = await ledgerRes.json() as Ledger;
    const balancesData = await balancesRes.json() as Balance[];
    setLedger(ledgerData);
    setBalances(balancesData);
    setEditedName(ledgerData.name);
    setLoading(false);
  };

  useEffect(() => { fetchAll(); }, [id]);

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMemberName.trim()) return;
    setAddingMember(true);
    await fetch(`/api/ledgers/${id}/members`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newMemberName.trim() }),
    });
    setNewMemberName("");
    setShowMemberForm(false);
    setAddingMember(false);
    fetchAll();
  };

  const handleDeleteExpense = async (expenseId: string) => {
    if (!confirm("確定刪除這筆支出？")) return;
    await fetch(`/api/expenses/${expenseId}`, { method: "DELETE" });
    fetchAll();
  };

  const handleSaveName = async () => {
    if (!editedName.trim()) return;
    await fetch(`/api/ledgers/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: editedName.trim() }),
    });
    setEditingName(false);
    fetchAll();
  };

  if (loading) return <div className="text-center text-gray-400 py-20">載入中…</div>;
  if (!ledger) return <div className="text-center text-red-400 py-20">帳本不存在</div>;

  return (
    <div>
      {/* Header */}
      <div className="flex items-start justify-between mb-1">
        <div className="flex-1">
          {editingName ? (
            <div className="flex gap-2 items-center">
              <input
                className="border border-gray-300 rounded-lg px-3 py-1 text-lg font-bold focus:outline-none focus:ring-2 focus:ring-indigo-400"
                value={editedName}
                onChange={(e) => setEditedName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSaveName()}
                autoFocus
              />
              <button onClick={handleSaveName} className="text-indigo-600 text-sm font-medium">儲存</button>
              <button onClick={() => setEditingName(false)} className="text-gray-400 text-sm">取消</button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold">{ledger.name}</h1>
              <button onClick={() => setEditingName(true)} className="text-gray-400 hover:text-gray-600 text-sm">✏️</button>
            </div>
          )}
          <p className="text-sm text-gray-400 mt-0.5">{ledger.members.length} 位成員 · {ledger.expenses.length} 筆支出</p>
        </div>
        <Link
          href={`/ledgers/${id}/expenses/new`}
          className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition ml-4 whitespace-nowrap"
        >
          + 新增支出
        </Link>
      </div>

      {/* 結算入口 */}
      <Link
        href={`/ledgers/${id}/settlement`}
        className="flex items-center justify-between bg-indigo-50 border border-indigo-200 rounded-xl px-4 py-3 mb-5 hover:bg-indigo-100 transition"
      >
        <span className="text-indigo-700 font-medium text-sm">💸 查看結算建議</span>
        <span className="text-indigo-400 text-sm">→</span>
      </Link>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 mb-4">
        {(["expenses", "balance", "members"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition ${
              tab === t ? "border-indigo-500 text-indigo-600" : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            {{ expenses: "支出紀錄", balance: "成員餘額", members: "成員管理" }[t]}
          </button>
        ))}
      </div>

      {/* TAB: 支出紀錄 */}
      {tab === "expenses" && (
        <div className="space-y-3">
          {ledger.expenses.length === 0 ? (
            <div className="text-center py-12 text-gray-400 text-sm">還沒有支出，點右上角新增吧！</div>
          ) : (
            ledger.expenses.map((e) => (
              <div key={e.id} className="bg-white rounded-xl border border-gray-200 p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold">{e.title}</span>
                      {e.category && (
                        <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                          {CATEGORY_LABELS[e.category] ?? e.category}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-400 mt-1">
                      {e.payer.name} 付款 · {SPLIT_METHOD_LABELS[e.splitMethod]} · {new Date(e.date).toLocaleDateString("zh-TW")}
                    </p>
                    {e.note && <p className="text-xs text-gray-400 mt-0.5">📝 {e.note}</p>}
                    <div className="mt-2 flex flex-wrap gap-1">
                      {e.splits.map((s) => (
                        <span key={s.id} className="text-xs bg-gray-50 border border-gray-200 px-2 py-0.5 rounded-full">
                          {s.member.name} NT${s.amount.toLocaleString()}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="text-right ml-3 flex-shrink-0">
                    <p className="font-bold text-gray-800">NT$ {e.amount.toLocaleString()}</p>
                    <button
                      onClick={() => handleDeleteExpense(e.id)}
                      className="text-xs text-red-400 hover:text-red-600 mt-1"
                    >
                      刪除
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* TAB: 成員餘額 */}
      {tab === "balance" && (
        <div className="space-y-2">
          {balances.length === 0 ? (
            <div className="text-center py-12 text-gray-400 text-sm">請先新增成員與支出</div>
          ) : (
            balances.map((b) => (
              <div key={b.id} className="bg-white rounded-xl border border-gray-200 p-4">
                <div className="flex items-center justify-between">
                  <span className="font-medium">{b.name}</span>
                  <span className={`font-bold text-sm ${b.netBalance > 0 ? "text-green-600" : b.netBalance < 0 ? "text-red-500" : "text-gray-500"}`}>
                    {b.netBalance > 0 ? `+NT$ ${b.netBalance.toLocaleString()}` : b.netBalance < 0 ? `-NT$ ${Math.abs(b.netBalance).toLocaleString()}` : "已結清"}
                  </span>
                </div>
                <div className="flex gap-4 mt-1 text-xs text-gray-400">
                  <span>已付出 NT$ {b.totalPaid.toLocaleString()}</span>
                  <span>應負擔 NT$ {b.totalOwed.toLocaleString()}</span>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* TAB: 成員管理 */}
      {tab === "members" && (
        <div>
          <div className="space-y-2 mb-4">
            {ledger.members.map((m) => (
              <div key={m.id} className="bg-white rounded-xl border border-gray-200 px-4 py-3 flex items-center">
                <span className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-sm mr-3">
                  {m.name.charAt(0)}
                </span>
                <span className="font-medium">{m.name}</span>
              </div>
            ))}
          </div>

          {showMemberForm ? (
            <form onSubmit={handleAddMember} className="flex gap-2">
              <input
                className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                placeholder="成員姓名"
                value={newMemberName}
                onChange={(e) => setNewMemberName(e.target.value)}
                autoFocus
                required
              />
              <button
                type="submit"
                disabled={addingMember}
                className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition disabled:opacity-50"
              >
                新增
              </button>
              <button type="button" onClick={() => setShowMemberForm(false)} className="px-3 py-2 text-gray-500 border border-gray-300 rounded-lg text-sm hover:bg-gray-50">
                取消
              </button>
            </form>
          ) : (
            <button
              onClick={() => setShowMemberForm(true)}
              className="w-full border-2 border-dashed border-gray-300 rounded-xl py-3 text-sm text-gray-400 hover:border-indigo-300 hover:text-indigo-400 transition"
            >
              + 新增成員
            </button>
          )}
        </div>
      )}
    </div>
  );
}
