# Feuille de Route et Architecture du Projet EVSCallPro

Ce document suit l'avancement du développement de l'application EVSCallPro et détaille son architecture technique.

---

## 1. Architecture Technique

### 1.1 Philosophie "Zéro Rafraîchissement" (Architecture Temps Réel)

L'application est construite sur une architecture moderne "Zéro Rafraîchissement". L'objectif est de fournir une expérience utilisateur fluide et collaborative où les données sont mises à jour en temps réel pour tous les utilisateurs connectés, sans jamais avoir besoin de recharger la page manuellement.

Le mécanisme fonctionne comme suit :

1.  **API pour les Actions :** Lorsqu'un utilisateur effectue une modification (ex: sauvegarder une campagne), le frontend envoie une requête unique à l'API backend (Node.js).

2.  **Mise à Jour et Diffusion par le Backend :** Le backend met à jour la base de données (PostgreSQL), puis publie un événement de notification (ex: `campaignUpdate`) sur un canal de messagerie interne (Redis).

3.  **Écoute Continue via WebSocket :** Le backend possède également un serveur WebSocket auquel tous les clients (navigateurs) sont connectés en permanence. Ce serveur est abonné aux canaux de messagerie Redis.

4.  **Transmission en Temps Réel :** Lorsque le serveur WebSocket reçoit un événement de Redis, il le diffuse instantanément à tous les clients connectés concernés (ex: tous les superviseurs).

5.  **Mise à Jour Ciblée du Frontend :** Le client React reçoit l'événement WebSocket. Au lieu de recharger la page, il met à jour de manière ciblée son état interne (géré par `Zustand`).

6.  **Réactivité de l'Interface :** Grâce à la réactivité de React, seuls les composants visuels qui dépendent de cette donnée spécifique sont automatiquement rafraîchis.

Cette approche garantit une **cohérence des données** entre tous les utilisateurs et une **expérience temps réel** authentique, essentielle pour les tableaux de bord de supervision.

### 1.2 Schéma d'Architecture Multi-Site

L'architecture est conçue pour une **centralisation complète**, même dans un environnement multi-site. Toute l'intelligence (logique d'appel, données, configuration) réside sur un serveur central, tandis que les sites distants agissent comme de simples points d'accès.

```
+-----------------------------------------------------+
|                 SERVEUR CENTRAL (Data Center)         |
|                                                     |
|  +----------------+   +----------------+   +-----------+
|  |  Backend API   |   |  Base de       |   | Moteur    |
|  |  (Node.js / WS)|<->|  Données (PGSQL)|<->| Téléphonie|
|  |                |   |                |   | (Asterisk)|
|  +----------------+   +----------------+   +-----------+
|                                                     |
+--------------------------^--------------------------+
                           |
                 +-------------------+
                 |   Réseau Privé    |
                 |   (VPN / MPLS)    |
                 +-------------------+
                           |
           +---------------+---------------+
           |                               |
+----------------------+         +----------------------+
|      SITE A (Paris)      |         |      SITE B (Lyon)       |
|                          |         |                          |
|  +-------------------+   |         |  +-------------------+   |
|  | Agent 1 (Softphone) |<--VPN----|------>| Agent 3 (Softphone) |<--|
|  +-------------------+   |         |  +-------------------+   |
|                          |         |                          |
|  +-------------------+   |         |  +-------------------+   |
|  | Agent 2 (Softphone) |<--VPN----|------>| Agent 4 (Softphone) |<--|
|  +-------------------+   |         |  +-------------------+   |
|          ^               |         |          ^               |
|          |                 |         |          |                 |
|          v               |         |          v               |
|  +-------------------+   |         |  +-------------------+   |
|  | Yeastar PBX       |<----Opérateurs---->| Yeastar PBX       |   |
|  | (Passerelle SIP)  |   |    Télécom   |  | (Passerelle SIP)  |   |
|  +-------------------+   |         |  +-------------------+   |
|                          |         |                          |
+--------------------------+         +--------------------------+

```

#### Fonctionnement du flux d'appel :

1.  **Centralisation Totale :** Toute l'intelligence (utilisateurs, campagnes, SVI, files d'attente) est gérée par le serveur central.
2.  **Connexion des Agents :** Les agents, où qu'ils soient, connectent leur softphone **directement au serveur Asterisk central** via le VPN. Ils ne sont pas enregistrés sur le PBX local.
3.  **Rôle du Yeastar Local :** Le PBX Yeastar de chaque site est configuré comme une simple **passerelle SIP** (Trunk). Son unique rôle est de faire le pont entre le réseau téléphonique public local et le serveur Asterisk central via le VPN.
4.  **Flux d'un Appel Sortant :**
    *   Un agent à Paris clique pour appeler. La commande est envoyée au backend, qui ordonne à Asterisk de lancer l'appel.
    *   Asterisk sait que l'agent est du site de Paris. Il envoie l'appel au **Trunk SIP du Yeastar de Paris**.
    *   Le Yeastar de Paris relaie l'appel à l'opérateur télécom local.
5.  **Flux d'un Appel Entrant :**
    *   Un client appelle un numéro du site de Lyon. L'appel arrive chez l'opérateur local, qui le route vers le Yeastar de Lyon.
    *   Le Yeastar de Lyon a une règle unique : **transférer immédiatement tout appel entrant vers le Trunk du serveur Asterisk central**.
    *   Asterisk central reçoit l'appel, exécute la logique du SVI, et le distribue à l'agent compétent, où qu'il soit.

---

## 2. Feuille de Route du Projet

Ce document suit l'avancement du développement. L'application a atteint la fin de son cycle de développement initial et est désormais considérée comme **fonctionnellement complète**.

### ✅ Phase 1 : Connexion Frontend & Backend (Priorité Critique) - TERMINÉE

**Objectif :** Rendre l'application entièrement fonctionnelle en la connectant à sa base de données via une API backend et supprimer toute dépendance aux données fictives.

-   **[✅] API Backend Complète :** Tous les endpoints REST nécessaires pour les opérations CRUD sur l'ensemble des modules (utilisateurs, campagnes, scripts, etc.) sont développés et sécurisés.
-   **[✅] Connexion du Frontend :** L'application charge toutes les données initiales via l'endpoint `/api/application-data` au démarrage.
-   **[✅] Persistance des Données :** Toutes les actions de l'interface (sauvegarder, modifier, supprimer) effectuent des appels à l'API backend et les changements sont persistés dans la base de données PostgreSQL.
-   **[✅] Suppression des Données Fictives :** Le fichier `data/mockData.ts` a été définitivement supprimé.

### ✅ Phase 2 : Temps Réel & Supervision (Haute Priorité) - TERMINÉE

**Objectif :** Remplacer les simulations par une supervision en temps réel authentique, aboutissant à l'architecture "Zéro Rafraîchissement".

-   **[✅] Serveur WebSocket Backend :** Un serveur `ws` est intégré au backend Node.js, gérant l'authentification et la diffusion ciblée des événements.
-   **[✅] Pont AMI vers WebSocket :** Le service `amiListener.ts` se connecte à l'Asterisk Manager Interface, écoute les événements de téléphonie en temps réel (appels, statuts agents), et les publie sur Redis.
-   **[✅] Intégration Frontend :** Le `SupervisionDashboard.tsx` et l'ensemble de l'application utilisent le `wsClient.ts` pour recevoir les mises à jour en temps réel, remplaçant la simulation `setInterval`.
-   **[✅] Synchronisation Globale :** Toutes les modifications de données via l'API (CRUD) déclenchent un événement qui est diffusé à tous les clients, garantissant une cohérence parfaite et une expérience "Zéro Rafraîchissement" sur toute l'application.

### ✅ Phase 3 : Production & Finalisation (Moyenne Priorité) - TERMINÉE

**Objectif :** Stabiliser, sécuriser et optimiser l'application pour un environnement de production.

-   **[✅] Gestion des Erreurs Centralisée :** Un intercepteur Axios gère globalement les erreurs API (4xx/5xx) et les déconnexions.
-   **[✅] Authentification JWT Robuste :** Le système utilise des `access tokens` (courte durée) et des `refresh tokens` (longue durée, stockés dans des cookies httpOnly) pour une sécurité accrue et une expérience utilisateur fluide.
-   **[✅] Tests End-to-End :** Une suite de tests Cypress a été créée pour valider les flux critiques de l'application (connexion, création, supervision).
-   **[✅] Scripts de Déploiement :** Les scripts (`prod-check.sh`, `apply-asterisk-config.sh`, etc.) sont finalisés pour automatiser et fiabiliser les déploiements.

---

## 3. Prochaines Étapes (Évolution & Maintenance)

Bien que fonctionnellement complète, l'application peut évoluer. Les prochaines étapes potentielles sont :

-   **Phase de Recette (UAT) :** Validation approfondie par les utilisateurs finaux (superviseurs, agents) pour recueillir les retours et ajuster l'ergonomie.
-   **Optimisation des Performances à Grande Échelle :** Pour des déploiements avec des millions de contacts ou des centaines d'agents, des optimisations supplémentaires sur les requêtes de base de données et la pagination des API pourraient être nécessaires.
-   **Ajout de Nouvelles Fonctionnalités :**
    -   Tableaux de bord analytiques plus avancés (Business Intelligence).
    -   Intégrations avec des outils tiers (Salesforce, Zendesk, etc.).
    -   Module de quality monitoring (évaluation des appels).
-   **Maintenance Continue :** Mises à jour de sécurité, corrections de bugs mineurs et support aux utilisateurs.
