# LEGAL-COMPLIANCE-IMPLEMENTATION — florianmolea.ro

Audit al implementării infrastructurii juridice și tehnice de conformitate e-commerce pentru magazinul florianmolea.ro (parfumuri auto FlorianMolea / Eau de Floryan). Vânzător: WORLDWIDE CONSULTING LINE SRL. Producător: VANESICA FRESH SRL.

Context important: la data acestei implementări, magazinul se află în **pre-lansare** — iconița de coș și linkul „Magazin” sunt ascunse pe toate paginile prin mecanismul temporar `pre-release.js`/`pre-release-locked` (adăugat înaintea acestei implementări, nemodificat aici), checkout-ul nu trimite comenzi reale către Worker, iar plata online (Stripe) și facturarea (Oblio) nu sunt active. Toate schimbările de mai jos pregătesc infrastructura pentru momentul lansării, fără să activeze vânzarea reală.

## 0. Etapă de audit și corecții (ulterioară implementării inițiale)

O trecere de audit separată a verificat implementarea de mai jos prin citire de cod, teste automate și testare reală în browser (server local, Chrome). A găsit și corectat:

- **Checkbox de confidențialitate eliminat din checkout** (`checkout.html`): Politica de confidențialitate este o informare GDPR, nu un consimțământ contractual — checkbox-ul obligatoriu `checkout-privacy` a fost eliminat; a rămas un singur checkbox contractual obligatoriu („Am citit și accept Termenii și condițiile și Politica de retur.”) plus un text informativ cu link către Politica de confidențialitate, necondiționat de nicio bifă.
- **Bug critic în `produs.html`** (`shop.js` → `renderProductDetailPage`): funcția căuta breadcrumb-ul cu `page.querySelector(...)`, dar breadcrumb-ul este element frate al `<main>`, nu descendent — `page.querySelector` returna `null`, iar `breadcrumb.hidden = false` arunca `TypeError`, întrerupând randarea înainte de a popula numele produsului, prețul, controalele sau nota „Produs în curs de pregătire”. Corectat prin căutarea breadcrumb-ului în `document`. Confirmat prin testare reală în browser (eroarea apărea în consolă la fiecare încărcare a paginii de produs, indiferent de `IS_LIVE_COMMERCE`).
- **Blocarea comercială era doar cosmetică**: `addToCart()` verifica doar `active`/`stock`, nu conformitatea — un apel direct al funcției (consolă sau DOM manipulat manual) ocolea complet blocarea din UI. Corectat: `addToCart()` apelează acum `isProductPurchasable()` (deci și `validateCommerceCompliance()`) înainte de a adăuga produsul. Suplimentar, `sanitizeCart()` (rulată la fiecare încărcare a coșului) a fost extinsă să elimine din coș orice produs devenit neconform între timp, nu doar cele inactive/fără stoc.
- **Formulare inconsistentă a regulii de transport gratuit** în `magazin.html` (secțiunea „De ce FlorianMolea”): textul „Transport gratuit de la 2 produse comandate” a fost aliniat la formularea canonică „minimum două produse în comandă, inclusiv două bucăți ale aceluiași produs”, identică acum pe toate paginile relevante.

Verificat și confirmat corect, fără corecții necesare: rolurile juridice (WORLDWIDE = vânzător/operator/parte contractuală; VANESICA = producător, niciodată vânzător; Florian Molea persoană fizică explicit exclus ca vânzător/producător; `manufacturerId` rezolvat per produs, fără presupunere globală), textul butonului final de checkout, placeholderul SAL (marcat vizibil ca atare, fără referire SOL/ODR, link către domeniul oficial anpc.ro fără sub-pagină ghicită), regula de transport gratuit în cod (`getCartCount()` însumează cantități, nu produse distincte).

### 0.1 Pictogramă SAL oficială (etapă ulterioară)

Utilizatorul a furnizat activul oficial ANPC (`pictograma-oficiala-SAL-ANPC-250x50.png`, 500×124 px reali). Placeholderul text (`images/legal/sal-anpc-badge.svg`) a fost șters și înlocuit cu activul oficial:

- Optimizat cu Pillow: PNG recomprimat (`optimize=True`) + variantă WebP fără pierderi (`lossless=True`), redenumite `images/legal/sal-anpc-badge.png` / `.webp` — 8,7 KB WebP față de ~19,9 KB PNG.
- Servite prin `<picture><source type="image/webp">…<img …></picture>`, cu `loading="lazy"`, `decoding="async"`, pe `index.html` și `contact-si-reclamatii.html`.
- Dimensiunea reală a activului oficial este ~4:1 (500×124), nu 5:1 (250×50) cum indica ghidul generic din cerința inițială. S-a ales afișarea la 250×62 px (proporție reală păstrată exact) în loc de a forța 250×50, ceea ce ar fi distorsionat sigla oficială — nu s-a redesenat sau modificat grafic activul.
- `data/legal-config.json` → `consumerProtection.salBadgeIsOfficial` este acum `true`, cu `salBadgeWidth/Height` actualizate la 250×62 și `salBadgeNote` explicând discrepanța de proporție.
- `COMPLIANCE-TODO.md` actualizat: item-ul „înlocuiește placeholderul SAL” este bifat ca rezolvat; a rămas deschis doar confirmarea URL-ului exact al platformei SAL (deocamdată `https://anpc.ro/`, domeniul oficial, fără sub-pagină ghicită).

## 1. Ce a fost implementat

- Sursă unică de adevăr pentru datele juridice: `data/legal-config.json` (vânzător WORLDWIDE) și `data/manufacturers.json` (producători, inițial VANESICA FRESH SRL).
- `products.json` extins pentru fiecare produs activ cu `manufacturerId`, `sellerId`, `commercialBrand`, `productType`, `productIdentifier`, `netQuantity` și blocul `safety` (instrucțiuni, avertismente, CLP), toate `null`/goale până la primirea documentației producătorului, fără a rupe câmpurile folosite deja de `shop.js`.
- `validateCommerceCompliance(product, legalConfig, manufacturers)` în `shop.js`: calculează lista de câmpuri critice lipsă pentru fiecare produs.
- Comutator central `IS_LIVE_COMMERCE` (`shop.js`, implicit `false`): în modul test/dev afișează doar un `console.warn` intern; în modul live ar dezactiva „Adaugă în coș” și ar afișa „Produs în curs de pregătire” pentru produsele neconforme, fără mesaje juridice tehnice către client.
- Pagină individuală de produs `produs.html?slug=<slug>`: informații comerciale, secțiune accesibilă „Producător și siguranța produsului” (accordion cu `aria-expanded`, navigabil din tastatură, deschis implicit dacă există avertismente), date structurate `Product`/`Offer`/`brand`/`manufacturer` fără date inventate (fără review, fără GTIN).
- Cardurile din magazin (`shop.js` → `buildProductCardMarkup`) primesc link „Detalii produs și siguranță” către `produs.html`, păstrând butonul „Adaugă în coș”, prețul, stocul și transportul.
- Checkout (`checkout.html`): checkbox obligatoriu unic „Am citit și accept Termenii și condițiile și Politica de retur” (linkuri distincte), checkbox separat pentru confidențialitate, checkbox opțional pentru newsletter, buton final „Comandă cu obligație de plată” (dezactivat, cu notă explicativă), identitate vânzător + linkuri legale în rezumatul comenzii.
- Footer juridic comun, actualizat pe toate paginile (existente + noi): identitate WORLDWIDE, linkuri către toate documentele juridice, buton persistent „Setări cookies”.
- Banner de cookies rescris (`script.js`): „Acceptă toate” / „Refuză opționale” / „Personalizează”, panou accesibil (focus trap, `Escape`, restaurare focus, switch-uri per categorie), niciun tag de analiză nu se încarcă înainte de consimțământ, preferința e granulară și persistă local, poate fi schimbată oricând din „Setări cookies”.
- Pictogramă SAL (placeholder marcat explicit, vezi secțiunea 4) + link către platforma SAL a ANPC + „Telefonul Consumatorului: 021 9551” pe homepage și în pagina Contact și reclamații; nu se face nicio referire la vechea platformă SOL/ODR.
- 6 pagini juridice noi: `livrare-si-plata.html`, `retur-si-retragere.html`, `formular-retragere.html` (formular tipăribil, fără endpoint fals), `conformitatea-produselor.html`, `informatii-legale.html`, `contact-si-reclamatii.html`.
- 3 pagini juridice existente rescrise: `terms-and-conditions.html`, `privacy-policy.html`, `cookies-policy.html` — reflectă WORLDWIDE ca vânzător/operator al magazinului, VANESICA ca producător, Stripe, Oblio, Cloudflare, GitHub Pages; păstrează secțiunile despre partea informativă administrată de Florian Molea.
- Regulă de transport gratuit clarificată și verificată în cod: `shop.js` → `getShippingInfo()` însumează cantitățile din coș (nu doar produsele distincte), deci pragul de 2 se atinge și cu 2 bucăți din același produs. Textul a fost aliniat peste tot: *„Transport gratuit la minimum două produse în comandă, inclusiv două bucăți ale aceluiași produs.”*
- `sitemap.xml` actualizat cu paginile noi și datele de ultimă modificare.

## 2. Fișiere create

```
data/legal-config.json
data/manufacturers.json
produs.html
livrare-si-plata.html
retur-si-retragere.html
formular-retragere.html
conformitatea-produselor.html
informatii-legale.html
contact-si-reclamatii.html
images/legal/sal-anpc-badge.svg (placeholder)
COMPLIANCE-TODO.md
LEGAL-COMPLIANCE-IMPLEMENTATION.md
```

## 3. Fișiere modificate

```
products.json
shop.js
shop.css
script.js
index.html
magazin.html
cos.html
checkout.html
comanda-confirmata.html
plata-anulata.html
terms-and-conditions.html
privacy-policy.html
cookies-policy.html
parteneriate.html
sitemap.xml
```

Nu au fost modificate: `worker/**` (cod și migrații D1 existente), `pre-release.js`, `pre-release.txt`, identitatea vizuală/CSS de bază din `style.css`.

## 4. Structura datelor juridice

- `data/legal-config.json` — identitatea WORLDWIDE, politica de transport, versiunile documentelor (`documentVersions.termsVersion` etc., toate `1.0.0`, `legalEffectiveDate: 2026-08-01`), date de contact ANPC/SAL, flag `paymentsAndInvoicing.liveCommerceEnabled: false`.
- `data/manufacturers.json` — registrul producătorilor, cu `vanesica-fresh` ca prima intrare. Adăugarea unui producător nou pentru produse viitoare presupune doar o intrare nouă în acest fișier și setarea `manufacturerId` corespunzător în `products.json` — nu necesită nicio altă modificare a infrastructurii juridice.
- `products.json` — fiecare produs are acum `manufacturerId: "vanesica-fresh"`, `sellerId: "worldwide-consulting-line"`, `commercialBrand: "Eau de Floryan"`, `productType: "Parfum auto"` și blocul `safety` (gol, `documentationStatus: "pending"`).

## 5. Câmpuri lipsă (rezumat — detalii acționabile în COMPLIANCE-TODO.md)

**WORLDWIDE CONSULTING LINE SRL:** telefon, e-mail, program suport, statut TVA, coduri CAEN autorizate, adresă expediere, adresă retur, e-mailuri dedicate (retur/confidențialitate/reclamații), curier, timp procesare, termen estimativ livrare.

**Fiecare produs (VANESICA FRESH SRL):** adresă electronică producător, identificator produs, cantitate netă, instrucțiuni utilizare/depozitare, avertismente, status CLP explicit (inclusiv „neaplicabil”), UFI (dacă e cazul), confirmare PCN România (dacă e cazul), lot, valabilitate.

## 6. Produse blocate pentru modul live și motivul

Toate cele 5 produse active (`parfum-first-drive`, `parfum-cuban-leaf`, `parfum-crispy`, `parfum-bubblegum`, `parfum-octopus`) ar fi blocate dacă `IS_LIVE_COMMERCE` ar fi `true` acum, deoarece `validateCommerceCompliance()` raportează lipsă pentru fiecare: adresă electronică producător, identificator produs, cantitate netă, instrucțiuni de utilizare, avertismente, status CLP explicit și confirmarea documentației producătorului (`safety.documentationStatus` este `"pending"`, nu `"confirmed"`). Verificat prin rulare directă a funcției de validare (Node, în afara browserului) — vezi secțiunea Teste.

Nu este un defect: reflectă corect faptul că documentația VANESICA FRESH SRL nu a fost încă primită. Magazinul rămâne oricum inaccesibil public din cauza mecanismului `pre-release`, deci nu există niciun risc de vânzare neconformă în starea curentă.

## 7. Date de cerut VANESICA FRESH SRL / de completat pentru WORLDWIDE

Vezi checklist-ul complet, per câmp, în `COMPLIANCE-TODO.md` (secțiunile 1 și 2).

## 8. Verificări manuale necesare

- Confirmarea juridică a conținutului `termeni-si-conditii.html`, `retur-si-retragere.html`, `conformitatea-produselor.html` de către un consultant/avocat, înainte de lansare.
- Confirmarea regimului TVA și a modului de afișare a prețurilor pe facturile Oblio.
- Confirmarea URL-ului exact al platformei SAL ANPC (în prezent trimite către `https://anpc.ro/`, domeniul oficial, fără sub-pagină specifică — nu a fost inventat un link mai profund fără confirmare).
- Înlocuirea pictogramei SAL placeholder cu activul oficial ANPC (250×50 px).
- Verificarea disponibilității mărcilor „FlorianMolea” / „Eau de Floryan” (OSIM), dacă se dorește protecție suplimentară.
- Testare manuală în browser a: bannerului de cookies (Acceptă toate / Refuză opționale / Personalizează + tastatură), accordion-ului de siguranță pe `produs.html`, linkurilor din footer pe toate paginile, checkbox-ului obligatoriu din checkout.

## 9. Teste executate

| Comandă | Rezultat |
| --- | --- |
| `cd worker && npm test` (vitest, 3 fișiere: `checkout.test.js`, `routes.test.js`, `security.test.js`) | **18/18 teste trecute**, neschimbat față de starea inițială (Worker-ul nu a fost modificat) |
| `node --check script.js` / `node --check shop.js` | sintaxă validă |
| Validare JSON (`products.json`, `data/legal-config.json`, `data/manufacturers.json`) | toate valide |
| Script de verificare a linkurilor interne (`href="/*.html"`) pe toate paginile `.html` din rădăcină | 0 linkuri interne rupte |
| Rulare directă a `validateCommerceCompliance()` (Node, logică identică cu `shop.js`) pentru toate cele 5 produse | confirmă blocarea corectă în modul live (secțiunea 6) |

**Nu a fost rulat** (nu exista infrastructură de test frontend în proiect înainte de această implementare, iar adăugarea unui framework nou de testare — de exemplu Vitest + jsdom la rădăcina proiectului — nu a fost inclusă în acest pas ca să nu extindă scopul dincolo de infrastructura juridică cerută):
- teste automate pentru `shop.js`/`script.js` (banner cookies, accordion, gating live) — verificate manual prin citirea codului și `node --check`, nu prin suite automate;
- testare vizuală în browser real (Chrome) a paginilor noi — recomandată ca pas următor, vezi secțiunea 11.

## 10. Modificări necesare în Worker/D1 (documentate, NEAPLICATE)

Nu am modificat `worker/migrations/*` existente și nu am rulat nicio migrare. Pentru a persista `termsVersion`, `termsAcceptedAt`, `privacyNoticeVersion` și `checkoutLegalSnapshot` la nivel de comandă (secțiunea 15–16 a cerinței), este nevoie de o migrare nouă, de exemplu:

```sql
-- worker/migrations/0003_legal_consent_fields.sql
ALTER TABLE orders ADD COLUMN terms_version TEXT NOT NULL DEFAULT '';
ALTER TABLE orders ADD COLUMN terms_accepted_at TEXT;
ALTER TABLE orders ADD COLUMN privacy_notice_version TEXT NOT NULL DEFAULT '';
ALTER TABLE orders ADD COLUMN checkout_legal_snapshot TEXT NOT NULL DEFAULT '{}';
```

Comenzi sugerate (doar pentru staging, de rulat manual de către voi — nu au fost executate):

```bash
cd worker
npx wrangler d1 migrations apply <NUME_DB> --env staging
```

Nu aplica automat în producție. Suplimentar, pentru ca `checkout.html` să poată trimite efectiv aceste câmpuri, `POST /checkout/session` din `worker/src/routes/checkout.js` trebuie extins să primească și să valideze `termsVersion`/`privacyNoticeVersion`/`checkoutLegalSnapshot` din payload — frontend-ul este pregătit conceptual (versiunile sunt disponibile în `data/legal-config.json → documentVersions`), dar **nu simulează** trimiterea acestor date până când endpoint-ul le acceptă real (conform cerinței de a nu simula salvarea).

De asemenea, `POST /stripe/webhook` este încă `handleNotImplemented` (pre-existent, nemodificat) — trebuie implementat înainte de activarea plăților live.

## 11. Pașii exacți înainte de activarea Stripe live

1. Completează toate câmpurile din `COMPLIANCE-TODO.md` (secțiunile 1 și 2).
2. Actualizează `data/legal-config.json` și `data/manufacturers.json` cu datele confirmate; setează `paymentsAndInvoicing.liveCommerceEnabled: true` doar informativ (nu controlează comportament, e document).
3. Actualizează `products.json` per produs: `productIdentifier`, `netQuantity`, `safety.*`, apoi `safety.documentationStatus: "confirmed"` numai după validarea datelor primite de la VANESICA FRESH SRL.
4. Rulează validarea (`validateCommerceCompliance`) pentru toate produsele active și confirmă `compliant: true`.
5. Setează `IS_LIVE_COMMERCE = true` în `shop.js`.
6. Implementează integrarea reală checkout → `POST /checkout/session` (Worker) → Stripe Checkout Session → `POST /stripe/webhook` (de implementat) → actualizare status comandă → factură Oblio.
7. Aplică migrarea `0003_legal_consent_fields.sql` (sau echivalentă) în staging, testează, apoi în producție.
8. Elimină mecanismul `pre-release` (vezi `pre-release.txt`) când magazinul este pregătit pentru trafic public.
9. Testare manuală completă a fluxului: adaugă în coș → checkout → plată Stripe (test mode) → pagină confirmare → factură Oblio → e-mail (dacă e implementat).
