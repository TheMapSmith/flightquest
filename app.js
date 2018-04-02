const fs = require('fs')
const turf = require('turf')
const mapboxgl = require('mapbox-gl')
const restclient = require('restler');

const apiKeyFile = require('./keys.js')
const airportCodes = JSON.parse(fs.readFileSync('data/airportCodes.json', 'utf-8'))
const airportData = JSON.parse(fs.readFileSync('data/airportData.json', 'utf-8'))

var airports = ['BTV', 'ATL', 'AUS', 'EWR', 'BTV']

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

function makePathFeature(line) {
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

function fetchRoute() {
  console.log('fetching!');

  var fxml_url = 'http://flightxml.flightaware.com/json/FlightXML2/';
  var username = 'themapsmith';
  var apiKey = apiKeyFile.apiKey;


  restclient.get(fxml_url + 'MetarEx', {
    username: username,
    password: apiKey,
    query: {
      airport: 'KAUS',
      howMany: 1
    }
  }).on('success', function(result, response) {
    // util.puts(util.inspect(result, true, null));
    var entry = result.MetarExResult.metar[0];
    console.log('The temperature at ' + entry.airport + ' is ' + entry.temp_air + 'C');
  });

  restclient.get(fxml_url + 'Enroute', {
    username: username,
    password: apiKey,
    query: {
      airport: 'KIAH',
      howMany: 10,
      filter: '',
      offset: 0
    }
  }).on('success', function(result, response) {
    console.log('Aircraft en route to KIAH:');
    //util.puts(util.inspect(result, true, null));
    var flights = result.EnrouteResult.enroute;
    for (i in flights) {
      var flight = flights[i];
      //util.puts(util.inspect(flight));
      console.log(flight.ident + ' (' + flight.aircrafttype + ')\t' +
        flight.originName + ' (' + flight.origin + ')');
    }
  });




}
