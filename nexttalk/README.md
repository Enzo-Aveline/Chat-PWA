# NextTalk - Chat PWA

🚀 **Application de chat en temps réel Progressive Web App (PWA)**

NextTalk est une application de messagerie moderne et performante construite avec Next.js 15. Elle permet aux utilisateurs de créer des salons, d'échanger des messages en temps réel, de partager des photos et leur localisation, le tout dans une interface fluide et responsive installable comme une application native.

## 🌟 Fonctionnalités Principales

*   **💬 Chat en Temps Réel** : Communication instantanée via Socket.IO.
*   **📂 Gestion des Salons** : Créez de nouveaux salons ou rejoignez ceux existants.
*   **📸 Partage Multimédia** :
    *   Prenez des photos directement depuis l'application via la caméra.
    *   Envoyez des images stockées sur votre appareil.
*   **📍 Géolocalisation** : Affichage de votre localisation actuelle via l'API de géolocalisation.
*   **🔔 Notifications** : Recevez des notifications pour les nouveaux messages, même lorsque vous n'êtes pas sur l'onglet actif.
*   **📱 Expérience PWA** :
    *   Installation sur smartphone et desktop.
    *   Fonctionnement hors ligne grâce au service worker et IndexedDB.
*   **👤 Profil Utilisateur** : Personnalisation du pseudo et de l'avatar.

## 🛠️ Technologies

### Frontend
*   **Framework** : [Next.js 15](https://nextjs.org/) (React 19)
*   **Langage** : TypeScript
*   **Styles** : Tailwind CSS
*   **PWA** : `next-pwa`
*   **Stockage Local** : IndexedDB (via `idb`)

### Communication & Data
*   **Real-time** : Socket.IO Client
*   **Data Fetching** : SWR

### Testing
*   **Framework** : Vitest
*   **Environnement** : JSDOM
*   **Utils** : React Testing Library

### Infrastructure
*   **Déploiement** : VPS avec Nginx + PM2
*   **CI/CD** : GitHub Actions

## 🚀 Installation et Démarrage

### Prérequis
*   Node.js (v20 ou supérieur recommandé)
*   npm

### Installation

1.  **Cloner le dépôt :**
    ```bash
    git clone https://github.com/Enzo-Aveline/Chat-PWA.git
    cd Chat-PWA/nexttalk/
    ```

2.  **Installer les dépendances**
    ```bash
    npm install
    ```

3.  **Configuration (.env)**
    Créez un fichier `.env` à la racine du projet pour configurer l'URL de l'API Socket.io (optionnel, une valeur par défaut est utilisée).
    ```env
    NEXT_PUBLIC_SOCKET_URL=https://{{domaine-api}}
    ```

4.  **Lancer en développement**
    ```bash
    npm run dev
    ```
    L'application sera accessible sur `http://localhost:3000`.



## 🧪 Tests et CI/CD

Le projet intègre deux niveaux de tests pour assurer la robustesse du code.

### Lancer les Tests Unitaires
Les tests unitaires et composants (avec Vitest) vérifient la logique métier isolée (ex: IndexedDB).
```bash
npm run test
```
Pour lancer un fichier de test spécifique (ex: uniquement les tests liés à `idb`) :
```bash
npm test -- idb
```

### Lancer les Tests E2E
Les tests de bout en bout (avec Playwright) simulent des parcours utilisateurs complets (ex: flux de connexion).
```bash
npm run test-e2e
```
Pour afficher le rapport visuel des derniers tests exécutés :
```bash
npx playwright show-report
```
*Note : Assurez-vous que le serveur de développement ne tourne pas déjà sur le port 3000, ou laissez Playwright le lancer automatiquement.*

### CI/CD

Le projet utilise GitHub Actions pour un déploiement continu (CD) sur un VPS.

**Workflow :** `deploy-nexttalk.yml`
*   **Trigger** : Push sur la branche `main` (fichiers dans `/nexttalk`).
*   **Actions** :
    1.  Connexion SSH au VPS.
    2.  `git pull` des derniers changements.
    3.  Installation des dépendances (`npm i`).
    4.  Build de l'application (`npm run build`).
    5.  Redémarrage du service avec PM2 (`pm2 restart nexttalk`).

## 📦 Build et Production

Pour préparer l'application pour la production :

1.  **Compiler le projet**
    ```bash
    npm run build
    ```

2.  **Démarrer le serveur de production**
    ```bash
    npm start
    ```

## 📝 Commandes Utiles

| Commande | Description |
|---|---|
| `npm run dev` | Lance le serveur de développement avec TurboPack. |
| `npm run build` | Compile l'application pour la production. |
| `npm start` | Démarre l'application compilée. |
| `npm run test` | Lance les tests unitaires avec Vitest. |
| `npm run test-e2e` | Lance les tests E2E avec Playwright. |

## 📦 Structure du Projet

```
nexttalk/
├── src/
│   ├── app/              # Routes et pages Next.js (App Router)
│   │   ├── chat/        # Fonctionnalités de chat ([id], menu)
│   │   └── login/       # Page de connexion
│   ├── components/       # Composants réutilisables (Modals, Toast, etc.)
│   ├── hooks/           # Custom hooks (useToast, etc.)
│   ├── lib/             # Logique métier (Socket, IDB) et utilitaires
│   └── styles/          # Fichiers CSS globaux
├── public/              # Fichiers statiques et assets PWA
├── vitest.config.mts    # Configuration des tests
└── next.config.ts       # Configuration Next.js (PWA, etc.)
```

## 🌐 Déploiement (Production)

L'application est configurée pour un déploiement continu via GitHub Actions sur un VPS.

**URL de Production** : https://vps115012.serveur-vps.net/

### Processus de déploiement automatique :
1.  Push sur la branche `main`.
2.  GitHub Action déclenche le déploiement.
3.  Pull, Build et Restart (PM2) sur le VPS.

### Commandes utiles (VPS) :
```bash
pm2 logs nexttalk    # Voir les logs
pm2 status           # Voir le statut des services
```

## 📄 Licence

MIT
