from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import Depends, FastAPI, Request, Response
from fastapi.responses import JSONResponse, PlainTextResponse, RedirectResponse, FileResponse
from starlette.staticfiles import StaticFiles

from server.auth import auth_backend, cookie_transport, current_active_user, current_optional_user, current_superuser, fastapi_users
from server.db import create_db_and_tables

WORKSPACE_DIR = Path(__file__).resolve().parent.parent
PUBLIC_DIR = WORKSPACE_DIR / "public"


app = FastAPI()

@app.on_event("startup")
async def on_startup():
    await create_db_and_tables()

@app.on_event("shutdown")
async def on_shutdown():
    pass

# Framework-managed auth routes:
# - POST /auth/jwt/login
# - POST /auth/jwt/logout
app.include_router(
    fastapi_users.get_auth_router(auth_backend),
    prefix="/auth/jwt",
    tags=["auth"],
)


@app.middleware("http")
async def security_headers_and_methods(request: Request, call_next):
    # Block access to internal directories (defense-in-depth)
    path = request.url.path
    if path.startswith(("/server/", "/tools/", "/dev_local/")):
        return PlainTextResponse("Forbidden", status_code=403)

    # Allow only safe methods globally; allow POST for login/logout.
    if request.method not in ("GET", "HEAD"):
        if request.method == "POST" and path in ("/auth/jwt/login", "/auth/jwt/logout"):
            pass
        else:
            return PlainTextResponse("Method Not Allowed", status_code=405)

    response: Response = await call_next(request)

    # Best-effort: discourage caching and reduce accidental downloads
    response.headers["Content-Disposition"] = "inline"
    response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate, max-age=0"
    response.headers["Pragma"] = "no-cache"
    response.headers["Referrer-Policy"] = "no-referrer"
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "SAMEORIGIN"
    return response

# API: list PNG files under Resources/PackAssembly
@app.get("/api/pack_assembly/pngs")
async def list_pack_assembly_pngs(_user=Depends(current_superuser)):
    pack_dir = WORKSPACE_DIR / "Resources" / "PackAssembly"
    if not pack_dir.exists():
        return JSONResponse([])
    def is_png(p: Path) -> bool:
        return p.is_file() and p.suffix.lower() == ".png"
    files = [p.name for p in sorted(pack_dir.iterdir()) if is_png(p)]
    urls = [f"/api/pack_assembly/file/{name}" for name in files]
    return JSONResponse(urls)

@app.get("/api/pack_assembly/file/{name}")
async def get_pack_assembly_file(name: str, _user=Depends(current_superuser)):
    # Prevent path traversal and restrict allowed extensions
    if "/" in name or "\\" in name:
        return PlainTextResponse("Bad Request", status_code=400)
    ext = Path(name).suffix.lower()
    if ext not in (".png", ".xlsx"):
        return PlainTextResponse("Forbidden", status_code=403)
    fpath = WORKSPACE_DIR / "Resources" / "PackAssembly" / name
    if not fpath.exists() or not fpath.is_file():
        return PlainTextResponse("Not Found", status_code=404)
    return FileResponse(fpath)


@app.get("/api/logout")
async def logout():
    # Convenience GET endpoint for the UI; FastAPI-Users official logout is POST /auth/jwt/logout.
    resp = RedirectResponse("/login.html", status_code=302)
    resp.delete_cookie(cookie_transport.cookie_name)
    return resp

# Explicit gates for primary pages to ensure redirect occurs even if static mount is hit
@app.get("/")
async def gate_root(user=Depends(current_optional_user)):
    if not user:
        return RedirectResponse("/login.html", status_code=302)
    return FileResponse(PUBLIC_DIR / "index.html")

@app.get("/index.html")
async def gate_index(user=Depends(current_optional_user)):
    if not user:
        return RedirectResponse("/login.html", status_code=302)
    return FileResponse(PUBLIC_DIR / "index.html")

@app.get("/feature1.html")
async def gate_f1(user=Depends(current_optional_user)):
    if not user:
        return RedirectResponse("/login.html", status_code=302)
    return FileResponse(PUBLIC_DIR / "feature1.html")

@app.get("/feature2.html")
async def gate_f2(user=Depends(current_optional_user)):
    if not user:
        return RedirectResponse("/login.html", status_code=302)
    return FileResponse(PUBLIC_DIR / "feature2.html")

@app.get("/feature3.html")
async def gate_f3(user=Depends(current_optional_user)):
    if not user:
        return RedirectResponse("/login.html", status_code=302)
    return FileResponse(PUBLIC_DIR / "feature3.html")


@app.get("/login.html")
async def login_page():
    return FileResponse(PUBLIC_DIR / "login.html")

# Serve the entire website directory as static content
app.mount(
    "/",
    StaticFiles(directory=str(PUBLIC_DIR), html=True),
    name="static",
)

