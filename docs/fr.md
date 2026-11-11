# Gradium

Cette intégration fait parler Gladys avec les voix de
[Gradium](https://gradium.ai), un service de synthèse vocale aux voix
naturelles et expressives, en français, anglais, allemand, espagnol et
portugais.

Une fois choisie comme voix de votre instance, Gradium prononce :

- l'action de scène **« jouer une notification »**, sur vos enceintes ;
- les réponses de l'**assistant vocal**.

Gradium est un service cloud : les textes à prononcer sont envoyés à Gradium,
et chaque synthèse consomme des crédits de votre compte Gradium.

## Prérequis

- Gladys Assistant **5.3.0** ou plus récent.
- Un compte Gradium et une clé d'API. L'offre gratuite suffit pour essayer.

## Configuration

1. Connectez-vous à [Gradium Studio](https://gradium.ai), ouvrez la page
   **API keys** et créez une clé. Copiez-la : elle n'est affichée qu'une fois.
2. Dans Gladys, ouvrez l'onglet **Configuration** de l'intégration, collez la
   clé dans **Clé d'API** et enregistrez.
3. Appuyez sur **Tester la connexion** : le message affiche vos crédits
   restants.
4. Ouvrez la page **Intelligence artificielle** de Gladys et sélectionnez
   **Gradium** dans la carte **Voix**. Tant que ce n'est pas fait, Gladys
   garde sa voix précédente.

## Choisir les voix

Gradium désigne une voix par un court identifiant, comme `YTpq7expH9539ERJ`.

- Appuyez sur **Lister les voix** pour afficher les voix du catalogue Gradium
  et vos propres voix (clonées ou créées dans Gradium Studio), avec leur
  langue et leur identifiant. Gradium Studio permet aussi d'écouter chaque
  voix et de copier son identifiant.
- La **Voix par défaut** sert dès que la langue n'a pas de voix dédiée.
- **Voix française**, **Voix anglaise**, **Voix allemande**, **Voix
  espagnole** et **Voix portugaise** sont facultatives. Gladys parle dans la
  langue de l'utilisateur qui a fait la demande : renseignez la voix d'une
  langue pour l'utiliser dans cette langue.

Une voix parle mieux dans sa propre langue : si votre foyer parle français,
mettez une voix française dans **Voix française** (ou dans **Voix par
défaut**).

## Autres réglages

- **Région** : laissez _Automatique_, sauf si vous voulez que vos requêtes
  soient traitées uniquement en Europe ou uniquement aux États-Unis.
- **Rythme d'élocution** : `0` est le rythme naturel de la voix. Une valeur
  négative (jusqu'à `-4`) parle plus vite, une valeur positive (jusqu'à `4`)
  plus lentement.
- **Format audio** : le _WAV_ est lu par toutes les enceintes. L'_Opus_ est
  bien plus léger et convient aux longs textes, mais certaines enceintes, dont
  Sonos, ne savent pas le lire.

## Limites

- Gladys envoie au plus 2 000 caractères par synthèse et accepte un extrait de
  5 Mo. En WAV, un extrait de plus de 50 secondes environ est automatiquement
  enregistré à une fréquence d'échantillonnage plus basse pour tenir ; la voix
  reste claire.
- Une synthèse doit aboutir en 30 secondes.
- Gradium propose aussi la reconnaissance vocale, mais Gladys n'a pas encore
  de type d'intégration pour elle : cette intégration ne fait que parler.

## Dépannage

- **« Gradium a refusé la clé d'API »** : la clé est fausse ou a été révoquée.
  Créez-en une nouvelle dans Gradium Studio et collez-la de nouveau.
- **« Crédits épuisés ou trop de requêtes »** : vérifiez votre solde avec
  **Tester la connexion**, et votre offre dans Gradium Studio.
- **Gladys ne parle pas avec Gradium** : vérifiez que Gradium est sélectionné
  dans la carte **Voix** de la page **Intelligence artificielle**.
- **L'enceinte reste muette en Opus** : remettez le **Format audio** sur WAV.
- **La voix a un accent** : la voix ne correspond pas à la langue. Renseignez
  une voix de cette langue dans le champ correspondant.

L'onglet **Logs** de l'intégration donne la raison de chaque synthèse en
échec. La clé d'API n'est jamais écrite dans les logs.
