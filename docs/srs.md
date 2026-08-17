# Frontend Directory Structure (docs/srs.md - RentHub Standard)

```text
apps/web/src/
├── app/
│   ├── (auth)/
│   │   ├── login/
│   │   │   └── page.tsx
│   │   └── register/
│   │       └── page.tsx
│   ├── admin/
│   │   └── page.tsx
│   ├── markets/
│   │   └── page.tsx
│   ├── p2p/
│   │   └── page.tsx
│   ├── trade/
│   │   └── [symbol]/
│   │       └── page.tsx
│   ├── wallet/
│   │   └── page.tsx
│   ├── favicon.ico
│   ├── layout.tsx
│   ├── not-found.tsx
│   └── page.tsx
├── components/
│   ├── base/
│   │   ├── avatar/
│   │   │   └── avatar.tsx
│   │   ├── badges/
│   │   │   └── badges.tsx
│   │   ├── buttons/
│   │   │   └── button.tsx
│   │   ├── input/
│   │   │   └── input.tsx
│   │   ├── modal/
│   │   │   └── modal.tsx
│   │   └── select/
│   │       └── select.tsx
│   └── features/
│       ├── admin/
│       │   ├── AuditLogTable.tsx
│       │   ├── MarketListingForm.tsx
│       │   └── UserManagementTable.tsx
│       ├── auth/
│       │   ├── LoginForm.tsx
│       │   └── RegisterForm.tsx
│       ├── p2p/
│       │   ├── P2PAdCard.tsx
│       │   ├── P2PEscrowModal.tsx
│       │   └── P2POrderCard.tsx
│       ├── trading/
│       │   ├── OrderForm.tsx
│       │   ├── OrderHistoryTable.tsx
│       │   ├── Orderbook.tsx
│       │   ├── RecentTrades.tsx
│       │   └── TradingViewChart.tsx
│       └── wallet/
│           ├── BalanceTable.tsx
│           ├── DepositModal.tsx
│           └── WithdrawForm.tsx
├── hooks/
│   ├── use-breakpoint.ts
│   └── use-websocket.ts
├── lib/
│   ├── axios.ts
│   └── socket.ts
├── providers/
│   ├── router-provider.tsx
│   └── theme.tsx
├── schemas/
│   ├── auth.schema.ts
│   ├── order.schema.ts
│   └── p2p.schema.ts
├── services/
│   ├── admin.service.ts
│   ├── auth.service.ts
│   ├── market.service.ts
│   ├── p2p.service.ts
│   ├── trading.service.ts
│   └── wallet.service.ts
├── styles/
│   ├── globals.css
│   ├── theme.css
│   └── typography.css
├── types/
│   └── backend.ts
└── utils/
    ├── cx.ts
    └── format.ts
```
