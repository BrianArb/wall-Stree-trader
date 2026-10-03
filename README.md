# 📈 QuantTrader Pro — Wall Street Trading Simulator

A real-time, interactive stock trading simulator and financial sandbox built entirely in Node.js with zero external dependencies. Features dynamic price simulation via Geometric Brownian Motion, long and short execution with margin collateral checks, dynamic breaking-news catalysts, and real-time technical indicators (SMA, 20-period Donchian Channels, and MACD 12/26/9) rendered on an HTML5 Canvas.

## 📑 Table of Contents

* [Key Features](#-key-features)

* [Quick Start](#-quick-start)

* [Asset Directory](#-asset-directory)

* [Quantitative & Mathematical Models](#-quantitative--mathematical-models)

  * [Price Dynamics (Geometric Brownian Motion)](#1-price-dynamics-geometric-brownian-motion)

  * [20-Period Donchian Channels](#2-20-period-donchian-channels)

  * [Moving Average Convergence Divergence (MACD)](#3-moving-average-convergence-divergence-macd)

* [Trading Mechanics](#-trading-mechanics)

  * [Long Positions](#long-positions)

  * [Short Selling & Margin Requirements](#short-selling--margin-requirements)

  * [Trader Rank Progression](#trader-rank-progression)

* [API Reference](#-api-reference)

  * [Server-Sent Events (SSE)](#server-sent-events-sse)

  * [REST Endpoints](#rest-endpoints)

* [Project Architecture](#-project-architecture)

* [License](#-license)

## ⚡ Key Features

* **Zero-Dependency Node.js Backend**: Built strictly using Node.js core modules (`http`, `url`, `crypto`). No `npm install` or third-party packages required.

* **Full-Duplex Architecture**: Real-time tick data and news broadcasts streamed via **Server-Sent Events (SSE)**, with low-latency REST endpoints handling trade dispatch and execution.

* **Custom HTML5 Canvas Engine**:

  * Switch between high-resolution glowing Area Line charts and Japanese Candlesticks.

  * Interactive crosshairs and hovering value inspection tooltips.

  * Sub-second volume histogram overlay.

  * Real-time indicator overlays with zero third-party charting libraries.

* **Advanced Technical Indicators**:

  * **15-Period SMA** (Simple Moving Average).

  * **20-Period Donchian Channels** (Upper Resistance, Lower Support, and Median Baseline).

  * **MACD Oscillator Sub-panel** (12-EMA, 26-EMA, MACD Line, 9-EMA Signal Line, and zero-centered Histogram bars).

* **Comprehensive Order Desk**:

  * Buy (Long), Sell (Close Long), Short (Borrow on 50% margin), and Cover (Close Short).

  * Percentage-based sizing buttons (25%, 50%, 75%, MAX).

  * Instant portfolio-wide liquidation button.

* **Synthesized Web Audio API FX**: Interactive auditory feedback for order execution and catalyst alerts generated procedurally in the browser.

## 🚀 Quick Start

### Prerequisites

* [Node.js](https://nodejs.org/) version 16.0 or higher.

### Running the Application

1. Clone or download `server.js` into your project directory.

2. Launch the server directly:

```
node server.js

```

3. Open your browser and navigate to:

```
http://localhost:3000

```

## 🏢 Asset Directory

The simulated exchange features six assets across divergent market sectors, each configured with unique volatility ($\sigma$), drift ($\mu$), and market beta ($\beta$):

| Ticker | Company / Asset | Sector | Base Price | Beta ($\beta$) | Volatility Profile | 
| ----- | ----- | ----- | ----- | ----- | ----- | 
| **`NVTX`** | NovaTech AI | Tech & Semiconductors | \$142.50 | 2.2 | High beta; explosive rallies and sharp corrections. | 
| **`GLDC`** | Goldcorp Trust | Commodities & Precious Metals | \$1,850.00 | 0.5 | Defensive safe haven asset; low daily volatility. | 
| **`PHRM`** | BioNova Labs | Biotechnology | \$48.20 | 1.8 | Catalyst-driven swings from clinical trials and FDA alerts. | 
| **`MEME`** | RocketMoon Corp | Consumer & Retail | \$18.75 | 3.5 | Extreme volatility driven by social sentiment and short squeezes. | 
| **`CYBR`** | Aegis Cyber | Cloud Security & Defense | \$215.40 | 0.9 | Steady institutional compounder with moderate swings. | 
| **`COIN`** | Satoshi Ledger | Digital Assets & Crypto | \$64.80 | 2.8 | Highly responsive to liquidity news and speculative volume. | 

## 📐 Quantitative & Mathematical Models

### 1. Price Dynamics (Geometric Brownian Motion)

Prices evolve every tick using a discretized Geometric Brownian Motion (GBM) model with an exponential catalyst decay factor:

$$
S_{t+\Delta t} = S_t \times (1 + \mu \Delta t + \sigma Z \sqrt{\Delta t} + C_t)
$$

Where:

* $S_t$: Stock price at time $t$

* $\mu$: Asset drift parameter

* $\sigma$: Base asset volatility

* $Z$: Standard normal random variable generated via the Box-Muller transform:
  

  $$
  Z = \sqrt{-2 \ln(u_1)} \cos(2\pi u_2), \quad u_1, u_2 \sim U(0, 1)
  $$

* $C_t$: Breaking news catalyst shock, decaying geometrically each tick:
  

  $$
  C_{t+1} = C_t \times 0.93
  $$

### 2. 20-Period Donchian Channels

Donchian Channels identify market breakouts, relative volatility, and range boundaries across a 20-period lookback window:

* **Upper Channel (Resistance)**:
  

  $$
  \text{UC}_t = \max(P_t, P_{t-1}, \dots, P_{t-19})
  $$

* **Lower Channel (Support)**:
  

  $$
  \text{LC}_t = \min(P_t, P_{t-1}, \dots, P_{t-19})
  $$

* **Middle Channel (Median Trend Line)**:
  

  $$
  \text{MC}_t = \frac{\text{UC}_t + \text{LC}_t}{2}
  $$

### 3. Moving Average Convergence Divergence (MACD)

The MACD tracks momentum and trend divergence using Exponential Moving Averages (EMA):

1. **Multiplier Formulation**:
   

   $$
   k = \frac{2}{N + 1}
   $$

   * For $N = 12$ (Fast): $k_{12} \approx 0.1538$

   * For $N = 26$ (Slow): $k_{26} \approx 0.0741$

   * For $N = 9$ (Signal): $k_9 = 0.2000$

2. **EMA Calculation**:
   

   $$
   \text{EMA}_t = (P_t \times k) + (\text{EMA}_{t-1} \times (1 - k))
   $$

3. **MACD Line**:
   

   $$
   \text{MACD Line}_t = \text{EMA}_{12}(P)_t - \text{EMA}_{26}(P)_t
   $$

4. **Signal Line**:
   

   $$
   \text{Signal Line}_t = \text{EMA}_9(\text{MACD Line})_t
   $$

5. **MACD Histogram**:
   

   $$
   \text{Histogram}_t = \text{MACD Line}_t - \text{Signal Line}_t
   $$

## 💼 Trading Mechanics

Traders start with **\$25,000.00** in seed capital.

### Long Positions

* **BUY**: Purchases shares using available cash. Reduces cash by $\text{Shares} \times P$.

* **SELL**: Sells owned shares at market price. Realized profit or loss ($(\text{Sale Price} - \text{Average Cost}) \times \text{Shares}$) is permanently credited to the cash balance.

### Short Selling & Margin Requirements

* **SHORT**: Borrows shares to sell immediately at market price, expecting the price to drop.

  * **Margin Collateral Requirement**: The trader must maintain at least **50% of the total order value** in liquid cash:
    

    $$
    \text{Cash Balance} \ge 0.50 \times (\text{Shares} \times P)
    $$

* **COVER**: Repurchases the borrowed shares to close out the short position.

  * Realized profit is calculated inversely:
    

    $$
    \text{PnL} = (\text{Borrow Price} - \text{Repurchase Price}) \times \text{Shares}
    $$

### Trader Rank Progression

As your total net worth ($\text{Cash} + \text{Invested Value}$) compounds, your trading status updates automatically:

| Rank Tier | Capital Requirement | Status | 
| ----- | ----- | ----- | 
| **Retail Amateur** | Starting Capital (\$25,000) | Default tier | 
| **Pattern Day Trader** | \$50,000 | Unlocked margin capabilities | 
| **Senior Quantitative Trader** | \$100,000 | Advanced algorithmic momentum | 
| **Prop Desk Director** | \$250,000 | Institutional tier | 
| **Hedge Fund Partner** | \$500,000 | Elite liquidity provider | 
| **Wall Street Titan** | \$1,000,000+ | Legendary status | 

## 🔌 API Reference

### Server-Sent Events (SSE)

#### `GET /api/stream`

Establishes a continuous, persistent text/event-stream connection.

**Events Broadcasted:**

* `init`: Full market snapshot sent upon initial connection.

* `tick`: Sub-second market snapshot containing price updates, clock data, and candlestick records.

* `news_event`: Emitted when breaking news shifts asset sentiment.

* `market_event`: Emitted at daily close (`16:00`) for day rolls.

### REST Endpoints

#### `POST /api/trade`

Submits an execution order.

**Request Payload:**

```
{
  "action": "BUY",
  "symbol": "NVTX",
  "qty": 25
}

```

*Valid `action` values: `BUY`, `SELL`, `SHORT`, `COVER`.*

**Response (200 OK):**

```
{
  "success": true,
  "message": "Bought 25 shares of NVTX at $142.50",
  "portfolio": { ... }
}

```

#### `GET /api/portfolio`

Returns current financial metrics, open positions, drawdown, and transaction logs.

**Response (200 OK):**

```
{
  "cash": 21437.50,
  "investedValue": 3562.50,
  "netWorth": 25000.00,
  "unrealizedPnL": 0.00,
  "returnPercent": 0.00,
  "peakNetWorth": 25000.00,
  "maxDrawdown": "0.0",
  "tradeCount": 1,
  "winRate": "100.0",
  "positions": [
    {
      "symbol": "NVTX",
      "type": "LONG",
      "shares": 25,
      "avgPrice": 142.50,
      "totalCost": 3562.50,
      "currentPrice": 142.50,
      "unrealizedPnL": 0.00
    }
  ],
  "transactions": [ ... ]
}

```

#### `GET /api/news`

Fetches the active historical ledger of recent news catalysts.

#### `POST /api/speed`

Adjusts the simulation clock rate.

**Request Payload:**

```
{ "speed": 2 }

```

*Valid `speed` values: `0` (pause), `1` (1x), `2` (2x), `5` (5x).*

#### `POST /api/liquidate`

Market-sells all active long positions and covers all open short positions immediately.

#### `POST /api/reset`

Restores seed capital to \$25,000.00 and clears all positions, history, and news.

## 🏗️ Project Architecture

```
.
└── server.js
    ├── MarketEngine          # Geometric Brownian Motion, candle aggregation, and clock loop
    ├── PortfolioLedger       # Margin checks, order validation, PnL accounting
    ├── HTTP Server Router    # SSE stream handler + REST endpoint controllers
    └── getTradingClientHtml  # Embedded single-page application (Tailwind + Canvas UI)

```

The entire system is intentionally packaged as an independent, single-file deployment. The frontend client is served directly from the root route (`/`) and establishes a persistent SSE connection back to the host instance.

## 📄 License

This project is licensed under the MIT License. Feel free to modify, extend, and deploy for educational and personal use.