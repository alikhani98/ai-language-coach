# Phase 7.9 — Persian typography and UI polish

## Font strategy

- Persian: self-hosted variable Vazirmatn, replacing Tahoma as the primary UI font.
- English: self-hosted variable Inter. English lesson content explicitly declares its language; Persian explanations retain the Persian UI stack.
- Both load through `next/font/local` with CSS variables, fallback fonts, preload, and `display: swap`. No runtime third-party font requests or new dependencies.
- Assets total approximately 453 KiB before HTTP compression. Both files have valid WOFF2 signatures and include their SIL Open Font License notices.
- Sources: [Vazirmatn upstream](https://github.com/rastikerdar/vazirmatn/tree/master/fonts/webfonts), [Inter upstream](https://github.com/rsms/inter/tree/master/docs/font-files). License copies come from the Google Fonts repositories for [Vazirmatn](https://github.com/google/fonts/tree/main/ofl/vazirmatn) and [Inter](https://github.com/google/fonts/tree/main/ofl/inter).

## Typography decisions

Locale-scoped CSS tokens power the Tailwind type scale and shared semantic classes: `type-display`, `type-title`, `type-section`, `type-copy`, `type-label`, and `type-coach`.

| Setting | Persian | English |
| --- | --- | --- |
| Body | 16 px / 1.95 | 16 px / 1.75 |
| Small text | 15 px | 14 px |
| Captions/navigation | 13 px | 12 px |
| Heading line height | 1.6 | 1.35 |
| Heading tracking | Normal (0) | -0.025 em |
| Label line height | 1.85 | 1.65 |

Hero and page-title sizes are fluid, with balanced heading wrapping. Regular, medium, and semibold weights establish hierarchy. Coach messages get a comfortable measure and medium weight; supporting copy has more separation from headings. Inputs retain a 16 px size and flexible height. Shared surfaces have consistent borders, padding, and corner radius.

Persian copy uses consistent half-spaces, with refinements to onboarding, practice guidance, conversation empty states, and notebook empty states. Native text shaping is preserved; Persian is never given negative letter spacing.

## Bilingual and RTL details

- Dashboard usernames use `bdi` isolation and a restrained Latin size within the greeting; long names may wrap without forcing arbitrary breaks throughout all prose.
- Level badges and correction examples isolate mixed-direction text.
- English vocabulary, examples, reading, and speaking content use explicit English/LTR scopes. Vocabulary meanings use automatic text direction.
- Chat bubble corners use logical `rounded-ee` / `rounded-es` utilities.
- Existing directional arrows and logical inline spacing are retained.
- Onboarding's heading now follows its existing local language selection along with the form, font tokens, and direction.
- Practice counts, conversation character counts, progress totals, and notebook counts use the interface locale. English learning content and CEFR codes retain Latin numerals.
- Notebook dates use the interface locale and learner timezone. Progress dates format the existing date-only values without shifting their calendar day.
- Mobile navigation has roomier label rhythm. Weekly activity labels no longer use fixed 11 px text; day circles are narrower on mobile. Notebook controls can wrap.

## Dark mode

The existing theme system is preserved. Muted foreground tokens are darker in light mode and lighter in dark mode (39% and 72% lightness respectively), making captions and helper text more readable. Existing calm card, coach, mission, and input surfaces remain in place; the shared typography applies consistently to both themes.

## Files changed

Font system and assets:

- `app/layout.tsx`
- `app/globals.css`
- `tailwind.config.ts`
- `app/fonts/vazirmatn-variable.woff2`
- `app/fonts/inter-variable.woff2`
- `app/fonts/OFL-Vazirmatn.txt`
- `app/fonts/OFL-Inter.txt`

Screens and workspaces:

- `app/dashboard/page.tsx`
- `app/practice/page.tsx`
- `app/conversation/page.tsx`
- `app/progress/page.tsx`
- `app/mistakes/page.tsx`
- `app/onboarding/page.tsx`
- `components/auth-form.tsx` (shared login/signup)
- `components/practice-workspace.tsx`
- `components/conversation-workspace.tsx`
- `components/mistake-notebook.tsx`
- `components/onboarding-form.tsx`
- `lib/i18n/messages/fa.json`

Shared UI:

- `components/ui/button.tsx`
- `components/ui/card.tsx`
- `components/ui/empty-state.tsx`
- `components/ui/input.tsx`
- `components/ui/label.tsx`
- `components/ui/mobile-nav.tsx`
- `components/ui/page-header.tsx`
- `components/ui/section-title.tsx`
- `components/coach/AICoachMessage.tsx`
- `components/coach/AIProgressSummary.tsx`
- `components/coach/CoachInsight.tsx`
- `components/coach/LearningRhythm.tsx`
- `components/coach/TodaysMission.tsx`

Shared header/desktop navigation inherit the centralized font and locale type scale without changing their interactions.

## Validation

| Check | Result |
| --- | --- |
| `npm run typecheck` | Passed |
| `npm run lint` | Passed; no warnings or errors |
| `npm test` | Passed; 9 files, 65 tests |
| `npm run build` | Passed; optimized production build and all 12 generated pages |
| Font assets | Both WOFF2 signatures verified; license notices included |

Browser visual verification was attempted using an isolated, read-only component preview with fixture data and inert actions. The browser connector did not reach this workspace's local preview, so desktop/mobile screenshot verification remains unconfirmed. The temporary preview process and script were removed. No authentication or learner records were created or changed for verification.

Backend, database, authentication behavior, AI providers, server actions, and route definitions are unchanged. Work stops at Phase 7.9.
