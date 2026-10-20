/**
 * PowerUser Plugins for OpenCode
 *
 * This module exports all PowerUser plugins for OpenCode integration.
 * Plugins provide hook-based automation that mirrors Claude Code's hook system
 * while taking advantage of OpenCode's more sophisticated 20+ event types.
 */

export { PowerUserHooksPlugin, default } from "./poweruser-hooks.ts"

// Re-export for named imports
export * from "./poweruser-hooks.ts"
