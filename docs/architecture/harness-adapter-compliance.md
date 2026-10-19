# Harness Adapter Compliance Matrix

This matrix is the public onramp for teams that want to use ECC across more
than one coding harness. It turns the cross-harness architecture into a
practical scorecard: what works today, what is instruction-only, what needs an
adapter, and what evidence an operator should collect before trusting a setup.

ECC's durable units stay in shared sources:

- `skills/*/SKILL.md`
- `rules/`
- `commands/`
- `hooks/hooks.json`
- `scripts/hooks/`
- MCP reference configs
- session and observability contracts

Harness-specific files should only adapt loading, event shape, command names,
or platform limits.

## Compliance States

| State | Meaning |
| --- | --- |
| Native | ECC can install or verify the surface directly for this harness. |
| Adapter-backed | ECC has a thin adapter, plugin, or package surface, but parity differs by harness. |
| Instruction-backed | ECC can provide the guidance and files, but the harness does not expose the runtime hook/session surface ECC needs for enforcement. |
| Reference-only | The tool is useful as a design pressure or external runtime, but ECC does not yet ship a direct installer or adapter for it. |

## Matrix

The matrix below is rendered from
`scripts/lib/harness-adapter-compliance.js` and verified by
`npm run harness:adapters -- --check`.

<!-- harness-adapter-compliance:matrix-start -->
| Harness or runtime | State | Supported assets | Unsupported or different surfaces | Install or onramp | Verification command | Risk notes |
| --- | --- | --- | --- | --- | --- | --- |
| Claude Code | Native | Claude plugin assets; skills; commands; hooks; MCP config; local rules; statusline-oriented workflows | Claude-native hooks do not imply parity in other harnesses | `./install.sh --profile minimal --target claude`; Claude plugin install | `npm run harness:audit -- --format json`; `node scripts/session-inspect.js --list-adapters` | Avoid loading every skill by default; keep hooks opt-in and inspectable. |
| Codex | Instruction-backed | `AGENTS.md`; Codex plugin metadata; skills; MCP reference config; command patterns | Native hook enforcement and Claude slash-command semantics are not equivalent | `./install.sh --profile minimal --target codex`; repo-local `AGENTS.md` review | `npm run harness:audit -- --format json` | Treat hooks as policy text unless a native Codex hook surface exists. |
| OpenCode | Adapter-backed | OpenCode package/plugin metadata; shared skills; MCP config; event adapter patterns | Event names, plugin packaging, and command dispatch differ from Claude Code | OpenCode package or plugin surface from this repo | `node tests/scripts/build-opencode.test.js`; `npm run harness:audit -- --format json` | Keep hook logic in shared scripts and adapt only event shape at the edge. |
| Hermes | Adapter-backed | Hermes home installation; shared skills, commands, and rules; Hermes-specific hooks; MCP reference config | Hermes hook execution and configuration semantics differ from Claude Code | `./install.sh --profile minimal --target hermes` | `node tests/lib/install-targets.test.js`; `node tests/hermes-hooks.test.js` | Keep Hermes-specific lifecycle hooks isolated under hooks/hermes and verify them in the target runtime. |
| Kimi | Adapter-backed | Kimi Code project instructions; shared Agent Skills via `.agents/skills`; MCP config; shared rules and commands | Kimi Code project installation is distinct from Claude home installation and does not imply Claude hook parity | `./install.sh --profile minimal --target kimi` | `node tests/lib/install-targets.test.js`; `npm run harness:audit -- --format json` | Keep all project-install writes confined to the `.kimi-code` target root and preserve unrelated project configuration. |
<!-- harness-adapter-compliance:matrix-end -->

## Scorecard Onramp

Use this sequence to verify the supported Claude Code, Codex, Hermes, Kimi, and OpenCode integrations:

```bash
npm run harness:adapters -- --check
npm run harness:audit -- --format json
npm run observability:ready
node scripts/session-inspect.js --list-adapters
node scripts/loop-status.js --json --write-dir .ecc/loop-status
```

Read the result as a setup scorecard, not a product badge:

- `harness:adapters -- --check` proves this public matrix still matches the
  adapter source data and required evidence fields.
- `harness:audit` scores tool coverage, context efficiency, quality gates,
  memory persistence, eval coverage, security guardrails, and cost efficiency.
- `observability:ready` proves the repo still exposes the local status,
  session, tool-activity, risk-ledger, and release-onramp signals.
- `session-inspect --list-adapters` shows which session surfaces are actually
  inspectable in the current environment.
- `loop-status --json` creates a machine-readable handoff/status payload for
  longer autonomous runs.

## Data-Backed Scorecard Contract

Each adapter record exposes:

- `id`
- `state`
- `supported_assets`
- `unsupported_surfaces`
- `install_or_onramp`
- `verification_commands`
- `risk_notes`
- `last_verified_at`
- `owner`
- `source_docs`

The validator fails if a public adapter claim has no install path,
verification command, risk note, owner, source doc, or verification date.

## Operating Rules

- Prefer small, additive adapters over harness-specific forks of the same
  workflow.
- Do not call a harness native until the adapter has an install path and a
  verification command.
- Keep Codex's instruction-backed surface distinct from runtime-backed adapters.
- Keep the shared CLI path healthy; it is the portability floor.
