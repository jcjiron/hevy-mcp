// hevy-ts reads process.env.API_KEY at import time and throws if it's
// missing, even when the module is auto-mocked. Tests never make real
// network calls, so a placeholder is fine when no real key is configured.
process.env.API_KEY = process.env.API_KEY || process.env.HEVY_API_KEY || "test-api-key";
