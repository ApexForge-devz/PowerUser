'use strict';

const fs = require('fs');
const path = require('path');

const MATRIX_BLOCK_START = '<!-- harness-adapter-compliance:matrix-start -->';
const MATRIX_BLOCK_END = '<!-- harness-adapter-compliance:matrix-end -->';

const COMPLIANCE_STATES = Object.freeze({
  Native: 'ECC can install or verify the surface directly for this harness.',
  'Adapter-backed': 'ECC has a thin adapter, plugin, or package surface, but parity differs by harness.',
  'Instruction-backed': 'ECC can provide the guidance and files, but the harness does not expose the runtime hook/session surface ECC needs for enforcement.',
  'Reference-only': 'The tool is useful as a design pressure or external runtime, but ECC does not yet ship a direct installer or adapter for it.',
});

const REQUIRED_FIELDS = Object.freeze([
  'id',
  'harness',
  'state',
  'supported_assets',
  'unsupported_surfaces',
  'install_or_onramp',
  'verification_commands',
  'risk_notes',
  'last_verified_at',
  'owner',
  'source_docs',
]);

function freezeRecord(record) {
  return Object.freeze({
    ...record,
    supported_assets: Object.freeze(record.supported_assets.slice()),
    unsupported_surfaces: Object.freeze(record.unsupported_surfaces.slice()),
    install_or_onramp: Object.freeze(record.install_or_onramp.slice()),
    verification_commands: Object.freeze(record.verification_commands.slice()),
    risk_notes: Object.freeze(record.risk_notes.slice()),
    source_docs: Object.freeze(record.source_docs.slice()),
  });
}

const ADAPTER_RECORDS = Object.freeze([
  {
    id: 'claude-code',
    harness: 'Claude Code',
    state: 'Native',
    supported_assets: [
      'Claude plugin assets',
      'skills',
      'commands',
      'hooks',
      'MCP config',
      'local rules',
      'statusline-oriented workflows',
    ],
    unsupported_surfaces: ['Claude-native hooks do not imply parity in other harnesses'],
    install_or_onramp: [
      '`./install.sh --profile minimal --target claude`',
      'Claude plugin install',
    ],
    verification_commands: [
      '`npm run harness:audit -- --format json`',
      '`node scripts/session-inspect.js --list-adapters`',
    ],
    risk_notes: ['Avoid loading every skill by default; keep hooks opt-in and inspectable.'],
    last_verified_at: '2026-05-12',
    owner: 'ECC maintainers',
    source_docs: [
      '.claude-plugin/plugin.json',
      'docs/architecture/cross-harness.md',
      'scripts/lib/install-targets/claude-home.js',
    ],
  },
  {
    id: 'codex',
    harness: 'Codex',
    state: 'Instruction-backed',
    supported_assets: [
      '`AGENTS.md`',
      'Codex plugin metadata',
      'skills',
      'MCP reference config',
      'command patterns',
    ],
    unsupported_surfaces: ['Native hook enforcement and Claude slash-command semantics are not equivalent'],
    install_or_onramp: [
      '`./install.sh --profile minimal --target codex`',
      'repo-local `AGENTS.md` review',
    ],
    verification_commands: ['`npm run harness:audit -- --format json`'],
    risk_notes: ['Treat hooks as policy text unless a native Codex hook surface exists.'],
    last_verified_at: '2026-05-12',
    owner: 'ECC maintainers',
    source_docs: [
      '.codex-plugin/plugin.json',
      'AGENTS.md',
      'scripts/lib/install-targets/codex-home.js',
    ],
  },
  {
    id: 'opencode',
    harness: 'OpenCode',
    state: 'Adapter-backed',
    supported_assets: [
      'OpenCode package/plugin metadata',
      'shared skills',
      'MCP config',
      'event adapter patterns',
    ],
    unsupported_surfaces: ['Event names, plugin packaging, and command dispatch differ from Claude Code'],
    install_or_onramp: ['OpenCode package or plugin surface from this repo'],
    verification_commands: [
      '`node tests/scripts/build-opencode.test.js`',
      '`npm run harness:audit -- --format json`',
    ],
    risk_notes: ['Keep hook logic in shared scripts and adapt only event shape at the edge.'],
    last_verified_at: '2026-05-12',
    owner: 'ECC maintainers',
    source_docs: [
      '.opencode/package.json',
      '.opencode/plugins/poweruser-hooks.ts',
      'scripts/build-opencode.js',
    ],
  },
  {
    id: 'hermes',
    harness: 'Hermes',
    state: 'Adapter-backed',
    supported_assets: ['Hermes home installation', 'shared skills, commands, and rules', 'Hermes-specific hooks', 'MCP reference config'],
    unsupported_surfaces: ['Hermes hook execution and configuration semantics differ from Claude Code'],
    install_or_onramp: ['`./install.sh --profile minimal --target hermes`'],
    verification_commands: ['`node tests/lib/install-targets.test.js`', '`node tests/hermes-hooks.test.js`'],
    risk_notes: ['Keep Hermes-specific lifecycle hooks isolated under hooks/hermes and verify them in the target runtime.'],
    last_verified_at: '2026-10-20',
    owner: 'PowerUser maintainers',
    source_docs: ['.hermes/README.md', 'docs/HERMES-HOOKS.md', 'scripts/lib/install-targets/hermes-home.js'],
  },
  {
    id: 'kimi',
    harness: 'Kimi',
    state: 'Adapter-backed',
    supported_assets: ['Kimi Code project instructions', 'shared Agent Skills via .agents/skills', 'MCP config', 'shared rules and commands'],
    unsupported_surfaces: ['Kimi Code project installation is distinct from Claude home installation and does not imply Claude hook parity'],
    install_or_onramp: ['`./install.sh --profile minimal --target kimi`'],
    verification_commands: ['`node tests/lib/install-targets.test.js`', '`npm run harness:audit -- --format json`'],
    risk_notes: ['Keep all project-install writes confined to the .kimi-code target root and preserve unrelated project configuration.'],
    last_verified_at: '2026-10-20',
    owner: 'PowerUser maintainers',
    source_docs: ['.kimi/README.md', 'AGENTS.md', 'scripts/lib/install-targets/kimi-project.js'],
  }
].map(freezeRecord));

function toTextList(value) {
  return Array.isArray(value) ? value.join('; ') : String(value || '');
}

function escapeMarkdownCell(value) {
  return toTextList(value).replace(/\|/g, '\\|').trim();
}

function renderMarkdownTable(records = ADAPTER_RECORDS) {
  const lines = [
    '| Harness or runtime | State | Supported assets | Unsupported or different surfaces | Install or onramp | Verification command | Risk notes |',
    '| --- | --- | --- | --- | --- | --- | --- |',
  ];

  for (const record of records) {
    lines.push([
      record.harness,
      record.state,
      record.supported_assets,
      record.unsupported_surfaces,
      record.install_or_onramp,
      record.verification_commands,
      record.risk_notes,
    ].map(escapeMarkdownCell).join(' | ').replace(/^/, '| ').replace(/$/, ' |'));
  }

  return lines.join('\n');
}

function renderStateTable() {
  const lines = [
    '| State | Meaning |',
    '| --- | --- |',
  ];

  for (const [state, meaning] of Object.entries(COMPLIANCE_STATES)) {
    lines.push(`| ${escapeMarkdownCell(state)} | ${escapeMarkdownCell(meaning)} |`);
  }

  return lines.join('\n');
}

function validateAdapterRecords(records = ADAPTER_RECORDS) {
  const errors = [];
  const ids = new Set();

  records.forEach((record, index) => {
    const label = record?.id || `record[${index}]`;

    for (const field of REQUIRED_FIELDS) {
      if (!Object.prototype.hasOwnProperty.call(record, field)) {
        errors.push(`${label}: missing required field ${field}`);
      }
    }

    if (typeof record.id !== 'string' || !/^[a-z0-9-]+$/.test(record.id)) {
      errors.push(`${label}: id must be a lowercase slug`);
    } else if (ids.has(record.id)) {
      errors.push(`${label}: duplicate id`);
    } else {
      ids.add(record.id);
    }

    if (!Object.prototype.hasOwnProperty.call(COMPLIANCE_STATES, record.state)) {
      errors.push(`${label}: unknown state ${record.state}`);
    }

    for (const field of [
      'supported_assets',
      'unsupported_surfaces',
      'install_or_onramp',
      'verification_commands',
      'risk_notes',
      'source_docs',
    ]) {
      if (!Array.isArray(record[field]) || record[field].length === 0) {
        errors.push(`${label}: ${field} must be a non-empty array`);
        continue;
      }

      record[field].forEach((value, valueIndex) => {
        if (typeof value !== 'string' || !value.trim()) {
          errors.push(`${label}: ${field}[${valueIndex}] must be a non-empty string`);
        }
      });
    }

    if (typeof record.harness !== 'string' || !record.harness.trim()) {
      errors.push(`${label}: harness must be a non-empty string`);
    }

    if (typeof record.owner !== 'string' || !record.owner.trim()) {
      errors.push(`${label}: owner must be a non-empty string`);
    }

    if (typeof record.last_verified_at !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(record.last_verified_at)) {
      errors.push(`${label}: last_verified_at must be YYYY-MM-DD`);
    }
  });

  return errors;
}

function extractMatrixBlock(markdown) {
  const normalized = String(markdown).replace(/\r\n/g, '\n');
  const start = normalized.indexOf(MATRIX_BLOCK_START);
  const end = normalized.indexOf(MATRIX_BLOCK_END);

  if (start < 0 || end < 0 || end <= start) {
    return null;
  }

  return normalized.slice(start + MATRIX_BLOCK_START.length, end).trim();
}

function validateDocumentation(options = {}) {
  const repoRoot = options.repoRoot || path.resolve(__dirname, '..', '..');
  const docPath = options.docPath || path.join(repoRoot, 'docs', 'architecture', 'harness-adapter-compliance.md');
  const errors = [];
  const source = fs.readFileSync(docPath, 'utf8');
  const actual = extractMatrixBlock(source);
  const expected = renderMarkdownTable();

  if (actual === null) {
    errors.push(`missing matrix block markers in ${path.relative(repoRoot, docPath)}`);
  } else if (actual !== expected) {
    errors.push(`matrix block in ${path.relative(repoRoot, docPath)} is not generated from adapter records`);
  }

  return errors;
}

module.exports = {
  ADAPTER_RECORDS,
  COMPLIANCE_STATES,
  MATRIX_BLOCK_END,
  MATRIX_BLOCK_START,
  REQUIRED_FIELDS,
  extractMatrixBlock,
  renderMarkdownTable,
  renderStateTable,
  validateAdapterRecords,
  validateDocumentation,
};
