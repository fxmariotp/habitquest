# ⚔ HabitQuest

App de tracking de hábitos con RPG. React + Supabase + Vite.

---

## Setup local

### 1. Instala dependencias
```bash
npm install
```

### 2. Configura las variables de entorno
```bash
cp .env.example .env
```
Edita `.env` y pon tus claves de Supabase:
```
VITE_SUPABASE_URL=https://XXXXXXXX.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGci...
```

### 3. Arranca el servidor de desarrollo
```bash
npm run dev
```
Abre http://localhost:5173

---

## Deploy en Vercel

1. Sube el proyecto a GitHub (ver instrucciones abajo)
2. Ve a vercel.com → "Add new project" → importa el repo
3. En "Environment Variables" añade:
   - `VITE_SUPABASE_URL` → tu URL de Supabase
   - `VITE_SUPABASE_ANON_KEY` → tu clave anon
4. Click "Deploy" — listo, tienes URL pública

### Subir a GitHub
```bash
git init
git add .
git commit -m "HabitQuest v1"
gh repo create habitquest --public
git push -u origin main
```
(necesitas tener `gh` instalado o crear el repo manualmente en github.com)

---

## Estructura del proyecto

```
src/
  App.jsx              # Router principal (auth / dashboard)
  main.jsx             # Entry point
  index.css            # Estilos globales
  lib/
    supabase.js        # Cliente Supabase
    game.js            # Lógica de juego (niveles, EXP, logros...)
    sound.js           # Sonidos 8-bit con Web Audio API
  i18n/
    translations.js    # ES / EN
  hooks/
    useGame.js         # Hook principal con toda la lógica de juego + sync Supabase
  components/
    Sidebar.jsx        # Panel de personaje (sidebar izquierdo)
  pages/
    AuthPage.jsx       # Login / registro
    Dashboard.jsx      # App principal con tabs
    FeedPage.jsx       # Feed de actividad del grupo con reacciones
    LeaderboardPage.jsx # Ranking semanal + sistema de amigos
    ProfilePage.jsx    # Perfil público + avatar picker
```

---

## Añadir amigos

Cada usuario debe configurar un **username** en su perfil (ej: `carlos`).
Luego en el Ranking → "Añadir amigo" → escribes el username del colega.

El enlace de perfil público será: `https://tu-app.vercel.app/u/carlos`

---

## Variables de entorno necesarias

| Variable | Dónde encontrarla |
|---|---|
| `VITE_SUPABASE_URL` | Supabase → Settings → API → Project URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase → Settings → API → anon public |
