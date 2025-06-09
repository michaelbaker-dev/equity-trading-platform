#!/usr/bin/env node

/**
 * Environment Verification Script for React Migration
 * Checks all required tools before starting the conversion
 */

const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

class EnvironmentChecker {
  constructor() {
    this.results = {
      passed: [],
      failed: [],
      warnings: []
    };
  }

  log(message, type = 'info') {
    const colors = {
      info: '\x1b[36m',     // Cyan
      success: '\x1b[32m',  // Green
      warning: '\x1b[33m',  // Yellow
      error: '\x1b[31m',    // Red
      reset: '\x1b[0m'      // Reset
    };
    console.log(`${colors[type]}${message}${colors.reset}`);
  }

  async checkCommand(command, name, requiredVersion = null) {
    try {
      const output = execSync(command, { encoding: 'utf8', stdio: 'pipe' });
      const version = output.trim();
      
      if (requiredVersion) {
        const currentVersion = this.extractVersion(version);
        const required = this.extractVersion(requiredVersion);
        
        if (this.compareVersions(currentVersion, required) >= 0) {
          this.results.passed.push(`${name}: ${version}`);
          this.log(`✅ ${name}: ${version}`, 'success');
          return true;
        } else {
          this.results.failed.push(`${name}: ${version} (requires ${requiredVersion})`);
          this.log(`❌ ${name}: ${version} (requires ${requiredVersion})`, 'error');
          return false;
        }
      } else {
        this.results.passed.push(`${name}: ${version}`);
        this.log(`✅ ${name}: ${version}`, 'success');
        return true;
      }
    } catch (error) {
      this.results.failed.push(`${name}: Not installed`);
      this.log(`❌ ${name}: Not installed`, 'error');
      return false;
    }
  }

  extractVersion(versionString) {
    const match = versionString.match(/(\d+)\.(\d+)\.(\d+)/);
    return match ? match[0] : '0.0.0';
  }

  compareVersions(version1, version2) {
    const v1 = version1.split('.').map(Number);
    const v2 = version2.split('.').map(Number);
    
    for (let i = 0; i < Math.max(v1.length, v2.length); i++) {
      const a = v1[i] || 0;
      const b = v2[i] || 0;
      if (a > b) return 1;
      if (a < b) return -1;
    }
    return 0;
  }

  checkFile(filePath, name) {
    if (fs.existsSync(filePath)) {
      this.results.passed.push(`${name}: Found`);
      this.log(`✅ ${name}: Found at ${filePath}`, 'success');
      return true;
    } else {
      this.results.failed.push(`${name}: Not found`);
      this.log(`❌ ${name}: Not found at ${filePath}`, 'error');
      return false;
    }
  }

  async checkCurrentProject() {
    this.log('\n📁 Checking Current Project Structure...', 'info');
    
    const currentDir = process.cwd();
    const requiredFiles = [
      { path: 'static/index.html', name: 'Main HTML file' },
      { path: 'static/styles.css', name: 'Main CSS file' },
      { path: 'static/js/equity-app.js', name: 'Equity App module' },
      { path: 'static/js/professional-chart.js', name: 'Professional Chart module' },
      { path: 'static/js/watchlist-manager.js', name: 'Watchlist Manager module' },
      { path: 'static/js/ui-components.js', name: 'UI Components module' },
      { path: 'static/js/api-client.js', name: 'API Client module' },
      { path: 'static/js/stock-search.js', name: 'Stock Search module' }
    ];

    let projectValid = true;
    for (const file of requiredFiles) {
      const fullPath = path.join(currentDir, file.path);
      if (!this.checkFile(fullPath, file.name)) {
        projectValid = false;
      }
    }

    return projectValid;
  }

  async checkGoBackend() {
    this.log('\n🔧 Checking Go Backend...', 'info');
    
    try {
      // Check if Go is installed
      await this.checkCommand('go version', 'Go', '1.19.0');
      
      // Check if the Go server can be built
      const currentDir = process.cwd();
      if (fs.existsSync(path.join(currentDir, 'go.mod'))) {
        execSync('go mod tidy', { stdio: 'pipe' });
        execSync('go build -o temp_server ./cmd', { stdio: 'pipe' });
        
        // Clean up temp file
        if (fs.existsSync('./temp_server')) {
          fs.unlinkSync('./temp_server');
        }
        
        this.log('✅ Go backend builds successfully', 'success');
        return true;
      } else {
        this.log('❌ Go backend: go.mod not found', 'error');
        return false;
      }
    } catch (error) {
      this.log(`❌ Go backend build failed: ${error.message}`, 'error');
      return false;
    }
  }

  async run() {
    this.log('🔍 Starting Environment Verification...', 'info');
    this.log('='.repeat(50), 'info');

    // Check core development tools
    this.log('\n🛠️  Checking Core Development Tools...', 'info');
    await this.checkCommand('node --version', 'Node.js', '18.0.0');
    await this.checkCommand('npm --version', 'npm', '8.0.0');
    await this.checkCommand('git --version', 'Git');

    // Check optional but recommended tools
    this.log('\n⚙️  Checking Optional Tools...', 'info');
    const hasYarn = await this.checkCommand('yarn --version', 'Yarn (optional)');
    const hasPnpm = await this.checkCommand('pnpm --version', 'pnpm (optional)');
    
    if (!hasYarn && !hasPnpm) {
      this.results.warnings.push('Consider installing yarn or pnpm for faster installs');
    }

    // Check current project structure
    const projectValid = await this.checkCurrentProject();

    // Check Go backend
    const backendValid = await this.checkGoBackend();

    // Check VS Code (optional)
    this.log('\n📝 Checking Code Editor...', 'info');
    await this.checkCommand('code --version', 'VS Code (optional)');

    // Summary
    this.log('\n📊 Environment Check Summary', 'info');
    this.log('='.repeat(50), 'info');
    
    if (this.results.passed.length > 0) {
      this.log(`✅ Passed (${this.results.passed.length}):`, 'success');
      this.results.passed.forEach(item => console.log(`   ${item}`));
    }

    if (this.results.failed.length > 0) {
      this.log(`\n❌ Failed (${this.results.failed.length}):`, 'error');
      this.results.failed.forEach(item => console.log(`   ${item}`));
    }

    if (this.results.warnings.length > 0) {
      this.log(`\n⚠️  Warnings (${this.results.warnings.length}):`, 'warning');
      this.results.warnings.forEach(item => console.log(`   ${item}`));
    }

    // Final recommendation
    this.log('\n🎯 Recommendation:', 'info');
    
    const criticalIssues = this.results.failed.filter(item => 
      item.includes('Node.js') || 
      item.includes('npm') || 
      item.includes('Git') ||
      !projectValid ||
      !backendValid
    );

    if (criticalIssues.length === 0 && projectValid && backendValid) {
      this.log('✅ Environment is ready for React migration!', 'success');
      this.log('Next step: Run npm run setup-react to begin conversion', 'info');
      return true;
    } else {
      this.log('❌ Environment needs setup before proceeding', 'error');
      this.log('Next step: Run npm run install-missing to fix issues', 'warning');
      return false;
    }
  }
}

// Run the checker
if (require.main === module) {
  const checker = new EnvironmentChecker();
  checker.run().then(success => {
    process.exit(success ? 0 : 1);
  });
}

module.exports = EnvironmentChecker;