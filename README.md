# 📈 QuantTrader Pro — Wall Street Trading Simulator

A high-performance, real-time stock market simulation and quantitative financial sandbox built entirely in Node.js with **zero external dependencies**. 

The platform features continuous Geometric Brownian Motion stochastic price modeling, live order routing (long equity and margin short-selling), automated corporate actions (forward splits and reverse splits with fractional cash-in-lieu accounting), breaking news sentiment catalysts, and real-time canvas-rendered quantitative indicators including 20-period Donchian Channels, 15-period SMA, and a full MACD (12, 26, 9) momentum oscillator.

---

## 📑 Table of Contents

* [⚡ Key Features](#-key-features)
* [🚀 Quick Start](#-quick-start)
* [📊 Asset Directory](#-asset-directory)
* [📐 Quantitative & Mathematical Models](#-quantitative--mathematical-models)
  * [1. Stochastic Price Dynamics (GBM)](#1-stochastic-price-dynamics-gbm)
  * [2. Corporate Actions & Stock Split Normalization](#2-corporate-actions--stock-split-normalization)
  * [3. 20-Period Donchian Channels](#3-20-period-donchian-channels)
  * [4. Moving Average Convergence Divergence (MACD 12/26/9)](#4-moving-average-convergence-divergence-macd-12269)
* [💼 Trading Mechanics & Risk Rules](#-trading-mechanics--risk-rules)
  * [Long Orders](#long-orders)
  * [Short Selling & Margin Collateral](#short-selling--margin-collateral)
  * [Corporate Action Position Reconciliation](#corporate-action-position-reconciliation)
  * [Trader Career Milestones](#trader-career-milestones)
* [🔌 Complete API Reference](#-complete-api-reference)
  * [Server-Sent Events (SSE) Feed](#server-sent-events-sse-feed)
  * [REST Endpoints](#rest-endpoints)
* [🏗️ Project Architecture](#️-project-architecture)
* [📄 License](#-license)

---

## ⚡ Key Features

* **Zero-Dependency Engine**: Built strictly upon native Node.js core modules (`http`, `url`, `crypto`). Runs out of the box without requiring `npm install` or third-party packages.
* **Full-Duplex Real-Time Architecture**: Continuous market ticks, corporate action notices, and news headlines streamed to connected frontends using **Server-Sent Events (SSE)**.
* **Autonomous Corporate Action Engine**:
  * **Dynamic Trigger Conditions**: Automatically executes forward splits on breakout stocks trading above $\$500.00$ and reverse splits on penny equities slipping below $\$3.00$ to maintain exchange compliance.
  * **Historical Continuum Preservation**: Retroactively scales price history and candlestick bars by the split ratio $R$ to prevent artificial visual chart cliffs and indicator distortions.
  * **Portfolio Reconciliation & Cash-in-Lieu**: Recomputes active share counts, cost basis, and collateral while liquidating fractional shares into available cash.
* **Quantitative HTML5 Canvas Terminal**:
  * Real-time switching between glowing Area Trend Lines and Japanese Candlestick bars with volume overlays.
  * Overlaid 15-period Simple Moving Average ($\text{SMA}_{15}$) and 20-period Donchian Channel breakout bands.
  * Dedicated zero-centered MACD oscillator sub-panel featuring 12-EMA, 26-EMA differential lines, 9-EMA signal line, and color-coded momentum histogram bars.
* **Procedural Acoustic Design**: Native Web Audio API sound synthesis generates immediate auditory feedback for filled orders, margin stop alerts, and corporate actions.

---

## 🚀 Quick Start

### Prerequisites
* [Node.js](https://nodejs.org/) (v16.0.0 or higher recommended).

### Running the Application

1. Clone or download the project files into a directory containing `server.js`.
2. Launch the server from your terminal:
   ```bash
   node server.js
   ```
3. Open your web browser and navigate to:
   ```
   http://localhost:3000
   ```
4. Adjust simulation speed ($0\times$, $1\times$, $2\times$, or $5\times$) using the header controls, or trigger manual test splits via the **✂️ Split** button.

---

## 📊 Asset Directory

The market engine maintains 6 distinct equities representing diverse volatility profiles, sectors, and beta coefficients:

| Ticker | Company Name | Sector | Baseline Price | Base Vol ($\sigma$) | Drift ($\mu$) | Beta ($\beta$) | Description |
| :---: | :--- | :--- | :---: | :---: | :---: | :---: | :--- |
| **`NVTX`** | NovaTech AI | Tech & Semiconductors | $\$142.50$ | $0.022$ | $+0.0004$ | $2.2$ | High-beta artificial intelligence & chipmaker. |
| **`GLDC`** | Goldcorp Trust | Commodities & Metals | $\$1,850.00$ | $0.007$ | $+0.0001$ | $0.5$ | Defensive hedge asset with low volatility and high baseline price. |
| **`PHRM`** | BioNova Labs | Biotechnology | $\$48.20$ | $0.035$ | $+0.0002$ | $1.8$ | Binary catalyst stock sensitive to FDA trial clinical headlines. |
| **`MEME`** | RocketMoon Corp | Consumer & Retail | $\$18.75$ | $0.045$ | $-0.0001$ | $3.5$ | Hyper-volatile retail favorite subject to retail pumps and dilution. |
| **`CYBR`** | Aegis Cyber | Cloud & Defense | $\$215.40$ | $0.012$ | $+0.0003$ | $0.9$ | Stable enterprise cybersecurity contractor. |
| **`COIN`** | Satoshi Ledger | Crypto Assets | $\$64.80$ | $0.038$ | $+0.0005$ | $2.8$ | High-beta digital asset infrastructure play. |

---

## 📐 Quantitative & Mathematical Models

### 1. Stochastic Price Dynamics (GBM)

Asset prices evolve discretely according to a Geometric Brownian Motion (GBM) model augmented with headline sentiment bias:

$$
S_{t + \Delta t} = S_t \times \left(1 + \mu \Delta t + \sigma Z \sqrt{\Delta t} + C_t\right)
$$

Where:
* $S_t$ is the current asset spot price.
* $\mu$ represents the baseline drift rate.
* $\sigma$ is the asset volatility coefficient.
* $Z \sim \mathcal{N}(0, 1)$ is a standard Gaussian random variable generated via the **Box-Muller Transform**:
  $$
  Z = \sqrt{-2 \ln(u_1)} \cos(2\pi u_2), \quad u_1, u_2 \in (0, 1]
  $$
* $C_t$ is the decaying catalyst sentiment bias. Following any market or stock-specific headline, the sentiment decays exponentially each tick:
  $$
  C_{t + \Delta t} = C_t \times \lambda, \quad \lambda = 0.93
  $$

---

### 2. Corporate Actions & Stock Split Normalization

When a corporate action executes with split ratio $R$ ($R > 1$ represents a forward split like $2:1$ or $5:1$, while $0 < R < 1$ represents a reverse split like $1:4$ where $R = 0.25$):

#### A. Spot & Historical Market Normalization
To prevent price discontinuities from creating false indicator signals (such as artificial gaps in moving averages or Donchian bands), all past prices and candles are normalized:

$$
P_{\text{new}} = \frac{P_{\text{old}}}{R}
$$

$$
\text{Open}' = \frac{\text{Open}}{R}, \quad \text{High}' = \frac{\text{High}}{R}, \quad \text{Low}' = \frac{\text{Low}}{R}, \quad \text{Close}' = \frac{\text{Close}}{R}
$$

$$
\text{Volume}' = \text{Volume} \times R
$$

#### B. Portfolio Position & Cost Basis Adjustment
For any open long or short position:

$$
N_{\text{exact}} = N_{\text{old}} \times R
$$

$$
\text{AvgPrice}_{\text{new}} = \frac{\text{AvgPrice}_{\text{old}}}{R}
$$

* **Forward Splits ($R > 1$)**: Whole shares are rounded ($N_{\text{new}} = \text{round}(N_{\text{exact}})$).
* **Reverse Splits ($R < 1$)**: Share counts are truncated to integer units ($N_{\text{new}} = \lfloor N_{\text{exact}} \rfloor$), and fractional shares are liquidated via cash-in-lieu:
  $$
  \text{Fraction} = N_{\text{exact}} - N_{\text{new}}
  $$
  $$
  \text{Cash-in-Lieu} = \text{Fraction} \times P_{\text{new}}
  $$
  For long positions, this amount is credited to cash balances. For short positions, the buyback liability is credited accordingly.

---

### 3. 20-Period Donchian Channels

The 20-period Donchian Channel tracks dynamic breakout volatility boundaries over a 20-period window:

$$
\text{Upper Channel}_t = \max\left(\text{High}_t, \text{High}_{t-1}, \dots, \text{High}_{t-19}\right)
$$

$$
\text{Lower Channel}_t = \min\left(\text{Low}_t, \text{Low}_{t-1}, \dots, \text{Low}_{t-19}\right)
$$

$$
\text{Middle Channel}_t = \frac{\text{Upper Channel}_t + \text{Lower Channel}_t}{2}
$$

Breakouts above $\text{Upper Channel}_t$ signal institutional upward momentum, while breakdowns below $\text{Lower Channel}_t$ identify support failures.

---

### 4. Moving Average Convergence Divergence (MACD 12/26/9)

The MACD measures momentum shifts by evaluating the convergence and divergence of short-term and medium-term exponential moving averages.

1. **Exponential Moving Averages**:
   For any series $P$ and period $k$, the smoothing weight is $\alpha = \frac{2}{k + 1}$:
   $$
   \text{EMA}_k(t) = \alpha P_t + (1 - \alpha) \text{EMA}_k(t-1)
   $$
   * Fast Smoothing Factor ($k = 12$): $\alpha_{12} = \frac{2}{13} \approx 0.1538$
   * Slow Smoothing Factor ($k = 26$): $\alpha_{26} = \frac{2}{27} \approx 0.0741$

2. **MACD Difference Line**:
   $$
   \text{MACD}_t = \text{EMA}_{12}(t) - \text{EMA}_{26}(t)
   $$

3. **Signal Line (9-Period EMA of MACD)**:
   $$
   \text{Signal}_t = \text{EMA}_9(\text{MACD})_t, \quad \alpha_9 = \frac{2}{10} = 0.20
   $$

4. **MACD Histogram**:
   $$
   \text{Histogram}_t = \text{MACD}_t - \text{Signal}_t
   $$

---

## 💼 Trading Mechanics & Risk Rules

### Long Orders
* **Buying**: Deducts $\text{Cost} = \text{Shares} \times P_{\text{market}}$ from available cash. If a position already exists, the average cost basis recalculates as:
  $$
  \text{AvgPrice}_{\text{blended}} = \frac{\text{TotalCost}_{\text{existing}} + \text{Cost}_{\text{order}}}{N_{\text{existing}} + N_{\text{order}}}
  $$
* **Selling**: Liquidates shares at market bid, adds proceeds to cash, and records realized profit/loss:
  $$
  \text{P\&L} = (\text{Price}_{\text{sell}} - \text{AvgPrice}) \times \text{Shares}_{\text{sold}}
  $$

### Short Selling & Margin Collateral
* **Shorting**: Traders can short sell shares they do not own to profit from falling prices.
* **Collateral Requirement**: Opening a short position requires a $50\%$ cash margin deposit:
  $$
  \text{Margin Required} = 0.50 \times (\text{Shares} \times P_{\text{market}})
  $$
* **Covering**: Buys back borrowed shares to close liability. Realized profit is calculated as:
  $$
  \text{P\&L}_{\text{short}} = (\text{AvgPrice}_{\text{short}} - \text{Price}_{\text{cover}}) \times \text{Shares}_{\text{covered}}
  $$

### Trader Career Milestones

Your trading tier updates dynamically based on total account net worth:

| Tier Title | Net Worth Target | Privilege / Description |
| :--- | :---: | :--- |
| **Retail Amateur** | $\$25,000$ | Baseline starting seed capital. |
| **Pattern Day Trader** | $\$50,000$ | Unlocks high-velocity intraday trading clearance. |
| **Senior Quantitative Trader** | $\$100,000$ | Recognized institutional execution consistency. |
| **Hedge Fund Partner** | $\$500,000$ | Large-scale portfolio allocation capabilities. |
| **Wall Street Titan** | $\$1,000,000+$ | Peak trader status; $40\times$ baseline seed return. |

---

## 🔌 Complete API Reference

### Server-Sent Events (SSE) Feed

#### `GET /api/stream`
Establishes a persistent SSE connection. Pushes real-time stream frames every second.

**Event Types Dispatched:**
* `init`: Pushes complete market state snapshot and clock upon connection.
* `tick`: Broadcasts latest asset prices, OHLC candlestick aggregates, and market clock.
* `news_event`: Broadcasts breaking news headlines and affected ticker sentiment.
* `market_event`: Dispatches corporate action notices:
  * `STOCK_SPLIT`: Broadcasts split factor, adjusted pricing, and portfolio adjustments.
  * `DAY_ROLL`: Broadcasts 4:00 PM session closing and roll to next trading day.

---

### REST Endpoints

#### `POST /api/trade`
Submits an execution order.

* **Request Body:**
  ```json
  {
    "action": "BUY",
    "symbol": "NVTX",
    "qty": 50
  }
  ```
  *(Supported actions: `"BUY"`, `"SELL"`, `"SHORT"`, `"COVER"`)*
* **Response (Success `200`):**
  ```json
  {
    "success": true,
    "message": "Bought 50 shares of NVTX at $142.50",
    "portfolio": { ... }
  }
  ```

#### `POST /api/split`
Executes an explicit forward or reverse stock split across the engine and ledger.

* **Request Body:**
  ```json
  {
    "symbol": "NVTX",
    "ratio": 2.0
  }
  ```
  *(Use `ratio > 1` for forward splits like `2.0` or `5.0`; use `0 < ratio < 1` for reverse splits like `0.25` for $1:4$)*
* **Response (Success `200`):**
  ```json
  {
    "success": true,
    "symbol": "NVTX",
    "ratio": 2,
    "oldPrice": 142.50,
    "newPrice": 71.25,
    "splitText": "2:1 Forward Stock Split",
    "portfolio": { ... }
  }
  ```

#### `GET /api/portfolio`
Returns current financial metrics, open positions, drawdown, and transaction history.

#### `GET /api/news`
Returns the recent catalyst feed array.

#### `POST /api/speed`
Controls the simulation speed clock.
* **Request Body:** `{"speed": 1}` *(Allowed values: `0` [pause], `1`, `2`, `5`)*

#### `POST /api/liquidate`
Instantly closes all active long and short positions at current market prices.

#### `POST /api/reset`
Resets the simulation, stocks, news stream, and cash back to $\$25,000.00$.

---

## 🏗️ Project Architecture

```
quant-trader-pro/
├── server.js               # Unified backend: HTTP server, SSE broadcaster,
│                           # MarketEngine, PortfolioLedger, and Embedded UI
├── index.html              # Standalone client simulator (alternative browser build)
├── game_description.md    # Promotional, store, and game overview documentation
└── README.md               # Technical documentation and mathematical models
```

### Server Subsystem Breakdown (`server.js`)
* **`MarketEngine`**: Manages continuous price generation, stochastic Gaussian shocks, candlestick generation, news catalyst injection, clock advancement, and automated corporate split evaluations.
* **`PortfolioLedger`**: Maintains cash balances, order fills, long/short margins, position accounting, cash-in-lieu disbursements, win-rate calculations, and max drawdown tracking.
* **`getTradingClientHtml()`**: Delivers the self-contained, responsive Tailwind CSS trading terminal with high-frequency HTML5 Canvas rendering and Web Audio synthesis.

---

## 📄 License

This project is open-source under the [MIT License](https://opensource.org/licenses/MIT). You are free to modify, distribute, and expand upon the engine for educational, analytical, and gaming purposes.