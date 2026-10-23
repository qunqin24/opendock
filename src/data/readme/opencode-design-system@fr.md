# OpenCode Design System

[![Version npm](https://img.shields.io/npm/v/opencode-design-system)](https://www.npmjs.com/package/opencode-design-system)
[![Licence MIT](https://img.shields.io/badge/license-MIT-blue.svg)](https://github.com/BraveOtter/opencode-design-system/blob/master/LICENSE)
[![OpenCode v2](https://img.shields.io/badge/OpenCode-v2-6f42c1)](https://opencode.ai/v2/docs/)

**Un plugin collaboratif pour OpenCode v2, conçu pour créer et faire évoluer des systèmes de design portables, indépendants des frameworks et que les agents IA peuvent réellement suivre.**

[English](https://github.com/BraveOtter/opencode-design-system/blob/master/README.md) · [Español](https://github.com/BraveOtter/opencode-design-system/blob/master/README.es.md) · [Português (Brasil)](https://github.com/BraveOtter/opencode-design-system/blob/master/README.pt-BR.md) · [Deutsch](https://github.com/BraveOtter/opencode-design-system/blob/master/README.de.md) · [Français](https://github.com/BraveOtter/opencode-design-system/blob/master/README.fr.md) · [Italiano](https://github.com/BraveOtter/opencode-design-system/blob/master/README.it.md) · [简体中文](https://github.com/BraveOtter/opencode-design-system/blob/master/README.zh-CN.md) · [日本語](https://github.com/BraveOtter/opencode-design-system/blob/master/README.ja.md)

> **Avis :** Il s’agit d’un projet communautaire indépendant. Il n’est pas développé par l’équipe OpenCode et n’est affilié à OpenCode d’aucune manière.

Le système de design devient la mémoire visuelle durable d’un projet : des fichiers **Markdown et JSON** structurés pour les tokens sémantiques, les préférences explicites, les décisions de design, les composants, les patterns et les spécifications d’écran. Un aperçu HTML interactif est généré à partir de ces sources ; il ne constitue jamais une deuxième source de vérité.

## Pourquoi ce plugin ?

- **Commencez par une conversation, pas par un questionnaire.** Clarifiez uniquement les choix importants d’identité visuelle qui restent incertains et consignez explicitement les préférences de la personne.
- **Documentez l’existant.** Une analyse limitée et en lecture seule aide à formaliser une interface existante sans la remanier en silence.
- **Fournissez le contexte pertinent aux agents.** Le chargement progressif apporte les tokens, composants, patterns et consignes utiles à une tâche d’interface, au lieu d’inclure tout le système dans chaque prompt.
- **Faites évoluer le système de manière cohérente.** Suivez les décisions, les dépendances des tokens sémantiques, les composants et patterns concernés, le statut et les changements de version du système de design.
- **Évitez la dépendance à un framework.** Le format faisant autorité est Markdown et JSON, et non React, Vue, Tailwind ou un aperçu généré.
- **Protégez les fichiers du projet.** L’analyse et les vérifications sont en lecture seule. La création ne remplace pas un répertoire `design-system/` existant et préserve le contenu de `AGENTS.md` en dehors du bloc géré par le plugin.

## Prérequis

- [OpenCode v2](https://opencode.ai/v2/docs/)
- Node.js **22.19 ou version ultérieure**

## Installation

### Installer le paquet publié sur npm

Installez-le globalement avec la CLI OpenCode :

```sh
opencode plugin add opencode-design-system
```

Pour épingler une version npm précise, remplacez `<version>` par la version souhaitée :

```sh
opencode plugin add opencode-design-system@<version>
```

Vous pouvez aussi le configurer pour un projet dans `opencode.json` ou `opencode.jsonc` :

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": ["opencode-design-system"]
}
```

OpenCode charge les plugins configurés au démarrage. Si le plugin n’apparaît pas, redémarrez OpenCode ou le service OpenCode.

### Installer directement depuis GitHub

Pour installer la dernière version de la branche par défaut :

```sh
opencode plugin add github:BraveOtter/opencode-design-system
```

Pour épingler une version balisée de GitHub, remplacez `<tag>` par le tag souhaité :

```sh
opencode plugin add github:BraveOtter/opencode-design-system#<tag>
```

### Utiliser un checkout local

Clonez le dépôt, installez les dépendances de développement et générez le build :

```sh
npm install
npm run build
```

Indiquez ensuite à OpenCode le répertoire du checkout (adaptez le chemin relatif à votre projet) :

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": ["../opencode-design-system"]
}
```

Le dépôt contient également un point d’entrée local facultatif pour les tests dans `plugins/local/index.js` ; il n’est pas chargé automatiquement et ne fait pas partie du paquet npm.

## Premiers pas

Créez un système à partir d’une direction visuelle :

```text
/design-system Un espace de travail calme et compact, aux verts doux, aux surfaces nettes et sans dégradés.
```

Si le projet possède déjà une interface, demandez d’abord à l’agent de l’analyser. Il expliquera ses observations et vous demandera si vous souhaitez documenter l’identité visuelle existante ou repartir de zéro avant de créer quoi que ce soit :

```text
/design-system Analyse l’interface de cette application et aide-moi à documenter son langage visuel actuel.
```

Pour concevoir un écran sans demander au plugin d’implémenter le code de l’interface :

```text
/design-screen Gestion des utilisateurs avec recherche, filtres, invitations et états vides.
```

Vous pouvez aussi demander une spécification d’écran en langage naturel sans utiliser `/design-screen`. Lorsqu’un manifest existe, le plugin renvoie l’agent vers le `AGENTS.md` du projet et les consignes pertinentes du système de design.

## Commandes

| Commande | Fonction |
| --- | --- |
| `/design-system [idea]` | Créer un système en collaboration ou discuter de la documentation d’une interface existante. |
| `/design-system/update [change]` | Appliquer une modification sémantique versionnée et identifier la documentation dépendante. |
| `/design-system/preview` | Régénérer l’aperçu interactif à partir des fichiers structurés. |
| `/design-system/review` | Ouvrir un espace local à deux volets avec l’aperçu, la conversation OpenCode actuelle et la sélection contextuelle d’éléments. |
| `/design-system/check` | Effectuer une vérification heuristique en lecture seule pour repérer d’éventuels écarts entre les styles de l’interface et les tokens documentés. |
| `/design-screen [screen]` | Enregistrer une spécification d’écran prête à implémenter, sans écrire le code de l’interface de l’application. |

Le plugin enregistre également les outils `design_system_create`, `design_system_read`, `design_system_analyze`, `design_system_update`, `design_system_preview`, `design_system_check` et `design_system_screen_spec`, que l’agent peut utiliser au besoin.

## Fonctionnement

### Une approche prudente pour les produits existants

L’outil `design_system_analyze` lit les sources d’interface et de styles probables, les configurations de frameworks reconnues et les dépendances déclarées. Il synthétise des indices comme les variables CSS, les couleurs, les rayons, les espacements, les points de rupture responsive et les composants candidats. L’analyse est limitée, ignore les répertoires de dépendances et de build, ne suit pas les liens symboliques et ne modifie pas les fichiers lus. Les résultats sont des indices, pas la preuve qu’une différence est une erreur.

L’agent explique les incertitudes et pose des questions avant de normaliser des choix visuels importants ou ambigus. L’analyse n’autorise pas à remanier ou modifier le code de l’application.

### Préserver les fichiers du projet

La création écrit un nouveau répertoire `design-system/` et ajoute ou met à jour uniquement le bloc géré par le plugin dans le `AGENTS.md` à la racine. Si `design-system/` contient déjà des fichiers, la création refuse de les remplacer. Les mises à jour écrivent délibérément dans les artefacts du système de design ; les outils d’analyse et de vérification intégrés ne modifient jamais les fichiers d’interface de l’application.

Les consignes gérées dans `AGENTS.md` sont portables : elles indiquent à OpenCode et aux autres agents de programmation où trouver les sources indépendantes des frameworks et comment ne charger que le nécessaire pour une tâche. Le plugin ne copie aucun agent, commande ou skill dans le projet.

### Une source de vérité portable

Le répertoire généré ressemble généralement à ceci :

```text
design-system/
├── README.md
├── manifest.json
├── tokens.json
├── preferences.json
├── FOUNDATIONS.md
├── AI-GUIDELINES.md
├── DECISIONS.md
├── CHANGELOG.md
├── schema/
├── components/
├── patterns/
├── screens/
├── preview/
│   └── index.html
└── tools/
    └── generate-preview.mjs

AGENTS.md  # Le contenu existant est conservé hors du bloc géré.
```

Le manifest répertorie les thèmes, les versions, les fichiers et les références de tokens déclarées par chaque composant et pattern. Les systèmes commencent en `0.1.0`, avec la version de schéma `1.0.0` ; leur statut de revue est `draft`, `review` ou `stable`.

Les tokens utilisent des chemins sémantiques et peuvent définir plusieurs thèmes :

```json
{
  "$schema": "./schema/tokens.schema.json",
  "schemaVersion": "1.0.0",
  "themes": {
    "light": {
      "color": {
        "surface": { "base": "#f6f8f7", "raised": "#ffffff" },
        "text": { "primary": "#17211f", "secondary": "#65726d" },
        "accent": { "primary": "#276f55" }
      },
      "radius": { "control": "6px", "card": "8px" },
      "spacing": { "sm": "8px", "md": "16px" }
    }
  }
}
```

Le vocabulaire peut s’étendre à la typographie, la mise en page, l’élévation, les animations, les points de rupture, le focus et les états. Les composants décrivent leur objectif, leurs variantes, leurs tokens, leur comportement, leur accessibilité, leur adaptation responsive et leurs relations. Les patterns documentent des compositions utiles, comme les formulaires, la navigation, les filtres, les tableaux et les états vides.

### Des mises à jour pertinentes et versionnées

`/design-system/update` lit le manifest et les documents pertinents avant de modifier le système. Par défaut, la mise à jour d’un token sémantique applique ce chemin à tous les thèmes ; utilisez le préfixe `themes.<name>.` pour ne modifier qu’un thème. La mise à jour consigne sa justification, recherche les dépendances déclarées, actualise la documentation pertinente et régénère l’aperçu.

L’impact sur la version du système de design suit ces règles :

- **PATCH** — corrections compatibles ou modifications de documentation.
- **MINOR** — ajouts compatibles, comme un nouveau token, composant ou pattern.
- **MAJOR** — modifications susceptibles de rompre des contrats de design existants.

Ces versions appartiennent au système de design généré dans le projet, pas au paquet npm du plugin. Par défaut, les systèmes mis à jour repassent à `draft` pour être relus par une personne.

## Skills de design intégrées

Le plugin enregistre en interne trois skills de design adaptées via OpenCode v2. Elles sont utilisées ensemble lors de la création ou de la mise à jour d’un système, du choix des tokens et de la spécification d’écrans : direction visuelle, conception d’interfaces produit et décisions de tokens accessibles. Elles guident l’agent sans remplacer la source de vérité du projet en Markdown et JSON, indépendante des frameworks ; leurs fichiers `SKILL.md` **ne sont pas écrits dans les projets utilisateurs**.

### Personnaliser les skills

L’option `designSkills` permet de désactiver toutes les skills intégrées ou certaines d’entre elles, ou de n’autoriser que des identifiants choisis. Avec un objet, les identifiants omis restent actifs. Utilisez `"designSkills": false` pour désactiver les trois ou un tableau pour n’activer que les identifiants listés. Ajoutez une skill personnelle au niveau global dans `~/.config/opencode/skills/<identifiant-de-votre-skill>/SKILL.md`. Désactivez la skill intégrée correspondante si la vôtre doit la remplacer. Pour modifier une skill intégrée, éditez `skills/<dossier-de-la-skill>/SKILL.md` dans un checkout ou fork local du plugin, puis chargez ce checkout ; conservez le crédit de la source et sa licence. Avis complets : [`THIRD-PARTY-NOTICES.md`](THIRD-PARTY-NOTICES.md).

### Crédits

- **Frontend Design** — Anthropic ; auteurs d’origine Prithvi Rajasekaran et Alexander Bricken. [Source](https://github.com/anthropics/claude-code/tree/main/plugins/frontend-design/skills/frontend-design) · Apache-2.0.
- **Interface Design** — Dammyjay93 (Damola Akinleye). [Source](https://github.com/Dammyjay93/interface-design) · MIT.
- **Design System Auditor** — Community-Access ; copyright © Taylor Arndt. [Source](https://github.com/Community-Access/accessibility-agents/blob/main/skills/design-system-auditor/SKILL.md) · MIT.

## Aperçu interactif

`design-system/preview/index.html` est généré à partir du manifest, des tokens et des spécifications de composants et de patterns. Il comprend des exemples de tokens et de composants, le changement de thème lorsqu’il y en a plusieurs et des exemples interactifs. Il prend en charge le focus clavier visible et `prefers-reduced-motion`.

Utilisez `/design-system/review` pour ouvrir un espace de revue local avec l’aperçu interactif à gauche et la même session OpenCode à droite. Les messages envoyés depuis le panneau de droite sont transmis à cette session ; l’aperçu généré est actualisé à la fin de chaque tour. Activez **Sélectionner un élément** pour choisir des composants, patterns ou exemples de tokens sémantiques documentés et joindre jusqu’à huit références vérifiées à un message. Les références utilisent les noms du manifest, les chemins sources et les chemins de tokens — pas des sélecteurs DOM — et sont vérifiées à nouveau avant l’envoi afin qu’une sélection obsolète ne cible pas silencieusement un autre élément. Le fichier HTML autonome reste disponible et fonctionne sans cet espace. Le serveur de revue écoute sur un port aléatoire de `127.0.0.1`, s’arrête au déchargement du plugin et n’expose pas les identifiants OpenCode au navigateur. Par défaut, la commande publie un lien dans la conversation au lieu d’ouvrir automatiquement un navigateur.

Pour ouvrir automatiquement le navigateur système lors de l’exécution de la commande de revue, configurez cette option du plugin :

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": [
    {
      "package": "opencode-design-system",
      "options": { "autoOpenReview": true }
    }
  ]
}
```

Régénérez l’aperçu dans OpenCode avec `/design-system/preview` ou, sans le plugin, depuis la racine du projet :

```sh
node design-system/tools/generate-preview.mjs
```

Le moteur de rendu autonome n’a aucune dépendance externe. Modifiez les fichiers structurés Markdown et JSON — pas le HTML généré — pour changer le système.

## Développement et tests

```sh
npm install
npm run typecheck
npm test
npm run build
```

Les tests couvrent un flux intégré dans un projet temporaire : analyse en lecture seule, création et préservation des fichiers utilisateur, mises à jour du bloc géré de `AGENTS.md`, spécifications d’écran, mises à jour de tokens entre thèmes, aperçus, espace de revue local authentifié et références d’éléments vérifiées, vérifications et sécurité des chemins.

## Publier une version

Le workflow GitHub Actions `Publish to npm` publie lorsqu’un tag `vX.Y.Z` est poussé, après la réussite des vérifications et la confirmation que le tag correspond à la version dans `package.json`. Avant la première publication, configurez npm Trusted Publishing pour le dépôt `BraveOtter/opencode-design-system` et le workflow `publish.yml`, et autorisez l’action directe `npm publish`. Le workflow utilise OIDC : aucun jeton de publication npm n’a besoin d’être stocké dans GitHub ; npm génère également automatiquement une attestation de provenance pour ce dépôt public.

Pour incrémenter la version du paquet et pousser le commit et le tag :

```sh
npm version patch # ou minor / major
git push --follow-tags
```

## Documentation

- [Guide des plugins OpenCode v2](https://opencode.ai/v2/docs/build/plugins)
- [Configuration des plugins OpenCode](https://opencode.ai/v2/docs/plugins)
- [Commandes OpenCode](https://opencode.ai/v2/docs/commands)
- [Instructions OpenCode et `AGENTS.md`](https://opencode.ai/v2/docs/instructions)
- [Référence de l’API des plugins](https://opencode.ai/v2/docs/api)
- [Paquet npm](https://www.npmjs.com/package/opencode-design-system)
- [Signaler un problème](https://github.com/BraveOtter/opencode-design-system/issues)

## Licence

Ce projet est distribué sous la [licence MIT](https://github.com/BraveOtter/opencode-design-system/blob/master/LICENSE).
