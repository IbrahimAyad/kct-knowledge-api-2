# Documentation Index

KCT Knowledge API documentation for developers, AI agents, and operations.

## Start Here

1. **[Quick Reference](QUICK_REFERENCE.md)** — Essential commands, URLs, endpoints, debugging
2. **[System Architecture](ai-context/architecture.md)** — How everything fits together
3. **[Environment Variables](../.env.documented)** — Configuration reference

## Documentation Map

| Document | Purpose | When to Use |
|----------|---------|-------------|
| [Quick Reference](QUICK_REFERENCE.md) | Common commands, URLs, debugging | Daily reference |
| [architecture.md](ai-context/architecture.md) | System overview, data flow, services | Understanding the codebase |
| [common-errors.md](ai-context/common-errors.md) | Error patterns and solutions | Debugging issues |
| [.env.documented](../.env.documented) | All environment variables | Setup, configuration |
| [openapi.yaml](openapi.yaml) | OpenAPI 3.0 spec | API client generation |

## AI Context

The `ai-context/` directory helps AI assistants (Claude, etc.) understand the system quickly: architectural context, error patterns, integration maps. Include these files when asking AI for help with this codebase.

## Archive

Historical implementation docs (phase summaries, old guides, migration notes) are preserved in `docs/archive/` for reference but are no longer maintained.

## Live URLs

- **Production**: https://kct-knowledge-api-2-production.up.railway.app
- **Swagger Docs**: https://kct-knowledge-api-2-production.up.railway.app/docs
- **Health Check**: https://kct-knowledge-api-2-production.up.railway.app/health

## Directory Structure

```
docs/
├── README.md              # This file
├── QUICK_REFERENCE.md     # Operations cheat sheet
├── openapi.yaml           # OpenAPI specification
├── ai-context/
│   ├── architecture.md    # System architecture
│   └── common-errors.md   # Troubleshooting
└── archive/               # 32 historical docs (not maintained)
```

---

**Last Updated**: 2025-02-15 | **Version**: 2.0
