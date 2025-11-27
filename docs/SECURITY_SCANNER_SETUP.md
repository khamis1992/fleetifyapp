# Security Scanner MCP - Setup Guide

## 🔒 Overview

The Security Scanner MCP is a comprehensive security scanning tool that integrates with your codebase to detect:
- Hardcoded credentials (API keys, passwords, tokens)
- Dependency vulnerabilities
- Security code patterns (XSS, SQL injection, etc.)
- Code quality issues

## 📦 Installation

The security scanner is already set up and ready to use. No additional installation required!

## 🚀 Usage

### Quick Scan (All Checks)
```bash
npm run security:scan
```

### Scan for Hardcoded Credentials Only
```bash
npm run security:scan:credentials
```

### Scan Dependencies Only
```bash
npm run security:scan:deps
```

### Generate Text Report
```bash
npm run security:scan:report
```

### Generate JSON Report
```bash
npm run security:scan:json
```

## 🔍 What It Scans

- Hardcoded credentials (API keys, passwords, tokens)
- Security vulnerabilities (XSS, SQL injection, etc.)
- Dependency vulnerabilities (npm audit)
- Code quality issues

## 📋 Regular Scanning

### Pre-commit Hook
Add to `.git/hooks/pre-commit`:
```bash
#!/bin/bash
npm run security:scan:credentials
```

### CI/CD Integration
Add to your CI/CD pipeline for automated scanning.

## 🔗 Related Tools

- **Credential Fix Script**: `npm run fix:credentials`
- **Dependency Audit**: `npm audit`

