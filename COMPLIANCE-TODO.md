# COMPLIANCE-TODO — florianmolea.ro

Checklist simplu, acționabil, al datelor și pașilor rămași înainte de activarea comercială reală (Stripe live + vânzare efectivă). Sursa tehnică a majorității câmpurilor de mai jos este `data/legal-config.json` și `data/manufacturers.json`.

## 0. Defect tehnic găsit în audit (neblocant juridic, dar de reparat înainte de lansare)

- [x] Rezolvat: fotografii reale au fost adăugate în `images/products/` (`<slug>-nobg.png` pentru carduri/pagina de produs, `<slug>-bg.png` disponibil ca variantă lifestyle neconectată încă) și `products.json` / seed-ul `worker/seeds/0001_products.sql` au fost actualizate să refere aceste fișiere în loc de placeholderele SVG vechi.

## 1. Date de completat pentru WORLDWIDE CONSULTING LINE SRL (vânzător)

- [x] Telefon de contact (`legal-config.json` → `seller.phone`) — +40 738 641 599
- [x] E-mail de contact (`seller.email`) — eaudefloryan@proton.me
- [x] Program de relații cu clienții (`seller.customerSupportSchedule`) — zilnic, în zilele lucrătoare, 10:00-14:00
- [x] Statut TVA / regim de plătitor (`seller.vatStatus`) — neplătitoare de TVA
- [ ] Codurile CAEN autorizate relevante pentru comerțul online (`seller.authorizedActivities`) — în curs de actualizare (nu s-a completat, la cererea explicită a utilizatorului)
- [x] Adresa de expediere a comenzilor (`seller.dispatchAddress`) — Str. Coralului nr. 1, sc. 1, bl. 1, et. 1, ap. 15, Bragadiru, jud. Ilfov (cod poștal neconfirmat încă)
- [x] Adresa de retur a produselor (`seller.returnAddress`) — idem adresa de expediere
- [x] E-mail dedicat retururilor (`contact.returnsEmail`) — eaudefloryan@proton.me (aceeași adresă unică, la cererea utilizatorului)
- [x] E-mail dedicat protecției datelor / confidențialitate (`contact.privacyEmail`) — eaudefloryan@proton.me
- [x] E-mail dedicat reclamațiilor (`contact.complaintsEmail`) — eaudefloryan@proton.me
- [x] Denumirea curierului partener (`commerce.courierName`) — Woot (woot.ro), contract semnat
- [x] Timpul de procesare a comenzilor (`commerce.shippingProcessingTime`) — 1-2 zile lucrătoare
- [x] Termenul estimativ de livrare (`commerce.shippingEstimate`) — 1-3 zile lucrătoare

Actualizat 2026-09-09 în `data/legal-config.json` și propagat în `informatii-legale.html`, `livrare-si-plata.html`, `retur-si-retragere.html`, `contact-si-reclamatii.html`, `privacy-policy.html`, `terms-and-conditions.html` (documente urcate la versiunea 1.1.0). Rămâne de completat doar codul CAEN, când e disponibil, și codul poștal al adresei din Bragadiru.

## 2. Date de cerut de la VANESICA FRESH SRL (producător), per produs Eau de Floryan

Pentru fiecare din cele 5 produse active (`parfum-first-drive`, `parfum-cuban-leaf`, `parfum-merdenea`, `parfum-bubblegum`, `parfum-octopus`):

- [ ] Adresa electronică oficială a producătorului (`manufacturers.json` → `vanesica-fresh.electronicAddress`) — comună pentru toate produsele
- [ ] SDS (fișa cu date de securitate) actualizată
- [ ] Eticheta finală în limba română
- [ ] Denumirea comercială exactă declarată de producător
- [ ] Identificatorul fiecărui produs (`productIdentifier`)
- [ ] Cantitatea netă (`netQuantity`)
- [ ] Instrucțiunile de utilizare (`safety.usageInstructions`)
- [ ] Instrucțiunile de depozitare (`safety.storageInstructions`)
- [ ] Avertismentele (`safety.warnings`)
- [ ] Confirmarea dacă produsul este amestec periculos (`safety.clp.isHazardous`)
- [ ] Clasificarea CLP completă, dacă este aplicabilă: cuvânt de avertizare, pictograme, fraze H/EUH/P (`safety.clp.*`)
- [ ] UFI, dacă este aplicabil (`safety.clp.ufi`)
- [ ] Confirmarea PCN pentru România, dacă este aplicabilă (`safety.clp.pcnConfirmedForRomania`)
- [ ] Identificarea lotului / procedura de trasabilitate
- [ ] Termenul de valabilitate, dacă există
- [ ] Condițiile de transport
- [ ] Procedura de incident și retragere de pe piață

**Nu completa aceste câmpuri pe baza unor produse similare găsite online — doar cu documentație oficială VANESICA FRESH SRL.** După primirea documentației, actualizează `products.json` (câmpul `safety` al fiecărui produs) și setează `safety.documentationStatus` pe `"confirmed"` doar când toate datele relevante au fost validate.

## 3. Activare mod live

- [x] `IS_LIVE_COMMERCE = true` și `SHOP_CHECKOUT_ENABLED = true` în `shop.js` — magazinul este live, plata prin Stripe activă.
- [x] Funcționalitatea „pre-release” a fost eliminată (confirmat: niciun fișier/clasă `pre-release*` nu mai există în repo, commit `53167be`).
- [ ] Notă: `terms-and-conditions.html` conținea încă, până la 2026-09-09, o mențiune de „pre-lansare, plată neactivă” rămasă de la implementarea inițială — a fost eliminată/corectată în această sesiune. Verifică dacă alte pagini (ex. `checkout.html`) mai au mențiuni similare depășite.

## 4. SAL / ANPC

- [x] Pictograma oficială SAL furnizată de utilizator, integrată în `images/legal/sal-anpc-badge.png` + `.webp` (index.html, contact-si-reclamatii.html). Rezoluție nativă 500×124 px; afișată la 250×62 px pentru a păstra proporția reală (ghidul generic cere 250×50 / raport 5:1, dar activul oficial primit are raport ~4:1 — s-a preferat proporția corectă, nedistorsionată, față de forțarea cifrei „50”). Nu s-a redesenat sigla.
- [x] Link-ul platformei SAL a fost verificat și actualizat 2026-09-09: platforma națională dedicată este `https://reclamatiisal.anpc.ro` (confirmată live; urmare a OPANPC 270/2026, care a actualizat cadrul SAL și a eliminat referirile la fosta platformă europeană SOL/ODR, desființată prin Regulamentul (UE) 2024/3228). Actualizat în `data/legal-config.json` → `consumerProtection.salPlatformUrl` și propagat în `index.html`, `terms-and-conditions.html`, `contact-si-reclamatii.html`.

## 5. Stripe / Oblio / Worker

- [ ] Vezi secțiunea dedicată din `LEGAL-COMPLIANCE-IMPLEMENTATION.md` pentru modificările tehnice necesare în Worker/D1 înainte de activarea plăților live (versiuni de documente acceptate, webhook Stripe, integrare Oblio). Notă: acel document descrie webhook-ul Stripe ca neimplementat, dar codul curent (`worker/src/routes/stripeWebhook.js`) arată o implementare completă — documentul tehnic pare depășit și ar trebui revizuit separat de zona legală.

## 6. Alte verificări manuale

- [x] Conținutul `termeni-si-conditii.html`, `retur-si-retragere.html` și `conformitatea-produselor.html` a fost verificat și validat de avocat (confirmat de utilizator, 2026-09-09).
- [x] Regimul TVA confirmat: WORLDWIDE CONSULTING LINE SRL nu este plătitoare de TVA; prețurile afișate nu includ TVA. Reflectat în `terms-and-conditions.html` și `informatii-legale.html`.
- [ ] Marca „FlorianMolea” / „Eau de Floryan”: documentația pentru depunerea la OSIM este în curs de întocmire (confirmat de utilizator, 2026-09-09) — de urmărit până la depunere și înregistrare efectivă.
