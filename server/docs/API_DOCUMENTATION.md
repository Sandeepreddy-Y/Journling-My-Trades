# TradeTrack Pro — REST API Documentation

Comprehensive API documentation for the **TradeTrack Pro** trading journal and prop firm dashboard backend.

---

## 🔑 Authentication Endpoints (`/api/auth`)

### 1. Register Account
- **Method**: `POST`
- **Path**: `/api/auth/register`
- **Access**: Public
- **Request Body**:
  ```json
  {
    "fullName": "John Doe",
    "email": "trader@example.com",
    "password": "StrongPassword123!"
  }
  ```
- **Success Response (201)**:
  ```json
  {
    "status": "success",
    "data": {
      "user": { "id": "user-1", "email": "trader@example.com", "displayName": "John Doe", "role": "trader" },
      "token": "eyJhbGciOi...",
      "refreshToken": "eyJhbGciOi..."
    }
  }
  ```

### 2. Login Account
- **Method**: `POST`
- **Path**: `/api/auth/login`
- **Access**: Public
- **Request Body**:
  ```json
  {
    "email": "trader@example.com",
    "password": "StrongPassword123!",
    "rememberMe": true
  }
  ```

### 3. Refresh Access Token
- **Method**: `POST`
- **Path**: `/api/auth/refresh`
- **Access**: Public
- **Request Body**:
  ```json
  {
    "refreshToken": "eyJhbGciOi..."
  }
  ```

### 4. Logout User
- **Method**: `POST`
- **Path**: `/api/auth/logout`
- **Access**: Private (Bearer Token)

### 5. Get Current Profile
- **Method**: `GET`
- **Path**: `/api/auth/me`
- **Access**: Private (Bearer Token)

---

## 📈 Trade Management Endpoints (`/api/trades`)

### 1. Get All Trades
- **Method**: `GET`
- **Path**: `/api/trades`
- **Access**: Private (Bearer Token)

### 2. Create Trade Execution
- **Method**: `POST`
- **Path**: `/api/trades`
- **Access**: Private (Bearer Token)
- **Request Body**:
  ```json
  {
    "symbol": "XAU/USD",
    "assetClass": "commodities",
    "direction": "long",
    "entryPrice": 2385.50,
    "exitPrice": 2398.00,
    "stopLoss": 2380.00,
    "takeProfit": 2405.00,
    "lotSize": 2.00,
    "fees": 15.00,
    "swap": 0.00,
    "setupTag": "Liquidity Grab + FVG",
    "session": "overlap",
    "emotion": "confident",
    "notes": "Swept London high before expansion.",
    "beforeScreenshot": "data:image/jpeg;base64,...",
    "afterScreenshot": "data:image/jpeg;base64,..."
  }
  ```

### 3. Get Trade Detail By ID
- **Method**: `GET`
- **Path**: `/api/trades/:id`
- **Access**: Private (Bearer Token)

### 4. Update Trade Execution
- **Method**: `PUT`
- **Path**: `/api/trades/:id`
- **Access**: Private (Bearer Token)

### 5. Delete Trade Execution
- **Method**: `DELETE`
- **Path**: `/api/trades/:id`
- **Access**: Private (Bearer Token)

---

## 📊 Performance Analytics Engine (`/api/analytics`)

### 1. Get Complete Analytics Report
- **Method**: `GET`
- **Path**: `/api/analytics`
- **Access**: Private (Bearer Token)
- **Returns**: Win Rate, Profit Factor, Avg RR, Avg Win, Avg Loss, Expectancy, Max Drawdown, Consecutive Streaks, Equity Curve, Monthly Returns, Session Breakdown, and Daily Heatmap.

---

## 🏢 Prop Firm Dashboard Endpoints (`/api/prop-firm`)

### 1. Get Prop Firm Accounts & Risk Metrics
- **Method**: `GET`
- **Path**: `/api/prop-firm/accounts`
- **Access**: Private (Bearer Token)

---

## 📸 Image Upload Endpoints (`/api/upload`)

### 1. Upload Chart Screenshot
- **Method**: `POST`
- **Path**: `/api/upload`
- **Access**: Private (Bearer Token)
- **Request Body**:
  ```json
  {
    "image": "data:image/jpeg;base64,...",
    "tradeId": "trade-123",
    "type": "before"
  }
  ```
