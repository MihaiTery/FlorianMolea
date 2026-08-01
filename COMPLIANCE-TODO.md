# COMPLIANCE-TODO — florianmolea.ro

Checklist simplu, acționabil, al datelor și pașilor rămași înainte de activarea comercială reală (Stripe live + vânzare efectivă). Sursa tehnică a majorității câmpurilor de mai jos este `data/legal-config.json` și `data/manufacturers.json`.

## 0. Defect tehnic găsit în audit (neblocant juridic, dar de reparat înainte de lansare)

- [ ] `products.json` referă imagini inexistente pe disc pentru toate cele 5 produse (ex. `images/products/placeholder-first-drive.svg`), în timp ce `images/products/` conține alte fișiere placeholder (`placeholder-black-ice.svg`, `placeholder-bubble-gum.svg`, `placeholder-ocean.svg`, `placeholder-parfum.svg`, `placeholder-vanilie.svg`), cu denumiri care nu se potrivesc 1:1 cu sloturile produselor curente. Rezultat: imaginile produselor apar sparte pe `magazin.html` și `produs.html`. Defectul este anterior acestei implementări juridice și nu a fost corectat aici (nu ține de conformitate legală, iar alegerea imaginii corecte per produs este o decizie de conținut/design, nu una pe care să o iau unilateral). Necesită fie imagini reale per produs, fie o mapare explicită confirmată a placeholderelor existente.

## 1. Date de completat pentru WORLDWIDE CONSULTING LINE SRL (vânzător)

- [ ] Telefon de contact (`legal-config.json` → `seller.phone`)
- [ ] E-mail de contact (`seller.email`)
- [ ] Program de relații cu clienții (`seller.customerSupportSchedule`)
- [ ] Statut TVA / regim de plătitor (`seller.vatStatus`)
- [ ] Codurile CAEN autorizate relevante pentru comerțul online (`seller.authorizedActivities`)
- [ ] Adresa de expediere a comenzilor (`seller.dispatchAddress`)
- [ ] Adresa de retur a produselor (`seller.returnAddress`)
- [ ] E-mail dedicat retururilor (`contact.returnsEmail`)
- [ ] E-mail dedicat protecției datelor / confidențialitate (`contact.privacyEmail`)
- [ ] E-mail dedicat reclamațiilor (`contact.complaintsEmail`)
- [ ] Denumirea curierului partener (`commerce.courierName`)
- [ ] Timpul de procesare a comenzilor (`commerce.shippingProcessingTime`)
- [ ] Termenul estimativ de livrare (`commerce.shippingEstimate`)

După completare: actualizează `data/legal-config.json`, apoi paginile `informatii-legale.html`, `livrare-si-plata.html`, `retur-si-retragere.html`, `contact-si-reclamatii.html` (secțiunile care afișează în prezent „va fi publicat după confirmare”).

## 2. Date de cerut de la VANESICA FRESH SRL (producător), per produs Eau de Floryan

Pentru fiecare din cele 5 produse active (`parfum-first-drive`, `parfum-cuban-leaf`, `parfum-crispy`, `parfum-bubblegum`, `parfum-octopus`):

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

- [ ] După completarea datelor din secțiunile 1 și 2 pentru un produs, verifică `validateCommerceCompliance()` (`shop.js`) pentru acel produs — trebuie să raporteze `compliant: true`.
- [ ] Setează `IS_LIVE_COMMERCE = true` în `shop.js` **doar** după ce toate produsele active sunt conforme, sau acceptă ca produsele neconforme să rămână blocate cu mesajul „Produs în curs de pregătire”.
- [ ] Elimină funcționalitatea temporară „pre-release” (teaser slider din `index.html`, clasele `pre-release-locked`, fișierul `pre-release.js`) conform pașilor din `pre-release.txt`, când magazinul este pregătit de lansare publică.

## 4. SAL / ANPC

- [x] Pictograma oficială SAL furnizată de utilizator, integrată în `images/legal/sal-anpc-badge.png` + `.webp` (index.html, contact-si-reclamatii.html). Rezoluție nativă 500×124 px; afișată la 250×62 px pentru a păstra proporția reală (ghidul generic cere 250×50 / raport 5:1, dar activul oficial primit are raport ~4:1 — s-a preferat proporția corectă, nedistorsionată, față de forțarea cifrei „50”). Nu s-a redesenat sigla.
- [ ] Confirmă/verifică link-ul exact către platforma SAL curentă a ANPC. În prezent website-ul trimite către `https://anpc.ro/` (domeniul oficial cunoscut), fără o pagină internă specifică — verifică dacă ANPC publică un URL dedicat platformei SAL și actualizează `data/legal-config.json` → `consumerProtection.salPlatformUrl`, apoi propagă în `terms-and-conditions.html` și `contact-si-reclamatii.html`.

## 5. Stripe / Oblio / Worker

- [ ] Vezi secțiunea dedicată din `LEGAL-COMPLIANCE-IMPLEMENTATION.md` pentru modificările tehnice necesare în Worker/D1 înainte de activarea plăților live (versiuni de documente acceptate, webhook Stripe, integrare Oblio).

## 6. Alte verificări manuale

- [ ] Verifică juridic conținutul complet al `termeni-si-conditii.html`, `retur-si-retragere.html` și `conformitatea-produselor.html` cu un consultant juridic înainte de lansarea comercială (documentul a fost redactat pe baza cerințelor primite, dar nu înlocuiește un aviz juridic).
- [ ] Confirmă regimul TVA aplicabil și modul de afișare a prețurilor (cu/fără TVA inclus) înainte de activarea facturării Oblio.
- [ ] Verifică denumirea exactă și disponibilitatea mărcilor „FlorianMolea” și „Eau de Floryan” (înregistrare OSIM, dacă este cazul).
