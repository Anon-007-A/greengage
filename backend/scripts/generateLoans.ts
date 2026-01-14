import { writeFileSync, mkdirSync } from 'fs';
import { resolve, join } from 'path';
import { generateRealisticLoans } from '../utils/loanGenerator';

// Simple CLI wrapper to run in Node (ts-node)
const argv = process.argv.slice(2);
const count = argv[0] ? Math.max(0, parseInt(argv[0], 10) || 150) : 150;
const seed = argv[1] ? parseInt(argv[1], 10) || 52781437 : 52781437;

const out = generateRealisticLoans(count, seed);
const dir = resolve(__dirname, '..', 'data');
try { mkdirSync(dir, { recursive: true }); } catch (e) {}
const outPath = join(dir, 'loans.json');
writeFileSync(outPath, JSON.stringify(out, null, 2));
console.log('Generated', out.length, 'loans to', outPath);
