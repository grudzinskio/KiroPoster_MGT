#!/usr/bin/env node

/**
 * Comprehensive System Test Runner
 * 
 * This script runs all system integration tests in the correct order
 * and provides a comprehensive report of the system's functionality.
 */

import { execSync } from 'child_process';
import path from 'path';
import fs from 'fs';

interface TestSuite {
  name: string;
  description: string;
  pattern: string;
  timeout?: number;
  critical: boolean;
}

interface TestResult {
  suite: string;
  passed: boolean;
  duration: number;
  output: string;
  error?: string;
}

class SystemTestRunner {
  private results: TestResult[] = [];
  private startTime: number = 0;

  private testSuites: TestSuite[] = [
    {
      name: 'Database Setup',
      description: 'Verify database connectivity and migrations',
      pattern: 'database/transactions',
      timeout: 30000,
      critical: true
    },
    {
      name: 'Authentication & Security',
      description: 'Test authentication flows and security measures',
      pattern: 'integration/auth',
      timeout: 20000,
      critical: true
    },
    {
      name: 'User Management',
      description: 'Test user CRUD operations and role management',
      pattern: 'integration/users',
      timeout: 15000,
      critical: true
    },
    {
      name: 'Company Management',
      description: 'Test company CRUD operations',
      pattern: 'integration/companies',
      timeout: 15000,
      critical: true
    },
    {
      name: 'Campaign Management',
      description: 'Test campaign lifecycle and status management',
      pattern: 'integration/campaigns',
      timeout: 20000,
      critical: true
    },
    {
      name: 'Image Management',
      description: 'Test image upload, approval, and file handling',
      pattern: 'integration/images',
      timeout: 25000,
      critical: true
    },
    {
      name: 'Role-Based Access Control',
      description: 'Comprehensive RBAC testing across all roles',
      pattern: 'security/rbac-comprehensive',
      timeout: 30000,
      critical: true
    },
    {
      name: 'File Upload Security',
      description: 'Test file upload security and validation',
      pattern: 'security/file-upload.security',
      timeout: 20000,
      critical: true
    },
    {
      name: 'Data Integrity',
      description: 'Test business rules and data consistency',
      pattern: 'integration/data-integrity',
      timeout: 25000,
      critical: true
    },
    {
      name: 'End-to-End User Workflows',
      description: 'Complete user journey testing',
      pattern: 'e2e/user-workflows.e2e',
      timeout: 45000,
      critical: true
    },
    {
      name: 'User Acceptance Tests',
      description: 'Business scenario validation',
      pattern: 'e2e/user-acceptance.e2e',
      timeout: 60000,
      critical: true
    },
    {
      name: 'Performance & Load Testing',
      description: 'Test system performance under load',
      pattern: 'performance/large-datasets',
      timeout: 120000,
      critical: false
    },
    {
      name: 'Concurrent Users Load Test',
      description: 'Test concurrent user operations',
      pattern: 'load/concurrent-users',
      timeout: 180000,
      critical: false
    }
  ];

  async runAllTests(): Promise<void> {
    console.log('🚀 Starting Comprehensive System Testing');
    console.log('=' .repeat(60));
    
    this.startTime = Date.now();
    
    // Check prerequisites
    await this.checkPrerequisites();
    
    // Run test suites
    for (const suite of this.testSuites) {
      await this.runTestSuite(suite);
    }
    
    // Generate report
    this.generateReport();
  }

  private async checkPrerequisites(): Promise<void> {
    console.log('🔍 Checking Prerequisites...');
    
    // Check if test database exists
    try {
      execSync('npm run db:test:setup', { 
        stdio: 'pipe',
        cwd: process.cwd(),
        timeout: 30000
      });
      console.log('✅ Test database setup complete');
    } catch (error) {
      console.log('⚠️  Test database setup failed, continuing with existing setup');
    }
    
    // Check if uploads directory exists
    const uploadsDir = path.join(process.cwd(), 'uploads');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
      console.log('✅ Created uploads directory');
    }
    
    // Check if test fixtures directory exists
    const fixturesDir = path.join(process.cwd(), 'src/tests/fixtures');
    if (!fs.existsSync(fixturesDir)) {
      fs.mkdirSync(fixturesDir, { recursive: true });
      console.log('✅ Created test fixtures directory');
    }
    
    console.log('');
  }

  private async runTestSuite(suite: TestSuite): Promise<void> {
    console.log(`📋 Running: ${suite.name}`);
    console.log(`   ${suite.description}`);
    
    const startTime = Date.now();
    let result: TestResult;
    
    try {
      const output = execSync(
        `npm test -- --testPathPatterns="${suite.pattern}" --verbose --forceExit`,
        {
          stdio: 'pipe',
          encoding: 'utf8',
          cwd: process.cwd(),
          timeout: suite.timeout || 60000,
          env: {
            ...process.env,
            NODE_ENV: 'test',
            CI: 'true'
          }
        }
      );
      
      const duration = Date.now() - startTime;
      
      result = {
        suite: suite.name,
        passed: true,
        duration,
        output: output.toString()
      };
      
      console.log(`   ✅ PASSED (${duration}ms)`);
      
    } catch (error: any) {
      const duration = Date.now() - startTime;
      
      result = {
        suite: suite.name,
        passed: false,
        duration,
        output: error.stdout?.toString() || '',
        error: error.stderr?.toString() || error.message
      };
      
      const status = suite.critical ? '❌ FAILED (CRITICAL)' : '⚠️  FAILED (NON-CRITICAL)';
      console.log(`   ${status} (${duration}ms)`);
      
      if (suite.critical) {
        console.log(`   Error: ${error.message}`);
      }
    }
    
    this.results.push(result);
    console.log('');
  }

  private generateReport(): void {
    const totalDuration = Date.now() - this.startTime;
    const passed = this.results.filter(r => r.passed).length;
    const failed = this.results.filter(r => !r.passed).length;
    const criticalFailed = this.results.filter(r => !r.passed && this.testSuites.find(s => s.name === r.suite)?.critical).length;
    
    console.log('📊 SYSTEM TEST REPORT');
    console.log('=' .repeat(60));
    console.log(`Total Duration: ${Math.round(totalDuration / 1000)}s`);
    console.log(`Test Suites: ${this.results.length}`);
    console.log(`Passed: ${passed}`);
    console.log(`Failed: ${failed}`);
    console.log(`Critical Failures: ${criticalFailed}`);
    console.log('');
    
    // Detailed results
    console.log('📋 DETAILED RESULTS');
    console.log('-' .repeat(60));
    
    this.results.forEach(result => {
      const suite = this.testSuites.find(s => s.name === result.suite);
      const status = result.passed ? '✅ PASS' : (suite?.critical ? '❌ FAIL' : '⚠️  FAIL');
      const duration = Math.round(result.duration / 1000);
      
      console.log(`${status} ${result.suite} (${duration}s)`);
      
      if (!result.passed && result.error) {
        console.log(`     Error: ${result.error.split('\n')[0]}`);
      }
    });
    
    console.log('');
    
    // System health assessment
    console.log('🏥 SYSTEM HEALTH ASSESSMENT');
    console.log('-' .repeat(60));
    
    if (criticalFailed === 0) {
      console.log('✅ SYSTEM HEALTHY - All critical tests passed');
      console.log('   The system is ready for production deployment.');
    } else {
      console.log('❌ SYSTEM UNHEALTHY - Critical test failures detected');
      console.log('   The system requires fixes before production deployment.');
      
      const criticalFailures = this.results.filter(r => 
        !r.passed && this.testSuites.find(s => s.name === r.suite)?.critical
      );
      
      console.log('   Critical failures:');
      criticalFailures.forEach(failure => {
        console.log(`   - ${failure.suite}`);
      });
    }
    
    if (failed > criticalFailed) {
      console.log(`⚠️  ${failed - criticalFailed} non-critical test(s) failed`);
      console.log('   These should be addressed but do not block deployment.');
    }
    
    console.log('');
    
    // Performance summary
    const performanceTests = this.results.filter(r => 
      r.suite.toLowerCase().includes('performance') || 
      r.suite.toLowerCase().includes('load')
    );
    
    if (performanceTests.length > 0) {
      console.log('⚡ PERFORMANCE SUMMARY');
      console.log('-' .repeat(60));
      
      performanceTests.forEach(test => {
        const status = test.passed ? '✅' : '❌';
        const duration = Math.round(test.duration / 1000);
        console.log(`${status} ${test.suite}: ${duration}s`);
      });
      
      console.log('');
    }
    
    // Recommendations
    console.log('💡 RECOMMENDATIONS');
    console.log('-' .repeat(60));
    
    if (criticalFailed === 0 && failed === 0) {
      console.log('🎉 Excellent! All tests passed.');
      console.log('   - System is ready for production');
      console.log('   - Consider running load tests regularly');
      console.log('   - Monitor system performance in production');
    } else {
      console.log('🔧 Action items:');
      
      if (criticalFailed > 0) {
        console.log('   1. Fix critical test failures immediately');
        console.log('   2. Re-run system tests after fixes');
        console.log('   3. Do not deploy until all critical tests pass');
      }
      
      if (failed > criticalFailed) {
        console.log('   4. Address non-critical failures in next iteration');
        console.log('   5. Review test coverage and add missing scenarios');
      }
      
      console.log('   6. Set up continuous integration to catch regressions');
      console.log('   7. Implement monitoring and alerting for production');
    }
    
    console.log('');
    console.log('🏁 System testing complete!');
    
    // Exit with appropriate code
    process.exit(criticalFailed > 0 ? 1 : 0);
  }
}

// Run if called directly
if (require.main === module) {
  const runner = new SystemTestRunner();
  runner.runAllTests().catch(error => {
    console.error('System test runner failed:', error);
    process.exit(1);
  });
}

export default SystemTestRunner;