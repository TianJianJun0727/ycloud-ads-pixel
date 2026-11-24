# AGENTS.md

You are an expert in JavaScript, Rspack, Rsbuild, Rslib, and library development. You write maintainable, performant, and accessible code.

## Commands

- `pnpm run build` - Build the library for production
- `pnpm run dev` - Turn on watch mode, watch for changes and rebuild the library
- `pnpm run test` - Run tests
- `pnpm run test:watch` - Run tests in watch mode

## Docs

- Rslib: https://rslib.rs/llms.txt
- Rsbuild: https://rsbuild.rs/llms.txt
- Rspack: https://rspack.rs/llms.txt
- Rstest: https://rstest.rs/llms.txt

## Tools

- `pnpm run format` formats the repository with Oxfmt.
- `pnpm run format:check` checks formatting.
- `pnpm run lint` checks code with Oxlint.
- The pre-commit hook formats and checks staged files.

## Source layout

- Keep the package exports in `src/index.ts` and the SDK methods and shared contracts in `src/core/`.
- Keep browser globals and script loading in `src/browser/`.
- Place vendor command conversion, constants, and types in `src/platforms/<name>/`. Google, Meta, OpenAI, and LinkedIn each have a platform adapter.
- Use `const` arrow functions for ordinary functions. The Google queue requires a function with its own `arguments` object.
- Verify adapter changes in the corresponding `tests/<platform>.test.ts` file with mocked browser queues or image requests. Cover shared behavior and dispatch across adapters in `tests/all-platforms.test.ts`.
