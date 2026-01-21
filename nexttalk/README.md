# NextTalk - Chat PWA

🚀 **Application de chat en temps réel Progressive Web App (PWA)**

NextTalk est une application de messagerie moderne et performante construite avec Next.js 15. Elle permet aux utilisateurs de créer des salons, d'échanger des messages en temps réel, de partager des photos et leur localisation, le tout dans une interface fluide et responsive installable comme une application native.

## 🌟 Fonctionnalités Principales

*   **💬 Chat en Temps Réel** : Communication instantanée via Socket.IO.
*   **📂 Gestion des Salons** : Créez de nouveaux salons ou rejoignez ceux existants.
*   **📸 Partage Multimédia** :
    *   Prenez des photos directement depuis l'application via la caméra.
    *   Envoyez des images stockées sur votre appareil.
*   **📍 Géolocalisation** : Partage et affichage de votre localisation actuelle via l'API de géolocalisation.
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
    git clone https://github.com/VOTRE_USERNAME/nexttalk.git
    cd nexttalk
    ```

2.  **Installer les dépendances :**
    ```bash
    npm install
    ```

3.  **Configuration de l'environnement :**
    Assurez-vous que les variables d'environnement sont configurées (voir section ci-dessous) ou utilisez les valeurs par défaut.

4.  **Lancer le serveur de développement :**
    ```bash
    npm run dev
    ```
    L'application sera accessible sur `http://localhost:3000`.

## 🧪 Tests

Le projet utilise **Vitest** pour les tests unitaires et d'intégration.

Pour lancer les tests :

1.  **Lancer tous les tests :**
    ```bash
    npm test
    ```

2.  **Lancer un test spécifique (ex: Header) :**
    ```bash
    npm test -- Header
    ```

### Tests E2E (End-to-End)

Les tests de bout en bout sont gérés par **Playwright**. Ils simulent un navigateur réel pour vérifier les parcours utilisateurs.

1.  **Lancer les tests (mode headless) :**
    ```bash
    npm run test-e2e
    ```

2.  **Lancer avec interface visuelle (mode UI) :**
    ```bash
    npx playwright test --ui
    ```

3.  **Voir le rapport de test :**
    ```bash
    npx playwright show-report
    ```

## 🔐 Variables d'Environnement

L'application utilise les variables suivantes (définies dans `.env` ou `.env.local`) :

```bash
NEXT_PUBLIC_SOCKET_URL=https://api.tools.gavago.fr  # URL du serveur Socket.IO
```

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
