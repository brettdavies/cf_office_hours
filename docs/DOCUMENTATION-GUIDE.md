# Documentation Guide

This guide explains the purpose and organization of documentation files in this project.

## Documentation Structure

### Root Level

#### [README.md](../README.md)
**Purpose:** Project overview and quick start
**Audience:** New developers, stakeholders
**Content:**
- Project description
- Quick start commands
- Tech stack summary
- Links to detailed documentation
- Basic environment setup

**Keep it:** Short (~100 lines), high-level, navigation-focused

---

### Developer Documentation

#### [docs/TROUBLESHOOTING.md](TROUBLESHOOTING.md) ⭐
**Purpose:** Single source of truth for solving common issues
**Audience:** Developers encountering problems
**Content:**
- Setup issues (ports, CORS, environment config)
- Authentication issues (UUID mismatch, magic links)
- Database issues (migrations, seeds)
- Development workflow issues (TypeScript, modules)
- Diagnostic commands and step-by-step solutions

**This is the PRIMARY troubleshooting reference** - all other docs should link here

#### [docs/architecture/10-development-workflow.md](architecture/10-development-workflow.md)
**Purpose:** Complete development workflow and best practices
**Audience:** Developers setting up or working on the project
**Content:**
- Initial setup steps
- Local development practices
- Database migrations
- Testing strategies
- Code quality standards
- Git workflow
- PR process
- Brief troubleshooting section with link to TROUBLESHOOTING.md

**Keep it:** Comprehensive but organized, workflow-focused

#### [docs/etl-workflow-readme.md](etl-workflow-readme.md)
**Purpose:** Technical architecture for ETL system
**Audience:** Backend developers, database architects
**Content:**
- ETL architecture and processing order
- Raw tables → production tables mapping
- Trigger functions and transformations
- **User Authentication Workflow section** (how auth replaces ETL for users)
- Database triggers documentation
- Brief troubleshooting with link to TROUBLESHOOTING.md

**Keep it:** Technical, architecture-focused, explains WHY not just HOW

---

### Story Documentation

#### [docs/stories/*.story.md](stories/)
**Purpose:** Implementation details for specific features
**Audience:** Developers implementing or reviewing features
**Content:**
- Feature requirements
- Acceptance criteria
- Implementation tasks
- Technical decisions
- Test coverage
- Dev notes and completion status

**Keep it:** Feature-specific, not general setup/troubleshooting

---

## Content Organization Principles

### ✅ DO

1. **Single Source of Truth**
   - Each piece of information lives in ONE primary location
   - Other docs reference the primary source

2. **Clear Hierarchy**
   - README → points to specialized docs
   - Specialized docs → deep dive into topics
   - All → reference TROUBLESHOOTING.md for issues

3. **Appropriate Depth**
   - README: 1-2 sentence overviews
   - Workflow docs: Step-by-step instructions
   - Architecture docs: Detailed technical explanations
   - Troubleshooting: Symptom → diagnosis → solution

### ❌ DON'T

1. **Duplicate Content**
   - Don't copy troubleshooting steps across multiple files
   - Don't repeat setup instructions
   - Link to the authoritative source instead

2. **Mix Concerns**
   - Don't put troubleshooting in architecture docs
   - Don't put architecture details in README
   - Don't put general setup in story files

3. **Make Docs Too Long**
   - README should be < 100 lines
   - Troubleshooting sections should link to main guide
   - Break up very long docs into multiple files

---

## When to Update Each File

### Update README.md when:
- Tech stack changes significantly
- New major documentation added
- Quick start process changes

### Update TROUBLESHOOTING.md when:
- New common issue identified
- Solution found for recurring problem
- Environment configuration changes

### Update 10-development-workflow.md when:
- Setup process changes
- New development practices adopted
- Testing strategy evolves
- Git workflow modified

### Update etl-workflow-readme.md when:
- Database architecture changes
- New ETL triggers added
- Processing order modified
- User authentication workflow changes

### Update story files when:
- Implementing the feature
- Recording technical decisions
- Updating test coverage
- Marking completion status

---

## Documentation Maintenance

### Regular Reviews
- **Monthly**: Check for outdated instructions
- **After major changes**: Update affected docs immediately
- **Before releases**: Verify all docs are current

### Quality Checklist
- [ ] No duplicate content across files
- [ ] Each file has clear, distinct purpose
- [ ] Cross-references use relative links
- [ ] Code examples are tested and working
- [ ] Troubleshooting links to main guide
- [ ] README stays concise (< 100 lines)

---

## Quick Reference

| Need to... | Check this file |
|-----------|----------------|
| Get started quickly | README.md |
| Fix a setup issue | TROUBLESHOOTING.md |
| Understand development workflow | 10-development-workflow.md |
| Learn about ETL architecture | etl-workflow-readme.md |
| Understand database migrations | 10-development-workflow.md #1016 |
| Debug auth issues | TROUBLESHOOTING.md → Authentication Issues |
| Review completed feature | docs/stories/X.X.story.md |
