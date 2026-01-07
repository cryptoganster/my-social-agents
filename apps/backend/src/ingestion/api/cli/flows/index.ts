/**
 * Flow Exports
 *
 * This module exports all CLI flow functions.
 * Flows represent interactive user operations in the CLI.
 *
 * Each flow:
 * - Accepts INestApplicationContext as parameter
 * - Returns Promise<FlowResult> ('main' | 'exit')
 * - Handles user interaction and command execution
 * - Manages error handling and user feedback
 */

// Flow exports
export { ingestFlow } from './ingest-flow';
export { scheduleFlow } from './schedule-flow';
export { configureFlow } from './configure-flow';
export { JsonEditorFlow } from './json-editor-flow';
export { TemplateSelectionFlow } from './template-selection-flow';
