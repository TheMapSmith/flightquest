const fs = require('fs')
const turf = require('turf')
const mapboxgl = require('mapbox-gl')

var airports = ['BTV', 'ATL']

const airportCodes = JSON.parse(fs.readFileSync('data/airportCodes.json', 'utf-8'))
const airportData = JSON.parse(fs.readFileSync('data/airportData.json', 'utf-8'))

function getAirportCoords() {
  var allCoords = []
  for (var i = 0; i <= airports.length; i++) {
    if (i != airports.length) {
      var codeIndex = airportCodes.indexOf(airports[i])
      if (codeIndex > 0) {
        var lnglat = []
        lnglat.push(airportData[codeIndex].Longitude)
        lnglat.push(airportData[codeIndex].Latitude)
        allCoords.push(lnglat)
      }
    } else {
      return allCoords
    }
  }
}

function makePathFeature (line) {
  var lineFeature = {}
  lineFeature.id = airports[0] + ' to ' + airports[1]
  lineFeature.type = 'line'
  lineFeature.source = {}
  lineFeature.source.type = "geojson"
  lineFeature.properties = {}
  lineFeature.source.data = line
  lineFeature.layout = {}
  lineFeature.layout['line-join'] = 'round'
  lineFeature.layout['line-cap'] = 'round'
  lineFeature.paint = {}
  lineFeature.paint['line-color'] = '#ffdd00'
  lineFeature.paint['line-width'] = 9

  return lineFeature
}
