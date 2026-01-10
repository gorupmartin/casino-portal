# 🎰 Casino Asset Portal

Open-source sustav za upravljanje imovinom casina, evidenciju radnih sati tehničara, praćenje ključeva i certifikata.

![Casino Asset Portal](https://via.placeholder.com/800x400?text=Casino+Asset+Portal)

## 🚀 Značajke

- **🔐 Upravljanje Korisnicima:** Role-based access control (Admin/Viewer) i granularne dozvole po modulima.
- **⏰ Radni Sati:** Evidencija dolazaka/odlazaka, automatski izračun prekovremenih sati, mjesečni izvještaji.
- **🔑 Keys Modul:** Inventura ključeva, praćenje stanja (srebrni/zlatni), dodjeljivanje lokacijama.
- **📜 Certifikati:** Baza certifikata za igre i aparate u skladu s HR/SLO regulativom.
- **🛡️ Audit Log:** Detaljno praćenje svih promjena u sustavu (tko, što, kada, stare/nove vrijednosti).

## 🛠️ Tehnologije

- **Frontend:** Next.js 14 (App Router), React, Tailwind CSS
- **Backend:** Next.js API Routes
- **Baza:** SQLite + Prisma ORM
- **Auth:** NextAuth.js

## 📦 Instalacija i Deployment

Pogledajte detaljne upute u [DEPLOYMENT.md](DEPLOYMENT.md) za postavljanje na vlastiti server (Windows/Linux).

## 💻 Lokalni Razvoj

1.  Klonirajte repozitorij:
    ```bash
    git clone https://github.com/vas-username/casino-portal.git
    ```
2.  Instalirajte pakete:
    ```bash
    npm install
    ```
3.  Pripremite bazu:
    ```bash
    npx prisma migrate dev
    npx prisma db seed
    ```
4.  Pokrenite server:
    ```bash
    npm run dev
    ```

## 📄 Licenca

Ovaj projekt je licenciran pod **MIT Licencom**. Slobodno ga koristite, mijenjajte i dijelite! Pogledajte [LICENSE](LICENSE) datoteku za detalje.
