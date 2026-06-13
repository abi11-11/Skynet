const path = require('path');
const tsJestPath = require.resolve('ts-jest');
console.log('ts-jest path:', tsJestPath);

const { createTransformer } = require(tsJestPath);
const transformer = createTransformer({
  tsconfig: {
    module: 'commonjs'
  }
});

const fs = require('fs');
const src = fs.readFileSync(path.resolve('./src/lib/cache.test.ts'), 'utf-8');

const transformed = transformer.process(src, path.resolve('./src/lib/cache.test.ts'), {
  config: {
    cwd: process.cwd(),
    rootDir: process.cwd(),
    testMatch: [],
    testRegex: [],
    globals: {}
  },
  instrument: false
});

console.log('Transformed:', typeof transformed === 'object' ? transformed.code.substring(0, 300) : transformed.substring(0, 300));
