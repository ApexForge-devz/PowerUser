'use strict';

// Backward-compatible import path for scripts and hooks created before the
// PowerUser rebrand. New code should import ./resolve-poweruser-root.
const poweruserRoot = require('./resolve-poweruser-root');

module.exports = {
  ...poweruserRoot,
  resolveEccRoot: poweruserRoot.resolvePowerUserRoot,
};
