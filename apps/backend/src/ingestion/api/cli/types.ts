import { INestApplicationContext } from '@nestjs/common';

/**
 * Shared types for CLI flows
 *
 * This module defines common types used across all CLI flow modules
 * to ensure type safety and consistent contracts.
 *
 * Requirements: 10.1, 10.2, 10.3
 */

/**
 * Result type for flow functions
 *
 * Represents the navigation decision after a flow completes:
 * - 'main': Return to main menu
 * - 'exit': Exit application
 *
 * @example
 * ```typescript
 * async function myFlow(app: INestApplicationContext): Promise<FlowResult> {
 *   // ... flow logic
 *   return 'main'; // Return to main menu
 * }
 * ```
 */
export type FlowResult = 'main' | 'exit';

/**
 * Function signature for CLI flows
 *
 * All flow functions must accept an INestApplicationContext and return
 * a Promise<FlowResult> to maintain consistent contracts across flows.
 *
 * @param app - NestJS application context for dependency injection
 * @returns Promise resolving to 'main' (return to menu) or 'exit' (quit app)
 *
 * @example
 * ```typescript
 * const ingestFlow: FlowFunction = async (app) => {
 *   const commandBus = app.get(CommandBus);
 *   // ... execute commands
 *   return 'main';
 * };
 * ```
 */
export type FlowFunction = (
  app: INestApplicationContext,
) => Promise<FlowResult>;

/**
 * Menu action type
 *
 * Represents the menu loop control:
 * - 'continue': Continue showing menu
 * - 'exit': Exit menu loop
 *
 * Used internally by the main menu to control the application loop.
 */
export type MenuAction = 'continue' | 'exit';
