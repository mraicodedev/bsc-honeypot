// DEX configurations for BSC
const DEX_CONFIG = {
  pancakeswapV2: {
    name: 'PancakeSwap V2',
    router: '0x10ED43C718714eb63d5aA57B78B54704E256024E',
    factory: '0xcA143Ce32Fe78f1f7019d7d551a6402fC5350c73',
    initCodeHash: '0x00fb7f630766e6a796048ea87d01acd3068e8ff67d078148a3fa3f4a84f69bd5'
  },
  pancakeswapV3: {
    name: 'PancakeSwap V3',
    router: '0x13f4EA83D0bd40E75C8222255bc855a974568Dd4',
    factory: '0x0BFbCF9fa4f9C56B0F40a671Ad40E0805A091865'
  },
  biswap: {
    name: 'Biswap',
    router: '0x3a6d8cA21D1CF76F653A67577FA0D27453350dD8',
    factory: '0x858E3312ed3A876947EA49d572A7C42DE08af7EE'
  },
  apeswap: {
    name: 'ApeSwap',
    router: '0xcF0feBd3f17CEf5b47b0cD257aCf6025c5BFf3b7',
    factory: '0x0841BD0B734E4F5853f0dD8d7Ea041c241fb0Da6'
  },
  babyswap: {
    name: 'BabySwap',
    router: '0x325E343f1dE602396E256B67eFd1F61C3A6B38Bd',
    factory: '0x86407bEa2078ea5f5EB5A52B2caA963bC1F889Da'
  },
  mdex: {
    name: 'MDEX',
    router: '0x7DAe51BD3E3376B8c7c4900E9107f12Be3AF1bA8',
    factory: '0x3CD1C46068dAEa5Ebb0d3f55F6915B10648062B8'
  },
  liquidmesh: {
    name: 'Liquidmesh',
    router: '0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506', // Placeholder - cần verify
    factory: '0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f' // Placeholder - cần verify
  }
};

const BSC_RPC_URLS = [
  'https://bsc-dataseed1.binance.org/',
  'https://bsc-dataseed2.binance.org/',
  'https://bsc-dataseed3.binance.org/',
  'https://bsc-dataseed4.binance.org/'

];

const BSC_CONFIG = {
  rpcUrls: BSC_RPC_URLS,
  chainId: 56,
  wbnb: '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c',
  busd: '0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56',
  usdt: '0x55d398326f99059fF775485246999027B3197955'
};

const RISK_THRESHOLDS = {
  minLiquidity: 500, // $500 USD (lower for meme coins)
  maxTaxRate: 0.25, // 25% (meme coins usually have higher tax)
  maxSingleDexDominance: 0.95, // 95% (meme coins usually only on 1 DEX)
  minPairAge: 3600, // 1 hour (newly created meme coins)
  microLiquidity: 100, // $100 USD (extremely low)
  dangerousLiquidity: 50 // $50 USD (dangerous)
};

module.exports = {
  DEX_CONFIG,
  BSC_CONFIG,
  BSC_RPC_URLS,
  RISK_THRESHOLDS
};