let fs = require('fs');
let d3 = require('d3-geo');

let daten = fs.readFileSync(__dirname + '/lks.json');
let bibos = fs.readFileSync(__dirname + '/data.json');

daten = JSON.parse(daten);
bibos = JSON.parse(bibos);

for (let i = 0; i < bibos.length; i++) {
    let found = false;
    for (let j = 0; j < daten.features.length; j++) {
        let lk = daten.features[j];
        let inside = d3.geoContains(lk, [bibos[i].coords[1], bibos[i].coords[0]])
        if (inside) {
            if (found) console.log('2: ' + bibos[i].name);
            else {
                found = true;
                bibos[i].lk = lk.properties.BEZ + ' ' + lk.properties.GEN;
            }
        }
    }
    if (!found) {
        console.log('0: ' + bibos[i].name + ' ' + bibos[i].ort);
        bibos[i].lk = '';
    }
}

fs.writeFileSync(__dirname + '/data2.json', JSON.stringify(bibos));

//console.log(daten.features[0].geometry.coordinates[0][0])

//console.log(d3.geoContains(daten.features[0], [13.630135,51.088286]))

