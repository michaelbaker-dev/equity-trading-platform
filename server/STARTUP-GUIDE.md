# 🚀 Equity Trading Platform - Startup Guide

## ⚡ Quick Start (Recommended)

```bash
./start-app-simple.sh
```

This will automatically:
- ✅ Start Docker Desktop if needed
- ✅ Build and start the Go backend
- ✅ Start the React frontend
- ✅ Open your browser

## 🔧 Manual Start (If automatic fails)

### Step 1: Start Docker
```bash
# Open Docker Desktop app (wait for whale icon in menu bar)
open -a Docker
```

### Step 2: Start Backend
```bash
./run.sh
```
Wait for: "Service is healthy" message

### Step 3: Start Frontend (in new terminal)
```bash
cd react-frontend
npm run dev
```

### Step 4: Open Browser
Visit: http://localhost:5173

## 🛑 Stop Everything

```bash
./stop-application.sh
```

## 🔍 Troubleshooting

### Docker Issues
```bash
# Check Docker status
docker info

# Restart Docker Desktop manually
# Click whale icon > Restart
```

### Backend Issues
```bash
# Check backend logs
docker-compose logs

# Restart backend only
docker-compose down
./run.sh
```

### Frontend Issues
```bash
# Kill frontend process
lsof -ti:5173 | xargs kill -9

# Restart frontend
cd react-frontend && npm run dev
```

## 📋 Expected URLs

- **Main App:** http://localhost:5173
- **Backend API:** http://localhost:8080/api/v1
- **Health Check:** http://localhost:8080/health

## 🎯 What Should Work

- ✅ Watchlist with real stock prices
- ✅ Real-time price updates (every 2 seconds)
- ✅ WebSocket connection (shows "🟢 Connected")
- ✅ Stock selection and data display
- ✅ Mini charts with price trends

---

**Need help?** Check the logs or run `./start-app-simple.sh` for guided startup.