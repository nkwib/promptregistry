---
id: 016
title: Launch checklist — publish, announce, close-the-loop on first issues
milestone: week-5
estimate: 0.5d
depends_on: [011, 012, 014, 015]
blocks: []
awaits_adr: []
type: launch
---

## Why

Shipping is a discrete action, not a gradient. Without a checklist that names every pre-publish gate (lockfile committed, screenshots regenerated, docs link to promptkit) and every post-publish action (one announce post, one issue-template commit, one watch on the first community PR), the launch leaks half-done.

## Scope

- A pre-publish checklist run once before `npm publish`:
  - End-to-end fixture (issue 011) green.
  - README hero screenshots regenerated (issue 014).
  - `package.json` metadata matches GitHub description (issue 015).
  - All TBD ADRs from grill-with-docs landed and linked from relevant issues.
  - Repo description names the wedge in one sentence.
- A post-publish action list:
  - One short announce note (Bluesky / X — pick one, not both for v1).
  - GitHub issue templates: bug, feature-request, support-question.
  - A first-week watch policy: read every issue within 24h, close `{{#if}}`-style scope-creep requests with a link to the README non-goal.

## Acceptance criteria

- Checklist file lives in `.github/RELEASE.md` (or similar) and is referenced from the publish flow.
- Issue templates render correctly when filed against the repo.
- Announce note draft is checked in (not posted) before publish; posting is a manual step on launch day.

## Out of scope

- Marketing / paid promotion.
- Community Discord / forum.

## Notes

The first-week scope-discipline rule mirrors promptkit's pattern: close the first `{{#if}}` request with a link to the README's non-goal paragraph. PromptRegistry's analog is closing the first hosted-UI request with a link to the deferred-features index (issue 999).
