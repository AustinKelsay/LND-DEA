/**
 * This script checks for and adds missing type declarations to the project
 */
const { execSync } = require('child_process');
const { existsSync } = require('fs');
const path = require('path');

// Packages that need type declarations
const packagesToCheck = [
  '@types/node',
  '@types/express'
];

// Types for common libraries used in the project
const libraryTypes = [
  '@types/node',
  '@types/express'
];

// Check if package.json exists
const packageJsonPath = path.join(__dirname, '..', 'package.json');
if (!existsSync(packageJsonPath)) {
  console.error('Error: package.json not found');
  process.exit(1);
}

// Check installed packages
console.log('Checking installed type definitions...');
const missingPackages = [];

for (const pkg of packagesToCheck) {
  try {
    // Try to require the package to see if it's installed
    require.resolve(pkg, { paths: [path.join(__dirname, '..')] });
    console.log(`✅ ${pkg} is installed`);
  } catch (err) {
    console.log(`❌ ${pkg} is not installed`);
    missingPackages.push(pkg);
  }
}

// Install missing packages
if (missingPackages.length > 0) {
  console.log(`\nInstalling missing type definitions: ${missingPackages.join(', ')}`);
  try {
    execSync(`npm install --save-dev ${missingPackages.join(' ')}`, {
      stdio: 'inherit',
      cwd: path.join(__dirname, '..')
    });
    console.log('✅ Successfully installed missing type definitions');
  } catch (error) {
    console.error('❌ Failed to install type definitions:', error.message);
    process.exit(1);
  }
} else {
  console.log('\n✅ All required type definitions are installed');
}

console.log('\nDone! TypeScript type definitions are up to date.'); 