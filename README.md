# BSC Honeypot Detector

A specialized JavaScript library for detecting honeypot tokens on Binance Smart Chain (BSC), optimized for meme coins and shitcoins.

## Features

- 🚀 **Optimized for Meme/Shitcoins**: Low thresholds, small trade amounts suitable for low-cap tokens
- 🔍 **Multi-DEX Liquidity Check**: Check liquidity across 7 major DEXs (PancakeSwap V2/V3, Biswap, ApeSwap, BabySwap, MDEX, Liquidmesh)
- 💱 **Multi-Base Pairs**: Support pairs with WBNB, USDT, BUSD
- 🎯 **Smart Trade Simulation**: Simulate trades with dynamic amounts based on liquidity
- 🛡️ **LP Token Detection**: Automatically detect LP tokens
- 🔄 **RPC Load Balancing**: 5 RPC endpoints with auto-retry
- ⚡ **Fast Detection**: ~1 second per token

## Installation

```bash
npm install bsc-honeypot-detector
```

## Usage

### Method 1: Simple function usage

```javascript
const { checkHoneypot } = require('bsc-honeypot-detector');

async function main() {
  const tokenAddress = '0x0E09FaBB73Bd3Ade0a17ECC321fD13a19e81cE82'; // CAKE
  const result = await checkHoneypot(tokenAddress);
  
  console.log('Is Honeypot:', result.isHoneypot);
  console.log('Risk Level:', result.riskLevel);
  console.log('Total Liquidity:', result.liquidity.totalLiquidity);
}
```

### Method 2: Using HoneypotDetector class

```javascript
const { HoneypotDetector } = require('bsc-honeypot-detector');

async function main() {
  const detector = new HoneypotDetector();
  const result = await detector.checkToken('0x...');
  
  // Check detailed results
  if (result.isHoneypot) {
    console.log('⚠️ WARNING: Token may be a honeypot!');
    console.log('Reasons:', result.details.risks);
  } else {
    console.log('✅ Token appears safe');
  }
}
```

### Method 3: Check multiple tokens at once

```javascript
const { checkMultipleTokens } = require('bsc-honeypot-detector');

async function main() {
  const tokens = ['0x...', '0x...', '0x...'];
  const results = await checkMultipleTokens(tokens);
  
  results.forEach((result, index) => {
    console.log(`Token ${index + 1}: ${result.isHoneypot ? 'HONEYPOT' : 'SAFE'}`);
  });
}
```

## Return Results

### Trading Token
```javascript
{
  tokenInfo: {
    name: "Example Token",
    symbol: "EXAMPLE",
    decimals: 18,
    totalSupply: "1000000000000000000000000"
  },
  isHoneypot: false,
  riskLevel: "low", // "low" | "medium" | "high" | "info"
  checks: {
    canSell: true,
    hasHighTax: false,
    hasLiquidity: true,
    singleDexDominance: false
  },
  liquidity: {
    totalLiquidity: 15000,
    dexDistribution: {
      pancakeswapV2: { liquidity: 12000, percentage: 80 },
      biswap: { liquidity: 3000, percentage: 20 }
    },
    riskFactors: {
      singleDexDominance: false,
      lowTotalLiquidity: false,
      noPairs: false
    }
  },
  trading: {
    dex: "PancakeSwap V2",
    canBuy: true,
    canSell: true,
    slippage: 0.05,
    taxRate: 0.02,
    tradeAmount: "0.003",
    priceImpact: 0.06,
    liquidityUsed: 12000
  },
  details: {
    risks: ["High price impact: 6.0% - Normal for meme coins"],
    recommendation: "LOW RISK - Appears safe to trade"
  }
}
```

### LP Token
```javascript
{
  tokenInfo: {
    name: "Pancake LPs",
    symbol: "Cake-LP",
    decimals: 18,
    totalSupply: "..."
  },
  isHoneypot: false,
  riskLevel: "info",
  details: {
    recommendation: "This is an LP (Liquidity Provider) token, not a trading token"
  }
}
```

## Configuration

You can use custom RPC URL:

```javascript
const detector = new HoneypotDetector('https://your-custom-rpc-url');
```

## Test

```bash
npm test
```

## Risk Levels

- **LOW**: Safe token, can trade
- **MEDIUM**: Some risks, trade carefully
- **HIGH**: High risk, likely honeypot
- **INFO**: LP token or special token

## Meme Coin Optimizations

- **Liquidity Threshold**: $500 (instead of $10k)
- **Tax Tolerance**: 25% (instead of 15%)
- **Trade Amounts**: $0.01-$3 (suitable for low-cap)
- **Price Impact**: More lenient for meme coins
- **Single DEX**: Normal for meme coins

## Supported Pairs

- **WBNB pairs**: Highest priority
- **USDT pairs**: Backup for stablecoin pairs
- **BUSD pairs**: Additional coverage for other tokens

## Notes

- ⚠️ Only supports Binance Smart Chain (BSC)
- 📊 Results are for reference only, not investment advice
- 🔍 Always DYOR before trading
- 🎯 Optimized for meme/shitcoins with low liquidity
- 🚫 Automatically detects LP tokens

## Donate

If this library is useful to you, please consider donating to support development:

**EVM Address**: `0x531B703B48e17e63Db760D2c1796795aEa123456`

Accepted tokens: BNB, ETH, USDT, USDC, MATIC and other tokens on EVM chains (BSC, Ethereum, Polygon, Arbitrum).

💝 All contributions are appreciated and help maintain the project!

## Author

**MrAI Code** - *Crypto Trading Tools Developer*

- GitHub: [@mraicodedev](https://github.com/mraicodedev)
- NPM: [@mraicodedev](https://www.npmjs.com/~mraicodedev)
- Email: mraicodedev@gmail.com
- X (Twitter): [@mraicodedev](https://x.com/mraicodedev)
- Telegram: [@mraicodedev](https://t.me/mraicodedev)

⭐ **Star this repository if it's useful!**

## License

MIT