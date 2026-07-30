# TradeTrack Pro — Comprehensive Production Deployment Guide

Complete step-by-step production deployment guide for **TradeTrack Pro**, covering Vercel, Render, Neon PostgreSQL, and Cloudinary setup.

---

## 🏗️ Architecture Stack Overview

```
┌─────────────────────────┐        ┌──────────────────────────┐
│  Vercel Frontend CDN    │ ─────> │  Render Node.js API      │
│  (React 19 + Vite SPA)  │        │  (Express.js REST Engine)│
└─────────────────────────┘        └────────────┬─────────────┘
                                                │
                                 ┌──────────────┴──────────────┐
                                 │                             │
                                 ▼                             ▼
                    ┌─────────────────────────┐  ┌─────────────────────────┐
                    │ Neon PostgreSQL DB      │  │ Cloudinary Image CDN    │
                    │ (Serverless SQL Cluster)│  │ (Chart Screenshots)     │
                    └─────────────────────────┘  └─────────────────────────┘
```

---

## 1. 🗄️ Database Provisioning on Neon PostgreSQL

1. Sign up at [Neon.tech](https://neon.tech/).
2. Create a new project: `tradetrack-pro-db`.
3. Copy your Connection String URI:
   ```env
   postgres://username:password@ep-cool-name-123456.us-east-2.aws.neon.tech/neondb?sslmode=require
   ```
4. Open the Neon **SQL Editor** tab.
5. Copy the complete SQL schema script from [server/models/schema.sql](file:///d:/COLLAGE/Projects/Journling%20My%20Trades/server/models/schema.sql) and click **Run**.

---

## 2. 📸 Image CDN Configuration on Cloudinary

1. Sign up at [Cloudinary.com](https://cloudinary.com/).
2. Go to the Cloudinary **Dashboard**.
3. Note down:
   - **Cloud Name**
   - **API Key**
   - **API Secret**

---

## 3. 🖥️ Backend Deployment on Render

1. Sign in to [Render.com](https://render.com/).
2. Click **New +** -> **Web Service**.
3. Select your GitHub repository.
4. Configure settings:
   - **Name**: `tradetrack-api`
   - **Root Directory**: `server`
   - **Runtime**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
5. Add Environment Variables:
   - `NODE_ENV`: `production`
   - `PORT`: `5000`
   - `DATABASE_URL`: `postgres://username:password@ep-cool-name-123456.us-east-2.aws.neon.tech/neondb?sslmode=require`
   - `JWT_SECRET`: `your_random_production_jwt_secret_64chars`
   - `JWT_REFRESH_SECRET`: `your_random_production_refresh_secret_64chars`
   - `CLOUDINARY_CLOUD_NAME`: `your_cloud_name`
   - `CLOUDINARY_API_KEY`: `your_api_key`
   - `CLOUDINARY_API_SECRET`: `your_api_secret`
   - `CLIENT_URL`: `https://tradetrack-pro.vercel.app`
6. Click **Create Web Service**. Note down your live API URL (e.g. `https://tradetrack-api.onrender.com`).

---

## 4. ⚡ Frontend Deployment on Vercel

1. Sign in to [Vercel.com](https://vercel.com/).
2. Click **Add New** -> **Project**.
3. Import your GitHub repository.
4. Set Framework Preset: `Vite`.
5. Add Environment Variable:
   - `VITE_API_URL`: `https://tradetrack-api.onrender.com/api`
6. Click **Deploy**. Vercel will automatically compile the optimized bundle and issue SSL certificates!

---

## 🐳 Docker Deployment Option

Run the full stack via Docker Compose:

```bash
docker-compose up -d --build
```
