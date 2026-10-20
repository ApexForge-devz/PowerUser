# Agent Orchestration

## Available Agents

PowerUser agents come either from the `poweruser@poweruser` plugin (plugin-scoped names, `poweruser:<name>`) or from a manual install into `~/.claude/agents/` (bare names, `<name>`). Use the name that matches the install you have; the manual installer strips the `poweruser:` prefix from copied files.
They are invoked through the Agent tool with that `subagent_type`:

```text
Agent(subagent_type: "poweruser:planner", prompt: "...")
```

| Agent | Purpose | When to Use |
|-------|---------|-------------|
| poweruser:planner | Implementation planning | Complex features, refactoring |
| poweruser:architect | System design | Architectural decisions |
| poweruser:tdd-guide | Test-driven development | New features, bug fixes |
| poweruser:code-reviewer | Code review | After writing code |
| poweruser:security-reviewer | Security analysis | Before commits |
| poweruser:build-error-resolver | Fix build errors | When build fails |
| poweruser:e2e-runner | E2E testing | Critical user flows |
| poweruser:refactor-cleaner | Dead code cleanup | Code maintenance |
| poweruser:doc-updater | Documentation | Updating docs |
| poweruser:rust-reviewer | Rust code review | Rust projects |
| poweruser:harmonyos-app-resolver | HarmonyOS app development | HarmonyOS/ArkTS projects |

For the full roster of 69 agents, see `/poweruser:poweruser-guide`.

## Immediate Agent Usage

No user prompt needed:
1. Complex feature requests - Use **poweruser:planner** agent
2. Code just written/modified - Use **poweruser:code-reviewer** agent
3. Bug fix or new feature - Use **poweruser:tdd-guide** agent
4. Architectural decision - Use **poweruser:architect** agent

## Parallel Task Execution

ALWAYS use parallel Task execution for independent operations:

```markdown
# GOOD: Parallel execution
Launch 3 agents in parallel:
1. Agent 1: Security analysis of auth module
2. Agent 2: Performance review of cache system
3. Agent 3: Type checking of utilities

# BAD: Sequential when unnecessary
First agent 1, then agent 2, then agent 3
```

## Delegation Completion Contract

Applies to every agent at every depth (parent, child, grandchild):

1. **Your final message IS the deliverable.** Never end your turn with "waiting for background agents" — a spawned task is not a completed task. Ending your turn while children are running orphans their results (completed children cannot notify a parent whose turn has ended).
2. **If you delegate, you own collection.** Wait for results, integrate them, then return. Fire-and-forget delegation is forbidden.
3. **Decompose only when the work cannot fit in one context.** Do not re-delegate a task already sized for a single agent — depth is an outcome, not a plan.

> Rationale: observed failure mode — research agents followed "Parallel Task Execution" above, spawned children, and returned "waiting" as their final answer. All children completed successfully but their results were orphaned. The parallel rule without a completion contract produces zombie tasks.

## Multi-Perspective Analysis

For complex problems, use split role sub-agents:
- Factual reviewer
- Senior engineer
- Security expert
- Consistency reviewer
- Redundancy checker
