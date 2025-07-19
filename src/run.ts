#!/usr/bin/env node

import module from 'node:module'
import { runCli } from './cli'

try {
  module.enableCompileCache?.()
} catch {}

runCli()
