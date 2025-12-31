# STL Shelf - Pricing & Cost Analysis

> Documento di analisi economica per la definizione dei piani di abbonamento
> 
> Data: Dicembre 2025

---

## Executive Summary

STL Shelf è una piattaforma SaaS cloud-hosted per la gestione di librerie di modelli 3D. L'analisi dei costi infrastrutturali dimostra un modello economico estremamente favorevole grazie all'utilizzo di Cloudflare R2 (zero egress fees) e costi variabili trascurabili.

**Break-even:** 6 utenti Basic OPPURE 3 utenti Pro

**Margine a scala:** 95-98%

---

## Stack Tecnologico

| Componente | Servizio | Ruolo |
|------------|----------|-------|
| Compute | Cloudflare Workers | API server, edge computing |
| File Storage | Cloudflare R2 | File 3D binari, thumbnails |
| Database | NeonDB + Hyperdrive | Metadata, utenti, relazioni |
| Email | Resend | Email transazionali |
| Payments | Polar.sh | Subscription billing |

### Architettura Storage

- **R2 (Cloudflare):** File STL/3MF/OBJ/PLY + thumbnails
- **NeonDB:** Solo metadata (models, versions, files info, tags, users, organizations)

Questa separazione è cruciale: i file binari (grandi, frequentemente scaricati) vanno su R2 con zero egress, mentre il DB contiene solo dati strutturati leggeri.

---

## Analisi Costi Infrastruttura

### Costi Fissi Mensili

| Servizio | Costo Attuale | Costo Futuro | Note |
|----------|---------------|--------------|------|
| Cloudflare Workers Paid | $5 | $5 | Include 10M requests, 30M CPU ms |
| NeonDB | $0 | ~$15-20 | Free ora, Launch plan in futuro |
| Resend | ~$8 | ~$8 | Quota del piano $25 condiviso |
| **Totale** | **~$13/mese** | **~$30/mese** | |

### Cloudflare R2 - Pricing Dettagliato

| Componente | Free Tier | Costo Oltre Free |
|------------|-----------|------------------|
| Storage | 10 GB/mese | **$0.015/GB/mese** |
| Class A (upload, list, put) | 1M ops/mese | $4.50/milione |
| Class B (download, get, head) | 10M ops/mese | $0.36/milione |
| Egress | Illimitato | **$0** |

**Vantaggio competitivo:** Zero egress fees significa che i download (l'operazione più frequente) non costano nulla, indipendentemente dal volume.

### NeonDB - Pricing Dettagliato

| Componente | Free Plan | Launch Plan |
|------------|-----------|-------------|
| Storage | 0.5 GB/progetto | **$0.35/GB/mese** |
| Compute | 100 CU-hours/mese | **$0.106/CU-hour** |
| Egress | 5 GB/mese | 100 GB inclusi, poi $0.10/GB |
| Scale to zero | 5 min (fisso) | 5 min (disabilitabile) |

**Nota:** Lo storage NeonDB costa 23x più di R2 ($0.35 vs $0.015), ma contiene solo metadata (~5KB per modello), quindi il costo rimane trascurabile.

---

## Dimensioni File Realistiche

| Tipo di modello | Dimensione tipica |
|-----------------|-------------------|
| Miniatura semplice | 1-5 MB |
| Parte funzionale (clip, holder) | 2-10 MB |
| Modello decorativo medio | 5-15 MB |
| Scultura dettagliata | 15-40 MB |
| Scan 3D / highpoly | 50-200 MB |

**Media realistica adottata: 10 MB per modello**

---

## Pricing Tiers Definitivi

| Tier | Modelli | Storage | Team Members | Prezzo |
|------|---------|---------|--------------|--------|
| **Free** | 10 | 200 MB | 1 | $0/mese |
| **Basic** | 200 | 10 GB | 3 | $4.99/mese |
| **Pro** | Unlimited | 50 GB | 10 | $12.99/mese |

### Logica dei Limiti

**Modelli come leva primaria di conversione:**
- Il numero di modelli è il limite più "sentito" dall'utente
- 10 modelli nel Free = una sessione di upload seria porta al limite
- Time-to-upgrade minimizzato

**Storage proporzionato:**
- Free: 10 modelli × 10 MB = 100 MB necessari → 200 MB (margine)
- Basic: 200 modelli × 10 MB = 2 GB necessari → 10 GB (5x margine)
- Pro: Unlimited modelli, 50 GB supporta ~5000 modelli medi

**Team Members come upgrade trigger:**
- Free: Solo personale (1 member)
- Basic: Piccolo team (3 members) 
- Pro: Team completo (10 members)
- Appena serve collaborare → upgrade obbligato

---

## Costi Variabili per Utente

### Costo R2 per Tier (uso medio stimato)

| Tier | Modelli Medi | Storage Medio | Costo R2/utente/mese |
|------|--------------|---------------|----------------------|
| Free | 5 | 50 MB | $0.00075 |
| Basic | 100 | 1.5 GB | $0.023 |
| Pro | 500 | 7.5 GB | $0.11 |

### Costo NeonDB per Utente

Il metadata per utente è trascurabile:
- 1 utente con 100 modelli = ~700 KB di dati DB
- 1000 utenti = ~700 MB totali
- Costo: < $0.25/mese totale

---

## Break-Even Analysis

### Scenario Attuale (costi fissi ~$13/mese)

| Utenti Paganti Necessari | Basic ($4.99) | Pro ($12.99) |
|--------------------------|---------------|--------------|
| Break-even | **3 utenti** | **1 utente** |

### Scenario Futuro (costi fissi ~$30/mese)

| Utenti Paganti Necessari | Basic ($4.99) | Pro ($12.99) |
|--------------------------|---------------|--------------|
| Break-even | **6 utenti** | **3 utenti** |

---

## Proiezioni di Margine

### Scenario: 1000 Utenti Totali

Distribuzione tipica SaaS: 90% Free, 8% Basic, 2% Pro

| Tier | Utenti | Storage Totale | Costo R2 | Revenue |
|------|--------|----------------|----------|---------|
| Free | 900 | 45 GB | $0.68 | $0 |
| Basic | 80 | 120 GB | $1.80 | $399.20 |
| Pro | 20 | 150 GB | $2.25 | $259.80 |
| **Totale** | **1000** | **315 GB** | **$4.73** | **$659.00** |

**Costi totali:** $30 (fissi) + $4.73 (R2) = ~$35/mese

**Margine:** $624/mese (**95%**)

### Scenario: 500 Utenti Paganti

| Tier | Utenti | Revenue | Costi Variabili |
|------|--------|---------|-----------------|
| Basic | 400 | $1,996 | $9.20 |
| Pro | 100 | $1,299 | $11.00 |
| **Totale** | **500** | **$3,295** | **$20.20** |

**Costi totali:** $30 + $20.20 = ~$50/mese

**Margine:** $3,245/mese (**98%**)

---

## Competitor Landscape

### Library Management (Competizione Diretta)

| Prodotto | Modello | Pricing | Note |
|----------|---------|---------|------|
| **Manyfold** | Self-hosted, open source | Free | Richiede Docker, PostgreSQL, Redis, manutenzione |
| **VanDAM** | Self-hosted (deprecated) | Free | Superato da Manyfold |

**Gap di mercato:** Nessuna soluzione cloud-hosted esiste. STL Shelf è l'unica opzione "managed".

### Marketplaces (Non Competitori)

| Prodotto | Modello | Pricing | Differenza |
|----------|---------|---------|------------|
| Thangs | Marketplace | $14.99/mese bundle | Discovery/vendita, non gestione libreria |
| MyMiniFactory Tribes | Creator subscriptions | $11.99-34.99/mese | Supporto creators, non organizzazione personale |
| Printables | Repository gratuito | Free | Community sharing, no gestione privata |
| Cults3D | Marketplace | Fee su vendite | Vendita, non libreria |

**Posizionamento:** STL Shelf non compete con i marketplace. Risolve un problema diverso: organizzare la propria collezione di modelli.

---

## Value Proposition

### Per Utenti Individuali
- Zero setup (vs self-hosting Manyfold)
- Preview 3D interattivo
- Organizzazione con tag e versioni
- Accesso da qualsiasi device

### Per Team/Makerspaces
- Collaborazione con ruoli
- Libreria condivisa
- Version control
- Nessuna manutenzione server

### Valore Economico del "Managed"
- Setup Manyfold: 4-8 ore
- Manutenzione Manyfold: 1-2 ore/mese
- Costo opportunità a $50/ora: $200-400 setup + $50-100/mese

STL Shelf a $4.99-12.99/mese è un risparmio netto.

---

## Rischi e Mitigazioni

| Rischio | Probabilità | Mitigazione |
|---------|-------------|-------------|
| Free users che non convertono | Alta | Limite 10 modelli forza upgrade rapido |
| Heavy users che abusano storage | Bassa | Limiti chiari per tier, costi R2 bassi |
| Aumento costi NeonDB | Media | Monitorare usage, ottimizzare query |
| Competitor cloud-hosted | Media | First mover advantage, open source trust |

---

## Action Items

- [ ] Configurare prodotti su Polar.sh con tier definitivi
- [ ] Aggiornare UI pricing con nuovi limiti
- [ ] Implementare enforcement limiti (modelli, storage, members)
- [ ] Setup webhook handlers per subscription lifecycle
- [ ] Test completo flusso checkout → attivazione
- [ ] Landing page con pricing chiaro

---

## Riferimenti

### Pricing Documentation
- [Cloudflare R2 Pricing](https://developers.cloudflare.com/r2/pricing/)
- [Cloudflare R2 Calculator](https://r2-calculator.cloudflare.com/)
- [NeonDB Plans & Pricing](https://neon.com/docs/introduction/plans)
- [NeonDB Pricing Page](https://neon.com/pricing)
- [Resend Pricing](https://resend.com/pricing)
- [Polar.sh Documentation](https://docs.polar.sh/)

### Competitor Research
- [Manyfold (ex VanDAM)](https://manyfold.app/)
- [Thangs](https://thangs.com/)
- [MyMiniFactory](https://www.myminifactory.com/)
- [Printables](https://www.printables.com/)

### Internal Documentation
- [STL Shelf PRD](./STL-Shelf-PRD.md)
- [Polar Integration Plan](./POLAR_INTEGRATION_PLAN.md)

---

*Ultimo aggiornamento: Dicembre 2025*
