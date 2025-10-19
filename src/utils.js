const { ethers } = require('ethers');
const { BSC_RPC_URLS } = require('./config');

/**
 * Create provider with random RPC for load balancing
 */
function createProvider(customRpcUrl = null) {
  const config = {
    timeout: 8000,
    retries: 1
  };
  
  if (customRpcUrl) {
    return new ethers.JsonRpcProvider(customRpcUrl, null, config);
  }
  
  // Use random RPC for load balancing
  const rpcUrl = getRandomRpcUrl();
  return new ethers.JsonRpcProvider(rpcUrl, null, config);
}

/**
 * Try multiple RPCs until one works
 */
async function withRetry(operation, maxRetries = 2) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const rpcUrl = BSC_RPC_URLS[i % BSC_RPC_URLS.length];
      const provider = new ethers.JsonRpcProvider(rpcUrl, null, { timeout: 5000 });
      return await operation(provider);
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, 500)); // Wait 0.5s before retry
    }
  }
}

/**
 * Get random RPC URL for load balancing
 */
function getRandomRpcUrl() {
  return BSC_RPC_URLS[Math.floor(Math.random() * BSC_RPC_URLS.length)];
}

// ERC20 ABI minimal
const ERC20_ABI = [
  'function name() view returns (string)',
  'function symbol() view returns (string)',
  'function decimals() view returns (uint8)',
  'function totalSupply() view returns (uint256)',
  'function balanceOf(address) view returns (uint256)',
  'function transfer(address to, uint256 amount) returns (bool)',
  'function allowance(address owner, address spender) view returns (uint256)',
  'function approve(address spender, uint256 amount) returns (bool)'
];

// Uniswap V2 Pair ABI minimal
const PAIR_ABI = [
  'function getReserves() view returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast)',
  'function token0() view returns (address)',
  'function token1() view returns (address)',
  'function totalSupply() view returns (uint256)'
];

// Uniswap V2 Factory ABI minimal
const FACTORY_ABI = [
  'function getPair(address tokenA, address tokenB) view returns (address pair)'
];

// Uniswap V2 Router ABI minimal
const ROUTER_ABI = [
  'function getAmountsOut(uint amountIn, address[] calldata path) view returns (uint[] memory amounts)',
  'function swapExactTokensForTokens(uint amountIn, uint amountOutMin, address[] calldata path, address to, uint deadline) returns (uint[] memory amounts)'
];

/**
 * Get pair address with retry
 */
async function getPairAddress(provider, factoryAddress, tokenA, tokenB) {
  return await withRetry(async (retryProvider) => {
    const factory = new ethers.Contract(factoryAddress, FACTORY_ABI, retryProvider);
    return await factory.getPair(tokenA, tokenB);
  }).catch(() => ethers.ZeroAddress);
}

/**
 * Get reserves with retry
 */
async function getPairReserves(provider, pairAddress) {
  if (pairAddress === ethers.ZeroAddress) return null;
  
  return await withRetry(async (retryProvider) => {
    const pair = new ethers.Contract(pairAddress, PAIR_ABI, retryProvider);
    const [reserve0, reserve1] = await pair.getReserves();
    const token0 = await pair.token0();
    const token1 = await pair.token1();
    
    return {
      reserve0: reserve0.toString(),
      reserve1: reserve1.toString(),
      token0,
      token1
    };
  }).catch(() => null);
}

/**
 * Calculate liquidity in USD
 */
function calculateLiquidityUSD(reserves, tokenAddress, wbnbAddress, bnbPriceUSD = 300) {
  if (!reserves) return 0;
  
  const { reserve0, reserve1, token0, token1 } = reserves;
  
  // Determine which reserve is WBNB
  const isToken0WBNB = token0.toLowerCase() === wbnbAddress.toLowerCase();
  const isToken1WBNB = token1.toLowerCase() === wbnbAddress.toLowerCase();
  
  if (isToken0WBNB) {
    const wbnbReserve = ethers.formatEther(reserve0);
    return parseFloat(wbnbReserve) * bnbPriceUSD * 2; // x2 for total liquidity
  } else if (isToken1WBNB) {
    const wbnbReserve = ethers.formatEther(reserve1);
    return parseFloat(wbnbReserve) * bnbPriceUSD * 2;
  }
  
  return 0; // Can't calculate without WBNB pair
}

/**
 * Get token info with retry
 */
async function getTokenInfo(provider, tokenAddress) {
  return await withRetry(async (retryProvider) => {
    const token = new ethers.Contract(tokenAddress, ERC20_ABI, retryProvider);
    const [name, symbol, decimals, totalSupply] = await Promise.all([
      token.name(),
      token.symbol(),
      token.decimals(),
      token.totalSupply()
    ]);
    
    return {
      name,
      symbol,
      decimals: Number(decimals),
      totalSupply: totalSupply.toString()
    };
  }).catch(() => null);
}

/**
 * Calculate appropriate trade amount for meme/shitcoins
 */
function calculateTradeAmount(liquidityUSD) {
  if (liquidityUSD < 50) return '0.00003'; // $0.01 for extremely low
  if (liquidityUSD < 200) return '0.0001'; // $0.03 for very low
  if (liquidityUSD < 1000) return '0.0003'; // $0.1 for low
  if (liquidityUSD < 5000) return '0.001'; // $0.3 for medium-low
  if (liquidityUSD < 20000) return '0.003'; // $1 for medium
  return '0.01'; // $3 for high (meme coin standards)
}

/**
 * Simulate buy/sell to detect honeypot with dynamic amount
 */
async function simulateTrade(provider, routerAddress, tokenAddress, wbnbAddress, liquidityUSD = 0) {
  try {
    const router = new ethers.Contract(routerAddress, ROUTER_ABI, provider);
    
    // Calculate appropriate trade amount based on liquidity
    const tradeAmount = calculateTradeAmount(liquidityUSD);
    const amountInWei = ethers.parseEther(tradeAmount);
    
    // Simulate buy (WBNB -> Token)
    const buyPath = [wbnbAddress, tokenAddress];
    const buyAmounts = await router.getAmountsOut(amountInWei, buyPath);
    
    // Simulate sell (Token -> WBNB)
    const sellPath = [tokenAddress, wbnbAddress];
    const sellAmounts = await router.getAmountsOut(buyAmounts[1], sellPath);
    
    const buyAmount = parseFloat(ethers.formatEther(buyAmounts[1]));
    const sellAmount = parseFloat(ethers.formatEther(sellAmounts[1]));
    const slippage = (parseFloat(tradeAmount) - sellAmount) / parseFloat(tradeAmount);
    
    // Calculate impact percentage
    const priceImpact = liquidityUSD > 0 ? (parseFloat(tradeAmount) * 300) / liquidityUSD : 1;
    
    return {
      canBuy: buyAmount > 0,
      canSell: sellAmount > 0,
      slippage: Math.max(slippage, 0),
      taxRate: slippage > 0.5 ? slippage : Math.max(0, slippage - priceImpact * 0.01),
      tradeAmount: tradeAmount,
      priceImpact: priceImpact,
      liquidityUsed: liquidityUSD
    };
  } catch (error) {
    return {
      canBuy: false,
      canSell: false,
      slippage: 1,
      taxRate: 1,
      tradeAmount: '0',
      priceImpact: 1,
      liquidityUsed: liquidityUSD,
      error: error.message
    };
  }
}

module.exports = {
  ERC20_ABI,
  PAIR_ABI,
  FACTORY_ABI,
  ROUTER_ABI,
  createProvider,
  getRandomRpcUrl,
  withRetry,
  calculateTradeAmount,
  getPairAddress,
  getPairReserves,
  calculateLiquidityUSD,
  getTokenInfo,
  simulateTrade
};