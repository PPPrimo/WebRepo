## .cloudflared/config.yml
tunnel: <TUNNEL-UUID>
credentials-file: /home/primo/.cloudflared/<TUNNEL-UUID>.json

ingress:
  - hostname: primowang.com
    service: http://127.0.0.1:8000

  - hostname: www.primowang.com
    service: http://127.0.0.1:8000

  - service: http_status:404
##end

## /etc/systemd/system/webrepo.service
[Unit]
Description=FastAPI WebRepo
After=network.target

[Service]
User=primo
WorkingDirectory=/home/primo/website/WebRepo
Environment=PYTHONPATH=/home/primo/website/WebRepo
Environment=PYTHONUNBUFFERED=1
ExecStart=/home/primo/website/WebRepo/WebRepoVEnv/bin/gunicorn server.app:app \
  -k uvicorn.workers.UvicornWorker \
  --bind 127.0.0.1:8000 \
  --workers 2
Restart=always

[Install]
WantedBy=multi-user.target
##end

