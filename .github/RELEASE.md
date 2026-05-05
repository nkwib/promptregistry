# Release checklist

Run this list once before each `npm publish`. None of these steps are automated in v1; they are all manual gates.

## Pre-publish

- [ ] **Tests green.** `npm test -- --run` passes locally and in CI.
- [ ] **Typecheck green.** `npm run typecheck` is clean.
- [ ] **Build green.** `npm run build` produces `dist/` without warnings.
- [ ] **End-to-end fixture green.** The `examples/quickstart` walkthrough (issue 011) succeeds: `codegen` writes the generated files, `check` is clean, `tsc --noEmit` succeeds.
- [ ] **Hero screenshots regenerated.** `npm run screenshot` rewrote `docs/hero-tsc.svg` and `docs/hero-diff.svg`. Each SVG is < 100 KB. The README still references both via relative paths.
- [ ] **Lockfile committed.** `examples/quickstart/prompts/.generated/prompt-lock.json` reflects the current Manifest hash and is committed (per ADR-0005).
- [ ] **`package.json` metadata correct.**
  - [ ] `name`, `version`, `description` match the GitHub repo description verbatim.
  - [ ] `repository.url` points at `https://github.com/nkwib/promptregistry`.
  - [ ] `homepage` points at `https://github.com/nkwib/promptregistry#readme`.
  - [ ] `author` is `Gabriele Magno <gabriele.magno@nearform.com>`.
  - [ ] `engines.node >= 20`.
  - [ ] `sideEffects: false`.
  - [ ] `files` is `["dist", "README.md", "LICENSE"]`.
  - [ ] `bin.promptregistry` points at `./dist/cli/index.js`.
  - [ ] `exports` covers `.` and `./runtime` with both ESM (`import`) and CJS (`require`) entries.
- [ ] **`LICENSE` present** at the repo root.
- [ ] **Tarball clean.** `npm publish --dry-run` lists only `dist/`, `README.md`, `LICENSE`, and `package.json`. `npm pack && tar -tf promptregistry-<version>.tgz` confirms no `tests/`, `examples/`, `src/`, `docs/`, `node_modules/`.
- [ ] **README hero is the first screen.** A reader scrolling for 10 seconds can name the wedge.
- [ ] **API reference up to date.** `docs/api.md` matches each subcommand's `--help` output and the current generated-module shape.
- [ ] **All TBD ADRs landed.** Any ADRs the issues reference are committed and linked.

## Publish

```bash
npm publish
```

The `prepublishOnly` script runs `typecheck`, `build`, and `test -- --run` automatically; if any fail, fix the underlying issue and create a NEW commit (do not amend a published commit).

## Post-publish

- [ ] **Tag the release.** `git tag v<version> && git push --tags`.
- [ ] **Smoke install.** In a sibling project: `npm install promptregistry`, run `npx promptregistry --help`. Confirm the binary resolves and the help text is correct.
- [ ] **`npm info promptregistry`** shows the description and homepage matching the GitHub repo description.
- [ ] **Announce note draft.** Check in a short note (Bluesky or X — pick one) under the announce-notes folder before publishing the post.
- [ ] **Watch the first issues.** Read every issue within 24h for the first week.
- [ ] **Scope-creep deflection.** Close the first hosted-UI / template-logic / eval-running request with a link to the README's non-goals paragraph and to [issue 999](../issues/999-v2-deferred.md). Do not litigate the request in the thread; the deflection is the answer.
- [ ] **Issue templates live.** Confirm the `.github/ISSUE_TEMPLATE/*.yml` forms render on the new-issue page.

## Do not, in v1

- Ship npm provenance / sigstore signing.
- Open a Discord / forum.
- Engage with marketing / paid promotion.
- Reopen any non-goal in response to a single user request.
