# Kako objaviti projekt na GitHub-u 🚀

Slijedi ove korake točno redom kako bi tvoj projekt postao dostupan online (Open Source).

## 1. Kreiraj "Spremište" (Repository) na GitHubu

1.  Otvori [github.com](https://github.com) i prijavi se.
2.  U gornjem desnom kutu klikni na **+** i odaberi **New repository**.
3.  Ispuni podatke:
    *   **Repository name:** `casino-portal` (ili ime po želji)
    *   **Description:** (Opcija) Npr. "Sustav za upravljanje casinom"
    *   **Public:** ✅ (mora biti javno ako želiš da bude Open Source besplatno)
    *   **Initialize this repository with:** Pusti sve **PRAZNO** (nemoj kvačiti README, gitignore, niti License - to već imaš!).
4.  Klikni zeleni gumb **Create repository**.

## 2. Poveži svoje računalo s GitHubom

Nakon što klikneš Create, GitHub će ti pokazati stranicu s uputama.
Traži dio gdje piše: **"…or push an existing repository from the command line"**.

Kopiraj te 3 naredbe koje vidiš tamo. One izgledaju otprilike ovako (tvoje će imati tvoj username):

```bash
git remote add origin https://github.com/TVOJ-USERNAME/casino-portal.git
git branch -M main
git push -u origin main
```

## 3. Izvrši naredbe

1.  Vrati se u **VS Code**.
2.  Otvori Terminal (`Ctrl` + `J`).
3.  Zalijepi te naredbe (sve tri odjednom ili jednu po jednu) i pritisni **Enter**.

---

### 🎉 Čestitam!

Ako se u terminalu ispiše nešto kao `Branch 'main' set up to track remote branch...`, uspio si!
Osvježi stranicu na GitHubu i vidjet ćeš svoj kod, svoj README i svoju Licencu.

Tvoj projekt je sada Open Source! 🌍
