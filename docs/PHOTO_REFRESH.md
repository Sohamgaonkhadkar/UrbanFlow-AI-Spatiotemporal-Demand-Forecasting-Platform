# Reference-video photo refresh — November 2, 2026

The five homepage image files were replaced with the exact photographs shown in the user's screen recording. ZIPs (7) and (8) referred to missing source assets while retaining the old public artwork. The public frontend URL visible in the recording was located, and its embedded JPEGs were recovered using its normal iframe request context.

All five recovered SHA-256 hashes match the intended image hashes in the supplied ZIP's `tests/imagery.spec.ts`. This is exact asset identity, rather than a similarity-based replacement. See [photo provenance](photo-provenance.json) for filenames, hashes, credits, located photo pages and the recorded site's URL. Photographer credits come from the supplied reference README; four Pexels photo pages were independently located.

The photographs now live in `frontend/src/assets` and are imported with `?inline`; matching `public/images` copies retain existing direct URLs. The rebuilt single-file production HTML was checked to contain every exact JPEG. No remote photo host is required at application runtime.

The only application source change is the five image import paths in `Homepage.tsx`. Existing styles, layout, animations, forecasting logic, genuine historical data, model artifact and backend remain unchanged. The v4 model still has SHA-256 `7b96eaf0f9c9bec866e29677f9df9cb7647a99619c1c4589c35632a8f845c2c4`. Original design manifests/screenshots remain historical evidence of the initial integration, before this explicitly requested image refresh.

Validation:

- `npm run typecheck`: passed.
- `npm run build`: passed; production HTML approximately 3.3295 MB.
- All five source/public image hashes and inlined production bytes: verified.
- Existing cinematic/navigation suite: 20 of 21 passed on the initial run; one initial-homepage-load timeout was rerun twice and passed both times without source/test changes. All 21 distinct checks were verified.
- Actual production preview: desktop/mobile renders, genuine backend data and zero browser runtime errors verified.

Updated previews: [desktop](screenshots/home-photos-desktop.png), [mobile](screenshots/home-photos-mobile.png), and the README's full homepage screenshots. The research repository is unaffected.
