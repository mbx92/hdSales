# HD Sales - Deployment Guide

## Prerequisites

- Ubuntu/Debian Linux Server
- Node.js 18+ 
- PostgreSQL 14+
- Nginx (untuk reverse proxy)

## 1. Persiapan Server

```bash
# Update sistem
sudo apt update && sudo apt upgrade -y

# Install Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Install PostgreSQL
sudo apt install -y postgresql postgresql-contrib

# Install Nginx
sudo apt install -y nginx

# Install PM2 alternatif (optional)
sudo npm install -g pm2
```

## 2. Setup Database

```bash
# Masuk ke PostgreSQL
sudo -u postgres psql

# Buat user dan database
CREATE USER hdsales WITH PASSWORD 'your_secure_password';
CREATE DATABASE hd_sales OWNER hdsales;
GRANT ALL PRIVILEGES ON DATABASE hd_sales TO hdsales;
\q
```

## 3. Deploy Aplikasi

```bash
# Buat direktori
sudo mkdir -p /var/www/hdsales
sudo chown $USER:$USER /var/www/hdsales

# Copy project ke server (dari local)
rsync -avz --exclude node_modules --exclude .output --exclude .git ./ user@server:/var/www/hdsales/

# SSH ke server
ssh user@server
cd /var/www/hdsales

# Install dependencies
npm install

# Copy environment file
cp deploy/env.production .env.production
nano .env.production  # Edit sesuai konfigurasi server

# Generate Prisma client
npx prisma generate

# Migrate database
npx prisma migrate deploy

# Build aplikasi
npm run build
```

## 4. Setup Systemd Service

```bash
# Copy service file
sudo cp deploy/hdsales.service /etc/systemd/system/

# Reload systemd
sudo systemctl daemon-reload

# Enable dan start service
sudo systemctl enable hdsales
sudo systemctl start hdsales

# Cek status
sudo systemctl status hdsales

# Lihat logs
sudo journalctl -u hdsales -f
```

## 5. Setup Nginx

```bash
# Copy konfigurasi
sudo cp deploy/nginx.conf /etc/nginx/sites-available/hdsales

# Edit domain
sudo nano /etc/nginx/sites-available/hdsales

# Enable site
sudo ln -s /etc/nginx/sites-available/hdsales /etc/nginx/sites-enabled/

# Test konfigurasi
sudo nginx -t

# Restart Nginx
sudo systemctl restart nginx
```

## 6. SSL dengan Let's Encrypt

```bash
# Install Certbot
sudo apt install -y certbot python3-certbot-nginx

# Generate SSL
sudo certbot --nginx -d your-domain.com

# Auto-renew test
sudo certbot renew --dry-run
```

## 7. Firewall

```bash
# Enable UFW
sudo ufw allow ssh
sudo ufw allow 'Nginx Full'
sudo ufw enable
```

## Update/Redeploy

```bash
cd /var/www/hdsales

# Pull perubahan (jika pakai git)
git pull origin main

# Atau rsync dari local
# rsync -avz --exclude node_modules --exclude .output ./ user@server:/var/www/hdsales/

# Install dependencies baru
npm install

# Generate Prisma
npx prisma generate

# Migrate jika ada perubahan schema
npx prisma migrate deploy

# Rebuild
npm run build

# Restart service
sudo systemctl restart hdsales
```

## Troubleshooting

```bash
# Cek logs aplikasi
sudo journalctl -u hdsales -f

# Cek Nginx error
sudo tail -f /var/log/nginx/error.log

# Cek port yang digunakan
sudo netstat -tlnp | grep 3000

# Restart semua
sudo systemctl restart hdsales
sudo systemctl restart nginx
```
