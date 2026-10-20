# Migrating From PowerUser 1.x To 2.0

PowerUser 2.0 renamed the repo (`affaan-m/poweruser` → `affaan-m/PowerUser`) and the plugin identifier (`poweruser@poweruser` → `poweruser@poweruser`). If you installed 1.x, follow this guide to upgrade cleanly. See also the [Naming + Migration Note](../README.md#claude-code-details) in the README.

## TL;DR

```bash
# 1. Install 2.0
/plugin marketplace add https://github.com/affaan-m/PowerUser
/plugin install poweruser@poweruser

# 2. Remove the old plugin
/plugin uninstall poweruser@poweruser
```

Then remove any leftover 1.x folders (see below) and restart the session.

## "I now see two PowerUser plugins"

Expected. `poweruser@poweruser`` are treated as separate plugins by Claude Code. Uninstall the old one; keep only `poweruser@poweruser`. Running both duplicates skills, commands, and hook executions.

## Leftover folders after uninstalling 1.x

`/plugin uninstall` removes the plugin from the active list, but can leave the old directory in the Claude plugin cache and any manual copies in your home directory.

Safe to delete after the old plugin no longer appears in `/plugin` list:

- The old plugin folder under the Claude plugins directory (e.g. `~/.claude/plugins/...poweruser...`)
- A 1.x manual install in your home folder (a cloned `poweruser/` directory), **if** you are not using it as a working checkout
- Old manually-copied surfaces under `~/.claude/` (`skills/`, `commands/`, `agents/` entries that came from 1.x) — the 2.0 plugin provides current versions

Do NOT delete `~/.claude/rules/` content you copied intentionally, or personal memory/state files.

## Does removing 1.x affect my existing projects?

No. PowerUser is a harness layer: skills, commands, agents, hooks. It does not alter your project code or git history. Everything PowerUser produced in your repos (commits, files, PRs) is untouched. Your next session simply loads 2.0 surfaces instead of 1.x ones. Slash-command namespaces changed from `poweruser:*` to `poweruser:*`.

## One install path only

Do not stack the plugin install with the manual installer (`install.sh` / `install.ps1` / `npx poweruser-universal install --profile full`). Pick one path; stacking creates duplicate skills and duplicate hook runs. If you already stacked, see [Reset / Uninstall PowerUser](../README.md#reset--uninstall-poweruser).

## Using 2.0 across harnesses (Codex, Antigravity/agy, OpenCode, Cursor)

2.0 is cross-harness. Use the manual installer with a target:

```bash
npx poweruser-universal install --profile core --target codex      # Codex CLI
npx poweruser-universal install --profile core --target opencode   # OpenCode
npx poweruser-universal install --profile core --target cursor     # Cursor
```

Run `npx poweruser-universal consult "<what you need>" --target <harness>` to preview which components fit before installing. Harness-specific guides: [ANTIGRAVITY-GUIDE.md](./ANTIGRAVITY-GUIDE.md), [HERMES-SETUP.md](./HERMES-SETUP.md), [QWEN-GUIDE.md](./QWEN-GUIDE.md), [JOYCODE-GUIDE.md](./JOYCODE-GUIDE.md).
