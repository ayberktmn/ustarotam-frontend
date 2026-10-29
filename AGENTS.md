# Usta Rotam — Agent Guide

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Project purpose

**Usta Rotam** is a Turkey-wide directory that helps vehicle owners find suitable auto repair workshops and service businesses by city, district, vehicle type, specialty, and customer ratings. **Manisa** is the initial seed market, not a product constraint: the information architecture, copy, filters, and defaults must work for every province.

The product helps users choose the right specialty and make an informed decision. It is not a booking, payment, or verified-review platform yet.

## Brand and language rules

- Use **Usta Rotam** everywhere: UI, metadata, documentation, and code-facing labels.
- The supported locales are `tr` (default) and `en`.
- All user-facing copy lives in `messages/tr.json` and `messages/en.json`. Do not hardcode UI strings in components.
- Turkish is the default locale without a URL prefix; English uses `/en`.
- Use locale-aware formatting (`tr-TR` / `en-US`) for dates and numbers.
- Do not introduce alternative or legacy project names.
- Do not invent a production domain. The canonical origin comes from `SITE_URL`.

## Tech stack

- Next.js `16.4.2` (App Router, Turbopack build, standard Node.js server)
- React `19.3.0`
- TypeScript with `strict: true` and the `@/*` import alias
- Tailwind CSS v4 via `@tailwindcss/turbopack`
- shadcn/ui components (`radix-nova` style) in `src/components/ui`
- lucide-react icons
- `next-intl` v4 with `src/proxy.ts` and localized pathnames
- TanStack Query v5 for client cache and retries
- Zod for runtime API response validation
- Sonner for accessible toast notifications
- ESLint with `eslint-config-next`
- npm and `package-lock.json`

Do not upgrade to canary releases. When changing dependencies, verify compatibility between Next.js, React, Tailwind, next-intl, and the shadcn preset.

## Read the installed Next.js documentation first

This repository uses Next.js 16. Before implementing a framework feature:

1. Read the matching guide under `node_modules/next/dist/docs/01-app/`.
2. Prefer the installed version's documentation over memory or older examples.
3. Keep the `nextjs-agent-rules` block above intact.

Important Next.js 16 details already in use:

- `params` and `searchParams` are Promises and must be awaited.
- `error.tsx` receives `retry`, not `reset`; it must be a Client Component.
- Unknown dynamic profile slugs use `notFound()`; verify that they return a real HTTP 404 with the localized not-found UI.
- The app intentionally does **not** enable `cacheComponents`; the streaming 404 behavior with Cache Components was unsuitable for this app. Re-enable only after verifying real 404 status codes and Suspense boundaries.
- All localized routes live under `src/app/[locale]/`. The locale layout owns `<html>` and `<body>`.
- Production uses the standard Next.js Node server (`npm run build` then `npm run start`).

## Directory organization

```text
src/app/[locale]/          Locale-aware pages, layouts, 404 and error UI
src/app/api/               Health endpoint
src/components/ui/         Generic shadcn/ui primitives
src/components/layout/     Header, footer, logo, language switcher, mobile nav
src/features/search/       Search form, filters, sorting, active filters, skeleton
src/features/workshops/    Workshop cards, ratings, reviews, profile pieces
src/features/home/         Home page sections (hero, trust, featured, categories, reviews, process)
src/features/testimonials/ Testimonial card
src/features/auth/         Auth provider and login/register forms
src/features/catalog/      React Query catalog hooks
src/lib/                   Data facade, validation, formatting, SEO/site config
src/lib/api/               HTTP client, Zod schemas, endpoint services, token lifecycle
src/lib/query/             Query client and query keys
src/lib/toast/             API error mapping and toast hooks
src/lib/repositories/      Local seed repository (public pages during migration)
src/components/providers/  Query, auth and Sonner providers
src/data/                  Local specialties, vehicle types, workshop records
src/types/                 Domain, search, locale and repository types
src/i18n/                  Routing, navigation, request configuration
src/styles/tokens.css      Single source of design tokens
messages/                  tr.json and en.json
public/                    Brand assets, PWA icons, social image, photos
```

Keep the structure shallow. The repository boundary is the only planned abstraction; do not add more layers until a real second consumer exists.

## Geographic coverage (Turkey-wide)

- Usta Rotam serves Türkiye as a whole. Manisa is seed/launch data, not a product assumption.
- The default experience covers all of Türkiye. Never pre-select a city in forms, filters, redirects, or metadata.
- City and district values come from the canonical catalog/backend data. Do not hardcode city lists or district maps in components.
- Never bake a city into copy, SEO metadata, route logic, empty states, or analytics. Use Turkey-wide wording; city-specific landing pages are a separate routing decision.
- Seed workshop records may remain Manisa-based, but they must not leak into navigation, metadata, empty states, or global defaults.
- New features must be verified with at least one non-Manisa city scenario.

## Code quality and architecture rules

Apply DRY, KISS, YAGNI, and SOLID pragmatically. They exist to keep the code readable, not to justify extra abstraction.

- **DRY:** Keep one source of truth for data, copy, validation, formatting, and UI recipes. Extract on the third repetition, not the first; a premature abstraction is worse than a small duplication.
- **KISS:** Choose the simplest solution that satisfies the requirement. No speculative config, wrapper components, state, or effects.
- **YAGNI:** Do not build for hypothetical consumers. Keep the existing "second consumer" threshold for new layers.
- **SOLID:** One reason to change per file or component. Extend behavior with composition and explicit variants instead of copy-paste. Keep props small and specific. Depend on the facade/repository boundary, not on concrete data sources.
- **Page size limit:** `page.tsx` and `layout.tsx` files must stay at or below 400 lines. A page composes; it does not implement UI sections or business logic. Split proactively when a page approaches 350 lines.
- **Split targets:** page-specific sections go to `src/features/<domain>/`, shared primitives to `src/components/ui/`, pure logic/formatting/validation to `src/lib/`, and domain types to `src/types/`.
- Functions do one thing, use early returns, and keep nesting shallow. Side effects belong at the edges; keep pure helpers in `src/lib`.
- No `any`. Validate unknown input at boundaries with Zod. Exported functions and components have explicit props and return types.
- Remove dead code, commented-out blocks, unused exports, and stray `console.*` before handoff.
- Follow the existing naming: `PascalCase` components, `use*` hooks, `kebab-case` files, and domain terms from `src/types`.
- Reuse existing helpers for translations, routes, formatting, and fetching. Do not duplicate keys, path strings, date/number logic, or fetch calls.

## Design system rules

- `src/styles/tokens.css` is the single source for colors, typography, spacing, shadows, and radii.
- Components must use semantic Tailwind tokens (`bg-brand`, `text-ink`, `border-line`, `bg-cream`, `text-h2`, etc.). Do not add hex colors in components.
- Typography uses **Manrope**, loaded in `src/app/[locale]/layout.tsx`.
- Use `page-container` for horizontal layout and `section-y` for vertical section rhythm.
- Keep buttons and form controls in `src/components/ui`; page-specific composition belongs in `src/features`.
- Preserve visible focus rings, accessible contrast, and reduced-motion behavior.
- When changing the brand, change tokens first and verify every page visually.
- Keep one visual language across every page: same tokens, container width, section rhythm, heading scale, radii, shadows, and control heights.
- Compose from `src/components/ui` primitives. When a page needs a different look, add a documented variant instead of forking the component.
- No raw hex/rgb values and no `bg-[#...]`. Do not add arbitrary values when a semantic token exists; promote a value to `src/styles/tokens.css` when it repeats three times.
- Reuse the shared section header, card, badge, empty state, skeleton, and form-field recipes instead of recreating them per page.
- Keep hover, focus, disabled, and error states identical for the same control type across the site.
- Use lucide-react icons with a consistent size and stroke per context. Do not mix icon libraries or ad-hoc SVGs.
- New page checklist: `page-container` and `section-y`, exactly one `h1`, consistent section order, loading/empty/error states, and a manual mobile + desktop check.

## Routing and i18n rules

- Canonical route keys and localized pathnames are defined in `src/i18n/routing.ts`.
- Always import `Link`, `redirect`, `usePathname`, `useRouter`, and `getPathname` from `@/i18n/navigation`.
- Use `next/link` only for non-localized targets such as `/api/health`.
- Every page/layout that reads messages must call `setRequestLocale(locale)`.
- Add every new UI string to **both** `messages/tr.json` and `messages/en.json` with the same key structure.
- Preserve the current page and query parameters in the language switcher.
- For metadata, define canonical and `hreflang` alternates with `getPathname` for both locales.
- Localized route pathnames must stay stable; changing them requires redirects.

## Server and Client Components

- Server Components are the default. Add `"use client"` only for browser state, event handlers, or browser-only APIs.
- Current client components: language switcher, mobile navigation, main nav, auth actions, auth forms, filter form shell, providers, and error boundary. Keep the client surface small.
- Do not import server-only modules into Client Components. `src/lib/site.ts` and `src/lib/workshops.ts` intentionally use `server-only`.
- Pass plain, serializable props across the server/client boundary. Do not pass secrets or raw API responses.

## Data access and backend integration

- UI components must not import `src/data/*` directly.
- Public workshop reads currently go through the facade in `src/lib/workshops.ts`; the active source is the local seed repository until the API payload contract is fully mapped.
- Backend endpoint calls live only in `src/lib/api/endpoints/*` and are consumed through `src/lib/api/index.ts` (browser) or `src/lib/api/server.ts` (server).
- Do not create frontend API endpoint routes. Consume the existing backend endpoints directly.
- Do not scatter `fetch` calls across components; use the API client.
- `API_INTERNAL_BASE_URL` is server-only. `NEXT_PUBLIC_API_BASE_URL` is the public browser base URL. Never expose secrets with `NEXT_PUBLIC_`.
- Validate URL query parameters in `src/lib/search-params.ts`. Never trust user input.
- Validate all API responses with Zod schemas in `src/lib/api/schemas.ts`.
- Map backend errors through `error.code`; never show raw backend messages to users.
- GET requests retry up to 2 times for network/429/5xx. POST/PATCH must not retry automatically unless the backend supports idempotency keys.
- 401 responses trigger a single-flight refresh; retry the original request once, then clear the session.
- Access tokens stay in memory. Never store them in localStorage or sessionStorage.

## Content and trust policy

- Current workshop records are seed content in the local repository and will be replaced by backend data. They must not be described as real verified businesses in documentation.
- Verification badges must represent a real `verificationStatus` value. Do not invent trust signals in UI.
- Support records with `rating: null` and `reviewCount: 0`.
- Do not add review submission, booking, payment, or verification flows that only pretend to work.
- Authentication is connected to the backend auth endpoints. Access tokens stay in memory; refresh tokens are HttpOnly cookies.
- When real data arrives, update verification, moderation, structured data, and indexing together.

## SEO and accessibility

- Keep `lang` aligned with the active locale and page-level titles/descriptions localized.
- Canonical URLs and `hreflang` alternates derive from `SITE_URL` and `getPathname`.
- Search and profile pages are indexable; auth pages are `noindex`.
- `sitemap.ts` includes both locales and workshop profiles; keep it accurate as pages are added.
- Do not add JSON-LD or `LocalBusiness` structured data until the data is real and verified.
- Forms need labels, descriptions, visible focus states, and accessible error/status messaging.
- Maintain keyboard navigation, skip link, contrast, and reduced motion.
- Never render untrusted content as raw HTML. Never use `dangerouslySetInnerHTML`.

## Images and media

- Photographs are currently sourced from Unsplash and stored in `public/images`; credits are in `public/images/CREDITS.md`.
- Use `next/image` with explicit `sizes` and meaningful `alt` text.
- When project photography is available, replace files using the same paths and keep the credits file current.
- Do not hotlink remote images at runtime.

## Security and future requirements

- Never commit secrets or real credentials. Use `.env.local` locally and environment variables in deployment.
- Server-only values such as `API_INTERNAL_BASE_URL` must not use the `NEXT_PUBLIC_` prefix.
- Validate external input at the boundary and fail safely.
- Do not swallow errors silently. The error boundary logs the error and shows a safe message.
- Future authentication, authorization, content moderation, and business verification must be enforced server-side. UI hiding is not authorization.
- Before enabling user reviews, plan authentication, rate limiting, moderation, abuse reporting, and retention.

## Deployment

- The app runs with the standard Next.js Node server (`npm run build`, `npm run start`).
- Docker is intentionally out of scope. Do not add container configuration without an explicit request.
- The backend is a separate service connected through the server-only repository boundary over HTTP.
- `SITE_URL` is read at build time for canonical URLs, robots, sitemap, and social metadata. Set it before building.
- The health endpoint is `GET /api/health`; it currently checks only this application.
- API endpoint base URLs come from `API_INTERNAL_BASE_URL` and `NEXT_PUBLIC_API_BASE_URL`.
- Reverse proxy and HTTPS termination are the deployment environment's responsibility; see `README.md`.

## Quality gates

Run these before handing off changes:

```bash
npm run lint
npm run typecheck
npm run build
```

Check the page-size limit:

```bash
find src/app -name 'page.tsx' -print0 | xargs -0 wc -l | awk '$1 > 400 && $2 != "total" { print; failed=1 } END { exit failed }'
```

Then start production output and smoke-test at minimum:

```bash
npm run start
curl -i http://localhost:3000/api/health
curl -s "http://localhost:3000/usta-ara?aracTuru=suv"
curl -s "http://localhost:3000/en/find-workshops?uzmanlik=klima"
curl -i http://localhost:3000/usta/gecersiz-slug   # must return 404
```

Verify both locales, the language switcher (including query preservation), filters, sorting, mobile filters, login/register/logout, and profile links. Do not report a command as passing unless it was actually run.
