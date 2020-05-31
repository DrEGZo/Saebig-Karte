// Die Karte
let map;

// Die Layer, die die Landkreise um den ausgewähltem Landkreis abdeckt
let coverLayer;

// Die Layer des ausgewählten Landkreises
let selectedLayer = null;

// Name des ausgewählten Landkreises
let landkreis = null;

// Ein weißes Rechteck, das die Straßenkarte versteckt (im rausgezoomten Zustand)
let streetCover = L.rectangle([[0, 0], [90, 180]], {
    fillColor: '#fff',
    fillOpacity: 1
});

// Objekt für gesetzte Marker
let markers = {}

// Die Koordinaten, die nötig sind, um ein Polygon auf der Karte zu invertieren
// (wichtig für coverLayer)
const vectorInverter = [[0, 90], [180, 90], [180, -90], [0, -90], [-180, -90], [-180, 0], [-180, 90], [0, 90]];

// Variable für das GeoJSON (muss vor Event-Listenern definiert sein)
let geojsonLK;
let geojsonKR;

// Koordinaten der Box, welche Sachsen enthält
const saxonyBox = [[50.15, 11.84], [51.70, 15.06]];

function main() {

    // Karte in DOM einfügen und Eigenschaften festlegen
    map = L.map('map', {
        zoomControl: true,              // + / - Knöpfe nicht sichtbar
        zoomSnap: 0.1,                  // Zoomabstufung
        boxZoom: false,                 // deaktiviert Box-Zoom (braucht man eh nicht)
        zoomAnimation: false,           // muss deaktivert werden, sonst funktioniert Responsibilität nicht mehr
        maxBoundsViscosity: 0.8,        // [0-1] legt fest, wie sich die Karte verhält, wenn man sie über die Grenze hinauszieht
        bounceAtZoomLimits: false,      // Brauch man nicht, erzeugt ohnehin Bugs auf Mobilgeräten
        wheelPxPerZoomLevel: 150,        // Wie start wird mit Mausrad gezoomt (je höher, desto langsamer)
        maxBounds: saxonyBox,
        maxZoom: 18
    });

    // Straßenkarte laden und in Karte einfügen
    L.tileLayer('https://api.maptiler.com/maps/streets/{z}/{x}/{y}.png?key=R7Y2sHW2hgzFomqlOY4W', {
        tileSize: 512,
        zoomOffset: -1,
        attribution: '<a href="https://www.maptiler.com/copyright/" target="_blank">© MapTiler</a> <a href="https://www.openstreetmap.org/copyright" target="_blank">© OpenStreetMap contributors</a>',
        crossOrigin: true
    }).addTo(map);

    // Erstellen der Marker Icons
    let icons = [
        [
            L.icon({
                iconUrl: 'iconW.svg',
                iconSize: [16, 19.2],
                iconAnchor: [8, 19.2],
                popupAnchor: [0, -21]
            }),
            L.icon({
                iconUrl: 'iconW.svg',
                iconSize: [22, 26.4],
                iconAnchor: [12, 26.4],
                popupAnchor: [0, -21]
            }),
            L.icon({
                iconUrl: 'iconW.svg',
                iconSize: [30, 36],
                iconAnchor: [15, 36],
                popupAnchor: [0, -21]
            })
        ],
        [
            L.icon({
                iconUrl: 'iconO.svg',
                iconSize: [15, 18],
                iconAnchor: [7.5, 18],
                popupAnchor: [0, -21]
            }),
            L.icon({
                iconUrl: 'iconO.svg',
                iconSize: [22, 26.4],
                iconAnchor: [12, 26.4],
                popupAnchor: [0, -21]
            }),
            L.icon({
                iconUrl: 'iconO.svg',
                iconSize: [30, 36],
                iconAnchor: [15, 36],
                popupAnchor: [0, -21]
            })
        ]
    ];

    // Hinzufügen der Marker sortiert nach Landkreis mit Popup (vorerst unsichtbar)
    for (let i = 0; i < bibodaten.length; i++) {
        let marker = L.marker(bibodaten[i].coords, {
            icon: icons[bibodaten[i].state][bibodaten[i].size],
            state: bibodaten[i].state,
            size: bibodaten[i].size,
            name: bibodaten[i].name,
            ort: bibodaten[i].ort
        });
        let markerContent = '<div class="markercontent"><div class="content-text">';
        markerContent += '<b>' + bibodaten[i].name + '</b><br>' + bibodaten[i].str + '<br>' + bibodaten[i].plz + ' ' + bibodaten[i].ort + '<br>';
        markerContent += '<a target="_bank" href="' + bibodaten[i].web + '">Website</a></div>';
        markerContent += '<div class="content-img' + (bibodaten[i].img == '' ? ' noImg' : '') + '" ';
        markerContent += 'style="background-image:url(\'' + bibodaten[i].img + '\')" onclick="openOverlay(\'' + bibodaten[i].img + '\', \'Max Mustermann\')"></div>';
        marker.bindPopup(markerContent);
        if (bibodaten[i].lk in markers) markers[bibodaten[i].lk].push(marker);
        else if (bibodaten[i].lk != '') markers[bibodaten[i].lk] = [marker];
    }

    // Eventlistener für Karte: Bei Größenänderung und Zoomen
    map.on({
        resize: function(e) {
            map.setMinZoom(0);
            onZoomed();
        },
        zoom: onZoomed
    });

    // Definieren der Funktion, die für jedes Lankreis-Polygon ausgeführt wird
    let forAllLKs = function (feature, layer) {

        // Beschriftungen der Landkreise als Tooltip einbinden
        let lkName = feature.properties.GEN; /* LK Name im GeoJSON */
        let lkProps = {
            direction: 'center',    // Zentriert
            permanent: true,        // die ganze Zeit sichtbar
            className: 'tooltip'    // CSS-Klasse für Tooltips, siehe style.css
        }

        // Extra-Klassen, um bei "abwegigen" Landkreisnamen die Position zu korrigieren
        if (lkName == 'Görlitz') lkProps.className += ' tooltipLKG';
        if (lkName == 'Nordsachsen') lkProps.className += ' tooltipLKN';
        if (lkName == 'Leipzig' && feature.properties.BEZ == 'Landkreis') lkName = 'LK Leipzig';

        // Beschriftung anbinden
        layer.bindTooltip(lkName, lkProps);

        // Eventlistener für die Landkreise
        layer.on({
            mouseover: function(e) {
                // Polygon-Füllung ändern
                e.target.setStyle({ fillOpacity: 0.6 });
            },
            mouseout: function(e) {
                // Style zurücksetzen
                geojsonLK.eachLayer(layer => { geojsonLK.resetStyle(layer); });
            },
            click: function(e) {
                // Namen des Landkreis setzen und Layer merken
                landkreis = feature.properties.BEZ + ' ' + feature.properties.GEN;
                selectedLayer = e.target;
                // Reinzoomen und Landkreis umranden
                focusOnArea();
            }

        });
    }

    // GeoJSON-Daten (in landkreisdaten-Variable, siehe landkreise.js) einzeichnen
    geojsonLK = L.geoJson(landkreisdaten, {
        style: { color: '#6AB446', fillColor: '#6AB446' },
        onEachFeature: forAllLKs
    });

    // Definieren der Funktion, die für jedes Kulturraum-Polygon ausgeführt wird
    let forAllKRs = function (feature, layer) {

        // Beschriftungen der Kulturräume als Tooltip einbinden
        let krName = feature.properties.GEN; /* KR Name im GeoJSON */
        let lkProps = {
            direction: 'center',    // Zentriert
            permanent: true,        // die ganze Zeit sichtbar
            className: 'tooltip'    // CSS-Klasse für Tooltips, siehe style.css
        }

        // Extra-Klassen, um bei "abwegigen" Kulturraumnamen die Position zu korrigieren
        if (krName == 'Meißen<br>Sächsische Schweiz<br>Osterzgebirge') lkProps.className += ' tooltipKRMSO';
        if (krName == 'Mittelsachsen<br>Erzgebirge') lkProps.className += ' tooltipKRME';
        if (krName == 'Leipziger Raum') lkProps.className += ' tooltipKRL';

        // Tooltip anbinden
        layer.bindTooltip(krName, lkProps);

        // Eventlistener für die Kulturräume
        layer.on({
            mouseover: function (e) {
                // Polygon-Füllung ändern
                e.target.setStyle({ fillOpacity: 0.6 });
            },
            mouseout: function (e) {
                // Style zurücksetzen
                geojsonKR.eachLayer(layer => { geojsonKR.resetStyle(layer) });
            },
            click: function (e) {
                // Namen des Kulturraums setzen und Layer merken
                landkreis = feature.properties.BEZ + ' ' + feature.properties.GEN;
                selectedLayer = e.target;
                // Reinzoomen und Kulturraum umranden
                focusOnArea();
            }

        });
    }

    // GeoJSON-Daten (in kulturraumdaten-Variable, siehe kulturraeume.js) einzeichnen
    geojsonKR = L.geoJson(kulturraumdaten, {
        style: { color: '#6AB446', fillColor: '#6AB446' },
        onEachFeature: forAllKRs
    });

    // Event-Listener für die Switch zwischen Landkreisen und Kulturräumen
    document.getElementById('selectLks').addEventListener('click', function (e) {
        let input = this.querySelector('input');
        if (!input.checked) input.checked = true;
        input.dispatchEvent(new Event('change'));
    });
    document.querySelector('#selectLks input').addEventListener('change', function (e) {
        if (this.checked) zuLandkreiseWechseln(true);
    });

    document.getElementById('selectKrs').addEventListener('click', function (e) {
        let input = this.querySelector('input');
        if (!input.checked) input.checked = true;
        input.dispatchEvent(new Event('change'));
    });
    document.querySelector('#selectKrs input').addEventListener('change', function (e) {
        if (this.checked) zuLandkreiseWechseln(false);
    });

    // Event-Listener für den Close-Button der Bildvorschau
    document.getElementById('overlay-close').addEventListener('click', function(evt) {
        document.getElementById('overlay').style.display = 'none';
    });

    // Karte ausrichten und initiierendes Zoom-Event aufrufen
    map.fitBounds(saxonyBox);
    onZoomed();
}

// Funktion zum Zoom auf ein bestimmtes Gebiet
// selectedLayer-Parameter ist Layer des gewählten Gebiets
function focusOnArea() {

    // Die GeoJSON-Koordinaten des Landkreises auslesen
    let coordinates = selectedLayer.feature.geometry.coordinates[0];

    // Neues GeoJSON erstellen, welches Invertierung des Landkreises darstellt
    // siehe https://stackoverflow.com/a/55897712
    let geoJson = {
        type: 'Feature',
        properties: {},
        geometry: {
            type: 'MultiPolygon',
            coordinates: [[vectorInverter, coordinates]]
        }
    }

    // Das invertierte GeoJSON in die Coverlayer laden, stylen und zur Karte hinzufügen
    coverLayer = L.geoJSON(geoJson, {
        style: {
            color: '#000000',
            fillColor: '#ffffff',
            fillOpacity: 0.7
        }
    }).addTo(map);

    // Karte auf Grenzen des Landkreises ausrichten
    map.fitBounds(selectedLayer.getBounds())

    // Zoom-Event auslösen
    onZoomed();
}

// Diese Funktion ermittelt, was von der Karte aktuell sichtbar ist
// und entscheidet dann, ob die Übersichts-/Straßenkarte etc. angezeigt wird.
function onZoomed() {
    // Breite und Höhe der Sachsenbox
    let maxSpan = [saxonyBox[1][0] - saxonyBox[0][0], saxonyBox[1][1] - saxonyBox[0][1]];
    // Breite und Höhe des aktuellen Ausschnitts
    let bounds = map.getBounds();
    let currentSpan = [bounds._northEast.lat - bounds._southWest.lat, bounds._northEast.lng - bounds._southWest.lng];
    // Breite und Höhe des ausgewählten Gebietes (0 wenn keins ausgewählt)
    let selectedSpan = [0, 0];
    if (selectedLayer !== null) {
        bounds = selectedLayer.getBounds();
        selectedSpan = [bounds._northEast.lat - bounds._southWest.lat, bounds._northEast.lng - bounds._southWest.lng];
    }
    // Falls schon ganz rausgezoomt, kein weiteres Rauszoomen zulassen
    if (currentSpan[0] >= maxSpan[0] && currentSpan[1] >= maxSpan[1]) map.setMinZoom(map.getZoom());
    // Vergleich der Höhen und Breiten und damit Entscheidung, welcher Kartenmodus angezeigt wird
    if (currentSpan[0] > maxSpan[0] * 0.6 && currentSpan[1] > maxSpan[1] * 0.6) mapMode0();
    else if (currentSpan[0] > selectedSpan[0] * 1.4 && currentSpan[1] > selectedSpan[1] * 1.4) mapMode1();
    else mapMode2();
}

// Kartenmodus 0: Schematische Darstellung der Landkreise/Kulturräume, keine Straßenkarte
function mapMode0() {
    streetCover.addTo(map).bringToBack();
    if (coverLayer) map.removeLayer(coverLayer);
    geojsonLK.eachLayer(layer => { geojsonLK.resetStyle(layer) });
    geojsonKR.eachLayer(layer => { geojsonKR.resetStyle(layer) });
    zuLandkreiseWechseln(document.querySelector('#selectLks input').checked);
    refreshMarker(true);
}

// Kartenmodus 1: Darstellung der Straßenkarte, keine Einrahmung eines Gebietes
function mapMode1() {
    if (coverLayer) map.removeLayer(coverLayer);
    geojsonKR.remove();
    geojsonLK.remove();
    streetCover.remove();
    refreshMarker(true);
}

// Kartenmodus 2: Darstellung der Straßenkarte mit Rahmen um ausgewähltes Gebiet.
function mapMode2() {
    geojsonKR.remove();
    geojsonLK.remove();
    streetCover.remove();
    refreshMarker(true);
}

// Wechselfunktion zwischen Landkreisansicht und Kulturraumansicht
function zuLandkreiseWechseln(bool) {
    if (bool) {
        geojsonKR.removeFrom(map);
        geojsonLK.addTo(map);
    } else {
        geojsonLK.removeFrom(map);
        geojsonKR.addTo(map);
    }
}

// OBSOLET, bei Gelegenheit entfernen (zusammen mit allen Komponenten)
// Prüft, ob der Landkreis einer Bibo Teil des ausgewählten Gebietes ist
function istInLandkreis(lk, gebiet) {
    if (lk == gebiet) return true;
    let lk_kr_map = {
        ' Meißen<br>Sächsische Schweiz<br>Osterzgebirge': [
            'Landkreis Sächsische Schweiz<br>Osterzgebirge',
            'Landkreis Meißen'
        ],
        ' Mittelsachsen<br>Erzgebirge': [
            'Landkreis Mittelsachsen',
            'Landkreis Erzgebirgskreis'
        ],
        ' Zwickau<br>Vogtland': [
            'Landkreis Zwickau',
            'Landkreis Vogtlandkreis'
        ],
        ' Leipziger Raum': [
            'Landkreis Nordsachsen',
            'Landkreis Leipzig',
            'Kreisfreie Stadt Leipzig'
        ],
        ' Oberlausitz Niederschlesien': [
            'Landkreis Bautzen',
            'Landkreis Görlitz'
        ],
        ' Dreden': ['Kreisfreie Stadt Dresden'],
        ' Leipzig': ['Kreisfreie Stadt Leipzig'],
        ' Chemnitz': ['Kreisfreie Stadt Chemnitz']
    }
    if (gebiet in lk_kr_map) return lk_kr_map[gebiet].indexOf(lk) != -1;
    return false;
}

// Öffnet die Bildvorschau
function openOverlay(url, auth) {
    let overlay = document.getElementById('overlay');
    let img = document.getElementById('overlay-img');
    let author = document.getElementById('overlay-auth');
    img.style.backgroundImage = 'url(\'' + url + '\')';
    img.addEventListener('click', function(evt) {
        if (this == evt.target) window.open(url);
    });
    author.innerText = auth;
    overlay.style.display = 'flex';
}

//zoomt auf die betroffene Bibliothek
function findLibrary(findme){
    
}

// Aktualisiert die Anzeige der Marker
function refreshMarker(allowShow) {

    let all = document.querySelector('#select-all input').checked;
    let wb = document.querySelector('#filter-wb input').checked;
    let wb0 = document.querySelector('#filter-wb-0 input').checked;
    let wb1 = document.querySelector('#filter-wb-1 input').checked;
    let wb2 = document.querySelector('#filter-wb-2 input').checked;
    let oeb = document.querySelector('#filter-oeb input').checked;
    let oeb0 = document.querySelector('#filter-oeb-0 input').checked;
    let oeb1 = document.querySelector('#filter-oeb-1 input').checked;
    let oeb2 = document.querySelector('#filter-oeb-2 input').checked;

    let search = document.querySelector('#search input').value.toUpperCase();


    if (search) {
      let searchresults = [];  //array mit den suchergebnissen
      let searchi = []; //array mit der stell in den bibodaten, war shcon spät, mir ist nichts besseres eingefallen
      [...document.getElementsByClassName("dela")].map(n => n && n.remove());
      for (let i = 0; i < bibodaten.length; i++) {
         if((bibodaten[i].name.toUpperCase().includes(search))||(bibodaten[i].ort.toUpperCase().includes(search))){
            searchresults.push(bibodaten[i]);
            searchi.push(i);
         }
        }
        let searchBox = document.getElementById('search-result');
        if (searchresults.length > 0) searchBox.style.display = 'block';
        else searchBox.style.display = 'none';
      for (let b = 0; b < searchresults.length; b++){
        if(b>9){
            break;
        }
        lia = document.createElement("a");
        lia.className = "dela";
        lia.id = "a"+b;
        lia.setAttribute("onclick","findLibrary('"+ searchi[b] +"');");
        lia.innerHTML = searchresults[b].name + " " + searchresults[b].ort;
        document.getElementById("search-result").appendChild(lia);
      }
    } else{
        [...document.getElementsByClassName("dela")].map(n => n && n.remove());
    }

      for (let lk in markers) {
          for (let i = 0; i < markers[lk].length; i++) {
              let show = false;
              let opt = markers[lk][i].options;
              if (all) show = true;
              else if (opt.state == 0) {
                  if (wb || (opt.size == 0 && wb0) || (opt.size == 1 && wb1) || (opt.size == 2 && wb2)) show = true;
              } else if (opt.state == 1) {
                  if (oeb || (opt.size == 0 && oeb0) || (opt.size == 1 && oeb1) || (opt.size == 2 && oeb2)) show = true;
              }
              if (!(allowShow || istInLandkreis(lk, landkreis))) show = false;
              if (show) markers[lk][i].addTo(map);
              else markers[lk][i].removeFrom(map);
          };
      }

    }

// Wenn DOM gelanden, main ausführen
window.onload = main;
