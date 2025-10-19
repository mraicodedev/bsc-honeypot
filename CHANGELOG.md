# Changelog

## v1.0.0 - Initial Release

### 🚀 Features
- **Meme Coin Optimized**: Specialized for low-cap tokens and meme coins
- **Multi-DEX Support**: Check liquidity across 7 major DEXs
- **Multi-Base Pairs**: Support WBNB, USDT, BUSD pairs
- **Smart Trade Simulation**: Dynamic trade amounts based on liquidity
- **LP Token Detection**: Automatic detection of LP tokens
- **RPC Load Balancing**: 5 stable RPC endpoints with auto-retry
- **Fast Detection**: ~1 second per token

### 🎯 Optimizations for Meme Coins
- Lower liquidity thresholds ($500 minimum)
- Higher tax tolerance (25% maximum)
- Smaller trade amounts ($0.01-$3)
- Lenient price impact analysis
- Single DEX dominance accepted

### 📊 Supported DEXs
- PancakeSwap V2 & V3
- Biswap, ApeSwap, BabySwap
- MDEX, Liquidmesh