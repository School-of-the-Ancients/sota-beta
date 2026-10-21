# Private beta deployment

This deployment restores the original beta with an isolated Supabase-compatible backend. It does not change another application's Supabase, and it does not migrate old cloud accounts or progress.

## Components and boundaries

- Dedicated Compose project `sota-private`: Postgres, GoTrue auth, PostgREST, Kong, and static Nginx frontend.
- Separate named database volumes and private network; no published database/auth/PostgREST ports.
- Publish gateway/static frontend only on an explicit private host IP, ports 8100/8101. A trusted HTTPS reverse proxy supplies public access.
- Public signup, anonymous-user creation, phone signup and Google login are disabled. Only the operator-provisioned email/password account exists.
- `public.user_data` uses row-level ownership plus an allowlisted JWT email. Anonymous reads/writes are revoked.
- The browser receives only the anon key. Database password, signing secret, service-role key, and initial account password remain in mode-0600 files under a mode-0700 instance directory. Never commit that directory or a credential-bearing build environment.
- GoTrue manages its auth schema/functions. Do not pre-create `auth.jwt()` as the `postgres` role: that breaks GoTrue's ownership-sensitive migrations.

## Render and start

On the deployment host, choose an unused private address/ports and supply the real HTTPS URLs and allowed account email:

```bash
python3 render.py --output "$HOME/sota-backend" \
  --public-url https://example.com/sota-api \
  --site-url https://example.com/sota/ \
  --allowed-email owner@example.com --bind-ip 192.168.1.10
cd "$HOME/sota-backend"
docker compose -f compose.json config --quiet
docker compose -f compose.json up -d db auth rest gateway
python3 /path/to/verify.py --instance "$HOME/sota-backend" \
  --base-url http://192.168.1.10:8100 --provision
```

The renderer refuses to overwrite an existing instance. Preserve its secrets/volumes across updates; never regenerate signing secrets as an incidental redeploy. The generated `PRIVATE-LOGIN.txt` is for the operator's private terminal/password manager, not a chat message. Provisioning is idempotent and does not reset an existing account password.

## Frontend and HTTPS

Production startup reads `public/sota-runtime.json`, which contains only the reviewed HTTPS configuration URL and UI capability flags. It then fetches the public anon configuration before mounting the app. Old Vercel build-time backend values are ignored in production, privileged keys are rejected, and failed/malformed configuration fails closed. Development can still use local Vite environment values. No provider credentials or service-role key are committed.

Run `npm ci` and `npm run build -- --base=/sota/` for the secondary path deployment; Vercel uses the root build. Transfer only `dist/` into the instance's `dist/` directory. Start `web` with Compose. The router and OAuth return path respect Vite's base path; runtime capability flags hide unsupported signup/Google UI.

At the existing HTTPS proxy, add these routes while preserving the existing configuration:

```caddyfile
example.com {
    redir /sota /sota/ 308
    handle_path /sota-api/* {
        reverse_proxy http://192.168.1.10:8100
    }
    handle_path /sota/* {
        reverse_proxy http://192.168.1.10:8101
    }
    respond 404
}
```

Validate the full proxy candidate before reload, preserve a private rollback copy, and test unrelated routes afterward. No DNS/provider authorization is implied by SSH access; the operator must own and already route the chosen HTTPS hostname.

## Verification and review

```bash
python3 -m unittest discover -s ops/sota_backend/tests -v
npm test -- --run
npm run build -- --base=/sota/
python3 verify.py --instance "$HOME/sota-backend" --base-url https://example.com/sota-api
```

The API verifier validates its target against the exact configured HTTPS URL or private IPv4 gateway before sending credentials, and refuses redirects. It checks owner login, refresh, blocked signup, absent-key/anonymous denial, another signed identity's denial, and row ownership. Existing owner progress is read only. A save/read check runs only when no owner row exists, using a plain insert and cleanup conditional on the exact marker; concurrent progress cannot be overwritten or deleted. It deliberately does not create an unauthorized real user. Check browser load/navigation, correct backend origin, private login UI, and public TLS separately. Verify the original/shared database remains unchanged. Source changes require current-head review; deployment receipts must identify the deployed source.

The secondary deployment can use a different URL from the old Vercel beta. The GitHub-linked Vercel deployment receives the runtime configuration change after reviewed merge. Verify both the live bundle and its runtime-config request before claiming the original beta has been restored.
