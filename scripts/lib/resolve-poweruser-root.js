'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');

const CURRENT_PLUGIN_SLUG = 'poweruser';
// Legacy identifiers are retained so existing ECC installations continue to resolve.
const LEGACY_PLUGIN_SLUGS = ['ecc', 'everything-claude-code'];
const CURRENT_PLUGIN_HANDLE = `${CURRENT_PLUGIN_SLUG}@${CURRENT_PLUGIN_SLUG}`;
const PLUGIN_CACHE_SLUGS = [CURRENT_PLUGIN_SLUG, ...LEGACY_PLUGIN_SLUGS];
const PLUGIN_ROOT_SEGMENTS = [
  [CURRENT_PLUGIN_SLUG],
  [CURRENT_PLUGIN_HANDLE],
  ['marketplaces', CURRENT_PLUGIN_SLUG],
  ...LEGACY_PLUGIN_SLUGS.flatMap((slug) => [
    [slug],
    [`${slug}@${slug}`],
    ['marketplaces', slug],
  ]),
];

// Artifacts that identify a COMPLETE PowerUser root when the caller gives no explicit
// probe. A real PowerUser root ships both the script tree AND PowerUser skills; a partial
// install (scripts copied, skills not) must not qualify for skill-resolving
// callers, which build `skills/...` paths against the resolved root (#2544).
// Checking "skills/ exists" is not enough — a user's own ~/.claude/skills/ can
// be present with none of the PowerUser skills — so we probe for a sentinel skill that
// ships in every PowerUser root and is exactly what the failing skill commands need.
// If that skill is ever renamed, move this sentinel with it.
const DEFAULT_SCRIPT_PROBE = path.join('scripts', 'lib', 'utils.js');
const DEFAULT_SKILL_PROBE = path.join('skills', 'continuous-learning-v2');

/**
 * Resolve the PowerUser source root directory.
 *
 * The resolver prioritizes the PowerUser plugin and retains ECC cache locations
 * as legacy aliases for existing installations.
 */
function resolvePowerUserRoot(options = {}) {
  const envRoot = options.envRoot !== undefined
    ? options.envRoot
    : (process.env.CLAUDE_PLUGIN_ROOT || '');

  if (envRoot && envRoot.trim()) {
    return envRoot.trim();
  }

  const homeDir = options.homeDir || os.homedir();
  const configuredDir = options.configDir !== undefined
    ? options.configDir
    : process.env.CLAUDE_CONFIG_DIR;
  const rawDir = typeof configuredDir === 'string' ? configuredDir.trim() : '';
  const expandedDir = rawDir === '~'
    ? homeDir
    : (rawDir.startsWith('~/') || rawDir.startsWith('~\\'))
      ? path.join(homeDir, rawDir.slice(2))
      : rawDir;
  const claudeDir = expandedDir ? path.resolve(expandedDir) : path.join(homeDir, '.claude');

  // Decide whether a candidate directory is a usable PowerUser root. An explicit
  // caller probe is honored exactly (script consumers know the artifact they
  // need). With the default probe the caller is a skill consumer, so a
  // candidate must contain both ECC's scripts and a sentinel PowerUser skill —
  // otherwise a scripts-only ~/.claude short-circuits and every skill path
  // resolves to a location that does not exist (#2544).
  const isRoot = options.probe
    ? (dir) => fs.existsSync(path.join(dir, options.probe))
    : (dir) => fs.existsSync(path.join(dir, DEFAULT_SCRIPT_PROBE))
            && fs.existsSync(path.join(dir, DEFAULT_SKILL_PROBE));

  // Standard install — files are copied directly into ~/.claude/
  if (isRoot(claudeDir)) {
    return claudeDir;
  }

  // Exact legacy plugin install locations. These preserve backwards
  // compatibility without scanning arbitrary plugin trees.
  const legacyPluginRoots = PLUGIN_ROOT_SEGMENTS.map((segments) =>
    path.join(claudeDir, 'plugins', ...segments)
  );

  for (const candidate of legacyPluginRoots) {
    if (isRoot(candidate)) {
      return candidate;
    }
  }

  // Missing cache locations are independent; unreadable/corrupt locations must surface.
  const directories = (dir) => {
    try { return fs.readdirSync(dir, { withFileTypes: true }); }
    catch (error) { if (error.code === 'ENOENT') return [];throw error; }
  };
  for (const slug of PLUGIN_CACHE_SLUGS) {
    const cacheBase = path.join(claudeDir, 'plugins', 'cache', slug);
    for (const orgEntry of directories(cacheBase)) {
      if (!orgEntry.isDirectory()) continue;
      const orgPath = path.join(cacheBase, orgEntry.name);
      for (const verEntry of directories(orgPath)) {
        if (!verEntry.isDirectory()) continue;
        const candidate = path.join(orgPath, verEntry.name);
        if (isRoot(candidate)) return candidate;
      }
    }
  }

  return claudeDir;
}

function normalizePluginRootForPlatform(rootDir, platform = process.platform) {
  if (platform !== 'win32' || typeof rootDir !== 'string') return rootDir;

  const match = rootDir.match(/^\/([a-zA-Z])(?:\/(.*))?$/);
  if (!match) return rootDir;

  const [, driveLetter, rest = ''] = match;
  return `${driveLetter.toUpperCase()}:/${rest}`;
}

/**
 * Compact inline locator for embedding in hooks.json and command .md code blocks.
 *
 * Earlier revisions inlined the *entire* resolvePowerUserRoot() search (~700 chars,
 * duplicated ~80×). That blob used a spread (`...s`) over nested array literals,
 * which broke Windows hook execution due to shell quoting (#2368).
 *
 * This minified form contains no spread, no nested array literals, and no
 * escaped double quotes, so it survives `node -e "..."` quoting on every shell.
 * When CLAUDE_PLUGIN_ROOT is set (as Claude Code does for plugin hooks and
 * commands) it is used directly. Otherwise the inline probes the same set of
 * locations resolvePowerUserRoot() knows about — ~/.claude, the exact plugin roots
 * under ~/.claude/plugins/, and the versioned plugin cache — only far enough to
 * load the committed resolve-poweruser-root module, then delegates the authoritative
 * decision to resolvePowerUserRoot(). This keeps discovery behaviour identical to the
 * old inline while centralising the real logic in one tested module.
 *
 * Usage in commands:
 *   const _r = <paste INLINE_RESOLVE>;
 *   const sm = require(_r + '/scripts/lib/session-manager');
 */
const INLINE_RESOLVE = `(function(){var p=require('path'),f=require('fs'),o=require('os');var e=process.env.CLAUDE_PLUGIN_ROOT;if(e&&e.trim())return e.trim();var d=(process.env.CLAUDE_CONFIG_DIR||'').trim()||p.join(o.homedir(),'.claude');if(d==='~')d=o.homedir();else if(d.charAt(0)==='~'&&(d.charAt(1)==='/'||d.charCodeAt(1)===92))d=p.join(o.homedir(),d.slice(2));d=p.resolve(d);function L(x){try{return require(p.join(x,'scripts','lib','resolve-poweruser-root')).resolvePowerUserRoot()}catch(_){return null}}var r=L(d);if(r)return r;var s=['poweruser','poweruser@poweruser','marketplaces/poweruser','ecc','poweruser@poweruser','marketplaces/ecc','everything-claude-code','everything-claude-code@everything-claude-code','marketplaces/everything-claude-code'];for(var i=0;i<s.length;i++){r=L(p.join(d,'plugins',s[i]));if(r)return r}function D(x){try{return f.readdirSync(x,{withFileTypes:true}).filter(function(z){return z.isDirectory()}).map(function(z){return z.name})}catch(e){if(e.code==='ENOENT')return [];throw e}}var g=['poweruser','ecc','everything-claude-code'];for(var j=0;j<g.length;j++){var c=p.join(d,'plugins','cache',g[j]);var O=D(c);for(var k=0;k<O.length;k++){var q=p.join(c,O[k]);var V=D(q);for(var m=0;m<V.length;m++){r=L(p.join(q,V[m]));if(r)return r}}}return d})()`;

module.exports = {
  resolvePowerUserRoot,
  normalizePluginRootForPlatform,
  INLINE_RESOLVE,
};
