const { ethers } = require('ethers');
const { DEX_CONFIG, BSC_CONFIG, RISK_THRESHOLDS } = require('./config');
const { 
  createProvider,
  getRandomRpcUrl,
  getPairAddress, 
  getPairReserves, 
  calculateLiquidityUSD, 
  getTokenInfo, 
  simulateTrade 
} = require('./utils');

class HoneypotDetector {
  constructor(rpcUrl = null) {
    this.provider = createProvider(rpcUrl);
    this.wbnb = BSC_CONFIG.wbnb;
  }

  /**
   * Main function to check if token is honeypot
   */
  async checkToken(tokenAddress) {
    try {
      console.log(`Checking token: ${tokenAddress}`);
      
      // Get basic token info
      const tokenInfo = await getTokenInfo(this.provider, tokenAddress);
      if (!tokenInfo) {
        return {
          isHoneypot: true,
          riskLevel: 'high',
          error: 'Invalid token address or contract'
        };
      }
      
      // Check if this is an LP token
      if (tokenInfo.name.includes('LP') || tokenInfo.name.includes('Pancake') || 
          tokenInfo.symbol.includes('LP') || tokenInfo.symbol.includes('-LP')) {
        return {
          tokenInfo,
          isHoneypot: false,
          riskLevel: 'info',
          checks: { canSell: false, hasHighTax: false, hasLiquidity: false, singleDexDominance: false },
          liquidity: { totalLiquidity: 0, dexDistribution: {}, riskFactors: {} },
          trading: { canBuy: false, canSell: false, slippage: 0, taxRate: 0 },
          details: {
            risks: [],
            recommendation: 'This is an LP (Liquidity Provider) token, not a trading token'
          }
        };
      }

      // Check liquidity across all DEXs
      const liquidityCheck = await this.checkLiquidityAllDEX(tokenAddress);
      
      // Simulate trades on DEX with highest liquidity
      const tradeSimulation = await this.simulateTradesMainDEX(tokenAddress, liquidityCheck);
      
      // Analyze results
      const analysis = this.analyzeResults(tokenInfo, liquidityCheck, tradeSimulation);
      
      return {
        tokenInfo,
        isHoneypot: analysis.isHoneypot,
        riskLevel: analysis.riskLevel,
        checks: {
          canSell: tradeSimulation.canSell,
          hasHighTax: tradeSimulation.taxRate > RISK_THRESHOLDS.maxTaxRate,
          hasLiquidity: liquidityCheck.totalLiquidity > RISK_THRESHOLDS.minLiquidity,
          singleDexDominance: liquidityCheck.riskFactors.singleDexDominance
        },
        liquidity: liquidityCheck,
        trading: tradeSimulation,
        details: analysis.details
      };
      
    } catch (error) {
      return {
        isHoneypot: true,
        riskLevel: 'high',
        error: error.message
      };
    }
  }

  /**
   * Check liquidity across all configured DEXs with multiple base tokens
   */
  async checkLiquidityAllDEX(tokenAddress) {
    const results = {
      totalLiquidity: 0,
      dexDistribution: {},
      riskFactors: {
        singleDexDominance: false,
        lowTotalLiquidity: false,
        noPairs: false
      }
    };

    // Check all available DEXs
    const memeCoinDexs = Object.keys(DEX_CONFIG);
    // Base tokens to check pairs against
    const baseTokens = {
      wbnb: { address: this.wbnb, price: 300 },
      usdt: { address: BSC_CONFIG.usdt, price: 1 },
      busd: { address: BSC_CONFIG.busd, price: 1 }
    };
    
    const liquidityPromises = memeCoinDexs.map(async (dexKey) => {
      const dexConfig = DEX_CONFIG[dexKey];
      let maxLiquidity = 0;
      let bestPair = ethers.ZeroAddress;
      
      try {
        // Check pairs with all base tokens
        for (const [baseName, baseToken] of Object.entries(baseTokens)) {
          const pairAddress = await getPairAddress(this.provider, dexConfig.factory, tokenAddress, baseToken.address);
          const reserves = await getPairReserves(this.provider, pairAddress);
          const liquidity = calculateLiquidityUSD(reserves, tokenAddress, baseToken.address, baseToken.price);
          
          if (liquidity > maxLiquidity) {
            maxLiquidity = liquidity;
            bestPair = pairAddress;
          }
          
          console.log(`${dexConfig.name} - ${baseName.toUpperCase()}: $${liquidity.toFixed(0)}`);
        }
        
        return {
          dex: dexKey,
          name: dexConfig.name,
          liquidity: maxLiquidity,
          pairAddress: bestPair,
          hasLiquidity: maxLiquidity > 0
        };
      } catch (error) {
        return {
          dex: dexKey,
          name: dexConfig.name,
          liquidity: 0,
          pairAddress: ethers.ZeroAddress,
          hasLiquidity: false,
          error: error.message
        };
      }
    });

    const liquidityResults = await Promise.all(liquidityPromises);
    
    // Process results
    liquidityResults.forEach(result => {
      results.dexDistribution[result.dex] = {
        name: result.name,
        liquidity: result.liquidity,
        percentage: 0, // Will calculate after total
        hasLiquidity: result.hasLiquidity,
        pairAddress: result.pairAddress
      };
      results.totalLiquidity += result.liquidity;
    });

    // Calculate percentages and risk factors
    const liquidityValues = Object.values(results.dexDistribution).map(d => d.liquidity);
    const maxLiquidity = Math.max(...liquidityValues);
    
    Object.keys(results.dexDistribution).forEach(dex => {
      const liquidity = results.dexDistribution[dex].liquidity;
      results.dexDistribution[dex].percentage = results.totalLiquidity > 0 
        ? (liquidity / results.totalLiquidity) * 100 
        : 0;
    });

    // Set risk factors
    results.riskFactors.singleDexDominance = results.totalLiquidity > 0 && 
      (maxLiquidity / results.totalLiquidity) > RISK_THRESHOLDS.maxSingleDexDominance;
    results.riskFactors.lowTotalLiquidity = results.totalLiquidity < RISK_THRESHOLDS.minLiquidity;
    results.riskFactors.noPairs = results.totalLiquidity === 0;

    return results;
  }

  /**
   * Simulate trades on the DEX with highest liquidity
   */
  async simulateTradesMainDEX(tokenAddress, liquidityCheck) {
    // Find DEX with highest liquidity
    let bestDex = 'pancakeswapV2';
    let maxLiquidity = 0;
    
    Object.entries(liquidityCheck.dexDistribution).forEach(([dex, info]) => {
      if (info.liquidity > maxLiquidity) {
        maxLiquidity = info.liquidity;
        bestDex = dex;
      }
    });
    
    const dexConfig = DEX_CONFIG[bestDex];
    if (!dexConfig || maxLiquidity === 0) {
      return {
        dex: 'No Liquidity',
        canBuy: false,
        canSell: false,
        slippage: 1,
        taxRate: 1,
        tradeAmount: '0',
        priceImpact: 1,
        liquidityUsed: 0,
        error: 'No liquidity found'
      };
    }
    
    try {
      const simulation = await simulateTrade(
        this.provider,
        dexConfig.router,
        tokenAddress,
        this.wbnb,
        maxLiquidity
      );
      
      return {
        dex: dexConfig.name,
        ...simulation
      };
    } catch (error) {
      return {
        dex: dexConfig.name,
        canBuy: false,
        canSell: false,
        slippage: 1,
        taxRate: 1,
        tradeAmount: '0',
        priceImpact: 1,
        liquidityUsed: maxLiquidity,
        error: error.message
      };
    }
  }

  /**
   * Analyze all results to determine honeypot status
   */
  analyzeResults(tokenInfo, liquidityCheck, tradeSimulation) {
    const risks = [];
    let riskScore = 0;

    // Check if can't sell
    if (!tradeSimulation.canSell) {
      risks.push('Cannot sell token - likely honeypot');
      riskScore += 50;
    }

    // Check high tax
    if (tradeSimulation.taxRate > RISK_THRESHOLDS.maxTaxRate) {
      risks.push(`High tax rate: ${(tradeSimulation.taxRate * 100).toFixed(1)}%`);
      riskScore += 30;
    }
    
    // Check dangerous liquidity levels for meme coins
    if (liquidityCheck.totalLiquidity < RISK_THRESHOLDS.dangerousLiquidity) {
      risks.push(`Dangerous liquidity: $${liquidityCheck.totalLiquidity.toFixed(0)} - High rug risk`);
      riskScore += 60;
    } else if (liquidityCheck.totalLiquidity < RISK_THRESHOLDS.microLiquidity) {
      risks.push(`Micro liquidity: $${liquidityCheck.totalLiquidity.toFixed(0)} - Very risky`);
      riskScore += 40;
    }
    
    // Check price impact for meme coins (more lenient)
    if (tradeSimulation.priceImpact > 0.5) {
      risks.push(`Extreme price impact: ${(tradeSimulation.priceImpact * 100).toFixed(1)}%`);
      riskScore += 30;
    } else if (tradeSimulation.priceImpact > 0.2) {
      risks.push(`High price impact: ${(tradeSimulation.priceImpact * 100).toFixed(1)}% - Normal for meme coins`);
      riskScore += 10;
    }
    
    // Check if only micro trades possible
    if (parseFloat(tradeSimulation.tradeAmount) <= 0.00003) {
      risks.push('Only dust trades possible - Extremely dangerous');
      riskScore += 50;
    }

    // Check low liquidity
    if (liquidityCheck.riskFactors.lowTotalLiquidity) {
      risks.push(`Low liquidity: $${liquidityCheck.totalLiquidity.toFixed(0)}`);
      riskScore += 20;
    }

    // Check no pairs
    if (liquidityCheck.riskFactors.noPairs) {
      risks.push('No trading pairs found');
      riskScore += 40;
    }

    // Single DEX dominance is normal for meme coins, but still note it
    if (liquidityCheck.riskFactors.singleDexDominance && liquidityCheck.totalLiquidity > 1000) {
      risks.push('Single DEX dominance - Normal for meme coins');
      riskScore += 5; // Lower penalty for meme coins
    }

    // Determine risk level and honeypot status
    let riskLevel = 'low';
    let isHoneypot = false;

    if (riskScore >= 50) {
      riskLevel = 'high';
      isHoneypot = true;
    } else if (riskScore >= 25) {
      riskLevel = 'medium';
    }

    return {
      isHoneypot,
      riskLevel,
      riskScore,
      details: {
        risks,
        totalRiskFactors: risks.length,
        recommendation: isHoneypot 
          ? 'DO NOT TRADE - High risk of honeypot' 
          : riskLevel === 'medium' 
            ? 'CAUTION - Medium risk, trade carefully'
            : 'LOW RISK - Appears safe to trade'
      }
    };
  }
}

module.exports = HoneypotDetector;