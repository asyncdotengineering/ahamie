#!/usr/bin/env node
import { buildProgram } from "../program";

const program = buildProgram();
await program.parseAsync(process.argv);
