// Die Karte
let map;

// Gibt an ob gerade alle Landkreise sichtbar sind oder nur einer
let zoomedOut = true;

// Die Layer, die die Landkreise um den ausgewähltem Landkreis abdeckt
let coverLayer;

// Die Layer des ausgewählten Landkreises (wird versteckt beim reinzoomen)
let removedLayer;

// Ein weißes Rechteck, das die Straßenkarte versteckt (im rausgezoomten Zustand)
let streetCover = L.rectangle([[0, 0], [90, 180]], {
    fillColor: '#fff',
    fillOpacity: 1
});

// Die Koordinaten, die nötig sind, um ein Polygon auf der Karte zu invertieren 
// (wichtig für coverLayer)
const vectorInverter = [[0, 90], [180, 90], [180, -90], [0, -90], [-180, -90], [-180, 0], [-180, 90], [0, 90]];



function main() {

    // Karte in DOM einfügen und Eigenschaften festlegen
    map = L.map('map', {
        zoomControl: false,             // + / - Knöpfe nicht sichtbar
        zoomSnap: 0.1,                  // Zoomabstufung
        boxZoom: false,                 // deaktiviert Box-Zoom (braucht man eh nicht)
        zoomAnimation: false,           // muss deaktivert werden, sonst funktioniert Responsibilität nicht mehr
        maxBoundsViscosity: 0.8,        // [0-1] legt fest, wie sich die Karte verhält, wenn man sie über die Grenze hinauszieht
        bounceAtZoomLimits: false,      // Brauch man nicht, erzeugt ohnehin Bugs auf Mobilgeräten
        wheelPxPerZoomLevel: 300,       // Wie start wird mit Mausrad gezoomt (je höher, desto langsamer)
        dragging: false                 // Karte nicht mit Maus verschiebbar -> Pfeiltasten! (kann man evt. wieder entfernen)
    });

    // Straßenkarte laden und in Karte einfügen
    L.mapboxGL({
        attribution: '<a href="https://www.maptiler.com/copyright/" target="_blank">© MapTiler</a> <a href="https://www.openstreetmap.org/copyright" target="_blank">© OpenStreetMap contributors</a>',
        accessToken: 'not-needed',
        style: 'https://api.maptiler.com/maps/streets/style.json?key=R7Y2sHW2hgzFomqlOY4W'
    }).addTo(map);

    // Übersichtskarte aller Landkreise initialisieren
    launchBaseMap();
    
    // Bei Größenänderung der Karte (durch z.B. Änderung der Fenstergröße Karte neu ausrichten)
    map.on({
        resize: function(e) {
            // Wenn gerade alle Landkreise sichtbar, an Sachsenfläche ausrichten
            if (zoomedOut) fitToBounds([[50.15, 11.84], [51.70, 15.06]], false);
            // sonst an Fläche des ausgewählten Landkreises ausrichten
            else fitToBounds(removedLayer.getBounds(), true);
        }
    });

    // Variable für das GeoJSON (muss vor Event-Listenern definiert sein)
    let geojson;

    // Definieren der Funktion, die für jedes Lankreis-Polygon ausgeführt wird
    let forAll = function (feature , layer) {
        
        // Beschriftungen der Landkreise als Tooltip einbinden
        layer.bindTooltip(feature.properties.GEN /* LK Name im GeoJSON */, {
            direction: 'center',    // Zentriert
            permanent: true,        // die ganze Zeit sichtbar
            className: 'tooltip'    // CSS-Klasse für Tooltips, siehe style.css
        });

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
                geojson.resetStyle(e.target);
            },

            // Klick Event
            click: function(e) {
                // Detailansicht des Landkreises anzeigen
                launchDetailedMap(e.target);
            }

        });
    }

    // GeoJSON-Daten (in landkreisdaten-Variable, siehe saxony_accurate.js) einzeichnen
    geojson = L.geoJson(landkreisdaten, { 
        style: { color: '#6AB446', fillColor: '#6AB446' },
        onEachFeature: forAll
    }).addTo(map);
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

    // Falls eine Landkreis-Layer zuvor entfernt wurde, jetzt wieder hinzufügen
    if (removedLayer) removedLayer.fire('mouseout').addTo(map);
    // (das mouseOut Event ist dafür dass der Landkreis seinen unrsprünglichen Style annimmt)
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
    removedLayer.remove()

    // Straßen sichtbar machen
    streetCover.remove();
}



// Funktion zur Anpassung der Karte auf einen bestimmten Bereich
// bounds-Parameter gibt Bereich vor, der sichtbar sein muss
// allowZoom gibt an, ob reingezoomt werden darf
function fitToBounds(bounds, allowZoom) {

    // aktuelle Restriktionen entfernen, um Änderungen der Ausrichtung zu ermöglichen
    map.setMinZoom(0).setMaxZoom(20).setMaxBounds(null);

    // Karte an neuen Bereich ausrichten
    map.fitBounds(bounds);

    // Aktuelle Zoomstufe auslesen
    let zoom = map.getZoom();
    
    // Neue Begrenzung festlegen und weiteres Rauszoomen verhindern
    map.setMinZoom(zoom).setMaxBounds(bounds);

    // Wenn Zoomen komplett verboten sein soll, dann auch weiteres Reinzoomen verhindern
    if (!allowZoom) map.setMaxZoom(zoom);
}

// Wenn DOM gelanden, main ausführen
window.onload = main;