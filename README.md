# Websites

## Structure

### 1) Install dependencies (Windows PowerShell)
```powershell
python -m pip install -r requirements.txt
```

### 2) Create an account
This project uses the open-source **FastAPI-Users** framework for authentication.

Users are stored in a local SQLite DB at `server/sensitive/users.db` (gitignored).

Create an admin user (superuser):
```powershell
python tools/manage_users.py add admin@example.com --admin
```

Remove a user:
```powershell
python tools/manage_users.py remove admin@example.com --admin
```

Overwrite a user:
```powershell
python tools/manage_users.py remove admin@example.com --admin --force
```

### 3) Start FastAPI (serves the site)
```powershell
python -m uvicorn server.app:app --host 127.0.0.1 --port 8000
```

Notes:
- Login endpoint is `POST /auth/jwt/login` and sets an HttpOnly cookie.
- Logout endpoint is `POST /auth/jwt/logout` (the UI also provides a convenience `GET /api/logout`).
- Cookie auth is **Secure** by default; for plain-HTTP local testing set `AUTH_COOKIE_SECURE=0`.

Production:
- `APP_ENV=production` - set through environment Linux example: Environment="APP_ENV=production"
- `AUTH_JWT_SECRET` - Environment="AUTH_JWT_SECRET=put-a-long-random-string-here"

### 4) Start Nginx

## Notes
- Admin-only restriction for Feature 2 is enforced by protecting the whole site behind Basic Auth.
- Zoom range can be tuned by `minDistance` and `maxDistance` in `src/main.js`.

## Production TLS for primowang.com
- Use a real certificate for `primowang.com`/`www.primowang.com` (Let’s Encrypt or Cloudflare). A self-signed cert will always show warnings for the public.
- Add an HTTP (port 80) server that redirects to HTTPS (port 443).

## Cloudflare + Nginx (Linux) deployment notes
- `dev_local/` is for local testing only and should not be deployed.
- If you deploy behind Cloudflare, use the production Nginx template in deploy/nginx/primowang.com.conf.
- Create `/etc/nginx/snippets/cloudflare_ips.conf` from Cloudflare’s published IP ranges so rate limiting uses the real client IP.
