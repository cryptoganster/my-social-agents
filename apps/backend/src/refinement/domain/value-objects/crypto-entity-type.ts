/**
 * Comprehensive taxonomy of crypto ecosystem entities.
 *
 * This enum covers the full spectrum of entities that can be extracted from crypto content,
 * enabling rich semantic search and filtering across assets, actors, events, regulations,
 * and other domain-relevant concepts.
 *
 * @remarks
 * Entity types are organized into logical categories for maintainability.
 * Each type represents a distinct concept in the crypto ecosystem.
 */
export enum CryptoEntityType {
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

/**
 * Type guard to check if a string is a valid CryptoEntityType
 */
export function isCryptoEntityType(value: string): value is CryptoEntityType {
  return Object.values(CryptoEntityType).includes(value as CryptoEntityType);
}

/**
 * Get all entity types as an array
 */
export function getAllEntityTypes(): CryptoEntityType[] {
  return Object.values(CryptoEntityType);
}

/**
 * Entity type categories for grouping and filtering
 */
export const ENTITY_TYPE_CATEGORIES = {
  ASSETS: [
    CryptoEntityType.TOKEN,
    CryptoEntityType.STABLECOIN,
    CryptoEntityType.NFT,
    CryptoEntityType.DERIVATIVE,
    CryptoEntityType.SYNTHETIC_ASSET,
    CryptoEntityType.GOVERNANCE_TOKEN,
    CryptoEntityType.REWARD_TOKEN,
    CryptoEntityType.WRAPPED_TOKEN,
  ],
  INFRASTRUCTURE: [
    CryptoEntityType.BLOCKCHAIN,
    CryptoEntityType.NETWORK,
    CryptoEntityType.LAYER,
    CryptoEntityType.SIDECHAIN,
    CryptoEntityType.ROLLUP,
    CryptoEntityType.CONSENSUS_MECHANISM,
    CryptoEntityType.NODE_TYPE,
    CryptoEntityType.CLIENT,
  ],
  DEFI: [
    CryptoEntityType.PROTOCOL,
    CryptoEntityType.SMART_CONTRACT,
    CryptoEntityType.CONTRACT_FUNCTION,
    CryptoEntityType.CONTRACT_EVENT,
    CryptoEntityType.POOL,
    CryptoEntityType.VAULT,
    CryptoEntityType.PAIR,
    CryptoEntityType.ORACLE,
    CryptoEntityType.STRATEGY,
  ],
  CEFI: [
    CryptoEntityType.EXCHANGE,
    CryptoEntityType.CUSTODIAN,
    CryptoEntityType.BROKER,
    CryptoEntityType.ISSUER,
    CryptoEntityType.PAYMENT_PROVIDER,
    CryptoEntityType.WALLET_PROVIDER,
  ],
  ACTORS: [
    CryptoEntityType.ORGANIZATION,
    CryptoEntityType.PERSON,
    CryptoEntityType.VALIDATOR,
    CryptoEntityType.MINER,
    CryptoEntityType.DEVELOPER,
    CryptoEntityType.DAO,
    CryptoEntityType.REGULATORY_BODY,
    CryptoEntityType.GOVERNMENT,
    CryptoEntityType.CENTRAL_BANK,
  ],
  MARKET: [
    CryptoEntityType.MARKET,
    CryptoEntityType.MARKET_CYCLE,
    CryptoEntityType.ECONOMIC_INDICATOR,
    CryptoEntityType.PRICE_ACTION,
    CryptoEntityType.LIQUIDITY_EVENT,
    CryptoEntityType.VOLATILITY_EVENT,
  ],
  EVENTS: [
    CryptoEntityType.ONCHAIN_EVENT,
    CryptoEntityType.GOVERNANCE_EVENT,
    CryptoEntityType.MARKET_EVENT,
    CryptoEntityType.SECURITY_EVENT,
    CryptoEntityType.PROTOCOL_EVENT,
    CryptoEntityType.LEGAL_EVENT,
  ],
  LEGAL: [
    CryptoEntityType.REGULATION,
    CryptoEntityType.LAW,
    CryptoEntityType.LEGAL_ACTION,
    CryptoEntityType.JURISDICTION,
    CryptoEntityType.SANCTION,
    CryptoEntityType.COMPLIANCE_REQUIREMENT,
  ],
  SECURITY: [
    CryptoEntityType.ATTACK,
    CryptoEntityType.VULNERABILITY,
    CryptoEntityType.EXPLOIT_TECHNIQUE,
    CryptoEntityType.RISK_FACTOR,
  ],
} as const;
