# savideo web

Next.js 15 (App Router) + Tailwind v4 front end for the savideo MVP. Design tokens come from `replica/design/` and live in `design/`.

```bash
npm install
npm run dev        # http://localhost:3000
npm run build && npm start
```

## Data layer

`lib/api.ts` picks the data layer:

- `NEXT_PUBLIC_API_BASE` empty: the **fake** layer (`lib/fake-api.ts`) with seed data. A yellow "Demo mode" bar shows at the top. Downloads hand the browser a small `.txt` stand-in from `/api/fake-download`.
- `NEXT_PUBLIC_API_BASE=https://api.savideo.example/v1`: the real FastAPI service (`lib/http-api.ts`), same function signatures, so no screen code changes.
  Set `NEXT_PUBLIC_DEMO_URL` to a public video you may share to keep the "Try a demo video" link; without it the link is hidden. The API lives in `../api` (see its README).

### Seed links for the fake layer

Any link on one of the seven supported sites returns a sample video. Words in the link trigger states:

| link contains | result |
| --- | --- |
| `demo` | 3:34 clip with 4K (the "Try a demo video" button) |
| `long` | 60+ character title, 70 min |
| `arabic` | Arabic title |
| `nothumb` | thumbnail missing |
| `private`, `removed`, `agegate`, `live`, `geo`, `toolong`, `paused`, `offline` | that error |
| `busy` | busy once, auto retry with countdown, then success |
| `youtube.com/playlist?list=…` | playlist of 6 |
| `x.com/…` | no audio tab |
| any other site | unsupported site |

The free limit (3 per UTC hour) is counted in `localStorage` (`sv.fake.quota`); delete that key to reset it.

## Layout

- `app/` routes: `/`, `/faq`, `/apps`, `/terms`, `/privacy`, `/copyright`, `/about`, `/contact`, `/design` (primitives).
- `components/ui/` primitives, `components/downloader/` the tool (S01 to S07), `components/home/` home sections.
- `messages/en.json`, `messages/ar.json` all UI strings. Language and theme are in Settings; Arabic switches the page to RTL.
