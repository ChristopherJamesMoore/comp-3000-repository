# VPS HTTPS (Nginx + Certbot)

This uses Nginx to reverse-proxy `https://ledgrx.duckdns.org` to the API on
`http://127.0.0.1:3001`.

## 1) Install Nginx + Certbot
```
sudo apt update
sudo apt install -y nginx certbot python3-certbot-nginx
```

## 2) Add the Nginx site
```
sudo cp deploy/nginx-ledgrx.conf /etc/nginx/sites-available/ledgrx
sudo ln -s /etc/nginx/sites-available/ledgrx /etc/nginx/sites-enabled/ledgrx
sudo nginx -t
sudo systemctl reload nginx
```

## 3) Enable HTTPS
```
sudo certbot --nginx -d ledgrx.duckdns.org
```

## 4) Firewall (optional)
```
sudo ufw allow 80
sudo ufw allow 443
```

## 5) Verify
```
curl https://ledgrx.duckdns.org/api/health
```
