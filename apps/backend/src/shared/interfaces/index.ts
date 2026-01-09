/**
 * Shared Interfaces
 *
 * This module exports all shared interfaces (ports) that define contracts
 * for infrastructure implementations. These interfaces enable dependency
 * inversion and allow the domain layer to remain independent of infrastructure.
 *
 * Following Clean Architecture principles:
 * - Domain/Application layers depend on these abstractions
 * - Infrastructure layer provides concrete implementations
 * - No infrastructure dependencies in this module
 */

// Resilience service interfaces
export * from './retry';
export * from './circuit-breaker';

// Cryptographic service interfaces
export * from './hash';
