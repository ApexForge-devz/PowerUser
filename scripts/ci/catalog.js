#!/usr/bin/env node
/**
 * Verify and optionally synchronize catalog counts in English project metadata.
 *
 * Usage: node scripts/ci/catalog.js [--json|--md|--text] [--write]
 */
'use strict';

const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '../..');
const WRITE_MODE = process.argv.includes('--write');
const OUTPUT_MODE = process.argv.includes('--md') ? 'md' : process.argv.includes('--text') ? 'text' : 'json';

function buildCatalog(root = ROOT) {
  const list = (dir, predicate) => {
    const full = path.join(root, dir);
    if (!fs.existsSync(full)) return [];
    return fs.readdirSync(full, { withFileTypes: true })
      .filter(predicate).map(entry => dir + '/' + entry.name).sort();
  };
  const agents = list('agents', entry => entry.isFile() && entry.name.endsWith('.md'));
  const commands = list('commands', entry => entry.isFile() && entry.name.endsWith('.md'));
  const skills = list('skills', entry => entry.isDirectory()
    && fs.existsSync(path.join(root, 'skills', entry.name, 'SKILL.md')))
    .map(dir => dir + '/SKILL.md');
  return {
    agents: { count: agents.length, files: agents, glob: 'agents/*.md' },
    commands: { count: commands.length, files: commands, glob: 'commands/*.md' },
    skills: { count: skills.length, files: skills, glob: 'skills/*/SKILL.md' },
  };
}

function readFileOrThrow(filePath) {
  try { return fs.readFileSync(filePath, 'utf8'); }
  catch (error) { throw new Error('Failed to read ' + path.basename(filePath) + ': ' + error.message); }
}

function writeFileOrThrow(filePath, content) {
  try { fs.writeFileSync(filePath, content, 'utf8'); }
  catch (error) { throw new Error('Failed to write ' + path.basename(filePath) + ': ' + error.message); }
}

function replaceOrThrow(content, regex, replacer, source) {
  if (!regex.test(content)) throw new Error(source + ' is missing the expected catalog marker');
  return content.replace(regex, replacer);
}

function parseReadmeExpectations(content) {
  const quick = content.match(/access to\s+(\d+)\s+agents,\s+(\d+)\s+skills,\s+and\s+(\d+)\s+(?:commands|legacy command shims?)/i);
  if (!quick) throw new Error('README.md is missing the catalog summary');
  const expectations = [
    { category: 'agents', expected: Number(quick[1]), source: 'README.md summary' },
    { category: 'skills', expected: Number(quick[2]), source: 'README.md summary' },
    { category: 'commands', expected: Number(quick[3]), source: 'README.md summary' },
  ];
  const treePatterns = [
    { category: 'agents', regex: /^\|\s*--\s*agents\/\s*#\s*(\d+)\s+specialized subagents for delegation\s*$/gim, source: 'README.md tree (agents)' },
    { category: 'commands', regex: /^\|\s*--\s*commands\/\s*#\s*(\d+)\s+maintained slash-command shims\s*$/gim, source: 'README.md tree (commands)' },
    { category: 'skills', regex: /^\|\s*--\s*skills\/\s*#\s*(\d+)\s+reusable workflows loaded on demand\s*$/gim, source: 'README.md tree (skills)' },
  ];
  for (const item of treePatterns) {
    const matches = [...content.matchAll(item.regex)];
    if (!matches.length) throw new Error(item.source + ' is missing a count');
    for (const match of matches) expectations.push({ category: item.category, expected: Number(match[1]), source: item.source });
  }
  const tablePatterns = [
    { category: 'agents', regex: /\|\s*(?:\*\*)?Agents(?:\*\*)?\s*\|\s*(?:(?:PASS:|\u2705)\s*)?(\d+)\s+agents\s*\|/i, source: 'README.md table (agents)' },
    { category: 'commands', regex: /\|\s*(?:\*\*)?Commands(?:\*\*)?\s*\|\s*(?:(?:PASS:|\u2705)\s*)?(\d+)\s+commands(?:\s*\([^)]*\))?\s*\|/i, source: 'README.md table (commands)' },
    { category: 'skills', regex: /\|\s*(?:\*\*)?Skills(?:\*\*)?\s*\|\s*(?:(?:PASS:|\u2705)\s*)?(\d+)\s+skills\s*\|/i, source: 'README.md table (skills)' },
  ];
  for (const item of tablePatterns) {
    const match = content.match(item.regex);
    if (!match) throw new Error(item.source + ' is missing a row');
    expectations.push({ category: item.category, expected: Number(match[1]), source: item.source });
  }
  return expectations;
}

function parseAgentsExpectations(content) {
  const summary = content.match(/providing\s+(\d+)\s+specialized agents,\s+(\d+)(\+)?\s+skills,\s+(\d+)\s+commands/i);
  if (!summary) throw new Error('AGENTS.md is missing the catalog summary');
  const expectations = [
    { category: 'agents', expected: Number(summary[1]), source: 'AGENTS.md summary' },
    { category: 'skills', expected: Number(summary[2]), mode: summary[3] ? 'minimum' : 'exact', source: 'AGENTS.md summary' },
    { category: 'commands', expected: Number(summary[4]), source: 'AGENTS.md summary' },
  ];
  const structure = [
    { category: 'agents', regex: /^\s*agents\/\s*[—–-]\s*(\d+)\s+specialized subagents\s*$/im, source: 'AGENTS.md tree (agents)' },
    { category: 'skills', regex: /^\s*skills\/\s*[—–-]\s*(\d+)(\+)?\s+workflow skills and domain knowledge\s*$/im, source: 'AGENTS.md tree (skills)' },
    { category: 'commands', regex: /^\s*commands\/\s*[—–-]\s*(\d+)\s+slash commands\s*$/im, source: 'AGENTS.md tree (commands)' },
  ];
  for (const item of structure) {
    const match = content.match(item.regex);
    if (!match) throw new Error(item.source + ' is missing a count');
    expectations.push({
      category: item.category,
      expected: Number(match[1]),
      mode: item.category === 'skills' && match[2] ? 'minimum' : 'exact',
      source: item.source,
    });
  }
  return expectations;
}

function parseIdentityExpectations(content, source) {
  const match = content.match(/with\s+(\d+)\s+specialized agents,\s+(\d+)\s+skills,\s+(?:and\s+)?(\d+)\s+commands/i);
  if (!match) throw new Error(source + ' is missing the catalog summary');
  return [
    { category: 'agents', expected: Number(match[1]), source },
    { category: 'skills', expected: Number(match[2]), source },
    { category: 'commands', expected: Number(match[3]), source },
  ];
}

function parseMetadataExpectations(content, source, getDescription) {
  let data;
  try { data = JSON.parse(content); } catch (error) { throw new Error(source + ' is not valid JSON: ' + error.message); }
  const description = getDescription(data);
  if (typeof description !== 'string') throw new Error(source + ' is missing a description');
  const match = description.match(/(\d+)\s+agents,\s+(\d+)\s+skills,\s+(\d+)\s+legacy command shims?/i);
  if (!match) throw new Error(source + ' is missing catalog counts');
  return [
    { category: 'agents', expected: Number(match[1]), source },
    { category: 'skills', expected: Number(match[2]), source },
    { category: 'commands', expected: Number(match[3]), source },
  ];
}

function evaluateExpectations(catalog, expectations) {
  return expectations.map(item => {
    const actual = catalog[item.category].count;
    const mode = item.mode || 'exact';
    return { ...item, mode, actual, ok: mode === 'minimum' ? actual >= item.expected : actual === item.expected };
  });
}

function formatExpectation(item) {
  return item.source + ': ' + item.category + ' documented ' + (item.mode === 'minimum' ? '>=' : '=') + ' ' + item.expected + ', actual ' + item.actual;
}

function syncReadme(content, catalog) {
  let next = replaceOrThrow(content,
    /(access to\s+)(\d+)(\s+agents,\s+)(\d+)(\s+skills,\s+and\s+)(\d+)(\s+(?:commands|legacy command shims?))/i,
    (_, a, _b, c, _d, e, _f) => a + catalog.agents.count + c + catalog.skills.count + e + catalog.commands.count + ' legacy command shims',
    'README.md summary');
  const patterns = [
    [/^(\|\s*--\s*agents\/\s*#\s*)(\d+)(\s+specialized subagents for delegation\s*)$/im, catalog.agents.count, 'README.md tree (agents)'],
    [/^(\|\s*--\s*commands\/\s*#\s*)(\d+)(\s+maintained slash-command shims\s*)$/im, catalog.commands.count, 'README.md tree (commands)'],
    [/^(\|\s*--\s*skills\/\s*#\s*)(\d+)(\s+reusable workflows loaded on demand\s*)$/im, catalog.skills.count, 'README.md tree (skills)'],
    [/(\|\s*(?:\*\*)?Agents(?:\*\*)?\s*\|\s*(?:(?:PASS:|\u2705)\s*)?)(\d+)(\s+agents\s*\|)/i, catalog.agents.count, 'README.md table (agents)'],
    [/(\|\s*(?:\*\*)?Commands(?:\*\*)?\s*\|\s*(?:(?:PASS:|\u2705)\s*)?)(\d+)(\s+commands\s*\|)/i, catalog.commands.count, 'README.md table (commands)'],
    [/(\|\s*(?:\*\*)?Skills(?:\*\*)?\s*\|\s*(?:(?:PASS:|\u2705)\s*)?)(\d+)(\s+skills\s*\|)/i, catalog.skills.count, 'README.md table (skills)'],
  ];
  for (const [regex, count, source] of patterns) {
    next = replaceOrThrow(next, regex, (_, a, _b, c) => a + count + c, source);
  }
  return next;
}

function syncAgents(content, catalog) {
  let next = replaceOrThrow(content,
    /(providing\s+)(\d+)(\s+specialized agents,\s+)(\d+)(\+?)(\s+skills,\s+)(\d+)(\s+commands)/i,
    (_, a, _b, c, _d, plus, e, _f, g) => a + catalog.agents.count + c + catalog.skills.count + plus + e + catalog.commands.count + g,
    'AGENTS.md summary');
  const agentsRegex = /^(\s*agents\/\s*[—–-]\s*)(\d+)(\s+specialized subagents\s*)$/im;
  const skillsRegex = /^(\s*skills\/\s*[—–-]\s*)(\d+)(\+?)(\s+workflow skills and domain knowledge\s*)$/im;
  const commandsRegex = /^(\s*commands\/\s*[—–-]\s*)(\d+)(\s+slash commands\s*)$/im;
  next = replaceOrThrow(next, agentsRegex, (_, a, _b, c) => a + catalog.agents.count + c, 'AGENTS.md tree (agents)');
  next = replaceOrThrow(next, skillsRegex, (_, a, _b, plus, c) => a + catalog.skills.count + plus + c, 'AGENTS.md tree (skills)');
  next = replaceOrThrow(next, commandsRegex, (_, a, _b, c) => a + catalog.commands.count + c, 'AGENTS.md tree (commands)');
  return next;
}

function syncIdentity(content, catalog, source) {
  return replaceOrThrow(content,
    /(with\s+)(\d+)(\s+specialized agents,\s+)(\d+)(\s+skills,\s+(?:and\s+)?)(\d+)(\s+commands)/i,
    (_, a, _b, c, _d, e, _f, g) => a + catalog.agents.count + c + catalog.skills.count + e + catalog.commands.count + g,
    source);
}

function syncMetadata(content, catalog, source, getDescription, setDescription) {
  let data;
  try { data = JSON.parse(content); } catch (error) { throw new Error(source + ' is not valid JSON: ' + error.message); }
  const description = getDescription(data);
  if (typeof description !== 'string') throw new Error(source + ' is missing a description');
  const updated = replaceOrThrow(description,
    /(\d+)(\s+agents,\s+)(\d+)(\s+skills,\s+)(\d+)(\s+legacy command shims?)/i,
    (_, _a, b, _c, d, _e, f) => catalog.agents.count + b + catalog.skills.count + d + catalog.commands.count + f,
    source);
  setDescription(data, updated);
  return JSON.stringify(data, null, 2) + '\n';
}

function createDocumentSpecs(root = ROOT) {
  return [
    { filePath: path.join(root, 'README.md'), parseExpectations: parseReadmeExpectations, syncContent: syncReadme },
    { filePath: path.join(root, 'AGENTS.md'), parseExpectations: parseAgentsExpectations, syncContent: syncAgents },
    { filePath: path.join(root, 'SOUL.md'), parseExpectations: content => parseIdentityExpectations(content, 'SOUL.md'), syncContent: (content, catalog) => syncIdentity(content, catalog, 'SOUL.md') },
    { filePath: path.join(root, '.gemini', 'GEMINI.md'), parseExpectations: content => parseIdentityExpectations(content, '.gemini/GEMINI.md'), syncContent: (content, catalog) => syncIdentity(content, catalog, '.gemini/GEMINI.md') },
    { filePath: path.join(root, '.claude-plugin', 'plugin.json'), parseExpectations: content => parseMetadataExpectations(content, '.claude-plugin/plugin.json', data => data.description), syncContent: (content, catalog) => syncMetadata(content, catalog, '.claude-plugin/plugin.json', data => data.description, (data, value) => { data.description = value; }) },
    { filePath: path.join(root, '.claude-plugin', 'marketplace.json'), parseExpectations: content => parseMetadataExpectations(content, '.claude-plugin/marketplace.json', data => data.plugins && data.plugins[0] && data.plugins[0].description), syncContent: (content, catalog) => syncMetadata(content, catalog, '.claude-plugin/marketplace.json', data => data.plugins && data.plugins[0] && data.plugins[0].description, (data, value) => { data.plugins[0].description = value; }) },
  ];
}

function runCatalogCheck(options = {}) {
  const root = options.root || ROOT;
  const writeMode = options.writeMode === undefined ? WRITE_MODE : options.writeMode;
  const specs = options.documentSpecs || createDocumentSpecs(root);
  const catalog = buildCatalog(root);
  if (writeMode) {
    for (const spec of specs) {
      const current = readFileOrThrow(spec.filePath);
      const updated = spec.syncContent(current, catalog);
      if (updated !== current) writeFileOrThrow(spec.filePath, updated);
    }
  }
  const expectations = specs.flatMap(spec => spec.parseExpectations(readFileOrThrow(spec.filePath)));
  return { catalog, checks: evaluateExpectations(catalog, expectations) };
}

function readFileOrThrow(filePath) {
  try { return fs.readFileSync(filePath, 'utf8'); }
  catch (error) { throw new Error('Failed to read ' + path.basename(filePath) + ': ' + error.message); }
}

function writeFileOrThrow(filePath, content) {
  try { fs.writeFileSync(filePath, content, 'utf8'); }
  catch (error) { throw new Error('Failed to write ' + path.basename(filePath) + ': ' + error.message); }
}

function renderText(result) {
  const mismatches = result.checks.filter(item => !item.ok);
  console.log('Catalog counts:');
  console.log('- agents: ' + result.catalog.agents.count);
  console.log('- commands: ' + result.catalog.commands.count);
  console.log('- skills: ' + result.catalog.skills.count);
  console.log('');
  if (!mismatches.length) { console.log('Documentation counts match the repository catalog.'); return; }
  console.error('Documentation count mismatches found:');
  for (const item of mismatches) console.error('- ' + formatExpectation(item));
}

function renderMarkdown(result) {
  const mismatches = result.checks.filter(item => !item.ok);
  console.log('# PowerUser Catalog Verification\n');
  console.log('| Category | Count | Pattern |');
  console.log('| --- | ---: | --- |');
  console.log('| Agents | ' + result.catalog.agents.count + ' | ' + result.catalog.agents.glob + ' |');
  console.log('| Commands | ' + result.catalog.commands.count + ' | ' + result.catalog.commands.glob + ' |');
  console.log('| Skills | ' + result.catalog.skills.count + ' | ' + result.catalog.skills.glob + ' |');
  console.log('');
  if (!mismatches.length) { console.log('Documentation counts match the repository catalog.'); return; }
  console.log('## Mismatches\n');
  for (const item of mismatches) console.log('- ' + formatExpectation(item));
}

function main(options = {}) {
  const outputMode = options.outputMode || OUTPUT_MODE;
  const result = runCatalogCheck(options);
  if (outputMode === 'json') console.log(JSON.stringify(result, null, 2));
  else if (outputMode === 'md') renderMarkdown(result);
  else renderText(result);
  if (result.checks.some(item => !item.ok)) process.exit(1);
}

if (require.main === module) {
  try { main(); }
  catch (error) { console.error('ERROR: ' + error.message); process.exit(1); }
}

module.exports = {
  buildCatalog,
  createDocumentSpecs,
  evaluateExpectations,
  formatExpectation,
  parseAgentsExpectations,
  parseIdentityExpectations,
  parseMetadataExpectations,
  parseReadmeExpectations,
  runCatalogCheck,
  syncAgents,
  syncIdentity,
  syncMetadata,
  syncReadme,
};
