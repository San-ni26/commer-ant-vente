# Test du Préchargement et Mode Hors Ligne Immédiat

## Objectif
Vérifier qu'après connexion, toutes les données et pages sont préchargées et accessibles immédiatement hors ligne.

## Prérequis
- Navigateur moderne (Chrome/Edge/Firefox)
- DevTools ouvert (F12)
- Compte commerçant de test

## Test 1 : Préchargement à la Connexion

### Étapes
1. **Vider tous les caches** :
   - Ouvrir DevTools → Application → Storage
   - Cliquer "Clear site data"
   - Recharger la page

2. **Se connecter** :
   - Aller sur `/connexion`
   - Se connecter avec les identifiants commerçant
   - **Observer** : Le modal de préchargement devrait apparaître automatiquement

3. **Vérifier le préchargement** :
   - Observer la barre de progression
   - Vérifier les étapes :
     - ✅ Chargement des boutiques (15%)
     - ✅ Chargement des employés (25%)
     - ✅ Chargement des ventes (55%)
     - ✅ Chargement des transactions (75%)
     - ✅ Mise en cache des pages (90%)
     - ✅ Finalisation (100%)
   - Le modal devrait se fermer automatiquement après 100%

4. **Vérifier IndexedDB** :
   - DevTools → Application → IndexedDB → kephale-bs-db
   - Vérifier que les stores contiennent des données :
     - `boutiques` : toutes les boutiques du commerçant
     - `employes` : tous les employés
     - `ventes` : ventes de chaque boutique
     - `transactions` : transactions de chaque boutique

5. **Vérifier le cache Service Worker** :
   - DevTools → Application → Cache Storage
   - Vérifier les caches :
     - `kbs-pages-v7` : doit contenir `/commercant`, `/commercant/boutiques`, etc.
     - `kbs-api-read-v7` : doit contenir les réponses API
     - `kbs-static-v7` : assets Next.js

## Test 2 : Navigation Hors Ligne Immédiate

### Étapes
1. **Juste après le préchargement terminé** :
   - **NE PAS naviguer encore**
   - DevTools → Network → Cocher "Offline"
   - Vérifier que le statut réseau affiche "No internet" (icône rouge)

2. **Naviguer vers les pages principales** :
   - Cliquer sur "Boutiques" dans le menu
   - ✅ La page doit charger instantanément
   - ✅ Le badge orange "Mode hors ligne" doit s'afficher
   - ✅ La liste des boutiques doit être visible

3. **Accéder aux détails d'une boutique** :
   - Cliquer sur une boutique
   - ✅ La page détail doit s'afficher
   - ✅ Les informations (nom, solde, stats) doivent être visibles

4. **Tester la page Ventes** :
   - Aller sur `/commercant/boutiques/[id]/ventes`
   - ✅ Les ventes doivent s'afficher depuis le cache
   - ✅ Le formulaire de création doit être accessible

5. **Tester la page Transactions** :
   - Aller sur `/commercant/boutiques/[id]/transactions`
   - ✅ Les transactions doivent s'afficher
   - ✅ Possibilité de créer une transaction (elle ira dans la queue)

6. **Tester la page Employés** :
   - Aller sur `/commercant/employes`
   - ✅ La liste des employés doit s'afficher

7. **Tester la page Rapports** :
   - Aller sur `/commercant/rapports`
   - ✅ Les statistiques approximatives doivent s'afficher

## Test 3 : Actions Hors Ligne (Queue)

### Étapes (toujours en mode Offline)
1. **Créer une vente** :
   - Aller sur une page ventes
   - Créer une nouvelle vente
   - ✅ Toast "Vente enregistrée — sera synchronisée à la reconnexion"
   - ✅ La vente apparaît dans la liste (mise à jour optimiste)

2. **Vérifier la queue** :
   - DevTools → Application → IndexedDB → sync-queue
   - ✅ L'action doit être dans la queue avec status "pending"

3. **Créer plusieurs actions** :
   - Créer 2-3 ventes supplémentaires
   - Créer une transaction
   - Supprimer une vente
   - ✅ Toutes les actions doivent être en queue

## Test 4 : Synchronisation au Retour en Ligne

### Étapes
1. **Repasser en ligne** :
   - DevTools → Network → Décocher "Offline"
   - Attendre 2-3 secondes

2. **Observer la synchronisation** :
   - ✅ Toast "Connexion rétablie — synchronisation en cours…"
   - ✅ Toast "X opération(s) synchronisée(s)" après quelques secondes
   - ✅ Badge orange disparaît

3. **Vérifier les données** :
   - Recharger la page (Ctrl+R)
   - ✅ Les ventes créées hors ligne doivent apparaître avec leur vrai ID
   - ✅ Les actions supprimées ne doivent plus être là

4. **Vérifier la queue** :
   - IndexedDB → sync-queue
   - ✅ Les actions doivent avoir status "completed" ou être supprimées

## Test 5 : Déconnexion Immédiate Après Connexion

### Scénario critique : connexion brève puis perte réseau
1. **Se déconnecter complètement**
2. **Vider les caches** (Clear site data)
3. **Se connecter**
4. **DÈS QUE le modal de préchargement atteint 50%** :
   - DevTools → Network → Cocher "Offline"
   - Attendre que le préchargement se termine (il utilisera les données déjà chargées)

5. **Tester la navigation** :
   - ✅ Les boutiques chargées avant la coupure doivent être accessibles
   - ✅ Les autres pages peuvent afficher "Page non disponible hors ligne" si pas en cache
   - ⚠️ C'est normal — le préchargement n'était pas complet

6. **Repasser en ligne**
7. **Attendre 5 secondes** (le préchargement reprendra en arrière-plan)
8. **Repasser hors ligne**
9. **Vérifier** : maintenant toutes les pages doivent être accessibles

## Test 6 : Préchargement Non Redéclenché

### Vérifier que le préchargement ne se répète pas à chaque connexion
1. **Se déconnecter**
2. **Se reconnecter**
3. ✅ Le modal de préchargement **ne doit PAS** s'afficher
4. ✅ L'app doit charger directement le dashboard

### Forcer un nouveau préchargement
1. **Ouvrir DevTools Console**
2. **Exécuter** :
   ```js
   localStorage.removeItem('preload_completed')
   ```
3. **Recharger la page**
4. ✅ Le modal doit réapparaître

## Test 7 : Employé (Boutique unique)

### Même test mais pour un employé
1. **Se connecter en tant qu'employé**
2. **Observer le préchargement** :
   - ✅ Chargement de la boutique (20%)
   - ✅ Chargement des ventes (65%)
   - ✅ Mise en cache des pages (85%)
   - ✅ Finalisation (100%)

3. **Passer hors ligne immédiatement**
4. **Naviguer** :
   - ✅ `/employe` doit charger
   - ✅ `/employe/ventes` doit charger avec les ventes de la boutique

## Résultats Attendus

### ✅ Succès si :
- Le modal de préchargement s'affiche à la première connexion
- Toutes les données sont en IndexedDB après préchargement
- Toutes les pages principales sont en cache SW
- L'app est 100% fonctionnelle hors ligne immédiatement après connexion
- Les actions hors ligne sont enregistrées et synchronisées au retour en ligne
- Le préchargement ne se répète pas dans les 24h

### ❌ Échec si :
- Le modal ne s'affiche pas
- Des pages affichent "Hors ligne" alors qu'elles ont été préchargées
- Des données ne sont pas en IndexedDB
- La navigation est lente ou bloquée hors ligne
- Les actions hors ligne ne sont pas synchronisées

## Débogage

### Console logs à surveiller :
```
[Preload] Chargement des boutiques...
[Preload] X boutiques sauvegardées
[Preload] Préchargement page /commercant
[SW] Page HTML depuis le cache: /commercant/boutiques
[Queue] Action ajoutée: create_vente
[Sync] Synchronisation: 3 actions en attente
```

### En cas de problème :
1. Vérifier la console pour les erreurs
2. Vérifier Network → voir si les requêtes API passent
3. Vérifier IndexedDB → sync-queue et kephale-bs-db
4. Vérifier Application → Service Workers (doit être "activated")
5. Vérifier Cache Storage → les caches doivent contenir des entrées

## Nettoyage Après Tests

```js
// Dans la console DevTools
localStorage.clear()
indexedDB.deleteDatabase('kephale-bs-db')
indexedDB.deleteDatabase('sync-queue')
navigator.serviceWorker.getRegistrations().then(regs => regs.forEach(r => r.unregister()))
location.reload()
```
