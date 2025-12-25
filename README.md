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

Production:
- `APP_ENV=production` - set through environment Linux example: Environment="APP_ENV=production"
- `AUTH_JWT_SECRET` - Environment="AUTH_JWT_SECRET=put-a-long-random-string-here"

### 4) Start Nginx
1- install nginx
2- do "path to nginx.exe" "path to nginx folder" "path to nginx config folder"

## Cloudflare
DNS record (shares same ip):
    Use "curl ifconfig.me" to check for current IP
    Type A on primowang.com
    CNName on www.primowang.com
Security: 
    SSL/TLS - Full (strict)
    Private key: RSA, 3 years, key is downlaoded and send pasted to server
    Edge Certificates
    Always use HTTPS
    Automatic HTTPS rewrites

primowangfirstsecretkey

