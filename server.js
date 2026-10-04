const http = require('http');
const url = require('url');
const crypto = require('crypto');

const PORT = process.env.PORT || 3000;

const STOCK_CONFIGS = [
    {
        symbol: 'NVTX',
        name: 'NovaTech AI',
        sector: 'Tech & Semiconductors',
        price: 142.50,
        baseVol: 0.022,
        drift: 0.0004,
        beta: 2.2,
        color: '#38bdf8'
    },
    {
        symbol: 'GLDC',
        name: 'Goldcorp Trust',
        sector: 'Commodities & Metals',
        price: 1850.00,
        baseVol: 0.007,
        drift: 0.0001,
        beta: 0.5,
        color: '#fbbf24'
    },
    {
        symbol: 'PHRM',
        name: 'BioNova Labs',
        sector: 'Biotechnology',
        price: 48.20,
        baseVol: 0.035,
        drift: 0.0002,
        beta: 1.8,
        color: '#c084fc'
    },
    {
        symbol: 'MEME',
        name: 'RocketMoon Corp',
        sector: 'Consumer & Retail',
        price: 18.75,
        baseVol: 0.045,
        drift: -0.0001,
        beta: 3.5,
        color: '#f472b6'
    },
    {
        symbol: 'CYBR',
        name: 'Aegis Cyber',
        sector: 'Cloud & Defense',
        price: 215.40,
        baseVol: 0.012,
        drift: 0.0003,
        beta: 0.9,
        color: '#60a5fa'
    },
    {
        symbol: 'COIN',
        name: 'Satoshi Ledger',
        sector: 'Crypto Assets',
        price: 64.80,
        baseVol: 0.038,
        drift: 0.0005,
        beta: 2.8,
        color: '#f59e0b'
    }
];

const NEWS_HEADLINES = [
    { text: "Federal Reserve hints at interest rate cuts; liquidity flooding into markets.", symbol: "ALL", sentiment: 0.04 },
    { text: "Inflation data runs hotter than forecasted; Treasury yields spike.", symbol: "ALL", sentiment: -0.035 },
    { text: "NVTX announces breakthrough 2nm Quantum Neural Processing Chip!", symbol: "NVTX", sentiment: 0.09 },
    { text: "NVTX hit with temporary export restriction in European territories.", symbol: "NVTX", sentiment: -0.07 },
    { text: "GLDC rallies to fresh all-time highs amid safe-haven global hedging.", symbol: "GLDC", sentiment: 0.05 },
    { text: "GLDC reserves audit reveals surprise supply surplus.", symbol: "GLDC", sentiment: -0.04 },
    { text: "BioNova (PHRM) Phase 3 Oncology trial receives FDA Accelerated Approval!", symbol: "PHRM", sentiment: 0.15 },
    { text: "BioNova (PHRM) secondary trial misses efficacy endpoint.", symbol: "PHRM", sentiment: -0.12 },
    { text: "WallStreetBets Reddit army rallies behind RocketMoon (MEME) short squeeze!", symbol: "MEME", sentiment: 0.18 },
    { text: "RocketMoon (MEME) files surprise $200M equity dilution offering.", symbol: "MEME", sentiment: -0.14 },
    { text: "Aegis Cyber (CYBR) wins multi-billion dollar Pentagon cloud security contract.", symbol: "CYBR", sentiment: 0.07 },
    { text: "Aegis Cyber (CYBR) detects sophisticated zero-day intrusion internally.", symbol: "CYBR", sentiment: -0.06 },
    { text: "Satoshi Ledger (COIN) hits record decentralized trading volume.", symbol: "COIN", sentiment: 0.11 },
    { text: "Global financial watchdog probes crypto reserves at Satoshi Ledger (COIN).", symbol: "COIN", sentiment: -0.09 }
];

class MarketEngine {
    constructor() {
        this.simSpeed = 1; // 0 = pause, 1 = 1x, 2 = 2x, 5 = 5x
        this.dayCount = 1;
        this.hour = 9;
        this.minute = 30;
        this.stocks = {};
        this.newsStream = [];
        this.sseClients = new Set();
        this.initStocks();
        this.initNews();
        this.startLoop();
    }

    initStocks() {
        STOCK_CONFIGS.forEach(cfg => {
            const history = [];
            const candles = [];
            let p = cfg.price;
            const startTime = Date.now() - 60 * 1000 * 60;

            for (let i = 0; i < 60; i++) {
                const open = p;
                const change = (Math.random() - 0.49) * cfg.baseVol * p;
                const close = Math.max(0.50, open + change);
                const high = Math.max(open, close) + Math.random() * (cfg.baseVol * p * 0.5);
                const low = Math.min(open, close) - Math.random() * (cfg.baseVol * p * 0.5);
                const volume = Math.floor(Math.random() * 8000 + 2000);
                const time = new Date(startTime + i * 15000).toISOString();

                history.push({ price: close, time });
                candles.push({ open, high, low, close, volume, time });
                p = close;
            }

            this.stocks[cfg.symbol] = {
                ...cfg,
                currentPrice: p,
                openPrice: history[0].price,
                dayHigh: Math.max(...candles.map(c => c.high)),
                dayLow: Math.min(...candles.map(c => c.low)),
                history: history,
                candles: candles,
                currentCandle: {
                    open: p,
                    high: p,
                    low: p,
                    close: p,
                    volume: 0,
                    ticks: 0
                },
                sentimentBias: 0
            };
        });
    }

    initNews() {
        this.newsStream = [
            { time: "09:30 AM", text: "Opening bell rings on Wall Street. Liquidity steady across all major sectors.", symbol: "ALL", sentiment: "bull" },
            { time: "09:28 AM", text: "High-beta quantum computing and semiconductor futures lead early volume.", symbol: "NVTX", sentiment: "bull" }
        ];
    }

    advanceClock() {
        if (this.simSpeed === 0) return;

        this.minute += this.simSpeed;
        if (this.minute >= 60) {
            this.hour += Math.floor(this.minute / 60);
            this.minute = this.minute % 60;
        }

        if (this.hour >= 16) {
            this.dayCount++;
            this.hour = 9;
            this.minute = 30;

            Object.values(this.stocks).forEach(stock => {
                stock.openPrice = stock.currentPrice;
                stock.dayHigh = stock.currentPrice;
                stock.dayLow = stock.currentPrice;
            });

            this.broadcast('market_event', {
                type: 'DAY_ROLL',
                message: `Market closed. Welcome to Day ${this.dayCount}!`
            });
        }
    }

    tick() {
        if (this.simSpeed === 0) return;

        this.advanceClock();

        // Random catalyst trigger
        if (Math.random() < 0.03 * this.simSpeed) {
            this.triggerNewsEvent();
        }

        Object.values(this.stocks).forEach(stock => {
            // Box-Muller Gaussian shock
            const u1 = Math.max(1e-6, Math.random());
            const u2 = Math.random();
            const z = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);

            const shock = z * stock.baseVol;
            const catalyst = stock.sentimentBias;
            stock.sentimentBias *= 0.93; // Exponential catalyst decay

            const returnPct = stock.drift + shock + catalyst;
            const nextPrice = Math.max(0.10, stock.currentPrice * (1 + returnPct));

            stock.currentPrice = nextPrice;
            if (nextPrice > stock.dayHigh) stock.dayHigh = nextPrice;
            if (nextPrice < stock.dayLow) stock.dayLow = nextPrice;

            // Aggregate candlestick data
            const cc = stock.currentCandle;
            cc.close = nextPrice;
            if (nextPrice > cc.high) cc.high = nextPrice;
            if (nextPrice < cc.low) cc.low = nextPrice;
            cc.volume += Math.floor(Math.random() * 500 + 40);
            cc.ticks++;

            const nowIso = new Date().toISOString();
            stock.history.push({ price: nextPrice, time: nowIso });
            if (stock.history.length > 90) stock.history.shift();

            if (cc.ticks >= 8) {
                stock.candles.push({ ...cc, time: nowIso });
                if (stock.candles.length > 50) stock.candles.shift();
                stock.currentCandle = {
                    open: nextPrice,
                    high: nextPrice,
                    low: nextPrice,
                    close: nextPrice,
                    volume: 0,
                    ticks: 0
                };
            }
        });

        this.broadcastMarketSnapshot();
    }

    triggerNewsEvent() {
        const item = NEWS_HEADLINES[Math.floor(Math.random() * NEWS_HEADLINES.length)];
        const sentimentType = item.sentiment > 0 ? 'bull' : 'bear';

        if (item.symbol === 'ALL') {
            Object.values(this.stocks).forEach(s => {
                s.sentimentBias += item.sentiment * (s.beta * 0.75);
            });
        } else if (this.stocks[item.symbol]) {
            this.stocks[item.symbol].sentimentBias += item.sentiment;
        }

        const ampm = this.hour >= 12 ? 'PM' : 'AM';
        const displayH = this.hour > 12 ? this.hour - 12 : this.hour;
        const timeStr = `${displayH}:${this.minute < 10 ? '0' + this.minute : this.minute} ${ampm}`;

        const newsPayload = {
            id: crypto.randomUUID(),
            time: timeStr,
            text: item.text,
            symbol: item.symbol,
            sentiment: sentimentType
        };

        this.newsStream.unshift(newsPayload);
        if (this.newsStream.length > 30) this.newsStream.pop();

        this.broadcast('news_event', newsPayload);
    }

    broadcastMarketSnapshot() {
        const ampm = this.hour >= 12 ? 'PM' : 'AM';
        const displayH = this.hour > 12 ? this.hour - 12 : this.hour;
        const padM = this.minute < 10 ? '0' + this.minute : this.minute;

        const snapshot = {
            clock: {
                day: this.dayCount,
                timeStr: `Day ${this.dayCount} • ${displayH}:${padM} ${ampm}`,
                speed: this.simSpeed
            },
            stocks: Object.values(this.stocks).map(s => ({
                symbol: s.symbol,
                name: s.name,
                sector: s.sector,
                price: s.currentPrice,
                openPrice: s.openPrice,
                dayHigh: s.dayHigh,
                dayLow: s.dayLow,
                beta: s.beta,
                color: s.color,
                candles: s.candles,
                history: s.history.slice(-60)
            }))
        };

        this.broadcast('tick', snapshot);
    }

    broadcast(eventType, data) {
        const payload = `event: ${eventType}\ndata: ${JSON.stringify(data)}\n\n`;
        for (const res of this.sseClients) {
            try {
                res.write(payload);
            } catch (err) {
                this.sseClients.delete(res);
            }
        }
    }

    startLoop() {
        setInterval(() => this.tick(), 1000);
    }
}

class PortfolioLedger {
    constructor(initialCash = 25000) {
        this.initialCash = initialCash;
        this.reset();
    }

    reset() {
        this.cash = this.initialCash;
        this.peakNetWorth = this.initialCash;
        this.maxDrawdown = 0;
        this.positions = {}; // { symbol: { symbol, type, shares, avgPrice, totalCost } }
        this.transactions = [];
        this.wins = 0;
        this.losses = 0;
        this.tradeCount = 0;
    }

    executeOrder(action, symbol, qty, currentPrice) {
        if (!symbol || !qty || qty <= 0 || !currentPrice || currentPrice <= 0) {
            return { success: false, message: 'Invalid order parameters.' };
        }

        const orderCost = qty * currentPrice;
        const existingPos = this.positions[symbol];

        if (action === 'BUY') {
            if (orderCost > this.cash) {
                return { success: false, message: `Insufficient buying power! Requires $${orderCost.toFixed(2)}.` };
            }

            if (existingPos && existingPos.type === 'SHORT') {
                return { success: false, message: 'You hold a SHORT position. Cover your short first.' };
            }

            this.cash -= orderCost;

            if (existingPos && existingPos.type === 'LONG') {
                const totalShares = existingPos.shares + qty;
                const totalCost = existingPos.totalCost + orderCost;
                existingPos.shares = totalShares;
                existingPos.totalCost = totalCost;
                existingPos.avgPrice = totalCost / totalShares;
            } else {
                this.positions[symbol] = {
                    symbol,
                    type: 'LONG',
                    shares: qty,
                    avgPrice: currentPrice,
                    totalCost: orderCost
                };
            }

            this.logTrade('BUY', symbol, qty, currentPrice, orderCost);
            return { success: true, message: `Bought ${qty} shares of ${symbol} at $${currentPrice.toFixed(2)}` };
        }

        if (action === 'SELL') {
            if (!existingPos || existingPos.type !== 'LONG') {
                return { success: false, message: `No active LONG position in ${symbol} to sell.` };
            }

            const sharesToSell = Math.min(qty, existingPos.shares);
            const proceeds = sharesToSell * currentPrice;
            const costBasis = sharesToSell * existingPos.avgPrice;
            const profit = proceeds - costBasis;

            this.cash += proceeds;
            existingPos.shares -= sharesToSell;
            existingPos.totalCost -= costBasis;

            if (profit >= 0) this.wins++; else this.losses++;
            this.tradeCount++;

            this.logTrade('SELL', symbol, sharesToSell, currentPrice, proceeds, profit);

            if (existingPos.shares <= 0) {
                delete this.positions[symbol];
            }

            return { success: true, message: `Sold ${sharesToSell} ${symbol} shares. Realized P&L: $${profit.toFixed(2)}` };
        }

        if (action === 'SHORT') {
            const marginRequired = orderCost * 0.50; // 50% margin collateral requirement
            if (this.cash < marginRequired) {
                return { success: false, message: `Margin requirement check failed. Need $${marginRequired.toFixed(2)} cash collateral.` };
            }

            if (existingPos && existingPos.type === 'LONG') {
                return { success: false, message: 'Close your existing LONG position before opening a SHORT.' };
            }

            if (existingPos && existingPos.type === 'SHORT') {
                const totalShares = existingPos.shares + qty;
                const totalCost = existingPos.totalCost + orderCost;
                existingPos.shares = totalShares;
                existingPos.totalCost = totalCost;
                existingPos.avgPrice = totalCost / totalShares;
            } else {
                this.positions[symbol] = {
                    symbol,
                    type: 'SHORT',
                    shares: qty,
                    avgPrice: currentPrice,
                    totalCost: orderCost
                };
            }

            this.logTrade('SHORT', symbol, qty, currentPrice, orderCost);
            return { success: true, message: `Short-sold ${qty} shares of ${symbol} at $${currentPrice.toFixed(2)}` };
        }

        if (action === 'COVER') {
            if (!existingPos || existingPos.type !== 'SHORT') {
                return { success: false, message: `No active SHORT position in ${symbol} to cover.` };
            }

            const sharesToCover = Math.min(qty, existingPos.shares);
            const repurchaseCost = sharesToCover * currentPrice;
            const originalBorrowedProceeds = sharesToCover * existingPos.avgPrice;
            const profit = originalBorrowedProceeds - repurchaseCost;

            if (this.cash + originalBorrowedProceeds < repurchaseCost) {
                return { success: false, message: 'Margin deficit: Insufficient cash balance to cover position buyback.' };
            }

            this.cash += profit;
            existingPos.shares -= sharesToCover;
            existingPos.totalCost -= originalBorrowedProceeds;

            if (profit >= 0) this.wins++; else this.losses++;
            this.tradeCount++;

            this.logTrade('COVER', symbol, sharesToCover, currentPrice, repurchaseCost, profit);

            if (existingPos.shares <= 0) {
                delete this.positions[symbol];
            }

            return { success: true, message: `Covered ${sharesToCover} short shares of ${symbol}. Realized P&L: $${profit.toFixed(2)}` };
        }

        return { success: false, message: `Unknown order action: ${action}` };
    }

    logTrade(type, symbol, qty, price, total, pnl = null) {
        this.transactions.unshift({
            id: crypto.randomUUID(),
            type,
            symbol,
            qty,
            price,
            total,
            pnl,
            timestamp: new Date().toLocaleTimeString()
        });
        if (this.transactions.length > 40) this.transactions.pop();
    }

    getSummary(stocksMap) {
        let investedValue = 0;
        let unrealizedPnL = 0;

        const positionsList = Object.values(this.positions).map(pos => {
            const stock = stocksMap[pos.symbol];
            const currPrice = stock ? stock.currentPrice : pos.avgPrice;
            let curVal = 0;
            let pnl = 0;

            if (pos.type === 'LONG') {
                curVal = pos.shares * currPrice;
                pnl = curVal - pos.totalCost;
                investedValue += curVal;
            } else {
                const repurchaseVal = pos.shares * currPrice;
                pnl = pos.totalCost - repurchaseVal;
                curVal = pos.totalCost + pnl;
                investedValue += Math.max(0, curVal);
            }

            unrealizedPnL += pnl;

            return {
                ...pos,
                currentPrice: currPrice,
                currentValue: curVal,
                unrealizedPnL: pnl,
                pnlPercent: (pnl / pos.totalCost) * 100
            };
        });

        const netWorth = this.cash + investedValue;
        if (netWorth > this.peakNetWorth) this.peakNetWorth = netWorth;

        const drawdown = ((this.peakNetWorth - netWorth) / this.peakNetWorth) * 100;
        if (drawdown > this.maxDrawdown) this.maxDrawdown = drawdown;

        const totalTrades = this.wins + this.losses;
        const winRate = totalTrades > 0 ? ((this.wins / totalTrades) * 100).toFixed(1) : "0.0";

        return {
            cash: this.cash,
            investedValue,
            netWorth,
            unrealizedPnL,
            returnPercent: ((netWorth - this.initialCash) / this.initialCash) * 100,
            peakNetWorth: this.peakNetWorth,
            maxDrawdown: this.maxDrawdown.toFixed(1),
            tradeCount: this.tradeCount,
            winRate,
            positions: positionsList,
            transactions: this.transactions
        };
    }
}

const market = new MarketEngine();
const ledger = new PortfolioLedger(25000);

function parseJsonBody(req) {
    return new Promise((resolve, reject) => {
        let body = '';
        req.on('data', chunk => {
            body += chunk.toString();
            if (body.length > 1e6) {
                req.destroy();
                reject(new Error('Payload too large'));
            }
        });
        req.on('end', () => {
            if (!body) return resolve({});
            try {
                resolve(JSON.parse(body));
            } catch (err) {
                reject(new Error('Invalid JSON format'));
            }
        });
    });
}

const server = http.createServer(async (req, res) => {
    const parsedUrl = url.parse(req.url, true);
    const pathname = parsedUrl.pathname;

    // CORS & Common Headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
    }

    if (pathname === '/api/stream' && req.method === 'GET') {
        res.writeHead(200, {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive'
        });
        res.write('retry: 2000\n\n');

        market.sseClients.add(res);

        // Immediate snapshot push
        const snapshot = {
            clock: {
                day: market.dayCount,
                timeStr: `Day ${market.dayCount} • ${market.hour > 12 ? market.hour - 12 : market.hour}:${market.minute < 10 ? '0' + market.minute : market.minute} ${market.hour >= 12 ? 'PM' : 'AM'}`,
                speed: market.simSpeed
            },
            stocks: Object.values(market.stocks)
        };
        res.write(`event: init\ndata: ${JSON.stringify(snapshot)}\n\n`);

        req.on('close', () => {
            market.sseClients.delete(res);
        });
        return;
    }

    if (pathname === '/api/portfolio' && req.method === 'GET') {
        const summary = ledger.getSummary(market.stocks);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(summary));
        return;
    }

    if (pathname === '/api/news' && req.method === 'GET') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(market.newsStream));
        return;
    }

    if (pathname === '/api/trade' && req.method === 'POST') {
        try {
            const body = await parseJsonBody(req);
            const { action, symbol, qty } = body;
            const stock = market.stocks[symbol];

            if (!stock) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: false, message: `Stock symbol ${symbol} not found.` }));
                return;
            }

            const result = ledger.executeOrder(action, symbol, parseInt(qty, 10), stock.currentPrice);
            const status = result.success ? 200 : 400;

            res.writeHead(status, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ ...result, portfolio: ledger.getSummary(market.stocks) }));
        } catch (err) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: false, message: err.message }));
        }
        return;
    }

    if (pathname === '/api/speed' && req.method === 'POST') {
        try {
            const body = await parseJsonBody(req);
            const speed = parseInt(body.speed, 10);
            if ([0, 1, 2, 5].includes(speed)) {
                market.simSpeed = speed;
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: true, speed: market.simSpeed }));
            } else {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: false, message: 'Invalid speed factor (0, 1, 2, 5).' }));
            }
        } catch (err) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: false, message: err.message }));
        }
        return;
    }

    if (pathname === '/api/liquidate' && req.method === 'POST') {
        const posKeys = Object.keys(ledger.positions);
        posKeys.forEach(sym => {
            const pos = ledger.positions[sym];
            const stock = market.stocks[sym];
            if (pos && stock) {
                if (pos.type === 'LONG') {
                    ledger.executeOrder('SELL', sym, pos.shares, stock.currentPrice);
                } else {
                    ledger.executeOrder('COVER', sym, pos.shares, stock.currentPrice);
                }
            }
        });

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, message: 'Liquidated all positions.', portfolio: ledger.getSummary(market.stocks) }));
        return;
    }

    if (pathname === '/api/reset' && req.method === 'POST') {
        ledger.reset();
        market.initStocks();
        market.initNews();
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, message: 'Game reset to $25,000 initial capital.' }));
        return;
    }

    if (pathname === '/' || pathname === '/index.html') {
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(getTradingClientHtml());
        return;
    }

    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('404 Not Found');
});

server.listen(PORT, () => {
    console.log(`=======================================================`);
    console.log(`🚀 QUANT TRADER PRO - Node.js Financial Simulation`);
    console.log(`📡 Server active at: http://localhost:${PORT}`);
    console.log(`⚡ Live SSE Feed & REST API initialized.`);
    console.log(`=======================================================`);
});

function getTradingClientHtml() {
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>QuantTrader Pro - Node.js Trading Game</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700&family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
    <script>
        tailwind.config = {
            darkMode: 'class',
            theme: {
                extend: {
                    fontFamily: {
                        sans: ['Inter', 'sans-serif'],
                        mono: ['JetBrains Mono', 'monospace'],
                    },
                    colors: {
                        bull: '#10b981',
                        bear: '#ef4444',
                        terminal: {
                            base: '#090d16',
                            card: '#0f172a',
                            border: '#1e293b',
                            accent: '#38bdf8'
                        }
                    }
                }
            }
        }
    </script>
    <style>
        body { background-color: #090d16; color: #f1f5f9; font-family: 'Inter', sans-serif; }
        .ticker-tape { animation: scrollTape 35s linear infinite; }
        @keyframes scrollTape { 0% { transform: translateX(0%); } 100% { transform: translateX(-50%); } }
        ::-webkit-scrollbar { width: 6px; height: 6px; }
        ::-webkit-scrollbar-track { background: #090d16; }
        ::-webkit-scrollbar-thumb { background: #1e293b; border-radius: 3px; }
    </style>
</head>
<body class="min-h-screen flex flex-col justify-between selection:bg-terminal-accent selection:text-black">

    <header class="border-b border-terminal-border bg-terminal-base sticky top-0 z-40">
        <div class="px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 border-b border-terminal-border/50 text-xs text-slate-400">
            <div class="flex items-center space-x-3">
                <div class="flex items-center space-x-1.5 font-bold tracking-wider text-terminal-accent text-sm">
                    <svg class="w-5 h-5 text-emerald-400 inline-block animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                    </svg>
                    <span class="text-white">QUANT<span class="text-terminal-accent">TRADER</span> PRO</span>
                    <span class="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">NODE.JS BACKEND</span>
                </div>
                <span class="hidden md:inline text-slate-600">|</span>
                <div class="hidden sm:flex items-center space-x-2">
                    <span id="backend-status-dot" class="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
                    <span id="backend-status-text" class="text-emerald-400 font-mono font-medium">LIVE STREAM</span>
                    <span id="market-clock" class="font-mono text-slate-300 ml-1">Day 1 • 09:30 AM</span>
                </div>
            </div>

            <div class="flex items-center space-x-2 sm:space-x-4">
                <div class="flex items-center bg-slate-800/80 rounded-lg p-0.5 border border-slate-700">
                    <button id="speed-pause" class="px-2 py-1 text-[11px] rounded font-mono text-slate-300 hover:text-white transition">⏸</button>
                    <button id="speed-1x" class="px-2 py-1 text-[11px] rounded font-mono bg-terminal-accent text-black font-bold transition">1x</button>
                    <button id="speed-2x" class="px-2 py-1 text-[11px] rounded font-mono text-slate-300 hover:text-white transition">2x</button>
                    <button id="speed-5x" class="px-2 py-1 text-[11px] rounded font-mono text-slate-300 hover:text-white transition">5x</button>
                </div>
                <button id="sound-btn" class="p-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 hover:text-white text-xs flex items-center gap-1">
                    <span id="sound-icon">🔊</span>
                </button>
                <button id="reset-game-btn" class="px-2.5 py-1 rounded-lg bg-rose-950/60 hover:bg-rose-900 border border-rose-800/60 text-rose-300 text-xs font-medium transition">
                    Restart
                </button>
            </div>
        </div>

        <div class="overflow-hidden whitespace-nowrap bg-black/40 border-b border-terminal-border py-1.5 text-xs font-mono relative">
            <div id="ticker-marquee" class="ticker-tape inline-block"></div>
        </div>
    </header>

    <main class="flex-1 max-w-[1680px] w-full mx-auto p-2 sm:p-4 grid grid-cols-1 lg:grid-cols-12 gap-3 sm:gap-4">
        
        <!-- Left Column: Balance & Watchlist (3 cols) -->
        <section class="lg:col-span-3 flex flex-col gap-3 sm:gap-4 order-2 lg:order-1">
            <div class="bg-terminal-card border border-terminal-border rounded-xl p-3 sm:p-4 shadow-xl">
                <div class="text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">Total Net Worth</div>
                <div class="flex items-baseline justify-between mb-2">
                    <div id="account-networth" class="text-2xl sm:text-3xl font-bold font-mono text-white tracking-tight">$25,000.00</div>
                    <div id="account-roi" class="text-xs font-mono font-semibold px-2 py-0.5 rounded bg-slate-800 text-slate-300">+0.00%</div>
                </div>

                <div class="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800/80 text-xs">
                    <div>
                        <span class="text-slate-400 block text-[11px]">Available Cash</span>
                        <span id="account-cash" class="font-mono font-semibold text-slate-200 text-sm">$25,000.00</span>
                    </div>
                    <div>
                        <span class="text-slate-400 block text-[11px]">Invested Value</span>
                        <span id="account-invested" class="font-mono font-semibold text-slate-200 text-sm">$0.00</span>
                    </div>
                    <div>
                        <span class="text-slate-400 block text-[11px]">Unrealized P&L</span>
                        <span id="account-daypl" class="font-mono font-semibold text-slate-300 text-sm">$0.00</span>
                    </div>
                    <div>
                        <span class="text-slate-400 block text-[11px]">Max Drawdown</span>
                        <span id="account-drawdown" class="font-mono font-semibold text-rose-400 text-sm">0.0%</span>
                    </div>
                </div>
            </div>

            <div class="bg-terminal-card border border-terminal-border rounded-xl flex-1 flex flex-col min-h-[340px] overflow-hidden shadow-xl">
                <div class="px-4 py-3 border-b border-terminal-border flex justify-between items-center bg-slate-900/60">
                    <div class="flex items-center space-x-2">
                        <span class="text-xs font-bold uppercase tracking-wider text-slate-300">Live Watchlist</span>
                        <span class="text-[10px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded">Node SSE</span>
                    </div>
                    <span class="text-[10px] text-slate-500 font-mono">Real-time</span>
                </div>
                <div id="watchlist-container" class="divide-y divide-slate-800/60 overflow-y-auto flex-1 max-h-[380px]"></div>
            </div>

            <div class="bg-terminal-card border border-terminal-border rounded-xl p-3 sm:p-4 shadow-xl flex-1 flex flex-col min-h-[220px]">
                <div class="flex justify-between items-center mb-2.5 pb-2 border-b border-terminal-border">
                    <div class="flex items-center space-x-1.5">
                        <span class="w-2 h-2 rounded-full bg-amber-400"></span>
                        <span class="text-xs font-bold uppercase tracking-wider text-slate-300">News Catalyst Terminal</span>
                    </div>
                    <span class="text-[10px] text-slate-500">Live SSE</span>
                </div>
                <div id="news-stream" class="space-y-2 overflow-y-auto max-h-[200px] text-xs pr-1"></div>
            </div>
        </section>

        <!-- Center Column: Canvas Chart & Trading Desk (6 cols) -->
        <section class="lg:col-span-6 flex flex-col gap-3 sm:gap-4 order-1 lg:order-2">
            <div class="bg-terminal-card border border-terminal-border rounded-xl p-3 sm:p-4 shadow-xl flex flex-col flex-1">
                <div class="flex flex-wrap items-center justify-between gap-2 pb-3 mb-2 border-b border-terminal-border">
                    <div class="flex items-center space-x-3">
                        <div id="selected-badge" class="w-10 h-10 rounded-xl bg-cyan-950/80 border border-cyan-800/80 flex items-center justify-center font-bold font-mono text-cyan-400 text-base">
                            NVTX
                        </div>
                        <div>
                            <div class="flex items-center space-x-2">
                                <h1 id="selected-symbol" class="text-lg font-bold text-white font-mono">NVTX</h1>
                                <span id="selected-name" class="text-xs text-slate-400 font-medium">NovaTech AI</span>
                                <span id="selected-sector" class="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">Semiconductors</span>
                            </div>
                            <div class="flex items-center space-x-3 mt-0.5">
                                <span id="selected-price" class="text-2xl font-bold font-mono text-white">$142.50</span>
                                <span id="selected-change" class="text-xs font-mono font-semibold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400">+0.00%</span>
                            </div>
                        </div>
                    </div>

                    <div class="flex flex-wrap items-center gap-1.5">
                        <div class="bg-slate-800/90 rounded-lg p-0.5 border border-slate-700 flex text-xs font-mono">
                            <button id="chart-mode-line" class="px-2.5 py-1 rounded bg-terminal-accent text-black font-semibold transition">Line</button>
                            <button id="chart-mode-candle" class="px-2.5 py-1 rounded text-slate-300 hover:text-white transition">Candles</button>
                        </div>
                        <div class="bg-slate-800/90 rounded-lg p-0.5 border border-slate-700 flex text-xs font-mono">
                            <button id="indicator-sma" class="px-2 py-1 rounded bg-indigo-600/40 text-indigo-300 border border-indigo-500/50 hover:bg-indigo-600/60 transition text-[11px]">SMA(15)</button>
                            <button id="indicator-dc" class="px-2 py-1 rounded bg-amber-500/30 text-amber-300 border border-amber-500/50 hover:bg-amber-500/50 transition text-[11px]">DC(20)</button>
                            <button id="indicator-macd" class="px-2 py-1 rounded bg-cyan-600/40 text-cyan-300 border border-cyan-500/50 hover:bg-cyan-600/60 transition text-[11px]">MACD(12,26,9)</button>
                            <button id="indicator-vol" class="px-2 py-1 rounded bg-slate-700/50 text-slate-300 hover:text-white transition text-[11px]">VOL</button>
                        </div>
                    </div>
                </div>

                <div class="relative w-full h-[280px] sm:h-[350px] bg-slate-950/70 rounded-lg border border-slate-800/60 overflow-hidden flex-1">
                    <canvas id="stock-chart" class="w-full h-full block"></canvas>
                    <div id="chart-tooltip" class="absolute hidden pointer-events-none bg-slate-900/95 border border-slate-700 rounded-lg p-2 text-[11px] font-mono shadow-2xl z-20 backdrop-blur-md">
                        <div class="text-slate-400" id="tooltip-time">--</div>
                        <div class="text-white font-bold" id="tooltip-price">Price: --</div>
                    </div>
                </div>
            </div>

            <!-- Execution Desk -->
            <div class="bg-terminal-card border border-terminal-border rounded-xl p-3 sm:p-4 shadow-xl">
                <div class="flex items-center justify-between mb-3 pb-2 border-b border-terminal-border">
                    <div class="flex items-center space-x-2">
                        <div class="w-2.5 h-2.5 rounded-full bg-terminal-accent animate-pulse"></div>
                        <span class="text-xs font-bold uppercase tracking-wider text-slate-200">REST Execution Desk</span>
                    </div>
                    <div class="text-xs text-slate-400 font-mono">
                        Available: <span id="trade-avail-cash" class="text-emerald-400 font-semibold">$25,000.00</span>
                    </div>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-12 gap-3 sm:gap-4 items-center">
                    <div class="md:col-span-6 space-y-2">
                        <div class="flex items-center justify-between text-xs text-slate-400">
                            <span>Quantity (Shares)</span>
                            <span id="trade-total-cost" class="font-mono text-slate-300">Total: $0.00</span>
                        </div>
                        <div class="flex items-center space-x-2">
                            <button id="btn-qty-minus" class="w-10 h-10 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-lg border border-slate-700 transition flex items-center justify-center">-</button>
                            <input id="trade-qty-input" type="number" min="1" max="100000" value="10" class="w-full h-10 bg-slate-950 border border-slate-700 rounded-lg text-center font-mono text-lg font-bold text-white focus:outline-none focus:border-terminal-accent">
                            <button id="btn-qty-plus" class="w-10 h-10 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-lg border border-slate-700 transition flex items-center justify-center">+</button>
                        </div>
                        <div class="grid grid-cols-4 gap-1.5 pt-1">
                            <button class="size-btn py-1 rounded bg-slate-800/80 hover:bg-slate-700 border border-slate-700 text-[11px] font-mono text-slate-300 transition" data-percent="0.25">25%</button>
                            <button class="size-btn py-1 rounded bg-slate-800/80 hover:bg-slate-700 border border-slate-700 text-[11px] font-mono text-slate-300 transition" data-percent="0.50">50%</button>
                            <button class="size-btn py-1 rounded bg-slate-800/80 hover:bg-slate-700 border border-slate-700 text-[11px] font-mono text-slate-300 transition" data-percent="0.75">75%</button>
                            <button class="size-btn py-1 rounded bg-slate-800/80 hover:bg-slate-700 border border-slate-700 text-[11px] font-mono text-amber-300 font-bold transition" data-percent="1.0">MAX</button>
                        </div>
                    </div>

                    <div class="md:col-span-6 grid grid-cols-2 gap-2.5">
                        <button id="btn-buy-stock" class="h-14 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-[0.98] border border-emerald-400 text-white font-bold flex flex-col items-center justify-center shadow-lg shadow-emerald-950/40 transition">
                            <span class="text-sm tracking-wide">BUY / LONG</span>
                            <span class="text-[10px] font-mono opacity-80">Profit on rise</span>
                        </button>

                        <button id="btn-sell-stock" class="h-14 rounded-xl bg-rose-600 hover:bg-rose-500 active:scale-[0.98] border border-rose-400 text-white font-bold flex flex-col items-center justify-center shadow-lg shadow-rose-950/40 transition">
                            <span class="text-sm tracking-wide">SELL / CLOSE</span>
                            <span class="text-[10px] font-mono opacity-80">Exit Long</span>
                        </button>

                        <button id="btn-short-stock" class="h-11 rounded-lg bg-purple-950/70 hover:bg-purple-900 border border-purple-700 text-purple-200 text-xs font-semibold flex items-center justify-center space-x-1.5 transition">
                            <span>📉</span>
                            <span>SHORT (Margin)</span>
                        </button>

                        <button id="btn-cover-stock" class="h-11 rounded-lg bg-indigo-950/70 hover:bg-indigo-900 border border-indigo-700 text-indigo-200 text-xs font-semibold flex items-center justify-center space-x-1.5 transition">
                            <span>🛡️</span>
                            <span>COVER SHORT</span>
                        </button>
                    </div>
                </div>
            </div>
        </section>

        <!-- Right Column: Positions & History (3 cols) -->
        <section class="lg:col-span-3 flex flex-col gap-3 sm:gap-4 order-3">
            <div class="bg-terminal-card border border-terminal-border rounded-xl p-3 sm:p-4 shadow-xl flex-1 flex flex-col min-h-[440px]">
                <div class="flex justify-between items-center pb-2.5 mb-2 border-b border-terminal-border">
                    <div class="flex items-center space-x-2">
                        <span class="text-xs font-bold uppercase tracking-wider text-slate-200">Active Positions</span>
                        <span id="pos-count-badge" class="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-800 text-slate-400">0</span>
                    </div>
                    <button id="liquidate-all-btn" class="text-[10px] text-rose-400 hover:text-rose-300 font-mono underline">Close All</button>
                </div>
                <!-- Enlarged positions list container accommodating all active positions -->
                <div id="positions-list" class="space-y-2 overflow-y-auto flex-1 min-h-[380px] max-h-[520px] pr-1"></div>
            </div>

            <div class="bg-terminal-card border border-terminal-border rounded-xl p-3 sm:p-4 shadow-xl flex flex-col h-[200px]">
                <div class="flex justify-between items-center pb-2 mb-2 border-b border-terminal-border">
                    <span class="text-xs font-bold uppercase tracking-wider text-slate-200">Server Execution Log</span>
                    <span class="text-[10px] text-slate-500 font-mono">Node REST</span>
                </div>
                <div id="order-history-list" class="space-y-1.5 overflow-y-auto flex-1 text-xs font-mono pr-1"></div>
            </div>

            <div class="bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950/40 border border-terminal-border rounded-xl p-3.5 shadow-xl">
                <div class="flex items-center justify-between mb-2">
                    <div class="flex items-center space-x-2">
                        <span class="text-base" id="rank-icon">🥉</span>
                        <div>
                            <div class="text-[10px] uppercase tracking-wider text-slate-400">Current Rank</div>
                            <div id="trader-rank" class="text-xs font-bold text-white">Retail Amateur</div>
                        </div>
                    </div>
                    <div class="text-right">
                        <div class="text-[10px] text-slate-400">Next Target</div>
                        <div id="rank-target" class="text-xs font-mono text-terminal-accent font-semibold">$50,000</div>
                    </div>
                </div>
                <div class="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                    <div id="rank-progress-bar" class="bg-terminal-accent h-1.5 rounded-full transition-all duration-500" style="width: 5%"></div>
                </div>
                <div class="flex justify-between items-center text-[10px] text-slate-400 mt-2">
                    <span>Win Rate: <b id="stat-winrate" class="text-white font-mono">0%</b></span>
                    <span>Trades: <b id="stat-tradecount" class="text-white font-mono">0</b></span>
                </div>
            </div>
        </section>
    </main>

    <div id="toast-container" class="fixed bottom-4 right-4 z-50 flex flex-col space-y-2 pointer-events-none max-w-sm w-full"></div>

    <script>
        class SoundFX {
            constructor() { this.enabled = true; this.ctx = null; }
            init() {
                if (!this.ctx) {
                    const AC = window.AudioContext || window.webkitAudioContext;
                    if (AC) this.ctx = new AC();
                }
                if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
            }
            playTrade() {
                if (!this.enabled) return; this.init(); if (!this.ctx) return;
                const now = this.ctx.currentTime;
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();
                osc.frequency.setValueAtTime(587.33, now);
                osc.frequency.exponentialRampToValueAtTime(880, now + 0.12);
                gain.gain.setValueAtTime(0.08, now);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
                osc.connect(gain); gain.connect(this.ctx.destination);
                osc.start(now); osc.stop(now + 0.25);
            }
            playWarning() {
                if (!this.enabled) return; this.init(); if (!this.ctx) return;
                const now = this.ctx.currentTime;
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();
                osc.type = 'sawtooth';
                osc.frequency.setValueAtTime(220, now);
                osc.frequency.linearRampToValueAtTime(150, now + 0.2);
                gain.gain.setValueAtTime(0.08, now);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
                osc.connect(gain); gain.connect(this.ctx.destination);
                osc.start(now); osc.stop(now + 0.25);
            }
        }

        const sfx = new SoundFX();

        class ClientApp {
            constructor() {
                this.stocks = {};
                this.selectedSymbol = 'NVTX';
                this.chartMode = 'line';
                this.showSMA = true;
                this.showVolume = true;
                this.showDonchian = true; // 20-period Donchian Channels toggle
                this.showMACD = true; // MACD (12, 26, 9) oscillator toggle
                this.portfolio = null;
                this.news = [];

                this.chartCanvas = document.getElementById('stock-chart');
                this.chartCtx = this.chartCanvas.getContext('2d');
                this.mouseChartPos = null;

                this.bindUI();
                this.setupCanvas();
                this.connectSSE();
                this.fetchPortfolio();
                this.fetchNews();
            }

            connectSSE() {
                this.eventSource = new EventSource('/api/stream');

                this.eventSource.addEventListener('init', (e) => {
                    const data = JSON.parse(e.data);
                    this.updateMarketState(data);
                });

                this.eventSource.addEventListener('tick', (e) => {
                    const data = JSON.parse(e.data);
                    this.updateMarketState(data);
                });

                this.eventSource.addEventListener('news_event', (e) => {
                    const newsItem = JSON.parse(e.data);
                    this.news.unshift(newsItem);
                    if (this.news.length > 25) this.news.pop();
                    this.renderNews();
                    this.showToast(\`📰 NEWS: \${newsItem.text.slice(0, 60)}...\`, newsItem.sentiment === 'bull' ? 'success' : 'warning');
                });

                this.eventSource.onerror = () => {
                    document.getElementById('backend-status-text').innerText = 'RECONNECTING';
                    document.getElementById('backend-status-dot').className = 'w-2 h-2 rounded-full bg-amber-500 animate-ping';
                };

                this.eventSource.onopen = () => {
                    document.getElementById('backend-status-text').innerText = 'LIVE STREAM';
                    document.getElementById('backend-status-dot').className = 'w-2 h-2 rounded-full bg-emerald-500 animate-ping';
                };
            }

            updateMarketState(data) {
                if (data.clock) {
                    document.getElementById('market-clock').innerText = data.clock.timeStr;
                }
                if (data.stocks) {
                    data.stocks.forEach(s => {
                        this.stocks[s.symbol] = s;
                    });
                    this.renderWatchlist();
                    this.renderSelectedHeader();
                    this.drawChart();
                    this.updateOrderEstimate();
                    this.fetchPortfolio();
                }
            }

            async fetchPortfolio() {
                try {
                    const res = await fetch('/api/portfolio');
                    if (res.ok) {
                        this.portfolio = await res.json();
                        this.renderPortfolio();
                    }
                } catch (err) {}
            }

            async fetchNews() {
                try {
                    const res = await fetch('/api/news');
                    if (res.ok) {
                        this.news = await res.json();
                        this.renderNews();
                    }
                } catch (err) {}
            }

            async executeTrade(action) {
                const qtyInput = document.getElementById('trade-qty-input');
                const qty = parseInt(qtyInput.value, 10) || 0;

                try {
                    const res = await fetch('/api/trade', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ action, symbol: this.selectedSymbol, qty })
                    });
                    const data = await res.json();
                    if (data.success) {
                        this.showToast(data.message, 'success');
                        sfx.playTrade();
                        this.fetchPortfolio();
                    } else {
                        this.showToast(data.message, 'error');
                        sfx.playWarning();
                    }
                } catch (err) {
                    this.showToast('Network error executing trade', 'error');
                }
            }

            renderPortfolio() {
                if (!this.portfolio) return;
                const p = this.portfolio;

                document.getElementById('account-networth').innerText = \`$\${p.netWorth.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\`;
                
                const roiEl = document.getElementById('account-roi');
                const isPos = p.returnPercent >= 0;
                roiEl.innerText = \`\${isPos ? '+' : ''}\${p.returnPercent.toFixed(2)}%\`;
                roiEl.className = \`text-xs font-mono font-semibold px-2 py-0.5 rounded \${isPos ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}\`;

                document.getElementById('account-cash').innerText = \`$\${p.cash.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\`;
                document.getElementById('trade-avail-cash').innerText = \`$\${p.cash.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\`;
                document.getElementById('account-invested').innerText = \`$\${p.investedValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\`;

                const dayplEl = document.getElementById('account-daypl');
                const isPnLPos = p.unrealizedPnL >= 0;
                dayplEl.innerText = \`\${isPnLPos ? '+' : ''}$\${p.unrealizedPnL.toFixed(2)}\`;
                dayplEl.className = \`font-mono font-semibold text-sm \${isPnLPos ? 'text-emerald-400' : 'text-rose-400'}\`;

                document.getElementById('account-drawdown').innerText = \`\${p.maxDrawdown}%\`;
                document.getElementById('stat-winrate').innerText = \`\${p.winRate}%\`;
                document.getElementById('stat-tradecount').innerText = p.tradeCount;

                // Update rank
                this.updateRank(p.netWorth);

                // Positions List
                const posContainer = document.getElementById('positions-list');
                document.getElementById('pos-count-badge').innerText = p.positions.length;

                if (p.positions.length === 0) {
                    posContainer.innerHTML = \`<div class="h-36 flex flex-col items-center justify-center text-center text-slate-500 text-xs">No active positions</div>\`;
                } else {
                    posContainer.innerHTML = p.positions.map(pos => \`
                        <div class="p-2.5 rounded-lg bg-slate-900/90 border border-slate-800 flex items-center justify-between hover:border-slate-700 transition">
                            <div>
                                <div class="flex items-center space-x-2">
                                    <span class="font-bold text-white text-xs font-mono cursor-pointer hover:text-terminal-accent" onclick="window.app.selectStock('\${pos.symbol}')">\${pos.symbol}</span>
                                    <span class="text-[10px] px-1.5 py-0.2 rounded font-mono font-bold \${pos.type === 'LONG' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-purple-500/20 text-purple-400'}">\${pos.type}</span>
                                    <span class="text-[11px] text-slate-300 font-mono">\${pos.shares} shs</span>
                                </div>
                                <div class="text-[10px] text-slate-400 font-mono mt-0.5">Avg: $\${pos.avgPrice.toFixed(2)}</div>
                            </div>
                            <div class="text-right">
                                <div class="font-mono text-xs font-bold \${pos.unrealizedPnL >= 0 ? 'text-emerald-400' : 'text-rose-400'}">
                                    \${pos.unrealizedPnL >= 0 ? '+' : ''}$\${pos.unrealizedPnL.toFixed(2)}
                                </div>
                                <button class="mt-1 px-2 py-0.5 text-[9px] rounded font-mono bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700" onclick="window.app.quickClose('\${pos.symbol}', '\${pos.type}', \${pos.shares})">Exit</button>
                            </div>
                        </div>
                    \`).join('');
                }

                // History List
                const histContainer = document.getElementById('order-history-list');
                if (p.transactions.length === 0) {
                    histContainer.innerHTML = \`<div class="text-slate-500 text-center py-6">No executed orders</div>\`;
                } else {
                    histContainer.innerHTML = p.transactions.map(item => \`
                        <div class="p-1.5 rounded bg-slate-900/60 border border-slate-800 flex items-center justify-between text-[11px]">
                            <div class="flex items-center space-x-1.5">
                                <span class="font-bold text-white">\${item.type}</span>
                                <span class="text-terminal-accent font-semibold">\${item.symbol}</span>
                                <span class="text-slate-400">x\${item.qty}</span>
                            </div>
                            <div class="text-right">
                                <span class="text-slate-200">$\${item.price.toFixed(2)}</span>
                                \${item.pnl !== null ? \`<span class="ml-1 text-[10px] font-bold \${item.pnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}">(\${item.pnl >= 0 ? '+' : ''}$\${item.pnl.toFixed(2)})</span>\` : ''}
                            </div>
                        </div>
                    \`).join('');
                }
            }

            updateRank(netWorth) {
                let rank = "Retail Amateur", icon = "🥉", next = 50000, prev = 25000;
                if (netWorth >= 1000000) { rank = "Wall Street Titan"; icon = "👑"; next = 5000000; prev = 1000000; }
                else if (netWorth >= 500000) { rank = "Hedge Fund Partner"; icon = "💎"; next = 1000000; prev = 500000; }
                else if (netWorth >= 100000) { rank = "Senior Quantitative Trader"; icon = "⚡"; next = 500000; prev = 100000; }
                else if (netWorth >= 50000) { rank = "Pattern Day Trader"; icon = "🥈"; next = 100000; prev = 50000; }

                document.getElementById('rank-icon').innerText = icon;
                document.getElementById('trader-rank').innerText = rank;
                document.getElementById('rank-target').innerText = \`$\${next.toLocaleString()}\`;
                const progress = Math.min(100, Math.max(0, ((netWorth - prev) / (next - prev)) * 100));
                document.getElementById('rank-progress-bar').style.width = \`\${progress}%\`;
            }

            renderWatchlist() {
                const container = document.getElementById('watchlist-container');
                const marquee = document.getElementById('ticker-marquee');
                if (!container) return;

                container.innerHTML = Object.values(this.stocks).map(stock => {
                    const isSelected = stock.symbol === this.selectedSymbol;
                    const change = stock.price - stock.openPrice;
                    const pct = ((change / stock.openPrice) * 100).toFixed(2);
                    const isUp = change >= 0;

                    return \`
                        <div class="p-2.5 flex items-center justify-between cursor-pointer transition \${isSelected ? 'bg-slate-800/90 border-l-4 border-terminal-accent' : 'hover:bg-slate-800/40'}" onclick="window.app.selectStock('\${stock.symbol}')">
                            <div class="flex items-center space-x-2">
                                <div class="w-7 h-7 rounded-lg bg-slate-800 flex items-center justify-center font-bold text-xs font-mono" style="color: \${stock.color}">
                                    \${stock.symbol}
                                </div>
                                <div>
                                    <div class="font-bold text-xs text-white leading-tight font-mono">\${stock.symbol}</div>
                                    <div class="text-[10px] text-slate-400 truncate max-w-[100px]">\${stock.name}</div>
                                </div>
                            </div>
                            <div class="text-right">
                                <div class="font-mono text-xs font-bold text-slate-100">$\${stock.price.toFixed(2)}</div>
                                <div class="font-mono text-[10px] font-semibold \${isUp ? 'text-emerald-400' : 'text-rose-400'}">
                                    \${isUp ? '+' : ''}\${pct}%
                                </div>
                            </div>
                        </div>
                    \`;
                }).join('');

                if (marquee) {
                    const items = Object.values(this.stocks).map(s => {
                        const change = s.price - s.openPrice;
                        const pct = ((change / s.openPrice) * 100).toFixed(2);
                        const isUp = change >= 0;
                        return \`<span class="mx-4"><b class="text-slate-300">\${s.symbol}</b> $\${s.price.toFixed(2)} <span class="\${isUp ? 'text-emerald-400' : 'text-rose-400'} font-semibold">\${isUp ? '▲' : '▼'} \${pct}%</span></span>\`;
                    }).join('');
                    marquee.innerHTML = items + items;
                }
            }

            renderSelectedHeader() {
                const stock = this.stocks[this.selectedSymbol];
                if (!stock) return;

                document.getElementById('selected-symbol').innerText = stock.symbol;
                document.getElementById('selected-badge').innerText = stock.symbol;
                document.getElementById('selected-badge').style.color = stock.color;
                document.getElementById('selected-name').innerText = stock.name;
                document.getElementById('selected-sector').innerText = stock.sector;
                document.getElementById('selected-price').innerText = \`$\${stock.price.toFixed(2)}\`;

                const diff = stock.price - stock.openPrice;
                const pct = ((diff / stock.openPrice) * 100).toFixed(2);
                const isUp = diff >= 0;

                const changeEl = document.getElementById('selected-change');
                changeEl.innerText = \`\${isUp ? '+' : ''}$\${Math.abs(diff).toFixed(2)} (\${isUp ? '+' : ''}\${pct}%)\`;
                changeEl.className = \`text-xs font-mono font-semibold px-2 py-0.5 rounded \${isUp ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}\`;
            }

            renderNews() {
                const stream = document.getElementById('news-stream');
                if (!stream) return;
                stream.innerHTML = this.news.map(n => \`
                    <div class="p-2 rounded-lg bg-slate-900/80 border \${n.sentiment === 'bull' ? 'border-emerald-900/60' : 'border-rose-900/60'} text-[11px] leading-tight">
                        <div class="flex items-center justify-between text-slate-400 mb-1 font-mono text-[10px]">
                            <span class="px-1 py-0.2 rounded \${n.sentiment === 'bull' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'} font-bold">\${n.symbol}</span>
                            <span>\${n.time}</span>
                        </div>
                        <p class="text-slate-200">\${n.text}</p>
                    </div>
                \`).join('');
            }

            selectStock(symbol) {
                this.selectedSymbol = symbol;
                this.renderWatchlist();
                this.renderSelectedHeader();
                this.updateOrderEstimate();
                this.drawChart();
            }

            calculateEMA(values, period) {
                const k = 2 / (period + 1);
                const emaArray = new Array(values.length).fill(null);
                if (values.length < period) return emaArray;

                let sum = 0;
                for (let i = 0; i < period; i++) sum += values[i];
                let prevEMA = sum / period;
                emaArray[period - 1] = prevEMA;

                for (let i = period; i < values.length; i++) {
                    const curEMA = values[i] * k + prevEMA * (1 - k);
                    emaArray[i] = curEMA;
                    prevEMA = curEMA;
                }
                return emaArray;
            }

            calculateMACD(dataSeries, fastPeriod = 12, slowPeriod = 26, signalPeriod = 9) {
                const prices = dataSeries.map(d => (d.price !== undefined ? d.price : d.close));
                const len = prices.length;
                const emaFast = this.calculateEMA(prices, fastPeriod);
                const emaSlow = this.calculateEMA(prices, slowPeriod);

                const macdLine = new Array(len).fill(null);
                for (let i = 0; i < len; i++) {
                    if (emaFast[i] !== null && emaSlow[i] !== null) {
                        macdLine[i] = emaFast[i] - emaSlow[i];
                    }
                }

                const signalLine = new Array(len).fill(null);
                const validMacdEntries = [];
                for (let i = 0; i < len; i++) {
                    if (macdLine[i] !== null) {
                        validMacdEntries.push({ val: macdLine[i], index: i });
                    }
                }

                if (validMacdEntries.length >= signalPeriod) {
                    const macdSubValues = validMacdEntries.map(e => e.val);
                    const kSignal = 2 / (signalPeriod + 1);

                    let sum = 0;
                    for (let s = 0; s < signalPeriod; s++) {
                        sum += macdSubValues[s];
                    }
                    let prevSignalEMA = sum / signalPeriod;
                    signalLine[validMacdEntries[signalPeriod - 1].index] = prevSignalEMA;

                    for (let s = signalPeriod; s < macdSubValues.length; s++) {
                        const curSigEMA = macdSubValues[s] * kSignal + prevSignalEMA * (1 - kSignal);
                        signalLine[validMacdEntries[s].index] = curSigEMA;
                        prevSignalEMA = curSigEMA;
                    }
                }

                const histogram = new Array(len).fill(null);
                for (let i = 0; i < len; i++) {
                    if (macdLine[i] !== null && signalLine[i] !== null) {
                        histogram[i] = macdLine[i] - signalLine[i];
                    }
                }

                return {
                    emaFast,
                    emaSlow,
                    macdLine,
                    signalLine,
                    histogram
                };
            }

            calculateDonchianChannels(dataSeries, period = 20) {
                const len = dataSeries.length;
                const result = new Array(len).fill(null);

                for (let i = 0; i < len; i++) {
                    if (i < period - 1) continue;

                    let highestHigh = -Infinity;
                    let lowestLow = Infinity;

                    for (let j = 0; j < period; j++) {
                        const item = dataSeries[i - j];
                        const high = item.high !== undefined ? item.high : item.price;
                        const low = item.low !== undefined ? item.low : item.price;

                        if (high > highestHigh) highestHigh = high;
                        if (low < lowestLow) lowestLow = low;
                    }

                    result[i] = {
                        upper: highestHigh,
                        lower: lowestLow,
                        middle: (highestHigh + lowestLow) / 2
                    };
                }

                return result;
            }

            async quickClose(symbol, type, shares) {
                const action = type === 'LONG' ? 'SELL' : 'COVER';
                this.selectedSymbol = symbol;
                document.getElementById('trade-qty-input').value = shares;
                await this.executeTrade(action);
            }

            updateOrderEstimate() {
                const stock = this.stocks[this.selectedSymbol];
                const qtyInput = document.getElementById('trade-qty-input');
                const costDisplay = document.getElementById('trade-total-cost');
                if (!stock || !qtyInput || !costDisplay) return;

                const qty = parseInt(qtyInput.value, 10) || 0;
                const cost = qty * stock.price;
                costDisplay.innerText = \`Total: $\${cost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\`;
            }

            setupCanvas() {
                const resize = () => {
                    const rect = this.chartCanvas.parentElement.getBoundingClientRect();
                    this.chartCanvas.width = rect.width * window.devicePixelRatio;
                    this.chartCanvas.height = rect.height * window.devicePixelRatio;
                    this.chartCtx.scale(window.devicePixelRatio, window.devicePixelRatio);
                    this.drawChart();
                };
                window.addEventListener('resize', resize);
                setTimeout(resize, 50);

                this.chartCanvas.addEventListener('mousemove', (e) => {
                    const rect = this.chartCanvas.getBoundingClientRect();
                    this.mouseChartPos = { x: e.clientX - rect.left, y: e.clientY - rect.top };
                    this.drawChart();
                });

                this.chartCanvas.addEventListener('mouseleave', () => {
                    this.mouseChartPos = null;
                    document.getElementById('chart-tooltip').classList.add('hidden');
                    this.drawChart();
                });
            }

            drawChart() {
                const stock = this.stocks[this.selectedSymbol];
                if (!stock || !stock.history || stock.history.length === 0) return;

                const ctx = this.chartCtx;
                const width = this.chartCanvas.width / window.devicePixelRatio;
                const height = this.chartCanvas.height / window.devicePixelRatio;

                ctx.clearRect(0, 0, width, height);

                const padding = { top: 20, right: 65, bottom: 25, left: 15 };
                const totalChartWidth = width - padding.left - padding.right;
                const totalChartHeight = height - padding.top - padding.bottom;

                const macdPaneHeight = this.showMACD ? Math.min(105, Math.floor(totalChartHeight * 0.35)) : 0;
                const chartHeight = this.showMACD ? (totalChartHeight - macdPaneHeight - 20) : totalChartHeight;
                const chartWidth = totalChartWidth;

                let minP = Infinity, maxP = -Infinity, maxVol = 1;

                if (this.chartMode === 'candle' && stock.candles && stock.candles.length > 0) {
                    stock.candles.forEach(c => {
                        if (c.low < minP) minP = c.low;
                        if (c.high > maxP) maxP = c.high;
                        if (c.volume > maxVol) maxVol = c.volume;
                    });
                } else {
                    stock.history.forEach(h => {
                        if (h.price < minP) minP = h.price;
                        if (h.price > maxP) maxP = h.price;
                    });
                }

                const padPrice = (maxP - minP) * 0.08 || 1;
                minP -= padPrice;
                maxP += padPrice;

                const getY = val => padding.top + chartHeight - ((val - minP) / (maxP - minP)) * chartHeight;

                // Grid lines & labels
                ctx.lineWidth = 1;
                ctx.strokeStyle = '#1e293b';
                ctx.fillStyle = '#64748b';
                ctx.font = '10px JetBrains Mono';
                ctx.textAlign = 'left';

                for (let i = 0; i <= 5; i++) {
                    const priceVal = minP + (i / 5) * (maxP - minP);
                    const y = getY(priceVal);
                    ctx.beginPath();
                    ctx.moveTo(padding.left, y);
                    ctx.lineTo(width - padding.right, y);
                    ctx.stroke();
                    ctx.fillText(\`$\${priceVal.toFixed(2)}\`, width - padding.right + 6, y + 3);
                }

                // Volumes
                if (this.showVolume && stock.candles && stock.candles.length > 0) {
                    const volH = chartHeight * 0.22;
                    const barW = Math.max(3, (chartWidth / stock.candles.length) * 0.7);

                    stock.candles.forEach((c, idx) => {
                        const x = padding.left + (idx / (stock.candles.length - 1)) * chartWidth;
                        const vHeight = (c.volume / maxVol) * volH;
                        ctx.fillStyle = c.close >= c.open ? 'rgba(16, 185, 129, 0.22)' : 'rgba(239, 68, 68, 0.22)';
                        ctx.fillRect(x - barW / 2, padding.top + chartHeight - vHeight, barW, vHeight);
                    });
                }

                // Candles or Line
                if (this.chartMode === 'candle' && stock.candles && stock.candles.length > 0) {
                    const count = stock.candles.length;
                    const cWidth = Math.max(4, (chartWidth / count) * 0.65);

                    stock.candles.forEach((c, idx) => {
                        const x = padding.left + (idx / (count - 1)) * chartWidth;
                        const openY = getY(c.open);
                        const closeY = getY(c.close);
                        const isBull = c.close >= c.open;

                        ctx.strokeStyle = isBull ? '#10b981' : '#ef4444';
                        ctx.fillStyle = isBull ? '#10b981' : '#ef4444';
                        ctx.lineWidth = 1.5;

                        // Wick
                        ctx.beginPath();
                        ctx.moveTo(x, getY(c.high));
                        ctx.lineTo(x, getY(c.low));
                        ctx.stroke();

                        // Body
                        ctx.fillRect(x - cWidth / 2, Math.min(openY, closeY), cWidth, Math.max(2, Math.abs(closeY - openY)));
                    });
                } else {
                    const count = stock.history.length;
                    if (count > 1) {
                        const isBull = stock.price >= stock.openPrice;
                        const strokeColor = isBull ? '#10b981' : '#ef4444';

                        ctx.beginPath();
                        stock.history.forEach((h, idx) => {
                            const x = padding.left + (idx / (count - 1)) * chartWidth;
                            const y = getY(h.price);
                            if (idx === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
                        });

                        ctx.lineWidth = 2.5;
                        ctx.strokeStyle = strokeColor;
                        ctx.shadowColor = strokeColor;
                        ctx.shadowBlur = 8;
                        ctx.stroke();
                        ctx.shadowBlur = 0;

                        const gradient = ctx.createLinearGradient(0, padding.top, 0, padding.top + chartHeight);
                        gradient.addColorStop(0, isBull ? 'rgba(16, 185, 129, 0.28)' : 'rgba(239, 68, 68, 0.28)');
                        gradient.addColorStop(1, 'rgba(0, 0, 0, 0.0)');
                        ctx.lineTo(padding.left + chartWidth, padding.top + chartHeight);
                        ctx.lineTo(padding.left, padding.top + chartHeight);
                        ctx.closePath();
                        ctx.fillStyle = gradient;
                        ctx.fill();
                    }
                }

                // SMA 15
                if (this.showSMA && stock.history.length >= 10) {
                    const period = 15;
                    ctx.beginPath();
                    ctx.lineWidth = 1.5;
                    ctx.strokeStyle = '#6366f1';
                    let started = false;

                    for (let i = 0; i < stock.history.length; i++) {
                        if (i >= period - 1) {
                            let sum = 0;
                            for (let j = 0; j < period; j++) sum += stock.history[i - j].price;
                            const avg = sum / period;
                            const x = padding.left + (i / (stock.history.length - 1)) * chartWidth;
                            const y = getY(avg);
                            if (!started) { ctx.moveTo(x, y); started = true; } else ctx.lineTo(x, y);
                        }
                    }
                    ctx.stroke();
                }

                // 20-Period Donchian Channels (Upper, Lower, and Centerline)
                const sourceData = (this.chartMode === 'candle' && stock.candles && stock.candles.length >= 20)
                    ? stock.candles
                    : stock.history;

                if (this.showDonchian && sourceData && sourceData.length >= 20) {
                    const dcValues = this.calculateDonchianChannels(sourceData, 20);
                    const count = sourceData.length;

                    // 1. Shaded Channel Fill between Upper and Lower bands
                    ctx.beginPath();
                    let firstUpper = true;
                    for (let i = 0; i < count; i++) {
                        if (!dcValues[i]) continue;
                        const x = padding.left + (i / (count - 1)) * chartWidth;
                        const yUpper = getY(dcValues[i].upper);
                        if (firstUpper) { ctx.moveTo(x, yUpper); firstUpper = false; } else { ctx.lineTo(x, yUpper); }
                    }
                    for (let i = count - 1; i >= 0; i--) {
                        if (!dcValues[i]) continue;
                        const x = padding.left + (i / (count - 1)) * chartWidth;
                        const yLower = getY(dcValues[i].lower);
                        ctx.lineTo(x, yLower);
                    }
                    ctx.closePath();
                    ctx.fillStyle = 'rgba(245, 158, 11, 0.07)';
                    ctx.fill();

                    // 2. Upper Channel Band (Resistance)
                    ctx.beginPath();
                    ctx.lineWidth = 1.2;
                    ctx.strokeStyle = '#f59e0b';
                    let upperStarted = false;
                    for (let i = 0; i < count; i++) {
                        if (!dcValues[i]) continue;
                        const x = padding.left + (i / (count - 1)) * chartWidth;
                        const y = getY(dcValues[i].upper);
                        if (!upperStarted) { ctx.moveTo(x, y); upperStarted = true; } else { ctx.lineTo(x, y); }
                    }
                    ctx.stroke();

                    // 3. Lower Channel Band (Support)
                    ctx.beginPath();
                    ctx.lineWidth = 1.2;
                    ctx.strokeStyle = '#f59e0b';
                    let lowerStarted = false;
                    for (let i = 0; i < count; i++) {
                        if (!dcValues[i]) continue;
                        const x = padding.left + (i / (count - 1)) * chartWidth;
                        const y = getY(dcValues[i].lower);
                        if (!lowerStarted) { ctx.moveTo(x, y); lowerStarted = true; } else { ctx.lineTo(x, y); }
                    }
                    ctx.stroke();

                    // 4. Middle Channel Line (Median / Trend Bias)
                    ctx.beginPath();
                    ctx.lineWidth = 1;
                    ctx.strokeStyle = 'rgba(251, 191, 36, 0.6)';
                    ctx.setLineDash([3, 3]);
                    let midStarted = false;
                    for (let i = 0; i < count; i++) {
                        if (!dcValues[i]) continue;
                        const x = padding.left + (i / (count - 1)) * chartWidth;
                        const y = getY(dcValues[i].middle);
                        if (!midStarted) { ctx.moveTo(x, y); midStarted = true; } else { ctx.lineTo(x, y); }
                    }
                    ctx.stroke();
                    ctx.setLineDash([]);
                }

                if (this.showMACD && sourceData && sourceData.length >= 26) {
                    const macdData = this.calculateMACD(sourceData, 12, 26, 9);
                    const macdTop = padding.top + chartHeight + 18;
                    const macdBottom = macdTop + macdPaneHeight;
                    const count = sourceData.length;

                    // Sub-panel background
                    ctx.fillStyle = 'rgba(15, 23, 42, 0.65)';
                    ctx.fillRect(padding.left, macdTop, chartWidth, macdPaneHeight);

                    // Divider boundary
                    ctx.strokeStyle = '#334155';
                    ctx.lineWidth = 1;
                    ctx.beginPath();
                    ctx.moveTo(padding.left, macdTop - 6);
                    ctx.lineTo(width - padding.right, macdTop - 6);
                    ctx.stroke();

                    // Find MACD min/max bounds across valid points
                    let minMACD = -0.05, maxMACD = 0.05;
                    for (let i = 0; i < count; i++) {
                        if (macdData.macdLine[i] !== null) {
                            if (macdData.macdLine[i] < minMACD) minMACD = macdData.macdLine[i];
                            if (macdData.macdLine[i] > maxMACD) maxMACD = macdData.macdLine[i];
                        }
                        if (macdData.signalLine[i] !== null) {
                            if (macdData.signalLine[i] < minMACD) minMACD = macdData.signalLine[i];
                            if (macdData.signalLine[i] > maxMACD) maxMACD = macdData.signalLine[i];
                        }
                        if (macdData.histogram[i] !== null) {
                            if (macdData.histogram[i] < minMACD) minMACD = macdData.histogram[i];
                            if (macdData.histogram[i] > maxMACD) maxMACD = macdData.histogram[i];
                        }
                    }

                    const absPeak = Math.max(0.1, Math.max(Math.abs(minMACD), Math.abs(maxMACD)) * 1.25);
                    const usableHeight = macdPaneHeight - 24;
                    const midY = macdTop + 14 + (usableHeight / 2);
                    const getMACDY = (val) => midY - (val / absPeak) * (usableHeight / 2);
                    const zeroY = midY;

                    // Zero Baseline
                    ctx.strokeStyle = '#475569';
                    ctx.setLineDash([2, 2]);
                    ctx.beginPath();
                    ctx.moveTo(padding.left, zeroY);
                    ctx.lineTo(width - padding.right, zeroY);
                    ctx.stroke();
                    ctx.setLineDash([]);

                    // MACD Histogram Bars
                    const histBarWidth = Math.max(2, (chartWidth / count) * 0.55);
                    for (let i = 0; i < count; i++) {
                        const hVal = macdData.histogram[i];
                        if (hVal !== null) {
                            const x = padding.left + (i / (count - 1)) * chartWidth;
                            const y = getMACDY(hVal);
                            const hHeight = Math.abs(y - zeroY);
                            ctx.fillStyle = hVal >= 0 ? 'rgba(16, 185, 129, 0.65)' : 'rgba(239, 68, 68, 0.65)';
                            ctx.fillRect(x - histBarWidth / 2, Math.min(y, zeroY), histBarWidth, Math.max(1, hHeight));
                        }
                    }

                    // MACD Line (12-EMA - 26-EMA Difference) in Cyan
                    ctx.beginPath();
                    ctx.lineWidth = 1.75;
                    ctx.strokeStyle = '#38bdf8';
                    let startedMACD = false;
                    for (let i = 0; i < count; i++) {
                        if (macdData.macdLine[i] !== null) {
                            const x = padding.left + (i / (count - 1)) * chartWidth;
                            const y = getMACDY(macdData.macdLine[i]);
                            if (!startedMACD) { ctx.moveTo(x, y); startedMACD = true; } else { ctx.lineTo(x, y); }
                        }
                    }
                    ctx.stroke();

                    // Signal Line (9-period EMA) in Amber/Orange
                    ctx.beginPath();
                    ctx.lineWidth = 1.5;
                    ctx.strokeStyle = '#f59e0b';
                    let startedSig = false;
                    for (let i = 0; i < count; i++) {
                        if (macdData.signalLine[i] !== null) {
                            const x = padding.left + (i / (count - 1)) * chartWidth;
                            const y = getMACDY(macdData.signalLine[i]);
                            if (!startedSig) { ctx.moveTo(x, y); startedSig = true; } else { ctx.lineTo(x, y); }
                        }
                    }
                    ctx.stroke();

                    // Latest Readings & Labels
                    const lastIdx = count - 1;
                    const lastDiff = macdData.macdLine[lastIdx];
                    const lastFast = macdData.emaFast[lastIdx];
                    const lastSlow = macdData.emaSlow[lastIdx];
                    const lastSig = macdData.signalLine[lastIdx];

                    ctx.font = '10px JetBrains Mono';
                    ctx.textAlign = 'left';
                    ctx.fillStyle = '#94a3b8';
                    ctx.fillText('MACD (12, 26, 9)', padding.left + 4, macdTop + 11);

                    if (lastDiff !== null && lastFast !== null && lastSlow !== null) {
                        ctx.fillStyle = '#38bdf8';
                        ctx.fillText('Diff: ' + (lastDiff >= 0 ? '+' : '') + lastDiff.toFixed(2), padding.left + 110, macdTop + 11);

                        ctx.fillStyle = '#64748b';
                        ctx.fillText('(12-EMA: $' + lastFast.toFixed(2) + ' | 26-EMA: $' + lastSlow.toFixed(2) + ')', padding.left + 210, macdTop + 11);

                        if (lastSig !== null) {
                            ctx.fillStyle = '#f59e0b';
                            ctx.fillText('Signal: ' + (lastSig >= 0 ? '+' : '') + lastSig.toFixed(2), width - padding.right - 105, macdTop + 11);
                        }
                    }

                    // Zero label on right gutter
                    ctx.fillStyle = '#64748b';
                    ctx.textAlign = 'left';
                    ctx.fillText('0.00', width - padding.right + 6, zeroY + 3);
                }

                // Current Price dashed marker
                const curY = getY(stock.price);
                ctx.setLineDash([4, 4]);
                ctx.strokeStyle = stock.price >= stock.openPrice ? '#10b981' : '#ef4444';
                ctx.beginPath();
                ctx.moveTo(padding.left, curY);
                ctx.lineTo(width - padding.right, curY);
                ctx.stroke();
                ctx.setLineDash([]);

                ctx.fillStyle = stock.price >= stock.openPrice ? '#10b981' : '#ef4444';
                ctx.fillRect(width - padding.right + 2, curY - 9, 60, 18);
                ctx.fillStyle = '#000000';
                ctx.font = 'bold 10px JetBrains Mono';
                ctx.textAlign = 'center';
                ctx.fillText(\`$\${stock.price.toFixed(2)}\`, width - padding.right + 32, curY + 4);

                // Tooltip & Crosshair
                if (this.mouseChartPos && this.mouseChartPos.x >= padding.left && this.mouseChartPos.x <= padding.left + chartWidth) {
                    const mouseX = this.mouseChartPos.x;
                    const mouseY = this.mouseChartPos.y;

                    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
                    ctx.lineWidth = 1;
                    ctx.setLineDash([2, 2]);
                    ctx.beginPath(); ctx.moveTo(mouseX, padding.top); ctx.lineTo(mouseX, padding.top + chartHeight); ctx.stroke();
                    ctx.beginPath(); ctx.moveTo(padding.left, mouseY); ctx.lineTo(width - padding.right, mouseY); ctx.stroke();
                    ctx.setLineDash([]);

                    const ratio = (mouseX - padding.left) / chartWidth;
                    const idx = Math.min(stock.history.length - 1, Math.max(0, Math.round(ratio * (stock.history.length - 1))));
                    const pt = stock.history[idx];

                    const tooltip = document.getElementById('chart-tooltip');
                    if (tooltip && pt) {
                        tooltip.classList.remove('hidden');
                        tooltip.style.left = \`\${Math.min(width - 150, mouseX + 15)}px\`;
                        tooltip.style.top = \`\${Math.max(10, mouseY - 40)}px\`;
                        document.getElementById('tooltip-price').innerText = \`Price: $\${pt.price.toFixed(2)}\`;
                        document.getElementById('tooltip-time').innerText = new Date(pt.time).toLocaleTimeString();
                    }
                }
            }

            bindUI() {
                // Speed controls
                const setSpeed = async (sp, el) => {
                    try {
                        const res = await fetch('/api/speed', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ speed: sp })
                        });
                        if (res.ok) {
                            ['speed-pause', 'speed-1x', 'speed-2x', 'speed-5x'].forEach(id => {
                                document.getElementById(id).className = 'px-2 py-1 text-[11px] rounded font-mono text-slate-300 hover:text-white transition';
                            });
                            el.className = 'px-2 py-1 text-[11px] rounded font-mono bg-terminal-accent text-black font-bold transition';
                        }
                    } catch (err) {}
                };

                document.getElementById('speed-pause').addEventListener('click', (e) => setSpeed(0, e.target));
                document.getElementById('speed-1x').addEventListener('click', (e) => setSpeed(1, e.target));
                document.getElementById('speed-2x').addEventListener('click', (e) => setSpeed(2, e.target));
                document.getElementById('speed-5x').addEventListener('click', (e) => setSpeed(5, e.target));

                // Audio
                const soundBtn = document.getElementById('sound-btn');
                soundBtn.addEventListener('click', () => {
                    sfx.enabled = !sfx.enabled;
                    document.getElementById('sound-icon').innerText = sfx.enabled ? '🔊' : '🔇';
                });

                // Chart modes
                const btnLine = document.getElementById('chart-mode-line');
                const btnCandle = document.getElementById('chart-mode-candle');
                btnLine.addEventListener('click', () => {
                    this.chartMode = 'line';
                    btnLine.className = 'px-2.5 py-1 rounded bg-terminal-accent text-black font-semibold transition';
                    btnCandle.className = 'px-2.5 py-1 rounded text-slate-300 hover:text-white transition';
                    this.drawChart();
                });
                btnCandle.addEventListener('click', () => {
                    this.chartMode = 'candle';
                    btnCandle.className = 'px-2.5 py-1 rounded bg-terminal-accent text-black font-semibold transition';
                    btnLine.className = 'px-2.5 py-1 rounded text-slate-300 hover:text-white transition';
                    this.drawChart();
                });

                // Indicators
                document.getElementById('indicator-sma').addEventListener('click', (e) => {
                    this.showSMA = !this.showSMA;
                    e.target.className = this.showSMA ? 'px-2 py-1 rounded bg-indigo-600/40 text-indigo-300 border border-indigo-500/50' : 'px-2 py-1 rounded bg-slate-800 text-slate-500';
                    this.drawChart();
                });
                document.getElementById('indicator-dc').addEventListener('click', (e) => {
                    this.showDonchian = !this.showDonchian;
                    e.target.className = this.showDonchian
                        ? 'px-2 py-1 rounded bg-amber-500/30 text-amber-300 border border-amber-500/50 hover:bg-amber-500/50 transition text-[11px]'
                        : 'px-2 py-1 rounded bg-slate-800 text-slate-500 hover:text-slate-300 transition text-[11px]';
                    this.drawChart();
                });
                document.getElementById('indicator-macd').addEventListener('click', (e) => {
                    this.showMACD = !this.showMACD;
                    e.target.className = this.showMACD
                        ? 'px-2 py-1 rounded bg-cyan-600/40 text-cyan-300 border border-cyan-500/50 hover:bg-cyan-600/60 transition text-[11px]'
                        : 'px-2 py-1 rounded bg-slate-800 text-slate-500 hover:text-slate-300 transition text-[11px]';
                    this.drawChart();
                });
                document.getElementById('indicator-vol').addEventListener('click', (e) => {
                    this.showVolume = !this.showVolume;
                    e.target.className = this.showVolume ? 'px-2 py-1 rounded bg-slate-700/50 text-slate-300' : 'px-2 py-1 rounded bg-slate-800 text-slate-500';
                    this.drawChart();
                });

                // Quantity
                const qtyInput = document.getElementById('trade-qty-input');
                document.getElementById('btn-qty-minus').addEventListener('click', () => {
                    let v = parseInt(qtyInput.value, 10) || 1;
                    if (v > 1) qtyInput.value = v - 1;
                    this.updateOrderEstimate();
                });
                document.getElementById('btn-qty-plus').addEventListener('click', () => {
                    let v = parseInt(qtyInput.value, 10) || 0;
                    qtyInput.value = v + 1;
                    this.updateOrderEstimate();
                });
                qtyInput.addEventListener('input', () => this.updateOrderEstimate());

                // Percent buttons
                document.querySelectorAll('.size-btn').forEach(btn => {
                    btn.addEventListener('click', () => {
                        const pct = parseFloat(btn.getAttribute('data-percent'));
                        const stock = this.stocks[this.selectedSymbol];
                        if (stock && this.portfolio && stock.price > 0) {
                            const usable = this.portfolio.cash * pct;
                            qtyInput.value = Math.max(1, Math.floor(usable / stock.price));
                            this.updateOrderEstimate();
                        }
                    });
                });

                // Trade Buttons
                document.getElementById('btn-buy-stock').addEventListener('click', () => this.executeTrade('BUY'));
                document.getElementById('btn-sell-stock').addEventListener('click', () => this.executeTrade('SELL'));
                document.getElementById('btn-short-stock').addEventListener('click', () => this.executeTrade('SHORT'));
                document.getElementById('btn-cover-stock').addEventListener('click', () => this.executeTrade('COVER'));

                // Liquidate all
                document.getElementById('liquidate-all-btn').addEventListener('click', async () => {
                    try {
                        const res = await fetch('/api/liquidate', { method: 'POST' });
                        const data = await res.json();
                        this.showToast(data.message, 'warning');
                        this.fetchPortfolio();
                    } catch (err) {}
                });

                // Reset
                document.getElementById('reset-game-btn').addEventListener('click', async () => {
                    try {
                        const res = await fetch('/api/reset', { method: 'POST' });
                        const data = await res.json();
                        this.showToast(data.message, 'info');
                        this.fetchPortfolio();
                    } catch (err) {}
                });
            }

            showToast(message, type = 'info') {
                const container = document.getElementById('toast-container');
                if (!container) return;
                const toast = document.createElement('div');
                let borderBg = 'bg-slate-900 border-slate-700 text-slate-200';
                if (type === 'success') borderBg = 'bg-emerald-950/90 border-emerald-500/80 text-emerald-200';
                if (type === 'warning') borderBg = 'bg-amber-950/90 border-amber-500/80 text-amber-200';
                if (type === 'error') borderBg = 'bg-rose-950/90 border-rose-500/80 text-rose-200';

                toast.className = \`p-3 rounded-xl border text-xs font-mono shadow-2xl backdrop-blur-md transform transition-all duration-300 translate-y-3 opacity-0 pointer-events-auto flex items-center justify-between \${borderBg}\`;
                toast.innerHTML = \`<div class="flex items-center space-x-2"><span>\${type === 'success' ? '✅' : type === 'warning' ? '⚠️' : type === 'error' ? '🛑' : 'ℹ️'}</span><span>\${message}</span></div>\`;
                container.appendChild(toast);

                setTimeout(() => toast.classList.remove('translate-y-3', 'opacity-0'), 10);
                setTimeout(() => {
                    toast.classList.add('translate-y-3', 'opacity-0');
                    setTimeout(() => toast.remove(), 350);
                }, 3800);
            }
        }

        window.addEventListener('DOMContentLoaded', () => {
            window.app = new ClientApp();
        });
    </script>
</body>
</html>`;
}