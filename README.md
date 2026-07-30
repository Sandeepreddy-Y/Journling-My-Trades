# 📈 TradeTrack Pro — Enterprise Trading Journal & Analytics Platform

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![React](https://img.shields.io/badge/React-19.0-blue?logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue?logo=typescript)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-6.0-purple?logo=vite)](https://vitejs.dev/)
[![Node.js](https://img.shields.io/badge/Node.js-20.x-green?logo=node.js)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express-4.21-lightgrey?logo=express)](https://expressjs.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-blue?logo=postgresql)](https://www.postgresql.org/)

**TradeTrack Pro** is a full-stack, enterprise-grade trading journal and behavioral performance analytics application built for Forex, Crypto, Indices, Gold, and Prop Firm traders. It features real-time equity curves, interactive trade replays, MT4/MT5 statement imports, prop firm drawdown monitors, position risk calculators, AI pattern detection, and strategy playbook checklists.

---

## 📸 Screenshots

| Trading Dashboard | Interactive Trade Replay |
| :---: | :---: |
| ![Dashboard Screenshot Placeholder](https://via.placeholder.com/600x350/131722/26A69A?text=TradeTrack+Pro+Dashboard) | ![Trade Replay Placeholder](https://via.placeholder.com/600x350/131722/2962FF?text=Bar-By-Bar+Trade+Replay) |

| Analytics & Heatmaps | Prop Firm Dashboard |
| :---: | :---: |
| ![Analytics Placeholder](https://via.placeholder.com/600x350/131722/FF6B6B?text=Performance+Analytics+Engine) | ![Prop Firm Placeholder](https://via.placeholder.com/600x350/131722/FFA726?text=Prop+Firm+Drawdown+Monitor) |

---

## ✨ Features

- 📊 **TradingView-Inspired Dashboard**: High-contrast obsidian canvas (`#131722`), 6 KPI overview cards, Recharts cumulative equity curve, monthly returns, and win/loss donut distribution.
- 🤖 **Antigravity AI Assistant**: Analyzes trading history to detect **Revenge Trading**, **Overtrading at Session Open**, and strategy edge confluences.
- 📈 **Full 23-Field Trade Management**: Track Date, Time, Account, Broker, Symbol, Buy/Sell, Entry, Exit, SL, TP, Lot Size, Risk %, Reward %, R:R Ratio, PnL, Commission, Swap, Session, Setup, Emotion, Notes, and Chart Screenshots.
- 📥 **MT4 / MT5 Statement Importer**: Import MetaTrader 4 & 5 CSV or HTML reports with duplicate detection and automatic symbol registration.
- ⏯️ **Bar-By-Bar Trade Replay**: Replay historical trade executions step-by-step with variable playback speeds (`1x`, `2x`, `5x`) and real-time trailing PnL tracking.
- 🏢 **Prop Firm Risk Tracker**: Monitor FTMO, FundingPips, Goat Funded, and Funding Traders accounts against Daily Drawdown, Overall Drawdown, Profit Target, 40% Consistency Rule, and Payout Countdown.
- 🧮 **Position Risk Calculator**: Calculate exact lot sizes based on account balance, risk percentage, stop loss distance, and instrument contract multipliers.
- 📚 **Strategy Library & Pre-Flight Checklist**: Create strategy playbooks with interactive pre-entry rule checklists.
- 📅 **Economic Calendar & Session Clocks**: Macroeconomic news releases (FOMC, NFP, CPI) and session clocks (London, NY, Tokyo, Sydney).
- 📝 **Trader Journal with Autosave**: Daily pre-market reflections, weekly reviews, and monthly retrospectives with real-time autosave.
- 🔐 **JWT Auth Architecture**: Access Token + Refresh Token rotation, HTTP-only cookies, bcrypt salt factor 10, and Remember Me options.

---

## 🛠️ Tech Stack

### Frontend
- **Framework**: React 19 + TypeScript + Vite 6
- **Styling**: Tailwind CSS v4 + Lucide React Icons
- **Charts**: Recharts
- **State & Routing**: React Context API + React Router v7
- **HTTP Client**: Axios with automated auth interceptors & refresh token retry

### Backend
- **Runtime**: Node.js v20+
- **Framework**: Express.js (MVC Architecture)
- **Database**: PostgreSQL 16 (Neon Serverless Compatible)
- **Authentication**: JSON Web Tokens (`jsonwebtoken`) + `bcryptjs`
- **Security**: Helmet, CORS, Rate Limiting (`rateLimiter.js`)
- **Media CDN**: Cloudinary SDK

---

## 📁 Repository Directory Structure

```
Journling My Trades/
├── .github/workflows/       # GitHub Actions CI/CD pipeline
├── public/                  # Static assets & PWA manifest.json
├── server/                  # Express Node.js Backend API
│   ├── config/              # PostgreSQL & Cloudinary connections
│   ├── controllers/         # API Controllers (Auth, Trades, Analytics, PropFirm, Upload)
│   ├── middleware/          # JWT auth & Rate limiting middleware
│   ├── models/              # PostgreSQL SQL schema definitions
│   ├── routes/              # Express API route endpoints
│   ├── scripts/             # Database migration & seed scripts
│   ├── .env.example         # Backend environment variables template
│   └── server.js            # Express API entry point
├── src/                     # React 19 + TypeScript Frontend SPA
│   ├── components/          # Reusable UI components (AI, Layout, Trades, Common)
│   ├── contexts/            # React AuthContext & ThemeContext
│   ├── hooks/               # Custom hooks (useTrades, useAnalytics, useKeyboardShortcuts)
│   ├── lib/                 # Axios client, image compression, export helpers
│   ├── pages/               # Lazy-loaded page components
│   ├── types/               # TypeScript interface definitions
│   ├── App.tsx              # Main routing & error boundaries
│   └── main.tsx             # React DOM root entry
├── Dockerfile               # Production Docker container build
├── docker-compose.yml       # Full-stack Docker orchestration
├── nginx.conf               # Production Nginx reverse proxy config
├── PRODUCTION_DEPLOYMENT.md # Deployment guide (Vercel, Render, Neon, Cloudinary)
├── .env.example             # Frontend environment variables template
├── .gitignore               # Excluded build & secret files
├── package.json             # Frontend dependencies & build scripts
└── vite.config.ts           # Vite configuration & dev proxy
```

---

## 🚀 Getting Started

### Prerequisites
- Node.js v20.x or higher
- npm v10.x or higher
- PostgreSQL v16 (optional for local DB, or use Neon.tech)

### 1. Clone the Repository
```bash
git clone https://github.com/your-username/tradetrack-pro.git
cd tradetrack-pro
```

### 2. Install Dependencies
```bash
# Install frontend dependencies
npm install

# Install backend dependencies
cd server
npm install
cd ..
```

### 3. Environment Setup

Create `.env` in the root directory:
```env
VITE_API_URL=http://localhost:5000/api
```

Create `server/.env` in the `server` directory:
```env
NODE_ENV=development
PORT=5000
DATABASE_URL=postgres://postgres:postgres@localhost:5432/tradetrack_db
JWT_SECRET=your_super_secret_jwt_key_min_32_characters
JWT_REFRESH_SECRET=your_super_secret_refresh_key_min_32_characters
CLIENT_URL=http://localhost:5173
```

### 4. Running the Development Servers

```bash
# Terminal 1: Start Backend Express API (Port 5000)
cd server
npm run dev

# Terminal 2: Start Frontend Vite Dev Server (Port 5173)
npm run dev
```

Open `http://localhost:5173` in your browser. On the login screen, click **"⚡ One-Click Instant Demo Login"** for immediate access!

---

## 🐳 Docker Support

Run the entire application in production mode via Docker Compose:

```bash
docker-compose up -d --build
```

---

## 📜 License

Distributed under the MIT License. See `LICENSE` for more information.
