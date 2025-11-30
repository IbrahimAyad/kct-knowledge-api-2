# Documentation Index

Welcome to the KCT Knowledge API documentation! This directory contains comprehensive guides for developers, AI agents, and operations teams.

## 🚀 Getting Started

**New to this API?** Start here:

1. **[Quick Reference](QUICK_REFERENCE.md)** ⭐ - Essential commands, URLs, and common tasks
2. **[System Architecture](ai-context/architecture.md)** - Understand how everything fits together
3. **[Environment Variables](../.env.documented)** - Set up your configuration

## 📖 Main Documentation

### For Developers

| Document | Purpose | When to Use |
|----------|---------|-------------|
| **[Quick Reference](QUICK_REFERENCE.md)** | Common commands & URLs | Daily reference |
| **[API Integration Guide](API_INTEGRATION_GUIDE.md)** | How to call endpoints | Building integrations |
| **[OpenAPI Spec](openapi.yaml)** | Complete API specification | API client generation |

### For AI Agents & Context

Located in `ai-context/` directory - **these files significantly improve AI assistance**:

| Document | Purpose | Use Case |
|----------|---------|----------|
| **[architecture.md](ai-context/architecture.md)** | Complete system overview | Understanding tech stack & data flow |
| **[common-errors.md](ai-context/common-errors.md)** | Troubleshooting guide | Debugging & error resolution |

### Configuration & Security

| Document | Purpose |
|----------|---------|
| **[.env.documented](../.env.documented)** | Environment variables reference with security guidelines |

## 🎯 Use Case Navigation

### I want to...

**Understand the system**
→ Read [System Architecture](ai-context/architecture.md)

**Call the API from my app**
→ Read [API Integration Guide](API_INTEGRATION_GUIDE.md)

**Set up environment variables**
→ Read [.env.documented](../.env.documented)

**Debug an error**
→ Check [Common Errors](ai-context/common-errors.md)

**Find a specific endpoint**
→ Use [Quick Reference](QUICK_REFERENCE.md) or [OpenAPI Spec](openapi.yaml)

**Deploy to production**
→ Read Quick Reference → Deployment section

## 📡 Live Resources

- **Production API**: https://kct-knowledge-api-2-production.up.railway.app
- **API Documentation**: https://kct-knowledge-api-2-production.up.railway.app/docs
- **Health Check**: https://kct-knowledge-api-2-production.up.railway.app/api/analytics/health
- **Railway Dashboard**: [Your Railway project link]

## 🔍 Documentation Quality

### AI Context Optimization

The `/ai-context` directory is specifically designed to provide AI assistants (like Claude) with:
- Complete architectural context
- Historical error patterns and solutions
- Environment configuration details
- Service integration maps

**Result**: AI assistants can provide more accurate, context-aware help without requiring lengthy explanations.

### Maintenance

This documentation should be updated when:
- ✅ New endpoints are added → Update API Integration Guide + OpenAPI spec
- ✅ New errors discovered → Add to Common Errors
- ✅ Architecture changes → Update architecture.md
- ✅ New environment variables → Update .env.documented
- ✅ Deployment process changes → Update Quick Reference

## 🆘 Getting Help

**If something isn't working:**

1. Check **[Common Errors](ai-context/common-errors.md)** first
2. Run health check: `curl https://kct-knowledge-api-2-production.up.railway.app/api/analytics/health`
3. Check Railway logs
4. Verify environment variables match `.env.documented`

**If documentation is unclear:**

1. Check **[Quick Reference](QUICK_REFERENCE.md)** for a simpler explanation
2. Review code examples in **[API Integration Guide](API_INTEGRATION_GUIDE.md)**
3. Open an issue in the repository

## 📁 Directory Structure

```
docs/
├── README.md (this file)                 # Documentation index
├── QUICK_REFERENCE.md                    # Quick commands & URLs
├── API_INTEGRATION_GUIDE.md              # How to use the API
├── openapi.yaml                          # OpenAPI specification
└── ai-context/                           # AI assistant context
    ├── architecture.md                   # System architecture
    └── common-errors.md                  # Error troubleshooting
```

## ✅ Documentation Completeness Checklist

- [x] System architecture documented
- [x] Common errors cataloged with solutions
- [x] Environment variables documented
- [x] Quick reference guide created
- [x] API endpoints documented (existing guide + OpenAPI spec)
- [ ] Database schema documented (future)
- [ ] Deployment guide documented (partial - in Quick Reference)
- [ ] Changelog created (future)

---

**Last Updated**: 2025-01-30
**Version**: 1.0
**Maintainer**: Development Team

**Quick Links**:
- [System Architecture](ai-context/architecture.md)
- [Quick Reference](QUICK_REFERENCE.md)
- [Common Errors](ai-context/common-errors.md)
- [Environment Variables](../.env.documented)
