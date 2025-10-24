# NextTalk - Chat PWA

🚀 **Application de chat en temps réel avec Progressive Web App (PWA)**

## 🌐 Production

**URL** : https://vps115012.serveur-vps.net/

[![Deploy to VPS](https://github.com/VOTRE_USERNAME/nexttalk/actions/workflows/deploy.yml/badge.svg)](https://github.com/VOTRE_USERNAME/nexttalk/actions/workflows/deploy.yml)

## 🛠️ Technologies

- **Framework** : Next.js 15
- **Styling** : Tailwind CSS
- **Real-time** : Socket.IO
- **PWA** : next-pwa
- **Déploiement** : VPS avec Nginx + PM2
- **CI/CD** : GitHub Actions

## 🚀 Déploiement automatique

Chaque push sur la branche `main` déclenche automatiquement :
1. 📥 Pull du code sur le VPS
2. 📦 Installation des dépendances
3. 🔨 Build de production
4. 🔄 Redémarrage de l'application
5. ✅ Vérification du statut

## 💻 Développement local

```bash
# Installation
npm install

# Développement
npm run dev

# Build
npm run build

# Production locale
npm start
```

## 📦 Structure du projet

```
nexttalk/
├── src/
│   ├── app/              # Pages Next.js
│   ├── components/       # Composants React
│   ├── hooks/           # Hooks personnalisés
│   ├── lib/             # Utilitaires (Socket.IO, etc.)
│   └── styles/          # Styles globaux
├── public/              # Assets statiques + PWA
├── .github/
│   └── workflows/       # GitHub Actions
└── ecosystem.config.js  # Configuration PM2
```

## 🔐 Variables d'environnement

```bash
NEXT_PUBLIC_SOCKET_URL=https://api.tools.gavago.fr
NODE_ENV=production
PORT=3000
```

## 📱 Fonctionnalités PWA

- ✅ Installable sur mobile et desktop
- ✅ Fonctionne hors ligne
- ✅ Notifications push
- ✅ Icônes adaptatives
- ✅ Manifest.json configuré

## 🔧 Commandes utiles sur le VPS

```bash
# Logs en temps réel
pm2 logs nexttalk

# Redémarrer
pm2 restart nexttalk

# Statut
pm2 status

# Monitoring
pm2 monit

# Déploiement manuel
/var/Chat-PWA/nexttalk/deploy.sh
```

## 📄 Licence

MIT
