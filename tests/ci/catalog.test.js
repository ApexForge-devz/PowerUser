/**
 * Direct coverage for the English-only PowerUser catalog validator.
 */
'use strict';

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { buildCatalog, formatExpectation, runCatalogCheck } = require('../../scripts/ci/catalog');

function createTestDir() { return fs.mkdtempSync(path.join(os.tmpdir(), 'poweruser-ci-catalog-')); }
function cleanupTestDir(dir) { fs.rmSync(dir, { recursive: true, force: true }); }

function writeCountedFiles(root, category, count) {
  const dir = path.join(root, category);
  fs.mkdirSync(dir, { recursive: true });
  for (let i = 1; i <= count; i += 1) {
    if (category === 'skills') {
      const skillDir = path.join(dir, 'skill-' + i);
      fs.mkdirSync(skillDir, { recursive: true });
      fs.writeFileSync(path.join(skillDir, 'SKILL.md'), '# Skill ' + i + '\n');
    } else fs.writeFileSync(path.join(dir, category + '-' + i + '.md'), '# ' + category + ' ' + i + '\n');
  }
}

function writeFixture(root, actual, documented, options = {}) {
  writeCountedFiles(root, 'agents', actual.agents);
  writeCountedFiles(root, 'commands', actual.commands);
  writeCountedFiles(root, 'skills', actual.skills);
  const plus = options.skillsMinimum ? '+' : '';
  fs.writeFileSync(path.join(root, 'README.md'), [
    'Access to ' + documented.agents + ' agents, ' + documented.skills + ' skills, and ' + documented.commands + ' legacy command shims.',
    '|-- agents/ # ' + documented.agents + ' specialized subagents for delegation',
    '|-- commands/ # ' + documented.commands + ' maintained slash-command shims',
    '|-- skills/ # ' + documented.skills + ' reusable workflows loaded on demand',
    '| Category | Count |',
    '| Agents | ' + documented.agents + ' agents |',
    '| Commands | ' + documented.commands + ' commands |',
    '| Skills | ' + documented.skills + ' skills |',
    '',
  ].join('\n'));
  fs.writeFileSync(path.join(root, 'AGENTS.md'), [
    'Production plugin providing ' + documented.agents + ' specialized agents, ' + documented.skills + plus + ' skills, ' + documented.commands + ' commands.',
    'agents/ - ' + documented.agents + ' specialized subagents',
    'skills/ - ' + documented.skills + plus + ' workflow skills and domain knowledge',
    'commands/ - ' + documented.commands + ' slash commands',
    '',
  ].join('\n'));
  fs.writeFileSync(path.join(root, 'SOUL.md'), 'PowerUser with ' + documented.agents + ' specialized agents, ' + documented.skills + ' skills, ' + documented.commands + ' commands.\n');
  fs.mkdirSync(path.join(root, '.gemini'), { recursive: true });
  fs.writeFileSync(path.join(root, '.gemini', 'GEMINI.md'), 'PowerUser with ' + documented.agents + ' specialized agents, ' + documented.skills + ' skills, and ' + documented.commands + ' commands.\n');
  fs.mkdirSync(path.join(root, '.claude-plugin'), { recursive: true });
  fs.writeFileSync(path.join(root, '.claude-plugin', 'plugin.json'), JSON.stringify({
    description: documented.agents + ' agents, ' + documented.skills + ' skills, ' + documented.commands + ' legacy command shims',
  }, null, 2));
  fs.writeFileSync(path.join(root, '.claude-plugin', 'marketplace.json'), JSON.stringify({
    plugins: [{ description: documented.agents + ' agents, ' + documented.skills + ' skills, ' + documented.commands + ' legacy command shims' }],
  }, null, 2));
}

function test(name, fn) {
  try { fn(); console.log('  PASS ' + name); return true; }
  catch (error) { console.error('  FAIL ' + name + '\n    ' + error.message); return false; }
}

function runTests() {
  console.log('\n=== Testing English-only PowerUser catalog validator ===\n');
  let passed = 0;
  let failed = 0;

  if (test('builds catalog counts from a supplied root', () => {
    const dir = createTestDir();
    try {
      writeFixture(dir, { agents: 2, skills: 1, commands: 3 }, { agents: 2, skills: 1, commands: 3 });
      const catalog = buildCatalog(dir);
      assert.deepStrictEqual({ agents: catalog.agents.count, skills: catalog.skills.count, commands: catalog.commands.count }, { agents: 2, skills: 1, commands: 3 });
    } finally { cleanupTestDir(dir); }
  })) passed++; else failed++;

  if (test('rejects an undocumented undercount in the English agent tree', () => {
    const dir = createTestDir();
    try {
      writeFixture(dir, { agents: 1, skills: 2, commands: 1 }, { agents: 1, skills: 2, commands: 1 });
      const file = path.join(dir, 'AGENTS.md');
      fs.writeFileSync(file, fs.readFileSync(file, 'utf8').replace('skills/ - 2 workflow skills', 'skills/ - 1 workflow skills'));
      const result = runCatalogCheck({ root: dir });
      const check = result.checks.find(item => item.source === 'AGENTS.md tree (skills)');
      assert.ok(check);
      assert.strictEqual(check.ok, false);
    } finally { cleanupTestDir(dir); }
  })) passed++; else failed++;

  if (test('accepts an explicitly marked lower-bound skill count', () => {
    const dir = createTestDir();
    try {
      writeFixture(dir, { agents: 1, skills: 2, commands: 1 }, { agents: 1, skills: 2, commands: 1 });
      const file = path.join(dir, 'AGENTS.md');
      fs.writeFileSync(file, fs.readFileSync(file, 'utf8').replace('skills/ - 2 workflow skills', 'skills/ - 1+ workflow skills'));
      const result = runCatalogCheck({ root: dir });
      const check = result.checks.find(item => item.source === 'AGENTS.md tree (skills)');
      assert.ok(check);
      assert.strictEqual(check.ok, true);
    } finally { cleanupTestDir(dir); }
  })) passed++; else failed++;

  if (test('reports mismatches from every tracked English catalog document', () => {
    const dir = createTestDir();
    try {
      writeFixture(dir, { agents: 1, skills: 1, commands: 1 }, { agents: 9, skills: 9, commands: 9 });
      const result = runCatalogCheck({ root: dir });
      const formatted = result.checks.filter(item => !item.ok).map(formatExpectation).join('\n');
      for (const source of ['README.md summary', 'README.md tree', 'AGENTS.md summary', 'SOUL.md', '.gemini/GEMINI.md', '.claude-plugin/plugin.json', '.claude-plugin/marketplace.json']) {
        assert.ok(formatted.includes(source), 'Expected mismatch from ' + source);
      }
    } finally { cleanupTestDir(dir); }
  })) passed++; else failed++;

  if (test('write mode synchronizes English counts in docs and metadata', () => {
    const dir = createTestDir();
    try {
      writeFixture(dir, { agents: 1, skills: 1, commands: 1 }, { agents: 7, skills: 7, commands: 7 }, { skillsMinimum: true });
      const result = runCatalogCheck({ root: dir, writeMode: true });
      assert.strictEqual(result.checks.filter(item => !item.ok).length, 0);
      assert.ok(fs.readFileSync(path.join(dir, 'README.md'), 'utf8').includes('Access to 1 agents, 1 skills, and 1 legacy command shims'));
      assert.ok(fs.readFileSync(path.join(dir, 'AGENTS.md'), 'utf8').includes('providing 1 specialized agents, 1+ skills, 1 commands'));
      assert.ok(fs.readFileSync(path.join(dir, 'SOUL.md'), 'utf8').includes('with 1 specialized agents, 1 skills, 1 commands'));
      assert.ok(fs.readFileSync(path.join(dir, '.gemini', 'GEMINI.md'), 'utf8').includes('with 1 specialized agents, 1 skills, and 1 commands'));
      assert.ok(fs.readFileSync(path.join(dir, '.claude-plugin', 'plugin.json'), 'utf8').includes('1 agents, 1 skills, 1 legacy command shims'));
    } finally { cleanupTestDir(dir); }
  })) passed++; else failed++;

  console.log('\nResults: Passed: ' + passed + ', Failed: ' + failed);
  process.exit(failed > 0 ? 1 : 0);
}

runTests();
