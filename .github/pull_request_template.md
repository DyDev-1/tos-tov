## What this changes

<!-- One or two sentences, in simple words. -->

## How to check it

<!-- Steps to try it by hand, or the commands to run. -->

## Checklist (from claude.md)

- [ ] One feature per branch, small commits
- [ ] Every API input is checked with Zod on the server
- [ ] Admin pages and routes check the role on the server
- [ ] Routes call services (business logic is not in pages)
- [ ] Nothing returns raw database rows (public or admin shapes only)
- [ ] Tests written for the business logic and for each API route
- [ ] Text is in `messages/en.json` and `messages/km.json` (no hard-coded text)
- [ ] Loading, empty and error states exist; layout checked on phone and desktop
- [ ] No secrets in git
