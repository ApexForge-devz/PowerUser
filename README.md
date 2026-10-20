# PowerUser

PowerUser is an open-source collection of agent workflows, skills, hooks, rules, and tooling for Claude Code, Codex, Hermes, Kimi, and OpenCode.

This fork is maintained at **[ApexForge-devz/PowerUser](https://github.com/ApexForge-devz/PowerUser)**. It builds on the upstream project and retains its MIT license and applicable attribution notices.

## Supported coding agents

PowerUser maintains integration support for **Claude Code, Codex, Hermes, Kimi, and OpenCode**. Other agent-platform adapters and their native configuration files are not included.

## Catalog

PowerUser currently provides access to 71 agents, 311 skills, and 97 legacy command shims.

|-- agents/ # 71 specialized subagents for delegation
|-- commands/ # 97 maintained slash-command shims
|-- skills/ # 311 reusable workflows loaded on demand

| Category | Count |
| --- | ---: |
| Agents | 71 agents |
| Commands | 97 commands |
| Skills | 311 skills |

## Codex desktop plugin

PowerUser includes a native Codex plugin manifest and a local-marketplace entry.

### Install from a checkout

Clone the repository, then add its path as a marketplace from a Codex CLI session:

```powershell
git clone https://github.com/ApexForge-devz/PowerUser.git
codex plugin marketplace add C:\path\to\PowerUser
codex plugin add poweruser@poweruser
codex plugin list --json
```

Replace the example path with the absolute path where you cloned the repository. Restart Codex and start a new conversation after installation. In the Codex desktop app, the repository can also be registered as a personal local plugin marketplace where that feature is available.

PowerUser uses `poweruser@poweruser` as the native plugin ID for new installations.

### Configure and use

Start a new conversation and invoke the configuration skill:

```text
$configure-poweruser
```

Skills are loaded on demand; you do not need to explicitly invoke every skill in the repository. Select the task-specific workflow for planning, test-driven implementation, security review, or final verification. Review and explicitly trust lifecycle hooks in Codex before enabling them.

## Development

Requirements and checks are documented in the repository. Common checks include:

```powershell
npm install
npm test
```

Some test suites also require platform-specific tools or external runtimes. Report checks as passed only when they have actually run.

The primary CLI entrypoint is `scripts/poweruser.js`. The project is a source checkout; this fork does not claim a separately published npm package or hosted GitHub App.

## Project structure

- `.codex-plugin/` — native Codex plugin manifest and usage notes
- `.claude-plugin/` — Claude Code plugin manifest
- `.agents/plugins/marketplace.json` — local plugin marketplace metadata
- `skills/` — reusable task workflows
- `agents/` — specialized agent prompts
- `hooks/` — supported automation hooks
- `docs/` — English design, harness, and development documentation
- `scripts/` — installer, tooling, validation, and compatibility utilities

## License and attribution

PowerUser is distributed under the MIT license. See [LICENSE](LICENSE) and retain existing copyright and attribution notices when redistributing or modifying upstream-derived files.
