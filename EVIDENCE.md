# EVIDENCE.md - Proof of Correctness

## Requirement 1: Idempotent Metering ✓

**Proof**: Same request with same idempotency key returns identical event, no duplicate created.

```bash
# First Request
$ curl -X POST http://localhost:3000/generate -H "Content-Type: application/json" -d "{\"tenant_id\": \"test-tenant-1\", \"usage_type\": \"api_call\", \"quantity\": 5, \"idempotency_key\": \"req-123\"}"

{"success":true,"event":{"id":"2f1fdc31-c095-4b0c-9673-66b4f52bb565","tenant_id":"test-tenant-1","type":"api_call","quantity":5,"idempotency_key":"req-123","created_at":"2026-08-27 15:38:49"},"cached":false}

# Second Request (Retry with the exact same key)
$ curl -X POST http://localhost:3000/generate -H "Content-Type: application/json" -d "{\"tenant_id\": \"test-tenant-1\", \"usage_type\": \"api_call\", \"quantity\": 5, \"idempotency_key\": \"req-123\"}"

{"success":true,"event":{"id":"2f1fdc31-c095-4b0c-9673-66b4f52bb565","tenant_id":"test-tenant-1","type":"api_call","quantity":5,"idempotency_key":"req-123","created_at":"2026-08-27 15:38:49"},"cached":true}