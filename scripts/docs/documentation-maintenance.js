#!/usr/bin/env node

/**
 * FleetifyApp Documentation Maintenance Script
 *
 * This script automates documentation maintenance tasks including:
 * - API documentation generation
 * - Content validation and link checking
 * - Table of contents generation
 * - Search index creation
 * - Documentation metrics and analytics
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const glob = require('glob');

class DocumentationMaintenance {
  constructor() {
    this.docsDir = path.join(__dirname, '../../docs');
    this.srcDir = path.join(__dirname, '../../src');
    this.outputDir = path.join(__dirname, '../../dist/docs');
    this.errors = [];
    this.warnings = [];
    this.stats = {
      totalPages: 0,
      apiEndpoints: 0,
      codeExamples: 0,
      brokenLinks: 0,
      lastUpdated: new Date().toISOString()
    };
  }

  /**
   * Run all documentation maintenance tasks
   */
  async runAll() {
    console.log('🚀 Starting FleetifyApp Documentation Maintenance...\n');

    try {
      // Clean previous builds
      await this.cleanOutput();

      // Generate API documentation
      await this.generateApiDocs();

      // Validate content and links
      await this.validateContent();

      // Generate search index
      await this.generateSearchIndex();

      // Generate table of contents
      await this.generateTableOfContents();

      // Collect documentation metrics
      await this.collectMetrics();

      // Generate documentation report
      await this.generateReport();

      console.log('\n✅ Documentation maintenance completed successfully!');

      if (this.warnings.length > 0) {
        console.log(`\n⚠️  ${this.warnings.length} warnings found:`);
        this.warnings.forEach(warning => console.log(`  - ${warning}`));
      }

      if (this.errors.length > 0) {
        console.log(`\n❌ ${this.errors.length} errors found:`);
        this.errors.forEach(error => console.log(`  - ${error}`));
        process.exit(1);
      }

    } catch (error) {
      console.error('\n❌ Documentation maintenance failed:', error.message);
      process.exit(1);
    }
  }

  /**
   * Clean previous documentation builds
   */
  async cleanOutput() {
    console.log('🧹 Cleaning previous builds...');

    if (fs.existsSync(this.outputDir)) {
      fs.rmSync(this.outputDir, { recursive: true, force: true });
    }

    fs.mkdirSync(this.outputDir, { recursive: true });
    console.log('✓ Output directory cleaned\n');
  }

  /**
   * Generate API documentation from code
   */
  async generateApiDocs() {
    console.log('📚 Generating API documentation...');

    try {
      // Find API route files
      const apiFiles = glob.sync('**/*.ts', {
        cwd: path.join(this.srcDir, 'lib', 'api'),
        absolute: true
      });

      let apiDocs = {
        version: '1.0.0',
        baseUrl: 'https://api.fleetifyapp.com/v1',
        endpoints: [],
        schemas: {},
        authentication: {
          type: 'Bearer',
          description: 'JWT token authentication'
        }
      };

      for (const file of apiFiles) {
        const content = fs.readFileSync(file, 'utf8');
        const endpoints = this.extractApiEndpoints(content);
        apiDocs.endpoints.push(...endpoints);
      }

      // Generate OpenAPI specification
      const openApiSpec = this.generateOpenApiSpec(apiDocs);

      // Write API documentation
      const apiDocPath = path.join(this.docsDir, 'api', 'openapi.json');
      fs.writeFileSync(apiDocPath, JSON.stringify(openApiSpec, null, 2));

      // Generate human-readable API docs
      await this.generateHumanReadableApiDocs(apiDocs);

      this.stats.apiEndpoints = apiDocs.endpoints.length;
      console.log(`✓ Generated documentation for ${apiDocs.endpoints.length} API endpoints\n`);

    } catch (error) {
      this.errors.push(`API documentation generation failed: ${error.message}`);
    }
  }

  /**
   * Extract API endpoints from source code
   */
  extractApiEndpoints(content) {
    const endpoints = [];

    // Match Supabase client calls
    const supabaseMatches = content.matchAll(/supabase\.(from|rpc)\(['"]([^'"]+)['"][^)]*\)/g);

    for (const match of supabaseMatches) {
      const [, method, table] = match;
      endpoints.push({
        path: `/${table}`,
        method: 'GET',
        description: `Access ${table} data`,
        parameters: [],
        responses: {
          200: { description: 'Successful response' }
        }
      });
    }

    // Match custom API functions
    const functionMatches = content.matchAll(/export\s+async\s+function\s+(\w+)\s*\([^)]*\)/g);

    for (const match of functionMatches) {
      const functionName = match[1];
      endpoints.push({
        path: `/functions/${functionName}`,
        method: 'POST',
        description: `${functionName} function`,
        parameters: [],
        responses: {
          200: { description: 'Function executed successfully' }
        }
      });
    }

    return endpoints;
  }

  /**
   * Generate OpenAPI specification
   */
  generateOpenApiSpec(apiDocs) {
    return {
      openapi: '3.0.0',
      info: {
        title: 'FleetifyApp API',
        version: apiDocs.version,
        description: 'Comprehensive fleet management API',
        contact: {
          name: 'API Support',
          email: 'api-support@fleetifyapp.com'
        }
      },
      servers: [
        { url: apiDocs.baseUrl, description: 'Production server' },
        { url: 'https://api-staging.fleetifyapp.com/v1', description: 'Staging server' }
      ],
      security: [
        { bearerAuth: [] }
      ],
      components: {
        securitySchemes: {
          bearerAuth: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT'
          }
        },
        schemas: apiDocs.schemas
      },
      paths: this.generateOpenApiPaths(apiDocs.endpoints)
    };
  }

  /**
   * Generate OpenAPI paths from endpoints
   */
  generateOpenApiPaths(endpoints) {
    const paths = {};

    for (const endpoint of endpoints) {
      if (!paths[endpoint.path]) {
        paths[endpoint.path] = {};
      }

      paths[endpoint.path][endpoint.method.toLowerCase()] = {
        summary: endpoint.description,
        description: endpoint.description,
        parameters: endpoint.parameters,
        responses: endpoint.responses
      };
    }

    return paths;
  }

  /**
   * Generate human-readable API documentation
   */
  async generateHumanReadableApiDocs(apiDocs) {
    let apiContent = `# FleetifyApp API Documentation

## Overview
The FleetifyApp API provides comprehensive REST endpoints for fleet management operations.

## Base URL
\`\`\`
${apiDocs.baseUrl}
\`\`\`

## Authentication
All API requests require authentication using a Bearer token:

\`\`\`bash
curl -H "Authorization: Bearer YOUR_API_KEY" \\
     https://api.fleetifyapp.com/v1/vehicles
\`\`\`

## Rate Limiting
- **Standard Tier**: 1,000 requests per hour
- **Professional Tier**: 5,000 requests per hour
- **Enterprise Tier**: 10,000 requests per hour

## Endpoints
`;

    // Group endpoints by category
    const categories = this.groupEndpointsByCategory(apiDocs.endpoints);

    for (const [category, endpoints] of Object.entries(categories)) {
      apiContent += `### ${category}\n\n`;

      for (const endpoint of endpoints) {
        apiContent += `#### ${endpoint.method.toUpperCase()} ${endpoint.path}\n\n`;
        apiContent += `${endpoint.description}\n\n`;

        if (endpoint.parameters.length > 0) {
          apiContent += `**Parameters:**\n\n`;
          for (const param of endpoint.parameters) {
            apiContent += `- \`${param.name}\` (${param.type}): ${param.description}\n`;
          }
          apiContent += '\n';
        }

        apiContent += `**Example Request:**\n\n`;
        apiContent += `\`\`\`bash\n`;
        apiContent += `curl -X ${endpoint.method.toUpperCase()} \\\n`;
        apiContent += `     -H "Authorization: Bearer YOUR_API_KEY" \\\n`;
        apiContent += `     -H "Content-Type: application/json" \\\n`;
        apiContent += `     ${apiDocs.baseUrl}${endpoint.path}\n`;
        apiContent += `\`\`\`\n\n`;

        apiContent += `**Example Response:**\n\n`;
        apiContent += `\`\`\`json\n`;
        apiContent += JSON.stringify({ success: true, data: {} }, null, 2);
        apiContent += `\n\`\`\`\n\n`;
      }
    }

    const apiDocPath = path.join(this.docsDir, 'api', 'ENDPOINTS.md');
    fs.writeFileSync(apiDocPath, apiContent);
  }

  /**
   * Group API endpoints by category
   */
  groupEndpointsByCategory(endpoints) {
    const categories = {
      'Fleet Management': [],
      'Customer Management': [],
      'Contract Management': [],
      'Financial Operations': [],
      'Legal Management': [],
      'HR Management': [],
      'Inventory Management': [],
      'System Administration': []
    };

    for (const endpoint of endpoints) {
      const path = endpoint.path.toLowerCase();

      if (path.includes('vehicle') || path.includes('fleet')) {
        categories['Fleet Management'].push(endpoint);
      } else if (path.includes('customer')) {
        categories['Customer Management'].push(endpoint);
      } else if (path.includes('contract')) {
        categories['Contract Management'].push(endpoint);
      } else if (path.includes('payment') || path.includes('invoice')) {
        categories['Financial Operations'].push(endpoint);
      } else if (path.includes('legal') || path.includes('traffic')) {
        categories['Legal Management'].push(endpoint);
      } else if (path.includes('employee') || path.includes('payroll')) {
        categories['HR Management'].push(endpoint);
      } else if (path.includes('inventory') || path.includes('warehouse')) {
        categories['Inventory Management'].push(endpoint);
      } else {
        categories['System Administration'].push(endpoint);
      }
    }

    return categories;
  }

  /**
   * Validate documentation content and links
   */
  async validateContent() {
    console.log('🔍 Validating documentation content...');

    const markdownFiles = glob.sync('**/*.md', { cwd: this.docsDir, absolute: true });

    for (const file of markdownFiles) {
      await this.validateMarkdownFile(file);
    }

    console.log(`✓ Validated ${markdownFiles.length} documentation files\n`);
  }

  /**
   * Validate individual markdown file
   */
  async validateMarkdownFile(filePath) {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const relativePath = path.relative(this.docsDir, filePath);

      // Check for broken internal links
      const linkMatches = content.matchAll(/\[([^\]]+)\]\(([^)]+)\)/g);

      for (const match of linkMatches) {
        const [, text, link] = match;

        // Skip external links
        if (link.startsWith('http://') || link.startsWith('https://')) {
          continue;
        }

        // Resolve relative paths
        const absoluteLink = path.resolve(path.dirname(filePath), link);

        if (!fs.existsSync(absoluteLink)) {
          this.errors.push(`Broken link in ${relativePath}: [${text}](${link})`);
          this.stats.brokenLinks++;
        }
      }

      // Check for required front matter
      if (content.includes('#')) {
        this.stats.totalPages++;
      }

      // Count code examples
      const codeBlocks = content.match(/```[\s\S]*?```/g) || [];
      this.stats.codeExamples += codeBlocks.length;

    } catch (error) {
      this.errors.push(`Error validating ${filePath}: ${error.message}`);
    }
  }

  /**
   * Generate search index for documentation
   */
  async generateSearchIndex() {
    console.log('🔍 Generating documentation search index...');

    const searchIndex = {
      version: '1.0.0',
      generated: new Date().toISOString(),
      documents: []
    };

    const markdownFiles = glob.sync('**/*.md', { cwd: this.docsDir });

    for (const file of markdownFiles) {
      try {
        const filePath = path.join(this.docsDir, file);
        const content = fs.readFileSync(filePath, 'utf8');

        // Extract metadata from front matter
        const frontMatter = this.extractFrontMatter(content);
        const bodyContent = this.removeFrontMatter(content);

        // Extract title from first H1 or filename
        const titleMatch = bodyContent.match(/^#\s+(.+)$/m);
        const title = titleMatch ? titleMatch[1] : path.basename(file, '.md');

        // Extract description from first paragraph
        const descriptionMatch = bodyContent.match(/^#\s+.+?\n\n(.+?)(?:\n\n|\n#|$)/s);
        const description = descriptionMatch ? descriptionMatch[1].trim() : '';

        // Extract headings
        const headings = this.extractHeadings(bodyContent);

        const document = {
          id: file.replace(/\\/g, '/'),
          title,
          description,
          content: bodyContent.replace(/\n{3,}/g, '\n\n').trim(),
          url: `/docs/${file.replace('.md', '')}`,
          category: frontMatter.category || 'Documentation',
          tags: frontMatter.tags || [],
          headings,
          lastModified: frontMatter.lastModified || new Date().toISOString(),
          wordCount: bodyContent.split(/\s+/).length
        };

        searchIndex.documents.push(document);

      } catch (error) {
        this.warnings.push(`Could not index ${file}: ${error.message}`);
      }
    }

    // Write search index
    const indexPath = path.join(this.outputDir, 'search-index.json');
    fs.writeFileSync(indexPath, JSON.stringify(searchIndex, null, 2));

    console.log(`✓ Generated search index with ${searchIndex.documents.length} documents\n`);
  }

  /**
   * Extract front matter from markdown content
   */
  extractFrontMatter(content) {
    const frontMatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
    if (!frontMatterMatch) return {};

    try {
      return this.parseYaml(frontMatterMatch[1]);
    } catch (error) {
      return {};
    }
  }

  /**
   * Remove front matter from markdown content
   */
  removeFrontMatter(content) {
    return content.replace(/^---\n[\s\S]*?\n---\n/, '');
  }

  /**
   * Extract headings from markdown content
   */
  extractHeadings(content) {
    const headings = [];
    const headingMatches = content.matchAll(/^(#{1,6})\s+(.+)$/gm);

    for (const match of headingMatches) {
      const [, hashes, text] = match;
      headings.push({
        level: hashes.length,
        text: text.trim(),
        id: text.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-')
      });
    }

    return headings;
  }

  /**
   * Simple YAML parser for front matter
   */
  parseYaml(yamlString) {
    const result = {};
    const lines = yamlString.split('\n');

    for (const line of lines) {
      const match = line.match(/^(\w+):\s*(.*)$/);
      if (match) {
        const [, key, value] = match;

        // Handle arrays
        if (value.startsWith('[') && value.endsWith(']')) {
          result[key] = value.slice(1, -1).split(',').map(item =>
            item.trim().replace(/^["']|["']$/g, '')
          );
        } else {
          result[key] = value.trim().replace(/^["']|["']$/g, '');
        }
      }
    }

    return result;
  }

  /**
   * Generate table of contents
   */
  async generateTableOfContents() {
    console.log('📋 Generating table of contents...');

    const toc = this.generateTableOfContentsStructure();

    let tocContent = `# FleetifyApp Documentation - Table of Contents

*Last updated: ${new Date().toISOString().split('T')[0]}*

## 📚 Documentation Structure

`;

    for (const [category, sections] of Object.entries(toc)) {
      tocContent += `### ${category}\n\n`;

      for (const section of sections) {
        if (section.type === 'file') {
          tocContent += `- [${section.title}](${section.url})\n`;
        } else if (section.type === 'directory') {
          tocContent += `- ${section.title}/\n`;
          for (const subsection of section.children || []) {
            tocContent += `  - [${subsection.title}](${subsection.url})\n`;
          }
        }
      }

      tocContent += '\n';
    }

    const tocPath = path.join(this.docsDir, 'TABLE_OF_CONTENTS.md');
    fs.writeFileSync(tocPath, tocContent);

    console.log('✓ Generated comprehensive table of contents\n');
  }

  /**
   * Generate table of contents structure
   */
  generateTableOfContentsStructure() {
    const structure = {
      'User Documentation': [
        {
          type: 'file',
          title: 'User Manual',
          url: '/user-guide/README.md'
        },
        {
          type: 'file',
          title: 'Quick Start Guide',
          url: '/user-guide/QUICK_START.md'
        },
        {
          type: 'directory',
          title: 'Fleet Management',
          children: [
            { type: 'file', title: 'Vehicle Management', url: '/user-guide/fleet/vehicle-management.md' },
            { type: 'file', title: 'Maintenance', url: '/user-guide/fleet/maintenance.md' },
            { type: 'file', title: 'Insurance', url: '/user-guide/fleet/insurance.md' }
          ]
        }
      ],
      'Developer Documentation': [
        {
          type: 'file',
          title: 'Developer Setup',
          url: '/developer/README.md'
        },
        {
          type: 'file',
          title: 'API Reference',
          url: '/api/README.md'
        },
        {
          type: 'directory',
          title: 'Architecture',
          children: [
            { type: 'file', title: 'System Overview', url: '/architecture/SYSTEM_OVERVIEW.md' },
            { type: 'file', title: 'Database Schema', url: '/architecture/DATABASE_SCHEMA.md' }
          ]
        }
      ],
      'API Documentation': [
        {
          type: 'file',
          title: 'API Reference',
          url: '/api/README.md'
        },
        {
          type: 'file',
          title: 'Authentication',
          url: '/api/AUTHENTICATION.md'
        },
        {
          type: 'file',
          title: 'Rate Limiting',
          url: '/api/RATE_LIMITING.md'
        }
      ],
      'System Administration': [
        {
          type: 'file',
          title: 'Deployment Guide',
          url: '/admin/DEPLOYMENT.md'
        },
        {
          type: 'file',
          title: 'Configuration',
          url: '/admin/CONFIGURATION.md'
        },
        {
          type: 'file',
          title: 'Monitoring',
          url: '/admin/MONITORING.md'
        }
      ]
    };

    return structure;
  }

  /**
   * Collect documentation metrics
   */
  async collectMetrics() {
    console.log('📊 Collecting documentation metrics...');

    const markdownFiles = glob.sync('**/*.md', { cwd: this.docsDir });
    const totalWords = markdownFiles.reduce((count, file) => {
      const content = fs.readFileSync(path.join(this.docsDir, file), 'utf8');
      return count + content.split(/\s+/).length;
    }, 0);

    const codeFiles = glob.sync('**/*.{ts,tsx,js,jsx}', { cwd: this.srcDir });
    const commentLines = codeFiles.reduce((count, file) => {
      const content = fs.readFileSync(path.join(this.srcDir, file), 'utf8');
      const comments = content.match(/\/\*[\s\S]*?\*\/|\/\/.*$/gm) || [];
      return count + comments.length;
    }, 0);

    this.stats.totalWords = totalWords;
    this.stats.totalFiles = markdownFiles.length;
    this.stats.codeFiles = codeFiles.length;
    this.stats.commentLines = commentLines;

    console.log(`✓ Collected metrics for ${markdownFiles.length} documentation files\n`);
  }

  /**
   * Generate documentation maintenance report
   */
  async generateReport() {
    console.log('📄 Generating documentation report...');

    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        totalPages: this.stats.totalPages,
        totalFiles: this.stats.totalFiles,
        apiEndpoints: this.stats.apiEndpoints,
        codeExamples: this.stats.codeExamples,
        brokenLinks: this.stats.brokenLinks,
        totalWords: this.stats.totalWords
      },
      quality: {
        errors: this.errors.length,
        warnings: this.warnings.length,
        score: this.calculateQualityScore()
      },
      coverage: {
        userGuide: this.calculateCoverage('user-guide'),
        developerDocs: this.calculateCoverage('developer'),
        apiDocs: this.calculateCoverage('api'),
        architecture: this.calculateCoverage('architecture')
      },
      recommendations: this.generateRecommendations()
    };

    const reportPath = path.join(this.outputDir, 'documentation-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

    // Generate human-readable report
    const humanReport = this.generateHumanReadableReport(report);
    const humanReportPath = path.join(this.outputDir, 'documentation-report.md');
    fs.writeFileSync(humanReportPath, humanReport);

    console.log('✓ Generated documentation maintenance report\n');
  }

  /**
   * Calculate documentation quality score
   */
  calculateQualityScore() {
    const baseScore = 100;
    const errorDeduction = this.errors.length * 10;
    const warningDeduction = this.warnings.length * 2;
    const brokenLinkDeduction = this.stats.brokenLinks * 5;

    return Math.max(0, baseScore - errorDeduction - warningDeduction - brokenLinkDeduction);
  }

  /**
   * Calculate documentation coverage for a section
   */
  calculateCoverage(section) {
    const sectionPath = path.join(this.docsDir, section);
    if (!fs.existsSync(sectionPath)) return 0;

    const files = glob.sync('**/*.md', { cwd: sectionPath });
    return files.length;
  }

  /**
   * Generate recommendations for improving documentation
   */
  generateRecommendations() {
    const recommendations = [];

    if (this.errors.length > 0) {
      recommendations.push('Fix broken links and validation errors to improve documentation quality');
    }

    if (this.stats.brokenLinks > 0) {
      recommendations.push('Update internal links to point to valid documentation pages');
    }

    if (this.stats.codeExamples < 50) {
      recommendations.push('Add more code examples to improve developer experience');
    }

    if (this.calculateCoverage('user-guide') < 10) {
      recommendations.push('Expand user guide documentation to cover more features');
    }

    if (this.calculateCoverage('api') < 5) {
      recommendations.push('Enhance API documentation with more detailed examples');
    }

    return recommendations;
  }

  /**
   * Generate human-readable documentation report
   */
  generateHumanReadableReport(report) {
    return `# FleetifyApp Documentation Report

*Generated on: ${new Date().toISOString()}*

## 📊 Summary

| Metric | Value |
|--------|-------|
| Total Pages | ${report.summary.totalPages} |
| Total Files | ${report.summary.totalFiles} |
| API Endpoints | ${report.summary.apiEndpoints} |
| Code Examples | ${report.summary.codeExamples} |
| Broken Links | ${report.summary.brokenLinks} |
| Total Words | ${report.summary.totalWords.toLocaleString()} |

## ✅ Quality Assessment

**Overall Score:** ${report.quality.score}/100

- **Errors:** ${report.quality.errors}
- **Warnings:** ${report.quality.warnings}

## 📚 Coverage Analysis

| Section | Files Covered |
|---------|---------------|
| User Guide | ${report.coverage.userGuide} |
| Developer Docs | ${report.coverage.developerDocs} |
| API Documentation | ${report.coverage.apiDocs} |
| Architecture | ${report.coverage.architecture} |

## 💡 Recommendations

${report.recommendations.map(rec => `- ${rec}`).join('\n')}

## 🔄 Next Steps

1. Address any errors or warnings found
2. Implement the recommendations above
3. Review and update outdated content
4. Schedule regular documentation maintenance

---

*This report was generated automatically by the FleetifyApp documentation maintenance script.*
`;
  }
}

// CLI interface
if (require.main === module) {
  const maintenance = new DocumentationMaintenance();

  const command = process.argv[2];

  switch (command) {
    case 'api':
      maintenance.generateApiDocs();
      break;
    case 'validate':
      maintenance.validateContent();
      break;
    case 'search':
      maintenance.generateSearchIndex();
      break;
    case 'toc':
      maintenance.generateTableOfContents();
      break;
    case 'metrics':
      maintenance.collectMetrics();
      break;
    case 'report':
      maintenance.generateReport();
      break;
    case 'all':
    default:
      maintenance.runAll();
      break;
  }
}

module.exports = DocumentationMaintenance;