let fs = require('fs');

let bibos = JSON.parse(fs.readFileSync(__dirname + '/data.json'));

for (i = 0; i < bibos.length; i++) {
    
    /* delete bibos[i]["PLZ + Ort"];
    bibos[i].state = parseInt(bibos[i].state);
    bibos[i].size = parseInt(bibos[i].size); */

    /* bibos[i].coords = [
        Math.round(parseFloat(bibos[i]["Breite"]) * 1000000) / 1000000,
        Math.round(parseFloat(bibos[i]["Länge"]) * 1000000) / 1000000
    ]; */
    
    /* delete bibos[i]["Breite"];
    delete bibos[i]["Länge"]; */
}

fs.writeFileSync(__dirname + '/data.json', JSON.stringify(bibos));