# Contributing to Generative Loaders

Thanks for helping improve Generative Loaders. Bug fixes, accessibility improvements, documentation corrections, and carefully designed new loading states are welcome.

## Before you start

- Search the existing issues and pull requests to avoid duplicate work.
- Open a feature request before investing in a large API change or new component family.
- Keep each pull request focused on one change.

## Local setup

Generative Loaders uses npm workspaces and requires Node.js 20.19 or newer for repository development.

```bash
git clone https://github.com/kasturibuilds/generative-loaders.git
cd generative-loaders
npm install
npm test
```

The publishable package lives in `packages/generative-loaders`. The website is maintained in a separate private source repository.

## Validate your change

Run the same checks used by continuous integration:

```bash
npm test
npm run lint
npm pack --workspace generative-loaders --dry-run
```

Changes to loader behavior should include or update tests. Visual changes should preserve reduced-motion behavior, keyboard accessibility where relevant, server rendering, and readable assistive-technology output.

## Pull requests

Describe the user-facing problem, the approach you took, and how you validated it. Add screenshots or a short recording when a visual change is difficult to understand from code alone. By contributing, you agree that your work will be released under the MIT license.
