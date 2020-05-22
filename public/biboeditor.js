/**
 * Tool zur schnellen Bearbeitung der Bibliotheksliste.
 * ACHTUNG: Ließt JSON ein und gibt JSON aus - kein JS!
 */

let fs = require('fs');

let bibos = JSON.parse(fs.readFileSync(__dirname + '/data3.json'));

for (i = 0; i < bibos.length; i++) {
    
    // Hier kommt das rein, was verändert werden soll.

}

fs.writeFileSync(__dirname + '/data.json', JSON.stringify(bibos));