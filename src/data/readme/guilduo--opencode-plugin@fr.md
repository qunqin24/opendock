[English](README.md) · [日本語](README.jp.md) · [Español](README.es.md) · [Português (Brasil)](README.pt-BR.md) · [Français](README.fr.md) · [Deutsch](README.de.md) · [한국어](README.ko.md) · [简体中文](README.zh-Hans.md) · [Русский](README.ru.md)

# Guilduo

> **Formez l'équipe la plus forte avec l'IA à vos côtés.**

**Les humains ne sont pas les seuls à pouvoir confier du travail.**

Guilduo est une **Human × AI Work Platform** où les personnes et les Agents IA peuvent confier, prendre en charge, transmettre et réviser du travail dans le même workspace. La plateforme traite le travail réel comme des Quests et le fait avancer grâce à des Relays, des Evidence et des Decisions partagés.

## Liens publics

### Pour commencer

- Découvrir Guilduo : [Site officiel](https://guilduo.com/)
- Travailler dans Guilduo : [Guilduo / Relay Forge](https://app.guilduo.com/)
- Connecter un client IA : `https://mcp.guilduo.com/mcp`

| Point d'entrée | Lien | Utilité |
|---|---|---|
| LP officielle | [Guilduo Landing Page](https://guilduo.com/) | Découvrir les principes, les fonctionnalités et le flux de travail de Guilduo |
| Web App officielle | [Guilduo / Relay Forge](https://app.guilduo.com/) | Ouvrir l'espace public Command et Quest en bêta |

`/next/relay-forge/` est un chemin de déploiement à l'intérieur d'un Appwrite Site, et non l'URL officielle de la Web App. Les URL de déploiement générées par Appwrite Sites et l'ancienne URL `workers.dev` sont conservées pour la validation, la compatibilité et le rollback. Le chemin canonique pour les nouveaux utilisateurs est le domaine Guilduo ci-dessus. La version candidate actuellement déployée est `0.6.0-beta.8`, gérée séparément des releases taguées.

### Rôle de chaque URL publique

| Rôle | URL canonique | État |
|---|---|---|
| Site officiel / LP | `https://guilduo.com` | canonical root |
| Web App | `https://app.guilduo.com` | Appwrite Site Custom Domain |
| MCP | `https://mcp.guilduo.com/mcp` | Endpoint Remote HTTP MCP canonique |
| API Appwrite | `https://api.guilduo.com/v1` | Endpoint officiel de l'API Appwrite (origin : `https://api.guilduo.com`) |
| Documentation (JA / EN) | `https://guilduo.com/docs/` / `https://guilduo.com/docs/en/` | Docs statiques ; publiés |
| Documentation subdomain | `https://docs.guilduo.com` | Reserved / Future |

`https://www.guilduo.com` est réservé aux redirections vers `https://guilduo.com`. L'ancienne URL `workers.dev` reste disponible pour les connexions compatibles et le rollback. `api.guilduo.com` sert à l'API Appwrite et est utilisée par le client Appwrite du navigateur ainsi que par l'`APPWRITE_ENDPOINT` du Worker ; ce n'est pas l'origin public des routes REST `/v1` ou MCP `/mcp` du Worker.

Consultez [BRAND.md](BRAND.md) pour le langage et les expressions de marque approuvés.

Guilduo est un projet indépendant, sans affiliation, approbation ni lien de remplacement avec Habitica. Les noms de produits et les marques commerciales appartiennent à leurs propriétaires respectifs.

## Périmètre de la bêta publique

| Domaine | État |
|---|---|
| Web / PWA | Fonction centrale de la bêta publique |
| Connexion Google Appwrite et stockage invité sur l'appareil | Disponible (authentification configurée) |
| CRUD des Quests, archivage, Quest Tree et combat MP | Disponible |
| Agent Registry, liaison des clients MCP et Handoff | Disponible |
| REST API 2.7.0 / MCP `/mcp` | 54 tools / OpenAPI 52 paths |
| `app.guilduo.com/` Guilduo / Relay Forge | Bêta publique de la Web App officielle (Desktop / Mobile). `/next/relay-forge/` est un chemin interne de déploiement et de compatibilité |
| 9 langues | Disponibles dans l'UI principale ; l'UI bêta couvre la navigation principale |
| Google Calendar, Google Tasks, Notion et Toggl | **Early Access / préparation OAuth** |
| Unity Battle Lab, Android/iOS natif et exécution autonome des Agents | En attente |

La version de l'application est la candidate `0.6.0-beta.8`, REST/MCP est en `2.7.0` et le Schema de données est en `7`. L'OAuth des Providers externes est désactivé par défaut afin de donner la priorité à la sécurité de la bêta publique et à la préparation de la revue. Les comptes et l'état utilisateur sont en cours de migration vers Appwrite.

## Principes de conception

1. **Les personnes gardent l'objectif et la décision finale** : les suggestions de l'IA restent vérifiables et ne sont jamais terminées ou publiées sans approbation.
2. **Séparer le travail des récompenses** : gagnez des MP grâce aux Quests, puis choisissez quand combattre et quelle commande utiliser.
3. **Lire, prévisualiser, exécuter** : le dry-run est la valeur par défaut pour les écritures, les mises à jour groupées et les Handoffs.
4. **Archiver avant de supprimer** : conservez l'historique, les récompenses et les liens externes ; archivez les Quests qui ne sont plus nécessaires.
5. **Mettre les humains et l'IA dans la même party** : Astra est un personnage compagnon, les Agents représentent des rôles et les utilisateurs restent séparés comme comptes.
6. **Ne pas enfermer les données** : REST, MCP, CLI et Web UI utilisent le même Worker et la même logique métier.

## Écrans et données

- `/` : L'UI actuelle. Avant la connexion, les données sont stockées sur l'appareil ; après la connexion, elles sont synchronisées avec Appwrite via le Worker.
- `/lp/` et `/lp/en/` : La Landing Page officielle de Guilduo en japonais et en anglais. Les URL de CTA proviennent de Runtime Config et sont désactivées en toute sécurité lorsqu'elles ne sont pas définies.
- `/interaction-lab/` : La route source Next pour le développement local et les captures.
- `/next/` et `/next/relay-forge/` : Les routes d'implémentation et de compatibilité sur Appwrite Sites. L'entrée officielle pour les nouveaux utilisateurs est `https://app.guilduo.com/`, qui redirige en interne vers l'entrée Relay Forge via un rewrite fondé sur l'hôte. Sur ordinateur, seule la liste centrale Today/Tree défile ; sur mobile, toute la page défile.
- `https://guilduo.com/` mène à `/lp/` sur le même Appwrite Site, tandis que `https://app.guilduo.com/` mène à `/next/relay-forge/`. Consultez [`docs/appwrite-site-routing.md`](docs/appwrite-site-routing.md) pour la configuration réelle du DNS et des rewrites.
- La source de vérité visuelle est [`DESIGN.md`](DESIGN.md), la source de vérité technique est [`PROJECT_SPEC.md`](PROJECT_SPEC.md) et le design des différences propres à Next est [`interaction-lab/DESIGN.md`](interaction-lab/DESIGN.md). Consultez [`design/TOKENS.json`](design/TOKENS.json) pour les tokens numériques, [`design/COMPONENTS.md`](design/COMPONENTS.md) pour les composants et [`design/SCREENS.md`](design/SCREENS.md) pour la composition des écrans.
- Lors d'une reconnexion, l'état Appwrite Auth est restauré et les données synchronisées précédemment restent disponibles en lecture seule lorsqu'elles existent. Les listes de Quests ne sont pas effacées pendant la reconnexion ; l'UI affiche un skeleton, un bouton de reconnexion et un verrou d'écriture.
- L'état d'achèvement des Quests et l'état des Agent Handoffs sont gérés séparément. Les To Dos ponctuelles sont archivées une fois terminées ; les tâches quotidiennes, habitudes et To Dos récurrentes reviennent à leur prochaine occurrence.
- Les profils publics n'exposent que le nom d'affichage, `@handle`, la bio, l'avatar et le niveau. Le contenu des Quests, les notes, l'UID et les informations OAuth restent privés.

## Architecture Appwrite / Worker

| Couche | Responsabilité |
|---|---|
| Appwrite Sites | Diffusion Web/PWA |
| Appwrite Auth / TablesDB | Connexion Google et état des Quests et du personnage par utilisateur |
| Cloudflare Worker | REST, OAuth, MCP, Webhooks et frontière des extensions |
| Cloudflare D1 | Agent Registry, connexions MCP, profils et métadonnées d'intégration |
| Cloudflare KV | État OAuth, état de courte durée et clients MCP |

Les tokens, API keys et secrets ne sont jamais stockés dans des lignes Appwrite publiques ni dans le Local Storage du navigateur. Les API Keys Appwrite résident uniquement dans les Worker Secrets. Agent Registry ne stocke pas non plus les API keys de modèles, les mots de passe ou les URL d'exécution.

## MCP

L'endpoint de connexion stable est :

```text
https://mcp.guilduo.com/mcp
```

MCP `2.7.0` expose 54 tools couvrant les Quests, l'archivage, Quest Tree, Agent Handoff, Agent Registry, les profils, les parties, le combat et le contrat Toggl Focus. `/mcp-next` est une voie de validation pour le nouveau SDK et ajoute Resources et Workflow Prompts. Utilisez `/mcp` pour l'usage normal afin de préserver la compatibilité avec les clients existants.

Pendant la migration, l'ancien `/mcp` de `workers.dev` reste disponible pour la compatibilité, mais les nouvelles inscriptions et reconnexions doivent utiliser `mcp.guilduo.com/mcp` ci-dessus.

### Enregistrer une nouvelle connexion MCP avec OAuth

Cette procédure s'adresse aux clients comme ChatGPT, Codex, Claude et OpenClaw qui prennent en charge Remote HTTP MCP et OAuth. Pour une première connexion, suivez les étapes 1–6 dans l'ordre. Pour vérifier une connexion existante, commencez à l'étape 7.

1. Si une ancienne connexion Guilduo / QuestForge, antérieure à la migration, est encore présente dans le client, déconnectez-la ou supprimez-la d'abord. Les anciens OAuth Grants et Tokens ne peuvent pas être réutilisés.
2. Ouvrez les paramètres MCP ou Connector du client et enregistrez une connexion nommée `Guilduo` de type Remote HTTP MCP.
3. Définissez l'URL stable `https://mcp.guilduo.com/mcp`. N'utilisez pas `/mcp-next` pour les tests de connexion ordinaires.
4. Lorsque le client propose un choix d'authentification, sélectionnez `OAuth`. N'entrez pas d'API Key, de Bearer Token ni de Client Secret.
5. Lorsque le navigateur affiche « Connect to Guilduo », connectez-vous avec le même compte Appwrite que dans la version Web de Guilduo, vérifiez les permissions demandées et acceptez-les.
6. Revenez au client MCP et confirmez qu'il indique que la connexion est établie ou disponible. À ce stade, OAuth est terminé, mais aucun Agent n'est peut-être encore lié.
7. Ouvrez Connections dans [Guilduo / Relay Forge](https://app.guilduo.com/) et liez le Client connecté à l'Agent souhaité. S'il n'existe aucun Agent, créez-en un dans Party > « Register Agent ».
8. Redémarrez ou rechargez le client MCP et exécutez le test de connexion ci-dessous.

Pour les clients qui ajoutent Remote MCP via un fichier de configuration, utilisez cet exemple :

```json
{
  "mcpServers": {
    "questforge": {
      "type": "http",
      "url": "https://mcp.guilduo.com/mcp",
      "authentication": "oauth"
    }
  }
}
```

Les clients MCP découvrent automatiquement les métadonnées OAuth. N'utilisez les URL suivantes que lorsqu'une vérification manuelle est nécessaire.

```text
Authorization Server Metadata
https://mcp.guilduo.com/.well-known/oauth-authorization-server

Protected Resource Metadata
https://mcp.guilduo.com/.well-known/oauth-protected-resource/mcp
```

### Vérifier l'Agent Context dans le test de connexion

Vérifiez la séquence suivante depuis le client :

1. L'initialisation MCP réussit.
2. `tools/list` renvoie 54 tools.
3. `list_registered_agents` renvoie uniquement votre propre Agent.
4. Appelez `get_current_agent_context`.

Avant de lier un Agent, la réponse normale est `linked: false` avec `agent: null`. Après la liaison dans Connections, elle devient `linked: true` et renvoie `agent` et `effectiveScopes`. Cela confirme que l'authentification OAuth, la séparation des UID et la liaison de l'Agent fonctionnent via la même connexion.

Exemple de demande de test :

```text
Guilduo MCPのtools/listを確認し、get_current_agent_contextを実行してください。
Agentがリンク済みか、Agent ID、Role、effectiveScopesだけを報告してください。
Token、Client ID、UIDは表示しないでください。
```

### Résoudre les erreurs 401 et les Agents non liés

| État | Réponse |
|---|---|
| 401 juste après la connexion | D'anciennes informations OAuth sont encore présentes. Supprimez la connexion, enregistrez à nouveau la même URL `/mcp` et réautorisez-la. |
| Impossible de revenir de l'écran OAuth | Vérifiez que vous êtes connecté avec le même compte Appwrite que dans la version Web de Guilduo. Vérifiez également les extensions susceptibles de bloquer le callback vers le client. |
| `linked: false` | OAuth a réussi. Liez le Client à un Agent dans Relay Forge Connections. |
| Erreur de permission `agents:read` | Réautorisez la connexion et confirmez la permission de lecture des Agents sur l'écran de consentement. Les paramètres de l'Agent ne peuvent pas ajouter de permissions OAuth. |
| La liaison de l'Agent n'apparaît pas | Rechargez le client MCP et exécutez à nouveau `get_current_agent_context`. |

Ne collez pas de Tokens, d'API Keys ou d'UID complets dans les paramètres de connexion ni dans les logs. Après l'autorisation OAuth, les Tokens sont gérés par le client MCP et Cloudflare KV.

### Clients IA

- ChatGPT / Codex : enregistrez l'URL de production `/mcp` ci-dessus dans Remote MCP App ou le mode développeur.
- Claude : ajoutez OAuth Remote MCP depuis Settings > Connectors.
- Gemini CLI : `gemini mcp add --transport http questforge https://mcp.guilduo.com/mcp`
- GitHub Copilot CLI : `copilot mcp add --transport http questforge https://mcp.guilduo.com/mcp`
- OpenClaw / Hermes : utilisez le même Remote HTTP MCP dans la prochaine recette de connexion.

Après l'inscription, créez ou modifiez les Agents dans **Party** de Relay Forge et liez les clients MCP autorisés à un Agent dans **Connections**. Un Agent ne peut pas augmenter les permissions d'un client MCP.

## CLI

La CLI a un rôle distinct de MCP. MCP sert à découvrir et approuver les outils IA ; la CLI sert aux opérations REST/JSON effectuées par les personnes et la CI.

```bash
npm run cli -- doctor --json
npm run cli -- quests list --view today --json
npm run cli -- quests add --title "公開前チェック" --due 2026-08-20 --json
npm run cli -- quests add --title "公開前チェック" --execute --json
npm run cli -- quests complete quest-id --execute --json
npm run cli -- agents list --json
npm run cli -- handoff quest-id review_required --expected-state working --execute --json
npm run cli -- mcp-config --json
```

Les écritures renvoient uniquement un dry-run ou un plan d'exécution si `--execute` n'est pas fourni. L'authentification utilise `QUESTFORGE_TOKEN` ou `--token-stdin`, et les tokens ne sont jamais écrits dans les logs. Les utilisateurs de production utilisent OAuth plutôt qu'une API key fixe.

## Skill / OpenAI Plugin / MCP App

- Skill officiel : [`skills/guilduo-workflows/SKILL.md`](skills/guilduo-workflows/SKILL.md)
- Package de préparation OpenAI Plugin : [`plugins/questforge/`](plugins/questforge/)
- Modèle d'enregistrement MCP App : [`plugins/questforge/.app.json.example`](plugins/questforge/.app.json.example)
- Checklist de soumission : [`plugins/questforge/openai-submission.json`](plugins/questforge/openai-submission.json)

Le Skill enseigne à l'IA la séquence lire, faire un dry-run, confirmer, exécuter et retourner une revue. La revue officielle OpenAI n'est pas terminée automatiquement. Après vérification de l'acceptation avec de vrais comptes, de la confidentialité et des parcours de suppression de compte dans la bêta publique, un opérateur soumet la demande depuis le Dashboard.

## 9 langues

Guilduo prend en charge le japonais, l'anglais, l'espagnol, le portugais brésilien, le français, l'allemand, le coréen, le chinois simplifié et le russe. Les paramètres de langue sont stockés par appareil et ne font pas partie de la synchronisation cloud. Les dates, les nombres et l'ordre de tri utilisent l'API Intl.

## Feuille de route des services externes

La priorité actuelle est d'établir les contrats et une présentation sûre ; le Provider OAuth reste en pause dans le cadre de l'Early Access.

1. Google Calendar : créneaux de disponibilité en lecture seule
2. Google Tasks : synchronisation bidirectionnelle sans suppression
3. Toggl Track : suivi du temps, estimations et conversion en MP
4. Notion : export des journaux quotidiens
5. Todoist, Discord / Slack : synchronisation et notifications
6. OpenClaw, Hermes Agent : recettes de connexion et réutilisation des Skills

La synchronisation initiale exige une prévisualisation et Guilduo ne supprime jamais automatiquement les données externes. Les Provider Secrets résident uniquement dans les Worker Secrets.

## Performances et télémétrie

Les objectifs utilisent un appareil de classe Pixel 9 : LCP inférieur ou égal à 2,5 secondes, INP inférieur ou égal à 200 ms, CLS inférieur ou égal à 0,1 et JavaScript initial compressé inférieur ou égal à 250 KB. La télémétrie anonyme ne concerne que les utilisateurs ayant donné un consentement explicite ; aucun contenu de Quest, aucune note, adresse e-mail, UID, token ou contenu externe n'est envoyé. Les événements autorisés implémentés sont Web Vitals, erreurs JavaScript, résultats de synchronisation, première réussite de Quest, connexion MCP et attribution d'Agent. Rien n'est envoyé après un refus ou un retrait du consentement. Avant le lancement public, un administrateur doit configurer `TELEMETRY_ENDPOINT` et la migration D1 0006.

## Développement local

Les prérequis sont Node.js 22+ et Wrangler. Gérez les ressources Appwrite via Appwrite Console ou MCP.

```bash
npm install
cp appwrite-config.example.js appwrite-config.js
cp runtime-config.example.js runtime-config.js
cp wrangler.example.jsonc wrangler.jsonc
npm run dev
```

Utilisez `Copy-Item` dans PowerShell. Les principales commandes sont :

```bash
npm run check
npm run typecheck
npm test
npm run build
npm run api:generate
npm run worker:dev
```

Pendant le développement TypeScript, les types du runtime Worker sont générés depuis la configuration Wrangler. `npm run typecheck` combine la génération des types, les contrôles de cohérence de la sortie générée, les contrôles de `any` explicite et de `@ts-nocheck`, ainsi que les contrôles stricts pour browser, Worker, Node et le prototype de combat. La transformation Vite et le contrôle des types sont séparés, tandis que les contrats API/MCP sont maintenus par des tests dédiés.

Le workflow des tags `v*` vérifie la cohérence de la version du paquet, des notes de release et du fait que le commit tagué soit un ancêtre de `main`, puis publie une Release du code source sur GitHub après validation des contrôles CI, types, tests, build et preview. Il n'utilise aucun secret de déploiement et ne lance automatiquement ni migration de production ni déploiement de Site ou de Worker. Le déploiement en production est distinct et passe par les workflows manuels existants `.github/workflows/deploy-appwrite-site.yml` et `.github/workflows/deploy-appwrite-worker.yml`, en conservant la protection de l'environnement `production` et les contrôles des caches conservés. Le runtime du Worker en production contient encore des correctifs déployés directement qui ne sont pas intégrés au code source public ; ne lancez pas d'abord le workflow générique de déploiement du Worker. La Release du code source du produit principal `v0.6.0-beta.8` et les extensions hôtes `beta.12` sont versionnées séparément ; Guilduo reste en bêta publique. Consultez [`RELEASE_SETUP.md`](RELEASE_SETUP.md).

## Documentation

- [Source de vérité du design visuel](DESIGN.md)
- [Spécification technique](PROJECT_SPEC.md)
- [Design tokens](design/TOKENS.json)
- [Spécification des composants](design/COMPONENTS.md)
- [Plans des écrans](design/SCREENS.md)
- [Manifeste des assets](design/ASSET_MANIFEST.md)
- [Références dorées](design/reference/README.md)
- [Feuille de route de la bêta publique](ROADMAP.md)
- [Guide des URL publiques](docs/public-urls.md)
- [Configuration API / MCP / OAuth](API_MCP_SETUP.md)
- [Configuration des releases taguées](RELEASE_SETUP.md)
- [Guilduo E2 brand rollout](docs/brand-rollout.md)
- [Confidentialité](PRIVACY.md)
- [Conditions](TERMS.md)
- [Sécurité](SECURITY.md)
- [Contribuer](CONTRIBUTING.md)
- [Assets](ASSETS.md)
- [Licence](LICENSE)

## Licence

Guilduo est distribué sous GNU AGPL-3.0-only. Si vous fournissez une version modifiée sur un réseau, respectez les exigences de mise à disposition du code source prévues par cette licence.
