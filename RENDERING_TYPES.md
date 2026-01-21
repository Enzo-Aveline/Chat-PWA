# Mes notes sur les Types de Rendu Web : SSR, SSG et ISR

## 1. SSR - Server-Side Rendering (Rendu Côté Serveur)

### C'est quoi ?
C'est quand je demande au serveur de générer le code HTML de ma page **à chaque fois qu'un utilisateur fait une requête**.

### Comment ça marche ?
1. L'utilisateur demande une page sur mon site.
2. Mon serveur reçoit sa requête.
3. Il va chercher les infos dont il a besoin (dans ma BDD ou via une API).
4. Il construit le HTML complet avec ces données.
5. Il renvoie ce HTML tout prêt au navigateur.
6. Le navigateur affiche la page et télécharge ensuite le JS pour rendre le tout interactif ("Hydration").

### Pourquoi c'est bien (Avantages)
*   **SEO** : C'est top parce que Google voit direct tout mon contenu.
*   **Fraîcheur** : Mes données sont toujours à jour, vu que je reconstruis la page à chaque visite.

### Les points négatifs (Inconvénients)
*   **Ça charge le serveur** : Mon serveur doit bosser à chaque visite, ça peut lui faire mal si j'ai du monde.
*   **C'est un peu moins rapide (TTFB)** : L'utilisateur doit attendre que le serveur ait fini de construire la page avant de recevoir le premier octet.

### Comment je fais en Next.js
Avant (Pages Router) : J'utilisais `getServerSideProps`.
Maintenant (App Router) : C'est ce qui se passe par défaut avec les Server Components si j'utilise des trucs dynamiques (headers, cookies) ou si je coupe le cache.

---

## 2. SSG - Static Site Generation (Génération de Site Statique)

### C'est quoi ?
Là, je génère toutes mes pages HTML une bonne fois pour toutes **au moment du build** (quand je compile mon appli).

### Comment ça marche ?
1. Quand je déploie mon site, Next.js parcourt mes pages.
2. Il récupère les données et fabrique un fichier HTML pour chaque URL.
3. Je stocke ça sur mon serveur (ou un CDN).
4. Quand un utilisateur arrive, je lui sers direct le fichier HTML qui est déjà prêt.

### Pourquoi c'est bien (Avantages)
*   **C'est ultra rapide** : Difficile de faire mieux qu'un simple fichier statique servi par un CDN.
*   **Ça coûte rien** : Mon serveur ne fait presque rien.
*   **C'est fiable** : Même si ma BDD plante, mon site marche encore (vu que les pages sont déjà faites).

### Les points négatifs (Inconvénients)
*   **C'est figé** : Si je change un prix en base, ça se verra pas sur le site tant que je relance pas un déploiement. Pas ouf pour du temps réel.

### Comment je fais en Next.js
Avant : J'utilisais `getStaticProps`.
Maintenant (App Router) : C'est le comportement par défaut si je n'utilise pas de données dynamiques.

---

## 3. ISR - Incremental Static Regeneration (Régénération Statique Incrémentale)

### C'est quoi ?
C'est une évolution du SSG. Ça me permet de mettre à jour mes pages statiques **après** le déploiement, sans avoir à tout rebuilder.

### Comment ça marche ?
1. Je sers la page comme en SSG (super rapide).
2. Je définis une durée de validité (ex: 60 secondes).
3. Si quelqu'un vient après 60s, il voit l'ancienne version, mais en douce, mon serveur régénère la page avec les nouvelles données.
4. Une fois fini, la nouvelle version remplace l'ancienne pour les prochains visiteurs.

### Pourquoi c'est bien (Avantages)
*   **Le meilleur des deux mondes** : J'ai la vitesse du statique (SSG) et la fraîcheur des données (presque comme le SSR).
*   **Scalabilité** : Je n'ai pas besoin de reconstruire mes 10 000 pages juste pour corriger une faute sur une seule.

### Les points négatifs (Inconvénients)
*   **C'est plus complexe** : Faut gérer le cache, c'est parfois chiant à débugger.
*   **Petit délai** : La première personne qui passe après l'expiration voit encore la vieille version.

### Comment je fais en Next.js
J'ajoute l'option `revalidate` dans `getStaticProps` ou dans la config de mon fetch/page segment.

---

## Récapitulatif

| Stratégie | Quand je génère le HTML ? | Vitesse | Fraîcheur des données | Je l'utilise pour... |
| :--- | :--- | :--- | :--- | :--- |
| **SSG** | Au Build | 🟢 Très Rapide | 🔴 Figé au build | Blog, Doc, Portfolio |
| **SSR** | À chaque visite | 🟠 Moyen | 🟢 Temps réel | Dashboard, Flux perso |
| **ISR** | Au Build + Régénération auto | 🟢 Très Rapide | 🟠 Quasi temps réel | E-commerce, News |

---

## 4. Ce que je dois retenir pour le SEO

### Pourquoi c'est important ?
Les moteurs de recherche (Google) envoient des robots pour lire mon site. Pour être bien classé, il faut que le robot puisse **lire et comprendre** mon contenu vite fait bien fait.

### Comparatif SEO

#### 1. SSG (Static Site Generation)
*   **Pourquoi ?** Le HTML est déjà tout prêt. Le robot de Google reçoit tout le contenu direct (textes, images) sans rien calculer.
*   **Vitesse** : C'est imbattable sur les Core Web Vitals (vitesse de chargement), donc Google adore.
*   **Verdict** : À utiliser pour tout ce qui est public (articles, landing pages).

#### 2. SSR (Server-Side Rendering)
*   **Pourquoi ?** Comme le SSG, j'envoie un HTML complet. C'est parfait si mon contenu change tout le temps mais doit être référencé.
*   **Attention** : Si mon serveur est lent à répondre (TTFB), Google peut me pénaliser un peu.
*   **Verdict** : Indispensable pour les pages dynamiques publiques (fiches produits avec stocks, actus).

#### 3. ISR (Incremental Static Regeneration)
*   **Pourquoi ?** C'est comme le SSG pour le robot : une page statique ultra-rapide.
*   **Fraîcheur** : Même si le robot passe pendant la régénération, il voit l'ancienne version qui reste lisible.
*   **Verdict** : Parfait pour les gros sites (news, e-commerce) où le SEO est vital.

#### 4. CSR (Client-Side Rendering)
*   **Le souci** : En CSR (React de base), j'envoie une page vide (`<div id="root"></div>`) et c'est le navigateur qui bosse.
*   **Risque** : Google *sait* lire le JS, mais ça lui coûte cher ("budget de crawl"). Il peut mettre du temps à indexer ma page, ou carrément laisser tomber si c'est trop lourd.
*   **Verdict** : J'évite ça pour les pages qui doivent être référencées. Je garde ça pour mes dashboards privés.

### Mon classement SEO

1.  **SSG / ISR** : Les champions (Vitesse max + Contenu immédiat).
2.  **SSR** : Très bon (Contenu immédiat), mais je surveille mon serveur.
3.  **CSR** : Moins bon (Trop dépendant du JS, indexation potentiellement retardée).
