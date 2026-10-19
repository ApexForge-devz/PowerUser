#!/usr/bin/env node
'use strict';
// Legacy entrypoint retained for existing statusLine settings.
const api = require('./poweruser-statusline');
if (require.main === module) api.runStatusline();
module.exports = api;
