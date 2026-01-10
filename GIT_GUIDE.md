# Vodič za korištenje Gita (Verzianiranje koda)

Budući da je ovo tvoj prvi projekt, Git će ti biti najbolji prijatelj. On ti omogućuje da spremaš "povijest" svog koda. Ako nešto pokvariš, uvijek se možeš vratiti natrag.

## 1. Instalacija

Primijetio sam da **Git nije instaliran** na tvom računalu.

1.  Odi na: [https://git-scm.com/downloads](https://git-scm.com/downloads)
2.  Preuzmi verziju za **Windows**.
3.  Instaliraj ga (samo klikaj "Next" na svemu, postavke su dobre).
4.  **Restartaj VS Code** (ili terminal) da prepozna naredbu `git`.

---

## 2. Prvo postavljanje (Samo jednom)

Kada instaliraš Git, otvori terminal u VS Code-u i upiši ovo:

```bash
# Postavi svoje ime (ovo će pisati uz tvoje promjene)
git config --global user.name "Tvoje Ime"
git config --global user.email "tvoj-email@primjer.com"

# Inicijaliziraj repozitorij (stvori Git folder u projektu)
git init
```

---

## 3. Kako spremiti promjene (Commit)

Ovo radiš svaki put kad napraviš neki dio posla (npr. "dodao novi gumb", "popravio bug").

```bash
# 1. Dodaj sve promijenjene datoteke u "pripremu"
git add .

# 2. Spremi ih s porukom (opiši što si radio)
git commit -m "Ovdje napiši što si napravio"
```

---

## 4. Što ako želim vratiti kod? (Undo)

Ako si nešto jako zeznuo i želiš vratiti sve na zadnje spremanje:

```bash
git checkout .
```
*(Oprez: ovo briše sve promjene koje nisi commit-ao!)*

---

## 💡 Važna napomena za sigurnost

Ja sam ti već pripremio datoteku **`.gitignore`**.
Ona govori Gitu: **"Ignoriraj tajne datoteke!"**

Zato Git **neće** spremati:
- `.env` (tvoje lozinke)
- `prisma/dev.db` (tvoju bazu podataka)
- `node_modules` (gigabajte biblioteka)

To je odlično jer ako ikada staviš kod na internet (GitHub), tvoje lozinke i podaci ostaju sigurni kod tebe.
