#!/usr/bin/env node

/**
 * Test Validation Script
 * 
 * Validates that all test files are properly structured and can be executed
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

interface TestFile {
  path: string;
  name: string;
  size: number;
  hasDescribe: boolean;
  hasTest: boolean;
  syntaxValid: boolean;
  error?: string;
}

class TestValidator {
  private testFiles: TestFile[] = [];
  private testDir = path.join(process.cwd(), 'src/tests');

  async validateAllTests(): Promise<void> {
    console.log('🔍 Validating Test Files');
    console.log('=' .repeat(50));
    
    await this.scanTestFiles();
    await this.validateTestFiles();
    this.generateReport();
  }

  private async scanTestFiles(): Promise<void> {
    const scanDirectory = (dir: string): void => {
      const items = fs.readdirSync(dir);
      
      for (const item of items) {
        const fullPath = path.join(dir, item);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory()) {
          scanDirectory(fullPath);
        } else if (item.endsWith('.test.ts') || item.endsWith('.e2e.test.ts')) {
          const relativePath = path.relative(this.testDir, fullPath);
          this.testFiles.push({
            path: relativePath,
            name: item,
            size: stat.size,
            hasDescribe: false,
            hasTest: false,
            syntaxValid: false
          });
        }
      }
    };
    
    scanDirectory(this.testDir);
    console.log(`Found ${this.testFiles.length} test files`);
  }

  private async validateTestFiles(): Promise<void> {
    for (const testFile of this.testFiles) {
      await this.validateTestFile(testFile);
    }
  }

  private async validateTestFile(testFile: TestFile): Promise<void> {
    const fullPath = path.join(this.testDir, testFile.path);
    
    try {
      // Read file content
      const content = fs.readFileSync(fullPath, 'utf8');
      
      // Check for describe blocks
      testFile.hasDescribe = /describe\s*\(/.test(content);
      
      // Check for test blocks
      testFile.hasTest = /(?:test|it)\s*\(/.test(content);
      
      // Check syntax by trying to compile
      try {
        execSync(`npx tsc --noEmit --skipLibCheck "${fullPath}"`, {
          stdio: 'pipe',
          timeout: 10000
        });
        testFile.syntaxValid = true;
      } catch (error: any) {
        testFile.syntaxValid = false;
        testFile.error = error.message;
      }
      
    } catch (error: any) {
      testFile.error = `Failed to read file: ${error.message}`;
    }
  }

  private generateReport(): void {
    console.log('\n📊 VALIDATION REPORT');
    console.log('=' .repeat(50));
    
    const valid = this.testFiles.filter(f => f.syntaxValid && f.hasDescribe && f.hasTest);
    const invalid = this.testFiles.filter(f => !f.syntaxValid || !f.hasDescribe || !f.hasTest);
    
    console.log(`Total Files: ${this.testFiles.length}`);
    console.log(`Valid: ${valid.length}`);
    console.log(`Invalid: ${invalid.length}`);
    console.log('');
    
    if (invalid.length > 0) {
      console.log('❌ INVALID TEST FILES:');
      console.log('-' .repeat(30));
      
      invalid.forEach(file => {
        console.log(`📄 ${file.name}`);
        console.log(`   Path: ${file.path}`);
        
        const issues = [];
        if (!file.hasDescribe) issues.push('Missing describe block');
        if (!file.hasTest) issues.push('Missing test/it block');
        if (!file.syntaxValid) issues.push('Syntax errors');
        
        console.log(`   Issues: ${issues.join(', ')}`);
        
        if (file.error) {
          console.log(`   Error: ${file.error.split('\n')[0]}`);
        }
        console.log('');
      });
    }
    
    if (valid.length > 0) {
      console.log('✅ VALID TEST FILES:');
      console.log('-' .repeat(30));
      
      valid.forEach(file => {
        const sizeKB = Math.round(file.size / 1024);
        console.log(`📄 ${file.name} (${sizeKB}KB)`);
      });
      console.log('');
    }
    
    // Summary
    if (invalid.length === 0) {
      console.log('🎉 All test files are valid!');
    } else {
      console.log(`⚠️  ${invalid.length} test file(s) need attention`);
    }
    
    console.log('\n🏁 Validation complete!');
  }
}

// Run if called directly
if (require.main === module) {
  const validator = new TestValidator();
  validator.validateAllTests().catch(error => {
    console.error('Test validation failed:', error);
    process.exit(1);
  });
}

export default TestValidator;