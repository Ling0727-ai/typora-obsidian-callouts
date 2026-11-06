#!/usr/bin/env node
require('../lib/installer.cjs').main().catch(error => {
  console.error('Typora installer:', error.message);
  process.exitCode = 1;
});
