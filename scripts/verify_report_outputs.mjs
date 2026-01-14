import fs from 'fs';
import path from 'path';

const outDir = path.join(process.cwd(), 'scripts', 'output');
const files = fs.readdirSync(outDir).filter(f => f.endsWith('.json'));

function topLevelKeys(obj) {
  return Object.keys(obj).sort();
}

function summarize(file) {
  const content = JSON.parse(fs.readFileSync(path.join(outDir, file), 'utf8'));
  const keys = topLevelKeys(content);
  const strLen = JSON.stringify(content).length;
  return { file, keys, strLen };
}

const summaries = files.map(summarize);
console.log('Report output summaries:');
summaries.forEach(s => {
  console.log(`- ${s.file}: keys=[${s.keys.join(', ')}], length=${s.strLen}`);
});

// Pairwise comparison (keys overlap and simple content diff)
console.log('\nPairwise differences:');
for (let i = 0; i < summaries.length; i++) {
  for (let j = i + 1; j < summaries.length; j++) {
    const a = summaries[i];
    const b = summaries[j];
    const keyIntersection = a.keys.filter(k => b.keys.includes(k));
    const keyUnion = Array.from(new Set([...a.keys, ...b.keys]));
    const jaccard = keyIntersection.length / Math.max(1, keyUnion.length);
    const lengthRatio = Math.max(a.strLen, b.strLen) / Math.max(1, Math.min(a.strLen, b.strLen));
    const identical = fs.readFileSync(path.join(outDir, a.file), 'utf8') === fs.readFileSync(path.join(outDir, b.file), 'utf8');
    console.log(`- ${a.file} <> ${b.file}: jaccard=${jaccard.toFixed(3)}, lengthRatio=${lengthRatio.toFixed(2)}, identical=${identical}`);
  }
}

// Quick pass/fail: ensure no two files are identical and each file has at least one unique key
let allGood = true;
for (let i = 0; i < summaries.length; i++) {
  for (let j = i + 1; j < summaries.length; j++) {
    const a = summaries[i];
    const b = summaries[j];
    const identical = fs.readFileSync(path.join(outDir, a.file), 'utf8') === fs.readFileSync(path.join(outDir, b.file), 'utf8');
    if (identical) {
      console.error(`ERROR: ${a.file} is byte-identical to ${b.file}`);
      allGood = false;
    }
  }
}

summaries.forEach(s => {
  const others = summaries.filter(o => o.file !== s.file);
  const uniqueKeyFound = s.keys.some(k => others.every(o => !o.keys.includes(k)));
  if (!uniqueKeyFound) {
    console.warn(`WARNING: ${s.file} does not have an obviously unique top-level key compared with others`);
    allGood = false;
  }
});

if (allGood) {
  console.log('\nVERIFICATION PASSED: each report file has unique structure/content.');
  process.exit(0);
} else {
  console.log('\nVERIFICATION WARNING/FAILED: see messages above.');
  process.exit(2);
}
