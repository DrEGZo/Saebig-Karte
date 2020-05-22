/**
 * Dieser Script ließt ein GeoJSON von Landkreisen ein
 * und gibt ein GeoJSON von Kulturräumen aus.
 * Input: lks.json, output: krs.json
 * Nur auf Sachsen anwendbar.
 */

let turf = require('@turf/union');
let fs = require('fs');

let daten = JSON.parse(fs.readFileSync(__dirname + '/lks.json'));

let result = {
    type: "FeatureCollection",
    features: [
        turf.default(daten.features[6], daten.features[2]),
        turf.default(daten.features[8], daten.features[3]),
        turf.default(daten.features[11], daten.features[1]),
        turf.default(turf.default(daten.features[4], daten.features[10]), daten.features[7]),
        turf.default(daten.features[5], daten.features[9])
    ]
};

result.features[3].geometry.coordinates.push(daten.features[10].geometry.coordinates[0]);

result.features[0].properties.BEZ = '';
result.features[0].properties.GEN = 'Meißen<br>Sächsische Schweiz<br>Osterzgebirge';
result.features[1].properties.BEZ = '';
result.features[1].properties.GEN = 'Mittelsachsen<br>Erzgebirge';
result.features[2].properties.BEZ = '';
result.features[2].properties.GEN = 'Zwickau<br>Vogtland';
result.features[3].properties.BEZ = '';
result.features[3].properties.GEN = 'Leipziger Raum';
result.features[4].properties.BEZ = '';
result.features[4].properties.GEN = 'Oberlausitz Niederschlesien';

result.features.push({
    type: 'Feature',
    properties: {
        BEZ: '',
        GEN: 'Dresden'
    },
    geometry: daten.features[0].geometry
});
result.features.push({
    type: 'Feature',
    properties: {
        BEZ: '',
        GEN: 'Leipzig'
    },
    geometry: daten.features[10].geometry
});
result.features.push({
    type: 'Feature',
    properties: {
        BEZ: '',
        GEN: 'Chemnitz'
    },
    geometry: daten.features[12].geometry
});

fs.writeFile(__dirname + '/krs.json', JSON.stringify(result));