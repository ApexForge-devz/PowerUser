/** Tests for the supported PowerUser install targets. */
'use strict';

const assert = require('assert');
const path = require('path');
const {
  getInstallTargetAdapter,
  listInstallTargetAdapters,
} = require('../../scripts/lib/install-targets/registry');
const {
  SUPPORTED_INSTALL_TARGETS,
  loadInstallManifests,
} = require('../../scripts/lib/install-manifests');

function test(name, fn) {
  try {
    fn();
    console.log(`  ✓ ${name}`);
    return true;
  } catch (error) {
    console.error(`  ✗ ${name}`);
    console.error(`    ${error.message}`);
    return false;
  }
}

function main() {
  let passed = 0;
  let failed = 0;
  const run = (name, fn) => { if (test(name, fn)) passed += 1; else failed += 1; };
  const expected = ['claude', 'claude-project', 'codex', 'hermes', 'kimi', 'opencode'];

  run('registry exposes only the requested coding-agent targets', () => {
    assert.deepStrictEqual(listInstallTargetAdapters().map(adapter => adapter.target).sort(), expected.slice().sort());
    assert.deepStrictEqual(SUPPORTED_INSTALL_TARGETS.slice().sort(), expected.slice().sort());
  });

  run('unsupported coding-agent targets are not registered', () => {
    for (const target of ['cursor', 'antigravity', 'copilot', 'gemini', 'codebuddy', 'joycode', 'qwen', 'zed', 'openclaw', 'adal', 'pi']) {
      assert.throws(() => getInstallTargetAdapter(target), /Unknown install target adapter/);
    }
  });

  run('supported targets resolve to their intended roots', () => {
    assert.strictEqual(getInstallTargetAdapter('claude').resolveRoot({ homeDir: '/home/test' }), path.join('/home/test', '.claude'));
    assert.strictEqual(getInstallTargetAdapter('claude-project').resolveRoot({ projectRoot: '/workspace/app' }), path.join('/workspace/app', '.claude'));
    assert.strictEqual(getInstallTargetAdapter('codex').resolveRoot({ homeDir: '/home/test' }), path.join('/home/test', '.codex'));
    assert.strictEqual(getInstallTargetAdapter('hermes').resolveRoot({ homeDir: '/home/test' }), path.join('/home/test', '.hermes'));
    assert.strictEqual(getInstallTargetAdapter('kimi').resolveRoot({ projectRoot: '/workspace/app' }), path.join('/workspace/app', '.kimi-code'));
    assert.ok(getInstallTargetAdapter('opencode').resolveRoot({ homeDir: '/home/test' }).length > 0);
  });

  run('every install manifest target is one of the supported targets', () => {
    const manifests = loadInstallManifests();
    for (const module of manifests.modules) {
      assert.ok(module.targets.length > 0, `${module.id} must keep at least one supported target`);
      for (const target of module.targets) {
        assert.ok(SUPPORTED_INSTALL_TARGETS.includes(target), `${module.id} references unsupported target ${target}`);
      }
    }
  });

  console.log(`\nPassed: ${passed}`);
  console.log(`Failed: ${failed}`);
  if (failed > 0) process.exitCode = 1;
}

main();
