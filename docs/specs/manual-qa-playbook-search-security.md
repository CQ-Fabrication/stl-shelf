---
title: Manual QA Playbook Search + Security
summary: Checklist manuale e semi-automatica per validare i fix su ricerca, UX e hardening sicurezza (tenant isolation, cookie/sessioni/JWT, pagamenti).
read_when:
  - Prima della prima release pubblica
  - Dopo modifiche a ricerca, download, auth/sessioni o billing webhook
---

# Manual QA Playbook Search + Security

## 1. Prerequisiti

1. Servizi avviati e DB pronto:

```bash
docker compose up -d
bun db:migrate
bun db:seed
```

2. Avvio app:

```bash
bun dev
```

3. Account seed per login:
   - Email esempio: `giulia.rinaldi+alpha-farm@stlshelf.local`
   - Password: `Password1!`

4. Connessione DB:

```bash
psql "postgresql://stlshelf:stlshelf_dev_password@localhost:5432/stlshelf"
```

## 2. Raccolta ID utili per i test

Esegui:

```sql
-- Org/tenant disponibili
SELECT id, name, subscription_tier, polar_customer_id
FROM organization
ORDER BY id;

-- Version/file del tenant principale (alpha)
SELECT m.id AS model_id, mv.id AS version_id, mf.id AS file_id
FROM models m
JOIN model_versions mv ON mv.model_id = m.id
JOIN model_files mf ON mf.version_id = mv.id
WHERE m.organization_id = 'org_alpha_layerworks'
  AND m.deleted_at IS NULL
ORDER BY m.updated_at DESC
LIMIT 5;

-- Profile di un tenant diverso (per test isolamento)
SELECT pp.id AS foreign_profile_id
FROM print_profiles pp
JOIN model_versions mv ON mv.id = pp.version_id
JOIN models m ON m.id = mv.model_id
WHERE m.organization_id <> 'org_alpha_layerworks'
LIMIT 5;
```

## 3. Test Ricerca/UX (regressioni)

### RIC-01 Race typing + remove tag

1. Apri `/library?tags=validated`.
2. Scrivi velocemente `0999`.
3. Entro il debounce, rimuovi il tag.
4. Atteso:
   - Nessun rollback dei tag.
   - Testo non viene cancellato.
   - URL finale coerente con ultima azione utente.

### RIC-02 Race typing + add tag

1. In `/library`, inizia a digitare una query.
2. Aggiungi un tag dal filtro durante la digitazione.
3. Atteso:
   - `q` e `tags` restano entrambi in URL.
   - Nessuna richiesta in conflitto che resetta stato.

### RIC-03 Click tag dalla card

1. Con una query attiva (`q=0999`), clicca un tag su una card.
2. Atteso:
   - Il tag si applica.
   - `q` viene preservata.

### RIC-04 Chip tag troncati

1. Verifica card con tag lunghi (es. `support-heavy`).
2. Atteso:
   - Testo leggibile.
   - Nessun tag tagliato in modo anomalo.

### RIC-05 Performance query (EXPLAIN)

Segui il playbook dedicato:
`/Users/claudioquaglia/CQ Fabrication/3d-printing-ecosystem/stl-shelf/docs/specs/library-search-benchmark-playbook.md`

## 4. Test Sicurezza Download/Cookie

### SEC-01 Blocco cross-site su download file/profile/zip

Esegui (senza bisogno di login):

```bash
curl -i \
  -H "Origin: https://evil.example" \
  -H "Sec-Fetch-Site: cross-site" \
  "http://localhost:3000/api/download/file/<FILE_ID>"

curl -i \
  -H "Origin: https://evil.example" \
  -H "Sec-Fetch-Site: cross-site" \
  "http://localhost:3000/api/download/print-profile/<PROFILE_ID>"

curl -i \
  -H "Origin: https://evil.example" \
  -H "Sec-Fetch-Site: cross-site" \
  "http://localhost:3000/api/download/version/<VERSION_ID>/zip"
```

Atteso: `403` con body `{"error":"Cross-site request blocked."}` su tutti e tre.

### SEC-02 Isolamento tenant su download

1. Login con utente tenant Alpha.
2. Chiama endpoint profile con `foreign_profile_id` del tenant diverso.
3. Atteso: `404 Profile not found`.

### SEC-03 Gate pagamenti ZIP (Basic/Pro only)

1. Porta tier a `free`:

```sql
UPDATE organization SET subscription_tier='free' WHERE id='org_alpha_layerworks';
```

2. Prova download ZIP versione.
3. Atteso: `403` con errore piano non abilitato.
4. Ripristina tier:

```sql
UPDATE organization SET subscription_tier='pro' WHERE id='org_alpha_layerworks';
```

5. Riprova ZIP.
6. Atteso: `200` e `Content-Type: application/zip`.

### SEC-04 Cookie policy

1. Verifica `.env`:
   - `AUTH_COOKIE_SAMESITE` (default `lax`).
2. Login e apri DevTools > Application > Cookies.
3. Atteso:
   - Cookie auth `HttpOnly`.
   - `Path=/`.
   - `SameSite` coerente con `AUTH_COOKIE_SAMESITE`.
4. Se usi `AUTH_COOKIE_SAMESITE=none`, atteso `Secure=true` e uso HTTPS.

## 5. Test Sessioni/JWT

### SEC-05 Session list senza token in client

1. Vai in `Profile > Sessions`.
2. In Network apri la risposta della server function `listUserSessionsFn`.
3. Atteso:
   - campi: `id`, `createdAt`, `updatedAt`, `expiresAt`, `ipAddress`, `userAgent`, `isCurrent`.
   - nessun campo `token`.

### SEC-06 Revoke session singola

1. Apri una seconda sessione (browser/incognito) con stesso account.
2. Da sessione principale, `Profile > Sessions`, revoca la sessione secondaria.
3. Atteso:
   - success toast.
   - sessione secondaria invalidata.

### SEC-07 Revoke all other sessions

1. Mantieni almeno 2 sessioni attive.
2. Clicca `Revoke All`.
3. Atteso:
   - resti autenticato solo nella sessione corrente.
   - tutte le altre vengono disconnesse.

### SEC-08 Change password invalida le altre sessioni

1. Con almeno una sessione secondaria attiva, cambia password in `Profile > Security`.
2. Atteso:
   - cambio password riuscito.
   - sessioni secondarie revocate.

## 6. Test Billing Webhook Hardening

### SEC-09 Guard timestamp (stale event ignored)

1. Identifica customer:

```sql
SELECT id, polar_customer_id, subscription_tier, billing_last_webhook_at
FROM organization
WHERE polar_customer_id IS NOT NULL;
```

2. Simula 2 eventi `customer.state_changed` (nuovo poi vecchio):

```bash
bun --eval '
import { handleCustomerStateChanged } from "./src/lib/billing/webhook-handlers";

const customerId = process.argv[2];
const newer = new Date();
const older = new Date(newer.getTime() - 60_000);

await handleCustomerStateChanged({
  type: "customer.state_changed",
  timestamp: newer,
  data: { id: customerId, activeSubscriptions: [] },
});

await handleCustomerStateChanged({
  type: "customer.state_changed",
  timestamp: older,
  data: { id: customerId, activeSubscriptions: [] },
});
' -- <POLAR_CUSTOMER_ID>
```

3. Ricontrolla:

```sql
SELECT id, billing_last_webhook_at
FROM organization
WHERE polar_customer_id = '<POLAR_CUSTOMER_ID>';
```

Atteso: `billing_last_webhook_at` resta al timestamp più recente (evento vecchio ignorato).

### SEC-10 Vincoli univoci customer/subscription

Esegui in transazione:

```sql
BEGIN;
WITH ids AS (
  SELECT id FROM organization ORDER BY id LIMIT 2
)
UPDATE organization
SET polar_customer_id = 'qa-dup-customer'
WHERE id IN (SELECT id FROM ids);
ROLLBACK;
```

Atteso: errore `duplicate key value violates unique constraint organization_polar_customer_uidx`.

Ripeti analogo per `subscription_id`:

```sql
BEGIN;
WITH ids AS (
  SELECT id FROM organization ORDER BY id LIMIT 2
)
UPDATE organization
SET subscription_id = 'qa-dup-sub'
WHERE id IN (SELECT id FROM ids);
ROLLBACK;
```

Atteso: errore su `organization_subscription_uidx`.

## 7. Test specifico isolamento conflict resolution print profile

### SEC-11 Replace conflict non deve cancellare profili fuori versione

1. Prepara 2 versioni con profili distinti nello stesso tenant.
2. In versione A carica un profilo che genera conflitto.
3. Nel flusso `resolve conflict`, manipola payload `existingProfileId` mettendo ID di versione B.
4. Atteso:
   - errore `Profile not found or access denied`.
   - il profilo in versione B resta presente.

## 8. Exit Criteria

Puoi considerare il giro QA chiuso quando:

1. Tutti i test `RIC-*` passano.
2. Tutti i test `SEC-*` passano.
3. Nessuna regressione funzionale su upload/download/search.
4. Gate qualità verdi:

```bash
bun check
bun check-types
```
