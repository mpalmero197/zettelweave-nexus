

# Fix Platform Report Edge Function & Improve 3D Graph Visibility

## Issue 1: Platform Report Returns Non-2xx Errors

**Root cause**: Line 34 calls `supabase.auth.getClaims(token)` — this method does not exist on the Supabase JS client. It throws an error, which gets caught and returned as a 500. The client-side `supabase.functions.invoke` then discards the error body, showing a generic failure.

**Fix** in `supabase/functions/platform-report/index.ts`:
- Replace `getClaims(token)` with `getUser(token)` and extract `user.id` instead of `claims.sub`
- Change all error responses to return status 200 with `{ ok: false, error: "..." }` so the client can read the message
- Update the success response to include `ok: true`

**Fix** in `src/components/admin/PlatformReport.tsx`:
- Check `data.ok === false` and surface `data.error` as the toast message

## Issue 2: 3D Graph Hard to See

**Changes** in `src/components/Graph3D.tsx`:
- Increase `ambientLight` intensity from 0.15 to 0.4
- Increase `hemisphereLight` intensity from 0.3 to 0.6
- Increase base `emissiveIntensity` from 1.2 to 2.0 (hover from 3.5 to 4.5, search match from 2.5 to 3.5)
- Increase default edge opacity from 0.15 to 0.3, highlighted from 0.7 to 0.9
- Increase base edge lineWidth from 0.6 to 1.0
- Increase node label `fillOpacity` from 0.7 to 0.9
- Increase minimum node radius from 0.15 to 0.25

## Files Modified

| File | Change |
|---|---|
| `supabase/functions/platform-report/index.ts` | Fix auth (getClaims → getUser), return 200 with ok field for all responses |
| `src/components/admin/PlatformReport.tsx` | Handle `ok: false` response |
| `src/components/Graph3D.tsx` | Brighten lights, edges, nodes, labels |

