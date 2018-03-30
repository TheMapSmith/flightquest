const fs = require('fs')

var airports = ['BTV', 'ATL']

const airportCodes = JSON.parse(fs.readFileSync('data/airportCodes.json', 'utf-8'))
const airportData = JSON.parse(fs.readFileSync('data/airportData.json', 'utf-8'))

getIATA();

function getIATA() {
  for (var i = 0; i < airports.length; i++) {
    var codeIndex = airportCodes.indexOf(airports[i])
    if (codeIndex > 0) {
      console.log(airportData[codeIndex]);
    }
  }
}
