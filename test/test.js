const { checkHoneypot } = require('@mraicodedev/bsc-honeypot-detector');

// For local development, use:
// const { checkHoneypot } = require('../src/index');

async function testHoneypotDetector() {
  console.log('🚀 BSC Honeypot Detector Test\n');

  // Test token address - change this to test different tokens
  const tokenAddress = '0xd6C9383d1030c3ca802632E139880d6f99604444';
  
  console.log(`Testing token: ${tokenAddress}`);
  console.time('Detection Time');
  
  try {
    const result = await checkHoneypot(tokenAddress);
    
    console.timeEnd('Detection Time');
    console.log('\n📊 Results:');
    console.log(`Token: ${result.tokenInfo?.name} (${result.tokenInfo?.symbol})`);
    console.log(`Is Honeypot: ${result.isHoneypot ? '🚨 YES' : '✅ NO'}`);
    console.log(`Risk Level: ${result.riskLevel?.toUpperCase()}`);
    console.log(`Total Liquidity: $${result.liquidity?.totalLiquidity?.toFixed(0) || 0}`);
    console.log(`Can Sell: ${result.checks?.canSell ? '✅ YES' : '❌ NO'}`);
    console.log(`Tax Rate: ${((result.trading?.taxRate || 0) * 100).toFixed(1)}%`);
    console.log(`Trade Amount: ${result.trading?.tradeAmount} BNB`);
    
    if (result.liquidity?.dexDistribution) {
      console.log('\n💰 Liquidity Distribution:');
      Object.entries(result.liquidity.dexDistribution).forEach(([dex, info]) => {
        if (info.liquidity > 0) {
          console.log(`  ${info.name}: $${info.liquidity.toFixed(0)} (${info.percentage.toFixed(1)}%)`);
        }
      });
    }
    
    if (result.details?.risks?.length > 0) {
      console.log('\n⚠️ Risk Factors:');
      result.details.risks.forEach(risk => console.log(`  - ${risk}`));
    }
    
    console.log(`\n💡 ${result.details?.recommendation}`);
    
  } catch (error) {
    console.timeEnd('Detection Time');
    console.error('❌ Test failed:', error.message);
  }
}

// Run test
testHoneypotDetector();