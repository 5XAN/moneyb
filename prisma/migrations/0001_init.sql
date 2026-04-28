-- Migration: 0001_init
-- MoneyB initial schema for Cloudflare D1

CREATE TABLE IF NOT EXISTS "Ledger" (
  "id"        TEXT NOT NULL PRIMARY KEY,
  "name"      TEXT NOT NULL,
  "type"      TEXT NOT NULL DEFAULT 'FRIENDS',
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "Member" (
  "id"        TEXT NOT NULL PRIMARY KEY,
  "name"      TEXT NOT NULL,
  "ledgerId"  TEXT NOT NULL,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Member_ledgerId_fkey"
    FOREIGN KEY ("ledgerId") REFERENCES "Ledger"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "Expense" (
  "id"          TEXT NOT NULL PRIMARY KEY,
  "title"       TEXT NOT NULL,
  "amount"      REAL NOT NULL,
  "date"        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "note"        TEXT,
  "category"    TEXT,
  "splitMethod" TEXT NOT NULL,
  "ledgerId"    TEXT NOT NULL,
  "payerId"     TEXT NOT NULL,
  "createdAt"   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Expense_ledgerId_fkey"
    FOREIGN KEY ("ledgerId") REFERENCES "Ledger"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "Expense_payerId_fkey"
    FOREIGN KEY ("payerId") REFERENCES "Member"("id") ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "ExpenseSplit" (
  "id"        TEXT NOT NULL PRIMARY KEY,
  "expenseId" TEXT NOT NULL,
  "memberId"  TEXT NOT NULL,
  "amount"    REAL NOT NULL,
  CONSTRAINT "ExpenseSplit_expenseId_fkey"
    FOREIGN KEY ("expenseId") REFERENCES "Expense"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "ExpenseSplit_memberId_fkey"
    FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "Member_ledgerId_idx" ON "Member"("ledgerId");
CREATE INDEX IF NOT EXISTS "Expense_ledgerId_idx" ON "Expense"("ledgerId");
CREATE INDEX IF NOT EXISTS "Expense_payerId_idx" ON "Expense"("payerId");
CREATE INDEX IF NOT EXISTS "ExpenseSplit_expenseId_idx" ON "ExpenseSplit"("expenseId");
CREATE INDEX IF NOT EXISTS "ExpenseSplit_memberId_idx" ON "ExpenseSplit"("memberId");
