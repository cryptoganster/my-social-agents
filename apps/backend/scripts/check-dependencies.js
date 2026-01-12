#!/usr/bin/env node

/**
 * Check for missing dependencies
 * 
 * This script scans all TypeScript files for imports and verifies that
 * all imported packages are declared in package.json dependencies or devDependencies.
 * 
 * This helps catch issues where a package is available in node_modules
 * (as a transitive dependency) but not explicitly declared, which would
 * fail in CI with a clean install.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Read package.json
const packageJson = JSON.parse(
  fs.readFileSync(path.join(__dirname, '../package.json'), 'utf8')
);

const declaredDeps = new Set([
  ...Object.keys(packageJson.dependencies || {}),
  ...Object.keys(packageJson.devDependencies || {}),
]);

// Built-in Node.js modules (don't need to be in package.json)
const builtInModules = new Set([
  'assert', 'async_hooks', 'buffer', 'child_process', 'cluster', 'console',
  'constants', 'crypto', 'dgram', 'dns', 'domain', 'events', 'fs', 'http',
  'http2', 'https', 'inspector', 'module', 'net', 'os', 'path', 'perf_hooks',
  'process', 'punycode', 'querystring', 'readline', 'repl', 'stream',
  'string_decoder', 'timers', 'tls', 'trace_events', 'tty', 'url', 'util',
  'v8', 'vm', 'wasi', 'worker_threads', 'zlib'
]);

// Find all TypeScript files
const findTsFiles = (dir, fileList = []) => {
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      // Skip node_modules and dist
      if (file !== 'node_modules' && file !== 'dist') {
        findTsFiles(filePath, fileList);
      }
    } else if (file.endsWith('.ts') && !file.endsWith('.d.ts')) {
      fileList.push(filePath);
    }
  });
  
  return fileList;
};

// Extract package name from import statement
const extractPackageName = (importPath) => {
  // Skip relative imports (start with . or /)
  if (importPath.startsWith('.') || importPath.startsWith('/')) {
    return null;
  }
  
  // Skip path aliases (start with @/ or @refinement)
  if (importPath.startsWith('@/') || importPath.startsWith('@refinement/')) {
    return null;
  }
  
  // Handle scoped packages (@nestjs/common -> @nestjs/common)
  if (importPath.startsWith('@')) {
    const parts = importPath.split('/');
    return parts.length >= 2 ? `${parts[0]}/${parts[1]}` : importPath;
  }
  
  // Handle regular packages (lodash/get -> lodash)
  return importPath.split('/')[0];
};

// Parse imports from a TypeScript file
const parseImports = (filePath) => {
  const content = fs.readFileSync(filePath, 'utf8');
  const imports = new Set();
  
  // Match: import ... from 'package'
  // Match: import('package')
  // Match: require('package')
  const importRegex = /(?:import|require)\s*(?:\(['"](.*?)['"]|.*?from\s+['"](.*)['"])/g;
  
  let match;
  while ((match = importRegex.exec(content)) !== null) {
    const importPath = match[1] || match[2];
    if (importPath) {
      const packageName = extractPackageName(importPath);
      if (packageName) {
        imports.add(packageName);
      }
    }
  }
  
  return imports;
};

// Main
console.log('🔍 Checking for missing dependencies...\n');

const srcDir = path.join(__dirname, '../src');
const testDir = path.join(__dirname, '../test');
const tsFiles = [
  ...findTsFiles(srcDir),
  ...(fs.existsSync(testDir) ? findTsFiles(testDir) : [])
];

const usedPackages = new Set();
const missingPackages = new Set();

// Collect all used packages
tsFiles.forEach(file => {
  const imports = parseImports(file);
  imports.forEach(pkg => usedPackages.add(pkg));
});

// Check which packages are missing
usedPackages.forEach(pkg => {
  if (!declaredDeps.has(pkg) && !builtInModules.has(pkg)) {
    missingPackages.add(pkg);
  }
});

if (missingPackages.size === 0) {
  console.log('✅ All imported packages are declared in package.json');
  process.exit(0);
} else {
  console.error('❌ Missing dependencies detected:\n');
  
  missingPackages.forEach(pkg => {
    console.error(`   - ${pkg}`);
  });
  
  console.error('\n💡 To fix, run:');
  console.error(`   npm install --save-dev ${Array.from(missingPackages).join(' ')}`);
  console.error('\n   Or if they are runtime dependencies:');
  console.error(`   npm install --save ${Array.from(missingPackages).join(' ')}`);
  
  process.exit(1);
}
