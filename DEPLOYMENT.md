# Casino Asset Portal - Upute za Deployment

## Preduvjeti

- **Node.js** v18+ instaliran na serveru
- **npm** ili **yarn**
- Pristup serveru putem SSH

---

## 1. Priprema projekta

### Kloniranje projekta na server

```bash
# Kopirajte projekt na server (scp, git clone, itd.)
scp -r "Baza podataka" user@server:/var/www/casino-portal
```

### Instalacija dependencija

```bash
cd /var/www/casino-portal
npm install
```

---

## 2. Konfiguracija

### Kreiranje `.env` datoteke

```bash
cp .env.example .env
# ili kreirajte novu:
nano .env
```

### Sadržaj `.env` datoteke:

```env
# Database - za produkciju koristite apsolutnu putanju
DATABASE_URL="file:/var/www/casino-portal/prisma/dev.db"

# NextAuth - OBAVEZNO promijenite secret!
NEXTAUTH_SECRET="vaš-super-tajni-ključ-generirajte-novi"
NEXTAUTH_URL="https://vaša-domena.com"
```

> **VAŽNO:** Generirajte novi NEXTAUTH_SECRET:
> ```bash
> openssl rand -base64 32
> ```

---

## 3. Build i pokretanje

### Generiranje Prisma klijenta i build

```bash
npx prisma generate
npx prisma migrate deploy
npm run build
```

### Seedanje baze (samo prvi put)

```bash
npx prisma db seed
```

> **Admin login:**
> - Username: `admin`
> - Password: `admin123`

---

## 4. Pokretanje aplikacije

### Opcija A: PM2 (preporučeno)

```bash
# Instalacija PM2
npm install -g pm2

# Pokretanje
pm2 start npm --name "casino-portal" -- start

# Automatski restart pri rebootu
pm2 startup
pm2 save
```

### Opcija B: Systemd Service

Kreirajte `/etc/systemd/system/casino-portal.service`:

```ini
[Unit]
Description=Casino Asset Portal
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/var/www/casino-portal
ExecStart=/usr/bin/npm start
Restart=on-failure
Environment=NODE_ENV=production

[Service]
ExecStart=/usr/bin/npm start

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl enable casino-portal
sudo systemctl start casino-portal
```

---

## 5. Nginx Reverse Proxy

Kreirajte `/etc/nginx/sites-available/casino-portal`:

```nginx
server {
    listen 80;
    server_name vaša-domena.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/casino-portal /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

---

## 6. SSL (HTTPS)

### Opcija A: Imate Javnu Domenu (npr. casino-portal.com)
Najjednostavnija i najbolja opcija. Koristi besplatni Let's Encrypt.

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d vaša-domena.com
```

### Opcija B: Lokalna Mreža (npr. 192.168.1.50)
Ako nemate javnu domenu, morate kreirati **Self-Signed** certifikat. Preglednici će javljati upozorenje ("Not Secure"), ali veza će biti kriptirana.

1. **Kreirajte certifikat:**
```bash
sudo openssl req -x509 -nodes -days 365 -newkey rsa:2048 -keyout /etc/ssl/private/nginx-selfsigned.key -out /etc/ssl/certs/nginx-selfsigned.crt
```
*(Pritisnite Enter na sva pitanja)*

2. **Kreirajte Diffie-Hellman grupu (traje par minuta):**
```bash
sudo openssl dhparam -out /etc/nginx/dhparam.pem 2048
```

3. **Konfigurirajte Nginx (`/etc/nginx/sites-available/casino-portal`):**

```nginx
server {
    listen 80;
    server_name 192.168.1.50; # Vaša IP adresa
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl;
    server_name 192.168.1.50; # Vaša IP adresa

    ssl_certificate /etc/ssl/certs/nginx-selfsigned.crt;
    ssl_certificate_key /etc/ssl/private/nginx-selfsigned.key;

    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### 💡 Kako ukloniti upozorenje "Not Secure" na računalima kolega?

Budući da je ovo vaš vlastiti certifikat, preglednici mu inicijalno ne vjeruju. Da bi dobili zeleni lokotić na drugim računalima u firmi:

1.  Preuzmite datoteku `nginx-selfsigned.crt` sa servera na svoje računalo (preko SCP-a ili USB-a).
2.  Na svom Windows računalu dvaput kliknite na tu datoteku.
3.  Kliknite **Install Certificate**.
4.  Odaberite **Local Machine** -> Next.
5.  Odaberite **"Place all certificates in the following store"**.
6.  Kliknite **Browse** i odaberite **"Trusted Root Certification Authorities"** (ovo je ključno!).
7.  Next -> Finish.

Nakon restarta preglednika, vaša interna stranica će imati zeleni lokotić 🔒.

---

## 7. Održavanje

### Backup baze podataka

```bash
cp /var/www/casino-portal/prisma/dev.db /backup/casino-portal-$(date +%Y%m%d).db
```

### Ažuriranje aplikacije

```bash
cd /var/www/casino-portal
git pull  # ili scp nove datoteke
npm install
npx prisma migrate deploy
npm run build
pm2 restart casino-portal
```

### Pregled logova

```bash
pm2 logs casino-portal
# ili
journalctl -u casino-portal -f
```

---

## Brzi pregled naredbi

| Akcija | Naredba |
|--------|---------|
| Build | `npm run build` |
| Start | `npm start` |
| Dev mode | `npm run dev` |
| Migracije | `npx prisma migrate deploy` |
| Seed | `npx prisma db seed` |
| PM2 restart | `pm2 restart casino-portal` |
| PM2 logovi | `pm2 logs casino-portal` |

---

## Troubleshooting

### Port 3000 zauzet
```bash
lsof -i :3000
kill -9 <PID>
```

### Prisma problemi
```bash
npx prisma generate
npx prisma migrate reset  # OPREZ: briše podatke!
```

### Provjera statusa
```bash
pm2 status
curl http://localhost:3000
```
