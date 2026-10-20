'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..', '..');

function read(relativePath) {
  return fs.readFileSync(path.join(repoRoot, relativePath), 'utf8');
}

function test(name, fn) {
  try {
    fn();
    console.log(`  ✓ ${name}`);
  } catch (error) {
    console.error(`  ✗ ${name}`);
    throw error;
  }
}

console.log('\n=== Testing PowerUser public install identifiers ===\n');

test('root README presents the PowerUser repository and native plugin ID', () => {
  const readme = read('README.md');
  assert.ok(readme.includes('ApexForge-devz/PowerUser'));
  assert.ok(readme.includes('PowerUser'));
  assert.ok(readme.includes('poweruser@poweruser'));
  assert.ok(readme.includes('poweruser-universal'));
});

test('Claude and Codex plugin manifests share the canonical plugin name', () => {
  const claude = JSON.parse(read('.claude-plugin/plugin.json'));
  const codex = JSON.parse(read('.codex-plugin/plugin.json'));
  const marketplace = JSON.parse(read('.agents/plugins/marketplace.json'));
  assert.strictEqual(claude.name, 'poweruser');
  assert.strictEqual(codex.name, 'poweruser');
  assert.strictEqual(marketplace.name, 'poweruser');
  assert.strictEqual(marketplace.plugins[0].name, 'poweruser');
});

test('all public harness setup guides use PowerUser command names', () => {
  const docs = [
    '.claude-plugin/README.md',
    '.codex-plugin/README.md',
    '.hermes/README.md',
    '.kimi/README.md',
    '.opencode/README.md',
  ];
  for (const relativePath of docs) {
    const content = read(relativePath);
    assert.ok(/PowerUser/i.test(content), `${relativePath} should identify PowerUser`);
    assert.ok(!/npx\s+ecc(?=\s|$)/i.test(content), `${relativePath} contains a stale CLI command`);
  }
});

test('English-only documentation does not advertise removed localized entry points', () => {
  const readme = read('README.md');
  assert.ok(!readme.includes('Language:</strong>'));
  for (const relativePath of ['README.zh-CN.md', 'docs/zh-CN/README.md', 'docs/ja-JP/README.md']) {
    assert.ok(!fs.existsSync(path.join(repoRoot, relativePath)), `${relativePath} should not be present`);
  }
});

test('manual and guided install documentation points to current PowerUser setup', () => {
  const readme = read('README.md');
  const configureSkill = read('skills/configure-poweruser/SKILL.md');
  const migrationGuide = read('docs/MIGRATION-1X-TO-2.0.md');
  assert.ok(readme.includes('poweruser-universal'));
  assert.ok(configureSkill.includes('poweruser setup'));
  assert.ok(configureSkill.includes('poweruser@poweruser'));
  assert.ok(migrationGuide.includes('PowerUser'));
});

test('plugin command examples use the PowerUser namespace', () => {
  const readme = read('README.md');
  const configureSkill = read('skills/configure-poweruser/SKILL.md');
  assert.ok(readme.includes('/poweruser:configure-poweruser') || readme.includes('poweruser@poweruser'));
  assert.ok(configureSkill.includes('/poweruser:configure-poweruser'));
});
