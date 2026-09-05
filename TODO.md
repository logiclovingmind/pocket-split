# TODO — deferred features

## Splitwise pivot (2026-07-15)
Converted from the 2-person pool ledger into a full multi-group Splitwise clone:
multiple groups per room, arbitrary members, expenses with multiple payers and
four split modes (equal / exact / % / shares), net balances with greedy debt
simplification, settle-up payments, per-group currency, categories with icons.

## Deferred "pro" features (not built — need a server, storage, or are low-value for now)
- **Receipt photos / OCR** — needs Vercel Blob (or similar) + an OCR step.
- **Comments / activity thread per expense** — extra synced table; skipped for v1.
- **Recurring expenses** — a scheduler; add if actually needed.
- **Payment reminders / push notifications** — needs server + iOS push setup.
- **Charts / spending insights** — bar/pie of category totals per month.
- **CSV / PDF export** — dump a group's expenses.
- **Multi-currency conversion** — currency is per-group today; no FX across groups.
- **Group-level settle-all** — one tap to clear every simplified debt at once.

## Carried over from the old ledger (still nice-to-have)
- Share-room button + QR for cleaner link sharing (basic share added on GroupsScreen).
