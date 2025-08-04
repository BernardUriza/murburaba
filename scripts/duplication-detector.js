#!/usr/bin/env node

/**
 * Automated Code Duplication Detection Script
 * Runs multiple duplication detection tools and generates reports
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

class DuplicationDetector {
  constructor() {
    this.results = {
      timestamp: new Date().toISOString(),
      tools: {},
      summary: {
        totalDuplications: 0,
        criticalIssues: 0,
        estimatedSavings: 0
      }
    };
  }

  async runDetection() {
    console.log('🔍 Running automated duplication detection...');
    
    // 1. Run jscpd for JavaScript/TypeScript duplication
    await this.runJSCPD();
    
    // 2. Run custom pattern detection
    await this.runPatternDetection();
    
    // 3. Analyze bundle duplications
    await this.analyzeBundleDuplication();
    
    // 4. Check test duplications
    await this.analyzeTestDuplication();
    
    // 5. Generate reports
    await this.generateReports();
    
    console.log('✅ Duplication analysis complete!');
    return this.results;
  }

  async runJSCPD() {
    try {
      console.log('📊 Analyzing code duplications with jscpd...');
      
      const jscpdConfig = {
        threshold: 20,
        minLines: 5,
        format: ['json', 'console'],
        output: './reports/jscpd',
        ignore: ['**/node_modules/**', '**/dist/**', '**/.next/**'],
        reporters: ['json', 'console']
      };
      
      // Write jscpd config
      fs.writeFileSync('.jscpdrc.json', JSON.stringify(jscpdConfig, null, 2));
      
      const result = execSync('npx jscpd packages/murmuraba/src', { 
        encoding: 'utf8',
        cwd: process.cwd()
      });
      
      this.results.tools.jscpd = {
        status: 'success',
        output: result
      };
      
    } catch (error) {
      console.warn('⚠️ JSCPD analysis failed, continuing with other tools...');
      this.results.tools.jscpd = {
        status: 'error',
        error: error.message
      };
    }
  }

  async runPatternDetection() {
    console.log('🔎 Running custom pattern detection...');
    
    const patterns = [
      // React patterns
      { name: 'useState duplications', pattern: /const \[.*?, set.*?\] = useState\(/g },
      { name: 'useEffect duplications', pattern: /useEffect\(\(\) => \{[\s\S]*?\}, \[.*?\]\)/g },
      { name: 'vi.fn() mocks', pattern: /vi\.fn\(\)/g },
      { name: 'AudioContext mocks', pattern: /AudioContext.*=.*vi\.fn/g },
      { name: 'Console.log statements', pattern: /console\.log\(/g },
      { name: 'Error throwing patterns', pattern: /throw new Error\(/g },
      { name: 'RMS calculations', pattern: /Math\.sqrt.*reduce.*\+.*\*.*\//g }
    ];

    const sourceFiles = this.getSourceFiles();
    const patternResults = {};

    for (const pattern of patterns) {
      patternResults[pattern.name] = [];
      
      for (const file of sourceFiles) {
        const content = fs.readFileSync(file, 'utf8');
        const matches = [...content.matchAll(pattern.pattern)];
        
        if (matches.length > 1) {
          patternResults[pattern.name].push({
            file: file,
            occurrences: matches.length,
            lines: matches.map(m => this.getLineNumber(content, m.index))
          });
        }
      }
    }

    this.results.tools.patterns = patternResults;
    
    // Calculate summary stats
    let totalDupes = 0;
    Object.values(patternResults).forEach(results => {
      results.forEach(result => totalDupes += result.occurrences - 1);
    });
    
    this.results.summary.totalDuplications = totalDupes;
  }

  async analyzeBundleDuplication() {
    try {
      console.log('📦 Analyzing bundle duplications...');
      
      // Use webpack-bundle-analyzer if available
      const result = execSync('npx webpack-bundle-analyzer --analyze-mode json', {
        encoding: 'utf8',
        cwd: process.cwd()
      });
      
      this.results.tools.bundleAnalyzer = {
        status: 'success',
        duplicateModules: this.findDuplicateModules(result)
      };
      
    } catch (error) {
      console.warn('⚠️ Bundle analysis skipped (no webpack config found)');
      this.results.tools.bundleAnalyzer = {
        status: 'skipped',
        reason: 'No webpack configuration found'
      };
    }
  }

  async analyzeTestDuplication() {
    console.log('🧪 Analyzing test duplications...');
    
    const testFiles = this.getTestFiles();
    const testPatterns = [
      { name: 'beforeEach patterns', pattern: /beforeEach\(\(\) => \{/g },
      { name: 'afterEach patterns', pattern: /afterEach\(\(\) => \{/g },
      { name: 'describe blocks', pattern: /describe\(['"].*['"], \(\) => \{/g },
      { name: 'it blocks', pattern: /it\(['"].*should.*['"], /g },
      { name: 'expect assertions', pattern: /expect\(.*\)\.to/g }
    ];

    const testResults = {};
    
    for (const pattern of testPatterns) {
      testResults[pattern.name] = 0;
      
      for (const file of testFiles) {
        const content = fs.readFileSync(file, 'utf8');
        const matches = content.match(pattern.pattern);
        if (matches) {
          testResults[pattern.name] += matches.length;
        }
      }
    }

    this.results.tools.testAnalysis = testResults;
  }

  async generateReports() {
    console.log('📄 Generating reports...');
    
    const reportsDir = './reports/duplication';
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }

    // JSON report
    fs.writeFileSync(
      path.join(reportsDir, 'duplication-report.json'),
      JSON.stringify(this.results, null, 2)
    );

    // Markdown summary
    const markdown = this.generateMarkdownReport();
    fs.writeFileSync(
      path.join(reportsDir, 'duplication-summary.md'),
      markdown
    );

    // CSV for tracking
    const csv = this.generateCSVReport();
    fs.writeFileSync(
      path.join(reportsDir, 'duplication-metrics.csv'),
      csv
    );

    console.log(`📊 Reports generated in ${reportsDir}/`);
  }

  generateMarkdownReport() {
    const { summary, tools } = this.results;
    
    return `# Code Duplication Analysis Report
    
Generated: ${this.results.timestamp}

## Summary
- **Total Duplications Found**: ${summary.totalDuplications}
- **Critical Issues**: ${summary.criticalIssues}
- **Estimated Savings**: ${summary.estimatedSavings}%

## Pattern Analysis
${Object.entries(tools.patterns || {}).map(([pattern, results]) => 
  `### ${pattern}\n- Files affected: ${results.length}\n- Total occurrences: ${results.reduce((sum, r) => sum + r.occurrences, 0)}\n`
).join('\n')}

## Recommendations
1. **High Priority**: Consolidate test utilities and mocks
2. **Medium Priority**: Extract shared React hooks
3. **Low Priority**: Standardize console logging

## Next Steps
1. Run \`npm run lint:duplication\` regularly
2. Add duplication checks to CI/CD pipeline
3. Set duplication thresholds in pre-commit hooks
`;
  }

  generateCSVReport() {
    const patterns = this.results.tools.patterns || {};
    const rows = ['Pattern,Files,Occurrences,Priority'];
    
    Object.entries(patterns).forEach(([pattern, results]) => {
      const totalFiles = results.length;
      const totalOccurrences = results.reduce((sum, r) => sum + r.occurrences, 0);
      const priority = totalOccurrences > 10 ? 'High' : totalOccurrences > 5 ? 'Medium' : 'Low';
      
      rows.push(`${pattern},${totalFiles},${totalOccurrences},${priority}`);
    });

    return rows.join('\n');
  }

  getSourceFiles() {
    const glob = require('glob');
    return glob.sync('packages/murmuraba/src/**/*.{ts,tsx,js,jsx}', {
      ignore: ['**/node_modules/**', '**/dist/**', '**/*.test.*', '**/*.spec.*']
    });
  }

  getTestFiles() {
    const glob = require('glob');
    return glob.sync('packages/murmuraba/src/**/*.{test,spec}.{ts,tsx,js,jsx}');
  }

  getLineNumber(content, index) {
    return content.substring(0, index).split('\n').length;
  }

  findDuplicateModules(bundleData) {
    // Parse bundle analyzer output to find duplicate modules
    try {
      const data = JSON.parse(bundleData);
      return data.modules?.filter(module => 
        module.name.includes('node_modules') && 
        data.modules.filter(m => m.name.includes(module.name.split('/').pop())).length > 1
      ) || [];
    } catch {
      return [];
    }
  }
}

// CLI interface
if (require.main === module) {
  const detector = new DuplicationDetector();
  detector.runDetection().then(results => {
    console.log('\n🎯 Detection Summary:');
    console.log(`- Total duplications: ${results.summary.totalDuplications}`);
    console.log(`- Tools run: ${Object.keys(results.tools).length}`);
    console.log('- Reports saved to ./reports/duplication/');
    
    // Exit with code 1 if critical issues found
    if (results.summary.criticalIssues > 0) {
      console.error(`❌ ${results.summary.criticalIssues} critical duplication issues found!`);
      process.exit(1);
    }
  }).catch(error => {
    console.error('❌ Duplication detection failed:', error);
    process.exit(1);
  });
}

module.exports = DuplicationDetector;