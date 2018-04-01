const fs = require('fs')
const turf = require('turf')

var airports = ['BTV', 'ATL']

const airportCodes = JSON.parse(fs.readFileSync('data/airportCodes.json', 'utf-8'))
const airportData = JSON.parse(fs.readFileSync('data/airportData.json', 'utf-8'))

// getAirportCoords();

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
      setbbox(allCoords)
    }
  }
}

function setbbox(allCoords) {

  var line = turf.lineString(allCoords)
  var bbox = turf.bbox(line)

  var llb = mapboxgl.LngLatBounds.convert(bbox)

  return llb

  // NOTE: https://www.mapbox.com/mapbox-gl-js/api/#lnglatboundslike
  // Must be [SW, NE]


  var minlng, maxlng, minlat, maxlat
  var noPairs = allCoords.length
  if (noPairs == 22) {
    var firstPair = allCoords[0]
    var secondPair = allCoords[1]

    var lats = []
    var lngs = []

    lngs.push(firstPair[0])
    lngs.push(secondPair[0])
    // TODO: MAX of lngs
    lats.push(firstPair[1])
    lats.push(secondPair[1])
    // TODO: MAX of lats



  } else if (noPairs > 2) {
    // TODO: Probably different logic
  } else if (noPairs == 0) {
    console.log("No airports");
  } else if (noPairs == 1) {
    // TODO: Set the center of the map here
  }

}
// TODO: Pass the BBOX to the Map object in HTML
