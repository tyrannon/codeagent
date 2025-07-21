// responseTemplates.ts - Structured response templates with implementation details
import { DecisionFramework, DecisionResult } from './decisionFramework';

export interface ResponseTemplate {
  generateResponse(question: string, analysis: any, baseAnswer: string): string;
}

export class ArchitecturalResponseTemplate implements ResponseTemplate {
  generateResponse(question: string, analysis: any, baseAnswer: string): string {
    // Extract question type for decision framework
    const questionType = this.classifyQuestion(question);
    let decisionAnalysis = '';
    
    try {
      if (questionType && DecisionFramework.getAvailableCategories().includes(questionType)) {
        const decision = DecisionFramework.analyzeDecision(questionType, analysis);
        decisionAnalysis = this.formatDecisionAnalysis(decision);
      }
    } catch (error) {
      // Fall back to base analysis if decision framework fails
    }

    return `
## 🏗️ **Architectural Analysis**

${baseAnswer}

${decisionAnalysis}

## 📊 **Code Evidence from Your Project**

**Pattern Detection Results:**
${this.formatPatternEvidence(analysis)}

**Implementation Examples:**
${this.formatImplementationExamples(analysis)}

## ⚡ **Next Steps & Recommendations**

${this.generateActionableSteps(analysis, questionType)}

---
💡 **Confidence Level**: Based on static analysis of ${analysis.metrics?.totalFiles || 0} files with ${analysis.insights?.length || 0} architectural patterns detected.
    `.trim();
  }

  private classifyQuestion(question: string): string | null {
    const questionLower = question.toLowerCase();
    
    if (questionLower.includes('design pattern') || questionLower.includes('pattern')) {
      return 'design-patterns';
    }
    if (questionLower.includes('error') || questionLower.includes('exception') || questionLower.includes('handling')) {
      return 'error-handling';
    }
    if (questionLower.includes('performance') || questionLower.includes('optimization') || questionLower.includes('speed')) {
      return 'performance';
    }
    
    return null;
  }

  private formatDecisionAnalysis(decision: DecisionResult): string {
    return `
## 🎯 **Decision Framework Analysis**

### **Recommended Approach: ${decision.recommendation.value}**
**Risk Level:** ${decision.recommendation.riskLevel} | **Complexity:** ${decision.recommendation.complexity} | **Time:** ${decision.recommendation.implementation.timeEstimate}

**Why This is Best:**
${decision.reasoning}

**Benefits:**
${decision.recommendation.pros.map(pro => `- ✅ ${pro}`).join('\n')}

**Trade-offs to Consider:**
${decision.recommendation.cons.map(con => `- ⚠️ ${con}`).join('\n')}

### **Implementation Plan**

${decision.implementationPlan.phases.map((phase, index) => `
**Phase ${index + 1}: ${phase.name}** (${phase.duration})
${phase.description}

Steps:
${phase.steps.map(step => `- ${step}`).join('\n')}

Risks: ${phase.risks.join(', ')}
`).join('\n')}

**Risk Mitigation:**
${decision.implementationPlan.riskMitigation.map(risk => `- 🛡️ ${risk}`).join('\n')}

**Success Metrics:**
${decision.implementationPlan.successMetrics.map(metric => `- 📈 ${metric}`).join('\n')}

### **Alternative Approaches Considered**
${decision.alternatives.map(alt => `
- **${alt.value}** (Score: ${alt.score}/10, ${alt.complexity})
  - Pros: ${alt.pros.slice(0, 2).join(', ')}
  - Cons: ${alt.cons.slice(0, 1).join(', ')}
`).join('')}`;
  }

  private formatPatternEvidence(analysis: any): string {
    if (!analysis.insights || analysis.insights.length === 0) {
      return '- No architectural patterns detected in current analysis';
    }

    return analysis.insights.map((insight: any) => `
- **${insight.pattern}** (${Math.round(insight.confidence * 100)}% confidence)
  - Files: \`${insight.files.slice(0, 3).join('`, `')}\`
  - Evidence: ${insight.description}
  - Examples: ${insight.evidence.slice(0, 2).join('; ')}`).join('\n');
  }

  private formatImplementationExamples(analysis: any): string {
    if (!analysis.patterns || analysis.patterns.length === 0) {
      return '- No specific code examples found';
    }

    const examples = analysis.patterns
      .filter((p: any) => p.type === 'function' || p.type === 'class')
      .slice(0, 3);

    return examples.map((pattern: any) => `
- **${pattern.name}** in \`${pattern.file}:${pattern.lineNumber}\`
  - Type: ${pattern.type}
  - Description: ${pattern.description}
  - Context: ${pattern.code.split('\n')[0].trim()}...`).join('\n');
  }

  private generateActionableSteps(analysis: any, questionType: string | null): string {
    const steps = [
      '1. **Review** the architectural analysis above for your specific codebase',
      '2. **Backup** any files before making changes using CodeAgent\'s built-in backup feature',
      '3. **Test** any implementations with your existing test suite'
    ];

    if (questionType === 'design-patterns') {
      steps.push(
        '4. **Refactor** gradually - implement patterns incrementally to minimize risk',
        '5. **Measure** the impact on code maintainability and performance'
      );
    } else if (questionType === 'performance') {
      steps.push(
        '4. **Benchmark** current performance before making optimizations',
        '5. **Profile** your application to identify the biggest bottlenecks first'
      );
    } else if (questionType === 'error-handling') {
      steps.push(
        '4. **Implement** error handling incrementally, starting with the most critical paths',
        '5. **Log** errors appropriately for debugging while avoiding sensitive data exposure'
      );
    }

    return steps.join('\n');
  }
}

export class PerformanceResponseTemplate implements ResponseTemplate {
  generateResponse(question: string, analysis: any, baseAnswer: string): string {
    return `
## ⚡ **Performance Analysis**

${baseAnswer}

## 📈 **Current Performance Profile**

**Codebase Complexity Score**: ${analysis.metrics?.complexityScore || 'Unknown'}/10
**Files to Analyze**: ${analysis.metrics?.totalFiles || 0}
**Functions Identified**: ${analysis.metrics?.totalFunctions || 0}

## 🎯 **Optimization Opportunities**

${this.identifyOptimizationOpportunities(analysis)}

## 🛠️ **Implementation Strategy**

### **Phase 1: Measurement & Profiling**
- Set up performance benchmarks for critical operations
- Implement timing measurements in key functions
- Profile memory usage patterns

### **Phase 2: Quick Wins**
- Optimize synchronous I/O operations
- Implement caching for repeated calculations
- Remove unnecessary object creation in loops

### **Phase 3: Advanced Optimizations**
- Consider worker threads for CPU-intensive tasks
- Implement lazy loading for large resources
- Optimize database queries and API calls

## ⚠️ **Performance Trade-offs**

- **Memory vs Speed**: Caching improves speed but increases memory usage
- **Complexity vs Performance**: Some optimizations may make code harder to maintain
- **Premature Optimization**: Focus on actual bottlenecks identified through profiling

## 📊 **Success Metrics**

- Response time improvements (target: 20-50% reduction)
- Memory usage efficiency (target: < 10% increase)
- CPU utilization optimization
- User experience improvements (perceived speed)
    `.trim();
  }

  private identifyOptimizationOpportunities(analysis: any): string {
    const opportunities = [];
    
    if (analysis.patterns?.some((p: any) => p.code.includes('await') || p.code.includes('Promise'))) {
      opportunities.push('- **Async Operations**: Consider parallelizing independent async calls');
    }
    
    if (analysis.patterns?.some((p: any) => p.code.includes('fs.readFileSync') || p.code.includes('readFileSync'))) {
      opportunities.push('- **File I/O**: Convert synchronous file operations to async for better performance');
    }
    
    if (analysis.patterns?.some((p: any) => p.code.includes('for') || p.code.includes('forEach'))) {
      opportunities.push('- **Loop Optimization**: Consider using native array methods or parallel processing');
    }

    return opportunities.length > 0 ? opportunities.join('\n') : '- No obvious optimization opportunities detected in static analysis';
  }
}

export class SecurityResponseTemplate implements ResponseTemplate {
  generateResponse(question: string, analysis: any, baseAnswer: string): string {
    return `
## 🔒 **Security Analysis**

${baseAnswer}

## 🛡️ **Security Assessment**

${this.assessSecurityRisks(analysis)}

## 🎯 **Security Recommendations**

### **Input Validation & Sanitization**
- Validate all user inputs before processing
- Sanitize file paths to prevent directory traversal
- Implement rate limiting for API endpoints

### **Error Handling Security**
- Avoid exposing system details in error messages
- Log security events for monitoring
- Implement secure error recovery mechanisms

### **Dependency Security**
- Regular security audits of dependencies
- Use \`npm audit\` or similar tools
- Keep dependencies updated

## ⚠️ **Security Trade-offs**

- **Performance vs Security**: Additional validation may slow operations
- **Usability vs Security**: Strict validation might affect user experience
- **Logging vs Privacy**: Security logging must balance monitoring and privacy

## 🔍 **Implementation Checklist**

- [ ] Input validation implemented
- [ ] Error messages sanitized
- [ ] Dependencies audited
- [ ] Security headers configured
- [ ] Authentication/authorization reviewed
    `.trim();
  }

  private assessSecurityRisks(analysis: any): string {
    const risks = [];
    
    if (analysis.patterns?.some((p: any) => p.code.includes('eval') || p.code.includes('Function('))) {
      risks.push('- ⚠️ **Code Injection Risk**: Dynamic code execution detected');
    }
    
    if (analysis.patterns?.some((p: any) => p.code.includes('process.env') || p.code.includes('environment'))) {
      risks.push('- ℹ️ **Environment Variables**: Ensure sensitive data is properly handled');
    }
    
    if (analysis.patterns?.some((p: any) => p.code.includes('fs.') || p.code.includes('path.'))) {
      risks.push('- ⚠️ **File System Access**: Validate file paths to prevent directory traversal');
    }

    return risks.length > 0 ? risks.join('\n') : '- ✅ No obvious security risks detected in static analysis';
  }
}

export class TemplateFactory {
  static getTemplate(questionType: string): ResponseTemplate {
    const questionLower = questionType.toLowerCase();
    
    if (questionLower.includes('performance') || questionLower.includes('optimization') || questionLower.includes('speed')) {
      return new PerformanceResponseTemplate();
    }
    
    if (questionLower.includes('security') || questionLower.includes('vulnerability') || questionLower.includes('safe')) {
      return new SecurityResponseTemplate();
    }
    
    // Default to architectural template
    return new ArchitecturalResponseTemplate();
  }
}