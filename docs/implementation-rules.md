# AI Implementation & Coding Rules (Adapted from RentHub Standard)

- Docs & GEMINE.md là Single Source of Truth cho toàn bộ API contracts.
- Không được tự ý thay đổi folder structure (`src/components/base`, `src/components/features`, `src/types/backend.ts`, `src/services`, `src/schemas`).
- Không được hardcode màu hoặc style tùy tiện — dùng Tailwind theme variables và Design Tokens trong `src/styles/theme.css`.
- Luôn tạo Type & Interface trong `src/types/backend.ts` trước khi tạo Service hoặc Component.
- Tách bạch Base components (`src/components/base/`) và Feature components (`src/components/features/`).
- Financial integrity: Zero floating point numbers (`float`/`double`) cho monetary values. Mọi tính toán tiền tệ dùng `DECIMAL(36, 18)` hoặc `BigNumber`.
- Single Source of Truth cho Market Data: `Matching Engine + Trade Events` -> OHLCV Candles, Tickers, Recent Trades.
