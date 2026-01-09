import { ValueObject } from '@/shared/kernel';
import { CryptoEntityType } from '@refinement/domain/value-objects/crypto-entity-type';

/**
 * Properties for CryptoEntity Value Object
 */
export interface CryptoEntityProps {
  type: CryptoEntityType;
  value: string;
  confidence: number;
  startPos: number;
  endPos: number;
}

/**
 * CryptoEntity Value Object
 *
 * Represents a crypto ecosystem entity extracted from content.
 * Immutable value object that captures entity type, value, confidence score,
 * and position within the source text.
 *
 * Supports comprehensive entity taxonomy covering assets, infrastructure, actors,
 * events, regulations, and security concepts across the crypto ecosystem.
 *
 * Requirements: Refinement 3.1-3.15 (expanded entity extraction)
 * Design: Value Objects section - CryptoEntity
 */
export class CryptoEntity extends ValueObject<CryptoEntityProps> {
  private constructor(props: CryptoEntityProps) {
    super(props);
    this.validate();
  }

  /**
   * Validates the crypto entity properties
   *
   * Invariants:
   * - Type must be a valid CryptoEntityType
   * - Value must not be empty
   * - Confidence must be between 0 and 1 (inclusive)
   * - startPos must be >= 0
   * - endPos must be > startPos
   */
  protected validate(): void {
    // Validate type
    if (!Object.values(CryptoEntityType).includes(this.props.type)) {
      throw new Error(`Invalid entity type: must be a valid CryptoEntityType`);
    }

    // Validate value
    if (!this.props.value || this.props.value.trim().length === 0) {
      throw new Error('Invalid entity value: must not be empty');
    }

    // Validate confidence
    if (
      typeof this.props.confidence !== 'number' ||
      Number.isNaN(this.props.confidence) ||
      this.props.confidence < 0 ||
      this.props.confidence > 1
    ) {
      throw new Error(
        'Invalid confidence: must be a number between 0 and 1 (inclusive)',
      );
    }

    // Validate positions
    if (
      typeof this.props.startPos !== 'number' ||
      Number.isNaN(this.props.startPos) ||
      this.props.startPos < 0
    ) {
      throw new Error('Invalid startPos: must be a non-negative number');
    }

    if (
      typeof this.props.endPos !== 'number' ||
      Number.isNaN(this.props.endPos) ||
      this.props.endPos <= this.props.startPos
    ) {
      throw new Error('Invalid endPos: must be greater than startPos');
    }
  }

  /**
   * Generic factory method for creating any entity type
   *
   * @param type - The entity type
   * @param value - Entity value/name
   * @param confidence - Confidence score (0.0 - 1.0)
   * @param startPos - Start position in text
   * @param endPos - End position in text
   * @returns A new CryptoEntity instance
   */
  static create(
    type: CryptoEntityType,
    value: string,
    confidence: number,
    startPos: number,
    endPos: number,
  ): CryptoEntity {
    return new CryptoEntity({
      type,
      value,
      confidence,
      startPos,
      endPos,
    });
  }

  // ─────────────────────────────────────────────────────────────
  // Convenience Factory Methods for Common Entity Types
  // ─────────────────────────────────────────────────────────────

  // Assets & Financial Instruments
  static token(v: string, c: number, s: number, e: number): CryptoEntity {
    return CryptoEntity.create(CryptoEntityType.TOKEN, v, c, s, e);
  }

  static stablecoin(v: string, c: number, s: number, e: number): CryptoEntity {
    return CryptoEntity.create(CryptoEntityType.STABLECOIN, v, c, s, e);
  }

  static nft(v: string, c: number, s: number, e: number): CryptoEntity {
    return CryptoEntity.create(CryptoEntityType.NFT, v, c, s, e);
  }

  static governanceToken(
    v: string,
    c: number,
    s: number,
    e: number,
  ): CryptoEntity {
    return CryptoEntity.create(CryptoEntityType.GOVERNANCE_TOKEN, v, c, s, e);
  }

  // Blockchain Infrastructure
  static blockchain(v: string, c: number, s: number, e: number): CryptoEntity {
    return CryptoEntity.create(CryptoEntityType.BLOCKCHAIN, v, c, s, e);
  }

  static network(v: string, c: number, s: number, e: number): CryptoEntity {
    return CryptoEntity.create(CryptoEntityType.NETWORK, v, c, s, e);
  }

  static layer(v: string, c: number, s: number, e: number): CryptoEntity {
    return CryptoEntity.create(CryptoEntityType.LAYER, v, c, s, e);
  }

  static rollup(v: string, c: number, s: number, e: number): CryptoEntity {
    return CryptoEntity.create(CryptoEntityType.ROLLUP, v, c, s, e);
  }

  // Smart Contracts & DeFi
  static protocol(v: string, c: number, s: number, e: number): CryptoEntity {
    return CryptoEntity.create(CryptoEntityType.PROTOCOL, v, c, s, e);
  }

  static smartContract(
    v: string,
    c: number,
    s: number,
    e: number,
  ): CryptoEntity {
    return CryptoEntity.create(CryptoEntityType.SMART_CONTRACT, v, c, s, e);
  }

  static pool(v: string, c: number, s: number, e: number): CryptoEntity {
    return CryptoEntity.create(CryptoEntityType.POOL, v, c, s, e);
  }

  static vault(v: string, c: number, s: number, e: number): CryptoEntity {
    return CryptoEntity.create(CryptoEntityType.VAULT, v, c, s, e);
  }

  static oracle(v: string, c: number, s: number, e: number): CryptoEntity {
    return CryptoEntity.create(CryptoEntityType.ORACLE, v, c, s, e);
  }

  // CeFi / Centralized Platforms
  static exchange(v: string, c: number, s: number, e: number): CryptoEntity {
    return CryptoEntity.create(CryptoEntityType.EXCHANGE, v, c, s, e);
  }

  static custodian(v: string, c: number, s: number, e: number): CryptoEntity {
    return CryptoEntity.create(CryptoEntityType.CUSTODIAN, v, c, s, e);
  }

  static broker(v: string, c: number, s: number, e: number): CryptoEntity {
    return CryptoEntity.create(CryptoEntityType.BROKER, v, c, s, e);
  }

  static walletProvider(
    v: string,
    c: number,
    s: number,
    e: number,
  ): CryptoEntity {
    return CryptoEntity.create(CryptoEntityType.WALLET_PROVIDER, v, c, s, e);
  }

  // Actors & Organizations
  static person(v: string, c: number, s: number, e: number): CryptoEntity {
    return CryptoEntity.create(CryptoEntityType.PERSON, v, c, s, e);
  }

  static organization(
    v: string,
    c: number,
    s: number,
    e: number,
  ): CryptoEntity {
    return CryptoEntity.create(CryptoEntityType.ORGANIZATION, v, c, s, e);
  }

  static regulatoryBody(
    v: string,
    c: number,
    s: number,
    e: number,
  ): CryptoEntity {
    return CryptoEntity.create(CryptoEntityType.REGULATORY_BODY, v, c, s, e);
  }

  static government(v: string, c: number, s: number, e: number): CryptoEntity {
    return CryptoEntity.create(CryptoEntityType.GOVERNMENT, v, c, s, e);
  }

  static dao(v: string, c: number, s: number, e: number): CryptoEntity {
    return CryptoEntity.create(CryptoEntityType.DAO, v, c, s, e);
  }

  // Market & Economics
  static market(v: string, c: number, s: number, e: number): CryptoEntity {
    return CryptoEntity.create(CryptoEntityType.MARKET, v, c, s, e);
  }

  static economicIndicator(
    v: string,
    c: number,
    s: number,
    e: number,
  ): CryptoEntity {
    return CryptoEntity.create(CryptoEntityType.ECONOMIC_INDICATOR, v, c, s, e);
  }

  static marketCycle(v: string, c: number, s: number, e: number): CryptoEntity {
    return CryptoEntity.create(CryptoEntityType.MARKET_CYCLE, v, c, s, e);
  }

  // Events
  static onchainEvent(
    v: string,
    c: number,
    s: number,
    e: number,
  ): CryptoEntity {
    return CryptoEntity.create(CryptoEntityType.ONCHAIN_EVENT, v, c, s, e);
  }

  static governanceEvent(
    v: string,
    c: number,
    s: number,
    e: number,
  ): CryptoEntity {
    return CryptoEntity.create(CryptoEntityType.GOVERNANCE_EVENT, v, c, s, e);
  }

  static marketEvent(v: string, c: number, s: number, e: number): CryptoEntity {
    return CryptoEntity.create(CryptoEntityType.MARKET_EVENT, v, c, s, e);
  }

  static securityEvent(
    v: string,
    c: number,
    s: number,
    e: number,
  ): CryptoEntity {
    return CryptoEntity.create(CryptoEntityType.SECURITY_EVENT, v, c, s, e);
  }

  static protocolEvent(
    v: string,
    c: number,
    s: number,
    e: number,
  ): CryptoEntity {
    return CryptoEntity.create(CryptoEntityType.PROTOCOL_EVENT, v, c, s, e);
  }

  static legalEvent(v: string, c: number, s: number, e: number): CryptoEntity {
    return CryptoEntity.create(CryptoEntityType.LEGAL_EVENT, v, c, s, e);
  }

  // Legal, Compliance & Risk
  static regulation(v: string, c: number, s: number, e: number): CryptoEntity {
    return CryptoEntity.create(CryptoEntityType.REGULATION, v, c, s, e);
  }

  static law(v: string, c: number, s: number, e: number): CryptoEntity {
    return CryptoEntity.create(CryptoEntityType.LAW, v, c, s, e);
  }

  static legalAction(v: string, c: number, s: number, e: number): CryptoEntity {
    return CryptoEntity.create(CryptoEntityType.LEGAL_ACTION, v, c, s, e);
  }

  static jurisdiction(
    v: string,
    c: number,
    s: number,
    e: number,
  ): CryptoEntity {
    return CryptoEntity.create(CryptoEntityType.JURISDICTION, v, c, s, e);
  }

  // Security & Threats
  static attack(v: string, c: number, s: number, e: number): CryptoEntity {
    return CryptoEntity.create(CryptoEntityType.ATTACK, v, c, s, e);
  }

  static vulnerability(
    v: string,
    c: number,
    s: number,
    e: number,
  ): CryptoEntity {
    return CryptoEntity.create(CryptoEntityType.VULNERABILITY, v, c, s, e);
  }

  static exploitTechnique(
    v: string,
    c: number,
    s: number,
    e: number,
  ): CryptoEntity {
    return CryptoEntity.create(CryptoEntityType.EXPLOIT_TECHNIQUE, v, c, s, e);
  }

  // ─────────────────────────────────────────────────────────────
  // Getters
  // ─────────────────────────────────────────────────────────────

  get type(): CryptoEntityType {
    return this.props.type;
  }

  get value(): string {
    return this.props.value;
  }

  get confidence(): number {
    return this.props.confidence;
  }

  get startPos(): number {
    return this.props.startPos;
  }

  get endPos(): number {
    return this.props.endPos;
  }

  // ─────────────────────────────────────────────────────────────
  // Confidence Classification
  // ─────────────────────────────────────────────────────────────

  get isHighConfidence(): boolean {
    return this.props.confidence >= 0.8;
  }

  get isMediumConfidence(): boolean {
    return this.props.confidence >= 0.5 && this.props.confidence < 0.8;
  }

  get isLowConfidence(): boolean {
    return this.props.confidence < 0.5;
  }

  // ─────────────────────────────────────────────────────────────
  // Utility Methods
  // ─────────────────────────────────────────────────────────────

  toString(): string {
    return `${this.props.type}:${this.props.value}@${this.props.confidence.toFixed(2)}`;
  }
}
