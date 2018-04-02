const fs = require('fs')
const turf = require('turf')
const mapboxgl = require('mapbox-gl')
const restclient = require('restler');
const moment = require('moment');
moment().format();

const apiKeyFile = require('./keys.js')
const airportCodes = JSON.parse(fs.readFileSync('data/airportCodes.json', 'utf-8'))
const airportData = JSON.parse(fs.readFileSync('data/airportData.json', 'utf-8'))

const fxml_url = 'http://flightxml.flightaware.com/json/FlightXML2/';
const username = 'themapsmith';
const apiKey = apiKeyFile.apiKey;

const airports = []

const devFlag = true
var AirlineFlightSchedules = {}
var GetFlightID = {}
var GetHistoricalTrackResult = {}

if (devFlag) {
  AirlineFlightSchedules = JSON.parse(fs.readFileSync('data/AirlineFlightSchedules.json', 'utf-8'))
  GetFlightID = JSON.parse(fs.readFileSync('data/GetFlightID.json', 'utf-8'))
  GetHistoricalTrackResult = JSON.parse(fs.readFileSync('data/GetHistoricalTrackResult.json', 'utf-8'))
}

mapboxgl.accessToken = "pk.eyJ1IjoidGhlbWFwc21pdGgiLCJhIjoiYTdmMDdiZjYxNzNmNzFiOGVjZDJiYzI5MGQ5N2VlMmQifQ.fUnAp-76Ka0d3v4oMNPhFw";
const map = new mapboxgl.Map({
  container: "map", // container id
  style: "mapbox://styles/mapbox/dark-v9", // stylesheet location
  center: [-74.50, 40], // starting position [lng, lat]
  zoom: 2 // starting zoom
});

// page init
init()

function init() {
  document.getElementById('submit').addEventListener('click', function() {
    parseAirportCodes()
  })
}

function parseAirportCodes(origin, dest) {
  if (airports.length != 0) {
    var id = airports[0] + ' to ' + airports[1]
    map.removeLayer(id)
    airports.length = 0
  }
  var origin = document.getElementById('origin').value
  var dest = document.getElementById('dest').value

  airports.push(origin)
  airports.push(dest)
  getSchedules()
}

function getSchedules() {
  if (devFlag) {
    var ident = AirlineFlightSchedules.AirlineFlightSchedulesResult.data[0].ident
    var departureTime = AirlineFlightSchedules.AirlineFlightSchedulesResult.data[0].departuretime
    getFlightID(ident, departureTime)
  } else {
    var startUnixSecond = moment().subtract(7, 'days').unix()
    var endUnixSecond = moment().subtract(1, 'days').unix()

    var origin = document.getElementById('origin').value
    var dest = document.getElementById('dest').value

    console.log('fetching!');

    // get flights between given airports

    restclient.get(fxml_url + 'AirlineFlightSchedules', {
      username: username,
      password: apiKey,
      query: {
        startDate: startUnixSecond,
        endDate: endUnixSecond,
        origin: origin,
        destination: dest,
        howMany: 5,
        offset: 0
      }
    }).on('success', function(result, response) {
      if (result) {
        var ident = result.AirlineFlightSchedulesResult.data[0].ident
        var departureTime = result.AirlineFlightSchedulesResult.data[0].departuretime

        if (fs.statSync('data/AirlineFlightSchedules.json')) {
          getFlightID(ident, departureTime)
        }
        else {
          fs.writeFile('data/AirlineFlightSchedules.json', JSON.stringify(result), 'utf-8', getFlightID(ident, departureTime))
        }

      }
    })
  }
}

function getFlightID(ident, departureTime) {
  if (devFlag) {
    var FlightID = GetFlightID.GetFlightIDResult
    getLastTrack(FlightID)
  } else {
    console.log("getting ID");
    restclient.get(fxml_url + 'GetFlightID', {
      username: username,
      password: apiKey,
      query: {
        ident: ident,
        departureTime: departureTime
      }
    }).on('success', function(result, response) {
      var FlightID = result.GetFlightIDResult

      console.log(JSON.stringify(result,null,2))
      getLastTrack(FlightID)
    })
  }
}

function getLastTrack(FlightID) {
  if (devFlag) {
    var track = GetHistoricalTrackResult.GetHistoricalTrackResult.data
    parseTrack(track)
  } else {
    console.log('getting track');
    restclient.get(fxml_url + 'GetHistoricalTrack', {
      username: username,
      password: apiKey,
      query: {
        faFlightID: FlightID
      }
    }).on('success', function(result, response) {
      var track = result.GetHistoricalTrackResult.data
      console.log(JSON.stringify(result,null,2));
      parseTrack(track)
    })
  }
}

function parseTrack(track) {
  console.log('parsing track');
  var allCoords = []
  for (var i = 0; i <= track.length; i++) {
    if (i == track.length) {
      makePathFeature(allCoords)
    } else {
      var pair = []
      pair.push(track[i].longitude)
      pair.push(track[i].latitude)
      allCoords.push(pair)
    }
  }
}

function makePathFeature(allCoords) {
  var line = turf.lineString(allCoords)
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

  map.fitBounds(turf.bbox(line), {
    padding: 70
  });
  map.addLayer(lineFeature);
  var targetPoint = lineFeature.
  // var camera = {
  //   duration: 1000,
  //   easing: 1,
  //   offset: 2
  // }
  map.easeTo(camera, lineFeature);
}
