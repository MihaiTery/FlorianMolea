/* Config local pentru pagina /EDF (Eau de Floryan — instructiuni si informatii tehnice).
   Nu este folosit de nicio alta pagina. Datele CLP/UFI provin din documentatia
   producatorului Vanesica Fresh SRL pentru fiecare formula corespunzatoare. */
(function () {
  "use strict";

  var SDS_PENDING = "Fișă cu date de securitate — disponibilă în curând";

  var PICTOGRAMS = {
    GHS07: {
      label: "GHS07 – Atenție (pericol)",
      svg:
        '<svg viewBox="0 0 100 100" width="48" height="48" focusable="false">' +
          '<rect x="20" y="20" width="60" height="60" rx="6" fill="#fff" stroke="#e2231a" stroke-width="8" transform="rotate(45 50 50)"></rect>' +
          '<rect x="46" y="30" width="8" height="26" rx="3" fill="#000"></rect>' +
          '<circle cx="50" cy="66" r="5" fill="#000"></circle>' +
        "</svg>"
    },
    GHS09: {
      label: "GHS09 – Pericol pentru mediul acvatic",
      svg:
        '<svg viewBox="0 0 100 100" width="48" height="48" focusable="false">' +
          '<rect x="20" y="20" width="60" height="60" rx="6" fill="#fff" stroke="#e2231a" stroke-width="8" transform="rotate(45 50 50)"></rect>' +
          '<path d="M50 24 L50 46 M50 30 L43 23 M50 30 L57 23 M50 37 L44 31 M50 37 L56 31" stroke="#000" stroke-width="3" stroke-linecap="round" fill="none"></path>' +
          '<path d="M20 53 q7.5 8 15 0 q7.5 8 15 0 q7.5 8 15 0 q7.5 8 15 0" stroke="#000" stroke-width="3" fill="none" stroke-linecap="round"></path>' +
          '<path d="M34 69 q9 -10 20 -2 q-2 5 -10 5 q-6 0 -10 -3 Z" fill="#000"></path>' +
          '<path d="M54 67 l8 -5 l-2 8 z" fill="#000"></path>' +
        "</svg>"
    }
  };

  function pictogramRow(codes) {
    if (!codes || !codes.length) return "";
    return '<div class="edf-pictogram-row">' +
      codes.map(function (code) {
        var p = PICTOGRAMS[code];
        if (!p) return "";
        return '<span class="edf-pictogram" role="img" aria-label="' + p.label + '" title="' + p.label + '">' +
          p.svg +
          '<span class="edf-pictogram-code">' + code + "</span>" +
        "</span>";
      }).join("") +
    "</div>";
  }

  var scents = [
    {
      id: "first-drive",
      name: "First Drive",
      manufacturerFormula: "Vanesica New Car",
      ufi: "VEJ1-E0T3-N00R-WQ07",
      signalWord: "ATENȚIE",
      pictograms: ["GHS07"],
      classifications: [],
      hazardStatements: [],
      precautionaryStatements: [
        { code: "P102", text: "A nu se lăsa la îndemâna copiilor." },
        { code: "P501", text: "Aruncați conținutul/recipientul în conformitate cu reglementările privind deșeurile periculoase sau ambalajele și, respectiv, deșeurile de ambalaje." }
      ],
      supplementalStatements: [
        { code: "EUH208", text: "Conține 2-(4-tert-Butylbenzyl) propionaldehyde, Lysmeral extra, Eugenol, Hexil-cinamaldehidă, Linalool. Poate provoca o reacție alergică." }
      ],
      contains: [],
      ingredients: "methoxymethylbutanol, parfum",
      hasSkinContact: false,
      inhalationNote: false
    },
    {
      id: "merdenea",
      name: "Merdenea",
      manufacturerFormula: "Vanesica Black",
      ufi: "TVN1-P0DY-W00J-CC9T",
      signalWord: "ATENȚIE",
      pictograms: ["GHS07", "GHS09"],
      classifications: ["Skin Sens. 1A"],
      hazardStatements: [
        { code: "H317", text: "Poate provoca o reacție alergică a pielii." }
      ],
      precautionaryStatements: [
        { code: "P101", text: "Dacă este necesară consultarea medicului, țineți la îndemână recipientul sau eticheta produsului." },
        { code: "P102", text: "A nu se lăsa la îndemâna copiilor." },
        { code: "P261", text: "Evitați să inspirați praful/fumul/gazul/ceața/vaporii/spray-ul." },
        { code: "P302+P352", text: "ÎN CAZ DE CONTACT CU PIELEA: spălați cu multă apă." },
        { code: "P501", text: "Aruncați conținutul/recipientul în conformitate cu sistemul de colectare selectivă aplicat în municipiul dvs." }
      ],
      supplementalStatements: [],
      contains: [
        "(z)-3,4,5,6,6-pentamethylhept-3-en-2-one",
        "1-(1,2,3,5,6,7,8,8a-octahydro-2,3,8,8-tetramethyl-2-naphthyl)ethan-1-one",
        "1-(2,6,6-trimethyl-3-cyclohexen-1-yl)-2-buten-1-one",
        "2-(4-tert-Butylbenzyl)propionaldehyde",
        "Lysmeral extra",
        "Cumarină",
        "Dipentan",
        "Hexil-cinamaldehidă",
        "Hidroxi-metilpentilciclohexencarboxaldehidă",
        "Linalil acetat",
        "Linalool",
        "α-methyl-1,3-benzodioxole-5-propionaldehyde"
      ],
      ingredients: "methoxymethylbutanol, parfum",
      hasSkinContact: true,
      inhalationNote: true
    },
    {
      id: "bubblegum",
      name: "Bubblegum",
      manufacturerFormula: "Vanesica Bubble Gum",
      ufi: "0JP1-Q0X5-C00H-N2YA",
      signalWord: "ATENȚIE",
      pictograms: ["GHS07"],
      classifications: ["Aquatic Chronic 3", "Skin Sens. 1B"],
      hazardStatements: [
        { code: "H412", text: "Nociv pentru mediul acvatic cu efecte pe termen lung." },
        { code: "H317", text: "Poate provoca o reacție alergică a pielii." }
      ],
      precautionaryStatements: [
        { code: "P101", text: "Dacă este necesară consultarea medicului, țineți la îndemână recipientul sau eticheta produsului." },
        { code: "P102", text: "A nu se lăsa la îndemâna copiilor." },
        { code: "P302+P352", text: "ÎN CAZ DE CONTACT CU PIELEA: spălați cu multă apă." },
        { code: "P501", text: "Aruncați conținutul/recipientul în conformitate cu sistemul de colectare selectivă aplicat în municipiul dvs." }
      ],
      supplementalStatements: [],
      contains: [
        "Ethyl 2,3-epoxy-3-phenylbutyrate",
        "Linalil acetat",
        "Linalool"
      ],
      ingredients: "methoxymethylbutanol, parfum",
      hasSkinContact: true,
      inhalationNote: false
    },
    {
      id: "octopus",
      name: "Octopus",
      manufacturerFormula: "Vanesica Ocean",
      ufi: "VTK1-H0UF-J00P-G5A8",
      signalWord: "ATENȚIE",
      pictograms: ["GHS07"],
      classifications: ["Aquatic Chronic 3", "Skin Sens. 1"],
      hazardStatements: [
        { code: "H412", text: "Nociv pentru mediul acvatic cu efecte pe termen lung." },
        { code: "H317", text: "Poate provoca o reacție alergică a pielii." }
      ],
      precautionaryStatements: [
        { code: "P102", text: "A nu se lăsa la îndemâna copiilor." },
        { code: "P302+P352", text: "ÎN CAZ DE CONTACT CU PIELEA: spălați cu multă apă." },
        { code: "P501", text: "Aruncați conținutul/recipientul în conformitate cu reglementările privind deșeurile periculoase sau ambalajele și, respectiv, deșeurile de ambalaje." }
      ],
      supplementalStatements: [],
      contains: [
        "(r)-p-mentha-1,8-diene",
        "Linalil acetat",
        "Linalool"
      ],
      ingredients: "methoxymethylbutanol, parfum",
      hasSkinContact: true,
      inhalationNote: false
    },
    {
      id: "cuban-leaf",
      name: "Cuban Leaf",
      manufacturerFormula: "Vanesica Antitabac",
      ufi: "FUH1-V0YA-H009-89WS",
      signalWord: "ATENȚIE",
      pictograms: ["GHS07", "GHS09"],
      classifications: ["Skin Sens. 1B"],
      hazardStatements: [
        { code: "H317", text: "Poate provoca o reacție alergică a pielii." }
      ],
      precautionaryStatements: [
        { code: "P101", text: "Dacă este necesară consultarea medicului, țineți la îndemână recipientul sau eticheta produsului." },
        { code: "P102", text: "A nu se lăsa la îndemâna copiilor." },
        { code: "P302+P352", text: "ÎN CAZ DE CONTACT CU PIELEA: spălați cu multă apă." },
        { code: "P501", text: "Aruncați conținutul/recipientul în conformitate cu sistemul de colectare selectivă aplicat în municipiul dvs." }
      ],
      supplementalStatements: [],
      contains: [
        "(E)-2-benzylideneoctanal",
        "1-(1,2,3,4,5,6,7,8-octahydro-2,3,8,8-tetramethyl-2-naphthyl) ethan-1-one",
        "2-(4-tert-Butylbenzyl) propionaldehyde",
        "Lysmeral extra",
        "4-allylanisole",
        "Cedryl methyl ketone",
        "Cumarină",
        "d-limonen",
        "Eugenol",
        "Geraniol",
        "Linalil acetat",
        "Linalool",
        "Salicilat de benzil",
        "Similar to CAS 127-51-5"
      ],
      ingredients: "methoxymethylbutanol, parfum",
      hasSkinContact: true,
      inhalationNote: false
    }
  ];

  function esc(str) {
    return String(str).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  function statementList(items) {
    if (!items || !items.length) return "";
    return "<ul>" + items.map(function (s) {
      return "<li><strong>" + esc(s.code) + "</strong> — " + esc(s.text) + "</li>";
    }).join("") + "</ul>";
  }

  function renderScentPanel(scent) {
    var panel = document.querySelector("[data-edf-scent-panel]");
    if (!panel || !scent) return;

    var html = "";

    html += '<div class="edf-scent-panel-header">' +
        "<h3>" + esc(scent.name) + "</h3>" +
        '<span class="edf-formula">Formula producătorului: ' + esc(scent.manufacturerFormula) + "</span>" +
      "</div>";

    html += '<div class="edf-clp-top">' +
        '<div class="edf-clp-badge"><span>UFI</span><strong>' + esc(scent.ufi) + "</strong></div>" +
        '<div class="edf-clp-badge"><span>Cuvânt de avertizare</span><strong>' + esc(scent.signalWord) + "</strong></div>" +
      "</div>";

    html += '<div class="edf-clp-block">' +
        "<h4>Pictograme CLP</h4>" +
        pictogramRow(scent.pictograms) +
      "</div>";

    if (scent.hazardStatements.length) {
      html += '<div class="edf-clp-block">' +
          "<h4>Fraze de pericol</h4>" +
          statementList(scent.hazardStatements) +
          (scent.classifications.length ? '<p class="edf-clp-classifications">Clasificare: ' + esc(scent.classifications.join(", ")) + "</p>" : "") +
        "</div>";
    }

    html += '<div class="edf-clp-block">' +
        "<h4>Fraze de precauție</h4>" +
        statementList(scent.precautionaryStatements) +
      "</div>";

    if (scent.supplementalStatements.length) {
      html += '<div class="edf-clp-block">' +
          "<h4>Informații suplimentare</h4>" +
          statementList(scent.supplementalStatements) +
        "</div>";
    }

    if (scent.contains.length) {
      html += '<details class="edf-accordion">' +
          "<summary>Conține (" + scent.contains.length + " substanțe)</summary>" +
          "<ul>" + scent.contains.map(function (c) { return "<li>" + esc(c) + "</li>"; }).join("") + "</ul>" +
        "</details>";
    }

    html += '<div class="edf-clp-block">' +
        "<h4>Ingrediente</h4>" +
        "<p>" + esc(scent.ingredients) + "</p>" +
      "</div>";

    if (scent.hasSkinContact || scent.inhalationNote) {
      html += '<div class="edf-exposure-note">' +
          "<h4>Contact cu pielea</h4>";
      if (scent.hasSkinContact) {
        html += "<p><strong>Spălați cu multă apă.</strong></p>";
      }
      if (scent.inhalationNote) {
        html += "<p>Evitați să inspirați vaporii/spray-ul.</p>";
      }
      html += "</div>";
    }

    panel.innerHTML = html;
  }

  function renderDocs() {
    var list = document.querySelector("[data-edf-doc-list]");
    if (!list) return;

    var rows = scents.map(function (scent) {
      return (
        '<div class="edf-doc-row">' +
          "<strong>" + esc(scent.name) + "</strong>" +
          '<span class="edf-doc-status">' + SDS_PENDING + "</span>" +
        "</div>"
      );
    });

    list.innerHTML = rows.join("");
  }

  function init() {
    var select = document.querySelector("[data-edf-scent-select]");
    if (select) {
      select.innerHTML = scents
        .map(function (scent) {
          return '<option value="' + scent.id + '">' + esc(scent.name) + "</option>";
        })
        .join("");

      select.addEventListener("change", function () {
        var chosen = scents.filter(function (scent) {
          return scent.id === select.value;
        })[0];
        renderScentPanel(chosen);
      });

      renderScentPanel(scents[0]);
    }

    renderDocs();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
