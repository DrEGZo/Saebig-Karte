// Die Karte
let map;

// Gibt an ob gerade alle Landkreise sichtbar sind oder nur einer
let zoomedOut = true;

// Die Layer, die die Landkreise um den ausgewähltem Landkreis abdeckt
let coverLayer;

// Die Layer des ausgewählten Landkreises (wird versteckt beim reinzoomen)
let removedLayer;

let landkreis;

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

function main() {

    // Karte in DOM einfügen und Eigenschaften festlegen
    map = L.map('map', {
        zoomControl: true,              // + / - Knöpfe nicht sichtbar
        zoomSnap: 0.1,                  // Zoomabstufung
        boxZoom: false,                 // deaktiviert Box-Zoom (braucht man eh nicht)
        zoomAnimation: false,           // muss deaktivert werden, sonst funktioniert Responsibilität nicht mehr
        maxBoundsViscosity: 0.8,        // [0-1] legt fest, wie sich die Karte verhält, wenn man sie über die Grenze hinauszieht
        bounceAtZoomLimits: false,      // Brauch man nicht, erzeugt ohnehin Bugs auf Mobilgeräten
        wheelPxPerZoomLevel: 100        // Wie start wird mit Mausrad gezoomt (je höher, desto langsamer)
    });

    // Straßenkarte laden und in Karte einfügen
    L.tileLayer('https://api.maptiler.com/maps/streets/{z}/{x}/{y}.png?key=R7Y2sHW2hgzFomqlOY4W', {
        tileSize: 512,
        zoomOffset: -1,
        minZoom: 1,
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
        let icon = icons[bibodaten[i].state][bibodaten[i].size];
        let marker = L.marker(bibodaten[i].coords, {icon: icon});
        let markerContent = '<div class="markercontent"><div class="content-text">';
        markerContent += '<b>' + bibodaten[i].name + '</b><br>' + bibodaten[i].str + '<br>' + bibodaten[i].plz + ' ' + bibodaten[i].ort + '<br>';
        markerContent += '<a target="_bank" href="' + bibodaten[i].web + '">Website</a></div>';
        markerContent += '<div class="content-img' + (bibodaten[i].img == '' ? ' noImg' : '') + '" ';
        markerContent += 'style="background-image:url(\'' + bibodaten[i].img + '\')"></div>';
        marker.bindPopup(markerContent);
        if (bibodaten[i].lk in markers) markers[bibodaten[i].lk].push(marker);
        else if (bibodaten[i].lk != '') markers[bibodaten[i].lk] = [marker];
    }
    
    // Bei Größenänderung der Karte (durch z.B. Änderung der Fenstergröße Karte neu ausrichten)
    map.on({
        resize: function(e) {
            // Wenn gerade alle Landkreise sichtbar, an Sachsenfläche ausrichten
            if (zoomedOut) fitToBounds([[50.15, 11.84], [51.70, 15.06]], false);
            // sonst an Fläche des ausgewählten Landkreises ausrichten
            else fitToBounds(removedLayer.getBounds(), true);
        }
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
        console.log(lkName)
        if (lkName == 'Görlitz') lkProps.className += ' tooltipLKG';
        if (lkName == 'Nordsachsen') lkProps.className += ' tooltipLKN';
        if (lkName == 'Leipzig' && feature.properties.BEZ == 'Landkreis') lkName = 'LK Leipzig';
        layer.bindTooltip(lkName, lkProps);

        // Eventlistener für die Landkreise
        layer.on({
            
            // MouseOver Event
            mouseover: function(e) {
                // Polygon-Füllung ändern
                e.target.setStyle({ fillOpacity: 0.6 });
            },

            // MouseOut Event
            mouseout: function(e) {
                // Style zurücksetzen
                geojsonLK.resetStyle(e.target);
            },

            // Klick Event
            click: function(e) {
                // Namen des Landkreis setzen
                landkreis = feature.properties.BEZ + ' ' + feature.properties.GEN;
                // Detailansicht des Landkreises anzeigen
                launchDetailedMap(e.target);
            }

        });
    }

    // GeoJSON-Daten (in landkreisdaten-Variable, siehe saxony_accurate.js) einzeichnen
    geojsonLK = L.geoJson(landkreisdaten, { 
        style: { color: '#6AB446', fillColor: '#6AB446' },
        onEachFeature: forAllLKs
    });

    // Definieren der Funktion, die für jedes Lankreis-Polygon ausgeführt wird
    let forAllKRs = function (feature, layer) {

        // Beschriftungen der Landkreise als Tooltip einbinden
        let lkName = feature.properties.GEN; /* LK Name im GeoJSON */
        let lkProps = {
            direction: 'center',    // Zentriert
            permanent: true,        // die ganze Zeit sichtbar
            className: 'tooltip'    // CSS-Klasse für Tooltips, siehe style.css
        }
        if (lkName == 'Meißen<br>Sächsische Schweiz<br>Osterzgebirge') lkProps.className += ' tooltipKRMSO';
        if (lkName == 'Mittelsachsen<br>Erzgebirge') lkProps.className += ' tooltipKRME';
        if (lkName == 'Leipziger Raum') lkProps.className += ' tooltipKRL';
        layer.bindTooltip(lkName, lkProps);

        // Eventlistener für die Landkreise
        layer.on({

            // MouseOver Event
            mouseover: function (e) {
                // Polygon-Füllung ändern
                e.target.setStyle({ fillOpacity: 0.6 });
            },

            // MouseOut Event
            mouseout: function (e) {
                // Style zurücksetzen
                geojsonKR.resetStyle(e.target);
            },

            // Klick Event
            click: function (e) {
                // Namen des Landkreis setzen
                landkreis = feature.properties.BEZ + ' ' + feature.properties.GEN;
                // Detailansicht des Landkreises anzeigen
                launchDetailedMap(e.target);
            }

        });
    }

    // GeoJSON-Daten (in landkreisdaten-Variable, siehe saxony_accurate.js) einzeichnen
    geojsonKR = L.geoJson(kulturraumdaten, {
        style: { color: '#6AB446', fillColor: '#6AB446' },
        onEachFeature: forAllKRs
    });

    // Zurück-Knopf initialisieren
    document.getElementById('return-button').addEventListener('click', launchBaseMap);

    // Checkbox umschalten, wenn auf Label geklickt
    document.getElementById('select-all').addEventListener('click', function (e) {
        if (this == e.target) {
            this.querySelector('input').checked = !this.querySelector('input').checked;
            this.querySelector('input').dispatchEvent(new Event('change'));
        }
    });

    // Alle Bibos anzeigen wenn Checkbox checked
    document.querySelector('#select-all input').checked = false;
    document.querySelector('#select-all input').addEventListener('change', function(e) {
        if (this.checked) {
            for (let lk in markers) {
                for (let i = 0; i < markers[lk].length; i++) markers[lk][i].addTo(map);
            }
        } else {
            if (zoomedOut) launchBaseMap();
            else {
                console.log('a')
                for (let lk in markers) {
                    if (lk == landkreis) {
                        for (let i = 0; i < markers[lk].length; i++) markers[lk][i].addTo(map);
                    } else {
                        for (let i = 0; i < markers[lk].length; i++) markers[lk][i].removeFrom(map);
                    }
                }
            }
        }
    });

    document.getElementById('selectLks').addEventListener('click', function (e) {
        if (this == e.target) {
            if (!this.querySelector('input').checked) {
                this.querySelector('input').checked = true;
                this.querySelector('input').dispatchEvent(new Event('change'));
            }
        }
    });
    document.querySelector('#selectLks input').checked = true;
    document.querySelector('#selectLks input').addEventListener('change', function (e) {
        if (this.checked) zuLandkreiseWechseln(true);
    });

    document.getElementById('selectKrs').addEventListener('click', function (e) {
        if (this == e.target) {
            if (!this.querySelector('input').checked) {
                this.querySelector('input').checked = true;
                this.querySelector('input').dispatchEvent(new Event('change'));
            }
        }
    });
    document.querySelector('#selectKrs input').addEventListener('change', function (e) {
        if (this.checked) zuLandkreiseWechseln(false);
    });

    // Übersichtskarte aller Landkreise initialisieren
    launchBaseMap();
}


// Funktion zur Initialisierung der Landkreisübersicht
function launchBaseMap() {

    // Zustandsvariable setzen
    zoomedOut = true;

    // Karte auf Sachsengrenzen ausrichten
    fitToBounds([[50.15, 11.84], [51.70, 15.06]], false);

    // Straßenkarte abdecken
    streetCover.addTo(map).bringToBack();

    // Die Layer, die angrenzende Landkreise abdeckt entfernen
    if (coverLayer) map.removeLayer(coverLayer);

    zuLandkreiseWechseln(document.querySelector('#selectLks input').checked);

    // Falls eine Landkreis-Layer zuvor entfernt wurde, jetzt wieder hinzufügen
    if (removedLayer) removedLayer.fire('mouseout').addTo(map);
    // (das mouseOut Event ist dafür dass der Landkreis seinen unrsprünglichen Style annimmt)

    // Marker verstecken
    if (!document.querySelector('#select-all input').checked) {
        for (let lk in markers) {
            for (let i = 0; i < markers[lk].length; i++) markers[lk][i].removeFrom(map);
        }
    }

    // Zurück-Knopf verstecken
    document.getElementById('return-button').style.display = 'none';
}


// Funktion zur Initialisierung der Ansicht eines Landkreises
// selectedLayer-Parameter ist Layer des gewählten Landkreises
function launchDetailedMap(selectedLayer) {
    
    // Zustandsvariable setzen
    zoomedOut = false;

    // Karte auf Grenzen des Landkreises ausrichten
    fitToBounds(selectedLayer.getBounds(), true);
    
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

    // globale Variable removedLayer auf ausgewählten Landkreis setzen
    removedLayer = selectedLayer;

    // Das angeklickte Landkreis-Polygon entfernen
    // removedLayer.remove()
    geojsonKR.remove();
    geojsonLK.remove();

    // Straßen sichtbar machen
    streetCover.remove();

    // Nur die Marker des Landkreises anzeigen
    if (!document.querySelector('#select-all input').checked) {
        for (let lk in markers) {
            if (istInLandkreis(lk, landkreis)) {
                for (let i = 0; i < markers[lk].length; i++) markers[lk][i].addTo(map);
            } else {
                for (let i = 0; i < markers[lk].length; i++) markers[lk][i].removeFrom(map);
            }
        }
    }

    // Zurück-Knopf anzeigen
    document.getElementById('return-button').style.display = 'block';
}



// Funktion zur Anpassung der Karte auf einen bestimmten Bereich
// bounds-Parameter gibt Bereich vor, der sichtbar sein muss
// allowZoom gibt an, ob reingezoomt werden darf
function fitToBounds(bounds, allowZoom) {

    // aktuelle Restriktionen entfernen, um Änderungen der Ausrichtung zu ermöglichen
    map.setMinZoom(0).setMaxZoom(18).setMaxBounds(null);

    // Karte an neuen Bereich ausrichten
    map.fitBounds(bounds);

    // Aktuelle Zoomstufe auslesen
    let zoom = map.getZoom();
    
    // Neue Begrenzung festlegen und weiteres Rauszoomen verhindern
    map.setMinZoom(zoom).setMaxBounds(bounds);

    // Wenn Zoomen komplett verboten sein soll, dann auch weiteres Reinzoomen verhindern
    if (!allowZoom) map.setMaxZoom(zoom);
}

function zuLandkreiseWechseln(bool) {
    if (bool) {
        geojsonKR.removeFrom(map);
        geojsonLK.addTo(map);
    } else {
        geojsonLK.removeFrom(map);
        geojsonKR.addTo(map);
    }
}

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

// Wenn DOM gelanden, main ausführen
window.onload = main;