/**
 * IPC Event Handlers Module
 * Aggregates and exports all event handlers for the main process
 */

// Import and initialize all event handlers
import './window';
import './updates';

// Export handler modules for direct access if needed
export * as windowEvents from './window';
export * as updateEvents from './updates';
