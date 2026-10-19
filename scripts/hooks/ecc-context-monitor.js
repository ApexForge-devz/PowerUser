#!/usr/bin/env node
'use strict';
// Legacy entrypoint retained for existing hook settings.
const api = require('./poweruser-context-monitor');
if (require.main === module) {
  let data = '';
  process.stdin.setEncoding('utf8');
  process.stdin.on('data', chunk => { data += chunk; });
  process.stdin.on('end', () => { process.stdout.write(api.run(data)); process.exit(0); });
}
module.exports = api;
