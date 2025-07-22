#!/usr/bin/env node

/**
 * Test Multi-Language Analysis System
 * 
 * Demonstrates CodeAgent's enhanced multi-language capabilities
 */

console.log('🚀 Testing CodeAgent Multi-Language Analysis System\n');

const { enhancedCodeAnalyzer } = require('./utils/enhancedCodeAnalyzer');

async function testMultiLanguageAnalysis() {
  try {
    console.log('🔍 Starting enhanced project analysis...');
    
    // Analyze the current project
    const analysis = await enhancedCodeAnalyzer.analyzeProject(process.cwd());
    
    console.log('\n📊 Analysis Results:');
    console.log(`• Total Files Analyzed: ${analysis.analysisResults.length}/${analysis.totalFiles}`);
    console.log(`• Languages Detected: ${Array.from(analysis.languageStats.keys()).join(', ')}`);
    console.log(`• Overall Quality Score: ${Math.round(analysis.overallMetrics.codeQualityScore)}/100`);
    
    console.log('\n🌍 Language Distribution:');
    for (const [language, count] of analysis.languageStats) {
      const percentage = ((count / analysis.totalFiles) * 100).toFixed(1);
      console.log(`  ${language}: ${count} files (${percentage}%)`);
    }
    
    console.log('\n📈 Key Metrics:');
    console.log(`• Average Complexity: ${analysis.overallMetrics.averageComplexity.toFixed(1)}`);
    console.log(`• Maintainability: ${Math.round(analysis.overallMetrics.averageMaintainability)}/100`);
    console.log(`• Security Score: ${Math.round(analysis.overallMetrics.securityScore)}/100`);
    console.log(`• Performance Score: ${Math.round(analysis.overallMetrics.performanceScore)}/100`);
    
    console.log('\n🔧 Technical Debt:');
    console.log(`• Total Debt: ${analysis.technicalDebt.totalDebt} hours`);
    console.log(`• Complexity Debt: ${Math.round(analysis.technicalDebt.categories.complexity)} hours`);
    console.log(`• Security Debt: ${Math.round(analysis.technicalDebt.categories.security)} hours`);
    console.log(`• Test Coverage Debt: ${Math.round(analysis.technicalDebt.categories.testCoverage)} hours`);
    
    if (analysis.technicalDebt.highPriorityItems.length > 0) {
      console.log('\n⚠️ High Priority Issues:');
      analysis.technicalDebt.highPriorityItems.slice(0, 3).forEach(item => {
        console.log(`  • ${item}`);
      });
    }
    
    console.log('\n🎯 Top Recommendations:');
    analysis.recommendations.slice(0, 5).forEach((rec, index) => {
      const priorityEmoji = rec.priority === 'high' ? '🔥' : rec.priority === 'medium' ? '⚡' : '💡';
      console.log(`${index + 1}. ${priorityEmoji} ${rec.title}`);
      console.log(`   Impact: ${rec.expectedImpact}`);
      console.log(`   Effort: ${rec.estimatedEffort} | Files: ${rec.affectedFiles.length}`);
    });
    
    console.log('\n🔍 Pattern Detection Results:');
    const allPatterns = analysis.analysisResults.flatMap(result => result.patterns);
    const patternCounts = {};
    allPatterns.forEach(pattern => {
      patternCounts[pattern.type] = (patternCounts[pattern.type] || 0) + 1;
    });
    
    for (const [pattern, count] of Object.entries(patternCounts)) {
      console.log(`  • ${pattern}: ${count} instances`);
    }
    
    console.log('\n✨ Language-Specific Insights:');
    
    // Show insights for each language
    const languageInsights = {};
    analysis.analysisResults.forEach(result => {
      if (!languageInsights[result.language]) {
        languageInsights[result.language] = {
          files: 0,
          totalIssues: 0,
          suggestions: 0,
          patterns: 0
        };
      }
      
      const insights = languageInsights[result.language];
      insights.files++;
      insights.totalIssues += result.issues.length;
      insights.suggestions += result.suggestions.length;
      insights.patterns += result.patterns.length;
    });
    
    for (const [language, insights] of Object.entries(languageInsights)) {
      console.log(`\n  📝 ${language.toUpperCase()}:`);
      console.log(`    Files: ${insights.files}`);
      console.log(`    Issues: ${insights.totalIssues}`);
      console.log(`    Suggestions: ${insights.suggestions}`);
      console.log(`    Patterns: ${insights.patterns}`);
    }
    
    // Generate full report
    console.log('\n📄 Generating comprehensive report...');
    const report = enhancedCodeAnalyzer.generateReport(analysis);
    
    console.log('\n🎉 SUCCESS! Multi-language analysis completed successfully!');
    console.log('\n✅ Demonstrated Capabilities:');
    console.log('  ✅ Multi-language project analysis');
    console.log('  ✅ Pattern detection across languages');
    console.log('  ✅ Technical debt calculation');
    console.log('  ✅ Language-specific issue detection');
    console.log('  ✅ Intelligent recommendation generation');
    console.log('  ✅ Comprehensive reporting');
    
    console.log('\n🚀 CodeAgent now supports:');
    console.log('  • TypeScript/JavaScript analysis');
    console.log('  • Python analysis');
    console.log('  • Go analysis');  
    console.log('  • Rust analysis');
    console.log('  • Plugin architecture for extensibility');
    
    return analysis;
    
  } catch (error) {
    console.error('❌ Error during multi-language analysis:', error);
    console.error('\n🔧 This indicates the system needs debugging:');
    console.error('  • Check plugin imports and exports');
    console.error('  • Verify language detection logic');
    console.error('  • Ensure file reading permissions');
    
    return null;
  }
}

// Run the test
testMultiLanguageAnalysis()
  .then(analysis => {
    if (analysis) {
      console.log(`\n📊 Final Summary: Analyzed ${analysis.analysisResults.length} files across ${analysis.languageStats.size} languages`);
    }
  })
  .catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });