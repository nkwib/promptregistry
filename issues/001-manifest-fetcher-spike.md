---
id: 001
title: Manifest fetcher spike — GitHub raw, release asset, public bucket
milestone: week-1
estimate: 2d
depends_on: []
blocks: [002, 003, 006]
awaits_adr: []
type: build
---

## Why

`pull('prompt-name@v3')` cannot return a typed `Compiled template` until we can fetch the raw `Manifest` JSON from a static URL. We must validate three concrete sources end-to-end before locking the URL shape into the lockfile, because each has different ETag, redirect, and rate-limit behaviour that affects how `promptregistry check` will diff hashes against the remote.

## Scope

- A single `fetchManifest(url)` function that handles three URL kinds:
  - GitHub raw (`raw.githubusercontent.com/...`)
  - GitHub release asset (`github.com/owner/repo/releases/download/v.../manifest.json`)
  - Public Cloudflare R2 / S3 (any plain HTTPS GET that returns JSON).
- Returns the raw bytes, the parsed `Manifest`, and a content hash (sha256 over the canonical bytes).
- One concrete failure mode per source documented inline (GitHub raw rate limits, release asset 302s, R2 cache headers).

## Acceptance criteria

- Vitest covers a happy path per source kind and one failure path per source (404, malformed JSON, network error).
- Hash is deterministic across the three sources for byte-identical content.
- Function is pure and synchronous in its hashing step (no Web Crypto async surprises mid-pipeline).

## Out of scope

- Lockfile diffing — see issue 006.
- Auth / private repos — public-only for v1.
- Retry strategy — fail loudly, fix in v2.

## Notes

The hash computed here is the same value that lands in the `prompt-lock.json` and the `.d.ts` header. Pick the canonicalisation (raw bytes vs JSON.stringify) before issue 005 starts.
