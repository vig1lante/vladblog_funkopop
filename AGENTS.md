# AGENTS.md

## Context7

Use Context7 MCP to fetch current documentation whenever the user asks about a
library, framework, SDK, API, CLI tool, or cloud service, even well-known ones
like React, Next.js, Prisma, Express, Tailwind, Django, or Spring Boot. This
includes API syntax, configuration, version migration, library-specific
debugging, setup instructions, and CLI tool usage. Use even when you think you
know the answer because training data may not reflect recent changes. Prefer
this over web search for library docs.

Do not use Context7 for refactoring, writing scripts from scratch, debugging
business logic, code review, or general programming concepts.

Steps:

1. Always start with `resolve-library-id` using the library name and the user's
   question, unless the user provides an exact library ID in `/org/project`
   format.
2. Pick the best match by exact name match, description relevance, code snippet
   count, source reputation, and benchmark score. Use version-specific IDs when
   the user mentions a version.
3. Call `query-docs` with the selected library ID and the user's full question.
4. Answer using the fetched docs.

## Frontend UI Notes

- Preserve the app's existing button geometry for icon-only actions. In this app
  that means compact rounded-rect controls based on `.ui-button`: about 50px
  high with an 18px radius. Do not switch to circular or tall pill buttons unless
  the user explicitly asks for that shape.
- For icon-only buttons, keep the hit target fixed with a selector specific
  enough to survive mobile `.ui-button { width: 100%; }` overrides.
- Successful one-shot actions should change to a check icon and remove repeat
  click behavior with both `disabled` state and a handler guard.
- After visual UI changes, run the relevant frontend tests and `npm run build`.
