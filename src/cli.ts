#!/usr/bin/env node
import { runCli } from "./cli/run-cli.js";

process.exitCode = await runCli(process.argv.slice(2));
