"use client";
export const runtime = "edge";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { validateExactSplits, validateRatioSplits } from "@/lib/split-calculator";

interface Member { id: string; name: string; }

const CATEGORIES = [
  { value: "food", label: "🍽 餐飲" },
  { value: "transport", label: "🚗 交通" },
  { value: "accommodation", label: "🏨 住宿" },
  { value: "entertainment", label: "🎉 娛樂" },
  { value: "shopping", label: "🛒 購物" },
  { value: "other", label: "📦 其他" },
];

type SplitMethod = "EQUAL" | "EXACT" | "RATIO";

export default function NewExpensePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();

  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  // 表單欄位
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [payerId, setPayerId] = useState("");
  const [splitMethod, setSplitMethod] = useState<SplitMethod>("EQUAL");
  const [selectedMembers, setSelectedMembers] = useState<Set<string>>(new Set());
  const [exactAmounts, setExactAmounts] = useState<Record<string, string>>({});
  const [ratioValues, setRatioValues] = useState<Record<string, string>>({});
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [note, setNote] = useState("");
  const [category, setCategory] = useState("other");

  useEffect(() => {
    fetch(`/api/ledgers/${id}/members`)
      .then((r) => r.json() as Promise<Member[]>)
      .then((data) => {
        setMembers(data);
        // 預設全選
        const allIds = new Set(data.map((m) => m.id));
        setSelectedMembers(allIds);
        if (data.length > 0) setPayerId(data[0].id);
        const initExact: Record<string, string> = {};
        const initRatio: Record<string, string> = {};
        data.forEach((m) => { initExact[m.id] = ""; initRatio[m.id] = "1"; });
        setExactAmounts(initExact);
        setRatioValues(initRatio);
        setLoading(false);
      });
  }, [id]);

  const toggleMember = (memberId: string) => {
    setSelectedMembers((prev) => {
      const next = new Set(prev);
      if (next.has(memberId)) next.delete(memberId); else next.add(memberId);
      return next;
    });
  };

  const getValidationError = (): string => {
    if (!title.trim()) return "請輸入標題";
    if (!amount || Number(amount) <= 0) return "請輸入有效金額";
    if (!payerId) return "請選擇付款人";
    if (selectedMembers.size === 0) return "請選擇至少一位分攤對象";

    const participants = Array.from(selectedMembers).map((mid) => ({
      memberId: mid,
      value: splitMethod === "EXACT" ? Number(exactAmounts[mid] || 0)
           : splitMethod === "RATIO" ? Number(ratioValues[mid] || 0)
           : 0,
    }));

    if (splitMethod === "EXACT") {
      return validateExactSplits(Number(amount), participants) ?? "";
    }
    if (splitMethod === "RATIO") {
      return validateRatioSplits(participants) ?? "";
    }
    return "";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const err = getValidationError();
    if (err) { setError(err); return; }
    setError("");
    setSubmitting(true);

    const splits = Array.from(selectedMembers).map((mid) => ({
      memberId: mid,
      value: splitMethod === "EXACT" ? Number(exactAmounts[mid] || 0)
           : splitMethod === "RATIO" ? Number(ratioValues[mid] || 1)
           : 0,
    }));

    const res = await fetch(`/api/ledgers/${id}/expenses`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, amount: Number(amount), payerId, splitMethod, splits, date, note, category }),
    });

    if (res.ok) {
      router.push(`/ledgers/${id}`);
    } else {
      const data = await res.json() as { error?: string };
      setError(data.error ?? "新增失敗，請再試一次");
      setSubmitting(false);
    }
  };

  // 即時顯示分配金額預覽
  const getPreview = (): { name: string; amount: string }[] => {
    if (!amount || Number(amount) <= 0 || selectedMembers.size === 0) return [];
    const total = Number(amount);
    const participants = Array.from(selectedMembers);

    if (splitMethod === "EQUAL") {
      const each = Math.round((total / participants.length) * 100) / 100;
      return participants.map((mid) => ({
        name: members.find((m) => m.id === mid)?.name ?? mid,
        amount: `NT$ ${each.toLocaleString()}`,
      }));
    }
    if (splitMethod === "EXACT") {
      return participants.map((mid) => ({
        name: members.find((m) => m.id === mid)?.name ?? mid,
        amount: exactAmounts[mid] ? `NT$ ${Number(exactAmounts[mid]).toLocaleString()}` : "—",
      }));
    }
    if (splitMethod === "RATIO") {
      const totalRatio = participants.reduce((s, mid) => s + Number(ratioValues[mid] || 0), 0);
      if (totalRatio <= 0) return [];
      return participants.map((mid) => {
        const ratio = Number(ratioValues[mid] || 0);
        const amt = Math.round((ratio / totalRatio) * total * 100) / 100;
        return { name: members.find((m) => m.id === mid)?.name ?? mid, amount: `NT$ ${amt.toLocaleString()}` };
      });
    }
    return [];
  };

  if (loading) return <div className="text-center text-gray-400 py-20">載入中…</div>;

  if (members.length === 0) {
    return (
      <div className="text-center py-20">
        <p className="text-4xl mb-3">👤</p>
        <p className="text-gray-500 text-sm mb-4">請先到帳本新增成員，才能記錄支出。</p>
        <button onClick={() => router.back()} className="text-indigo-600 text-sm font-medium">← 回帳本</button>
      </div>
    );
  }

  const preview = getPreview();

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => router.back()} className="text-gray-400 hover:text-gray-600">←</button>
        <h1 className="text-xl font-bold">新增支出</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* 標題 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">標題 *</label>
          <input
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
            placeholder="例：午餐、計程車費、房費…"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
        </div>

        {/* 金額 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">金額 (NT$) *</label>
          <input
            type="number"
            min="0"
            step="1"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
            placeholder="0"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
          />
        </div>

        {/* 付款人 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">付款人 *</label>
          <select
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
            value={payerId}
            onChange={(e) => setPayerId(e.target.value)}
          >
            {members.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
        </div>

        {/* 分攤方式 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">分攤方式 *</label>
          <div className="flex gap-2">
            {(["EQUAL", "EXACT", "RATIO"] as SplitMethod[]).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setSplitMethod(m)}
                className={`flex-1 py-2 rounded-lg text-sm font-medium border transition ${
                  splitMethod === m
                    ? "bg-indigo-600 text-white border-indigo-600"
                    : "bg-white text-gray-600 border-gray-300 hover:border-indigo-300"
                }`}
              >
                {{ EQUAL: "平均", EXACT: "指定金額", RATIO: "比例" }[m]}
              </button>
            ))}
          </div>
        </div>

        {/* 分攤對象 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">分攤對象 *</label>
          <div className="space-y-2">
            {members.map((m) => (
              <div
                key={m.id}
                className={`flex items-center gap-3 p-3 rounded-xl border transition cursor-pointer ${
                  selectedMembers.has(m.id) ? "border-indigo-300 bg-indigo-50" : "border-gray-200 bg-white"
                }`}
                onClick={() => toggleMember(m.id)}
              >
                <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition ${
                  selectedMembers.has(m.id) ? "bg-indigo-600 border-indigo-600" : "border-gray-300"
                }`}>
                  {selectedMembers.has(m.id) && <span className="text-white text-xs">✓</span>}
                </div>
                <span className="flex-1 text-sm font-medium">{m.name}</span>

                {/* EXACT 輸入 */}
                {splitMethod === "EXACT" && selectedMembers.has(m.id) && (
                  <input
                    type="number"
                    min="0"
                    step="1"
                    className="w-24 border border-gray-300 rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-400"
                    placeholder="金額"
                    value={exactAmounts[m.id] ?? ""}
                    onChange={(e) => setExactAmounts((prev) => ({ ...prev, [m.id]: e.target.value }))}
                    onClick={(e) => e.stopPropagation()}
                  />
                )}

                {/* RATIO 輸入 */}
                {splitMethod === "RATIO" && selectedMembers.has(m.id) && (
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      min="0"
                      step="0.1"
                      className="w-16 border border-gray-300 rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-400"
                      value={ratioValues[m.id] ?? "1"}
                      onChange={(e) => setRatioValues((prev) => ({ ...prev, [m.id]: e.target.value }))}
                      onClick={(e) => e.stopPropagation()}
                    />
                    <span className="text-gray-400 text-sm">份</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* 分攤預覽 */}
        {preview.length > 0 && (
          <div className="bg-gray-50 rounded-xl p-3 border border-gray-200">
            <p className="text-xs text-gray-500 font-medium mb-2">分攤預覽</p>
            <div className="grid grid-cols-2 gap-1">
              {preview.map((p, i) => (
                <div key={i} className="flex justify-between text-xs">
                  <span className="text-gray-600">{p.name}</span>
                  <span className="font-medium">{p.amount}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 日期 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">日期</label>
          <input
            type="date"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>

        {/* 分類 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">分類</label>
          <div className="grid grid-cols-3 gap-2">
            {CATEGORIES.map((c) => (
              <button
                key={c.value}
                type="button"
                onClick={() => setCategory(c.value)}
                className={`py-2 rounded-lg text-xs font-medium border transition ${
                  category === c.value
                    ? "bg-indigo-600 text-white border-indigo-600"
                    : "bg-white text-gray-600 border-gray-200 hover:border-indigo-300"
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>

        {/* 備註 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">備註</label>
          <input
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
            placeholder="（選填）"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </div>

        {/* 錯誤訊息 */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg px-4 py-3">
            ⚠️ {error}
          </div>
        )}

        {/* 提交 */}
        <button
          type="submit"
          disabled={submitting}
          className="w-full bg-indigo-600 text-white py-3 rounded-xl font-semibold text-sm hover:bg-indigo-700 transition disabled:opacity-50"
        >
          {submitting ? "儲存中…" : "儲存支出"}
        </button>
      </form>
    </div>
  );
}
