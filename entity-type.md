export enum EntityType {
// ─────────────────────────────
// Assets & Financial Instruments
// ─────────────────────────────

TOKEN = 'token', // BTC, ETH, SOL, native or fungible crypto asset
STABLECOIN = 'stablecoin', // USDT, USDC, DAI, price-pegged tokens
NFT = 'nft', // Non-fungible tokens (BAYC, CryptoPunks)
DERIVATIVE = 'derivative', // Futures, options, perpetuals
SYNTHETIC_ASSET = 'synthetic_asset', // sUSD, synthetic BTC
GOVERNANCE_TOKEN = 'governance_token', // UNI, AAVE
REWARD_TOKEN = 'reward_token', // Incentive or emission-based token
WRAPPED_TOKEN = 'wrapped_token', // WBTC, WETH

// ─────────────────────────────
// Blockchain Infrastructure
// ─────────────────────────────

BLOCKCHAIN = 'blockchain', // Ethereum, Bitcoin, Solana
NETWORK = 'network', // Mainnet, Testnet, Devnet
LAYER = 'layer', // Layer 1, Layer 2, Layer 3
SIDECHAIN = 'sidechain', // Polygon PoS, xDai
ROLLUP = 'rollup', // Optimistic, ZK Rollup
CONSENSUS_MECHANISM = 'consensus_mechanism', // PoW, PoS, DPoS
NODE_TYPE = 'node_type', // Full node, light node, validator node
CLIENT = 'client', // Geth, Nethermind, Erigon

// ─────────────────────────────
// Smart Contracts & DeFi
// ─────────────────────────────

PROTOCOL = 'protocol', // Uniswap, Aave, Compound
SMART_CONTRACT = 'smart_contract', // Contract as a deployed entity
CONTRACT_FUNCTION = 'contract_function', // transfer(), swap(), mint()
CONTRACT_EVENT = 'contract_event', // Transfer, Approval
POOL = 'pool', // Liquidity pool
VAULT = 'vault', // Yield vault (Yearn)
PAIR = 'pair', // ETH/USDC
ORACLE = 'oracle', // Chainlink, Pyth
STRATEGY = 'strategy', // Yield or trading strategy

// ─────────────────────────────
// CeFi / Centralized Platforms
// ─────────────────────────────

EXCHANGE = 'exchange', // Binance, Coinbase
CUSTODIAN = 'custodian', // Fireblocks, BitGo
BROKER = 'broker', // Robinhood, eToro
ISSUER = 'issuer', // Tether, Circle
PAYMENT_PROVIDER = 'payment_provider', // MoonPay, Stripe
WALLET_PROVIDER = 'wallet_provider', // MetaMask, Ledger

// ─────────────────────────────
// Actors & Organizations
// ─────────────────────────────

ORGANIZATION = 'organization', // Ethereum Foundation, Uniswap Labs
PERSON = 'person', // Vitalik Buterin, CZ
VALIDATOR = 'validator', // Validator entities or roles
MINER = 'miner', // Mining actors
DEVELOPER = 'developer', // Core devs, contributors
DAO = 'dao', // Decentralized Autonomous Organization

REGULATORY_BODY = 'regulatory_body', // SEC, CFTC, ESMA
GOVERNMENT = 'government', // US Government, EU Commission
CENTRAL_BANK = 'central_bank', // FED, ECB

// ─────────────────────────────
// Market & Economics
// ─────────────────────────────

MARKET = 'market', // Spot market, derivatives market
MARKET_CYCLE = 'market_cycle', // Bull market, bear market
ECONOMIC_INDICATOR = 'economic_indicator', // Interest rates, CPI, inflation
PRICE_ACTION = 'price_action', // Pump, dump, consolidation
LIQUIDITY_EVENT = 'liquidity_event', // Liquidity crunch, liquidity injection
VOLATILITY_EVENT = 'volatility_event', // High volatility, low volatility

// ─────────────────────────────
// Events (Explicit separation)
// ─────────────────────────────

ONCHAIN_EVENT = 'onchain_event', // Transfer, mint, burn
GOVERNANCE_EVENT = 'governance_event', // Proposal, vote, delegation
MARKET_EVENT = 'market_event', // Crash, rally, delisting
SECURITY_EVENT = 'security_event', // Hack, exploit, vulnerability disclosure
PROTOCOL_EVENT = 'protocol_event', // Halving, merge, network upgrade
LEGAL_EVENT = 'legal_event', // Lawsuit, settlement, investigation

// ─────────────────────────────
// Legal, Compliance & Risk
// ─────────────────────────────

REGULATION = 'regulation', // MiCA, SEC rules
LAW = 'law', // Securities law, tax law
LEGAL_ACTION = 'legal_action', // Lawsuit, enforcement action
JURISDICTION = 'jurisdiction', // US, EU, Singapore
SANCTION = 'sanction', // OFAC sanctions
COMPLIANCE_REQUIREMENT = 'compliance_requirement', // KYC, AML

// ─────────────────────────────
// Security & Threats
// ─────────────────────────────

ATTACK = 'attack', // Rug pull, reentrancy attack
VULNERABILITY = 'vulnerability', // Integer overflow, oracle manipulation
EXPLOIT_TECHNIQUE = 'exploit_technique', // Flash loan attack
RISK_FACTOR = 'risk_factor', // Centralization risk, smart contract risk
}
