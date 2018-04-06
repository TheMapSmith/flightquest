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

mapboxgl.accessToken = "pk.eyJ1IjoidGhlbWFwc21pdGgiLCJhIjoiYTdmMDdiZjYxNzNmNzFiOGVjZDJiYzI5MGQ5N2VlMmQifQ.fUnAp-76Ka0d3v4oMNPhFw";
const map = new mapboxgl.Map({
  container: "map", // container id
  style: "mapbox://styles/mapbox/dark-v9", // stylesheet location
  center: [-96, 38], // starting position [lng, lat]
  zoom: 3 // starting zoom
});

// page init
init()

function init() {
  document.getElementById('submit').addEventListener('click', function() {
    getSchedules()
  })

  document.getElementById('beginFlight').addEventListener('click', function() {
    beginFlight()
  })
}

function getSchedules() {
  // set O/D and store in session storage
  var origin = document.getElementById('origin').value
  sessionStorage.setItem('origin', origin)
  var dest = document.getElementById('dest').value
  sessionStorage.setItem('dest', dest)
  // for not making API calls in dev
  if (origin == 'AUS' && dest == 'EWR') {
    console.log('Reading schedule from local storage');
    ausewr = JSON.parse(fs.readFileSync('storage/AUS-EWR-1522422120.json', 'utf-8'))
    var randomRoute = Math.floor(Math.random() * 5)
    var ident = ausewr.AirlineFlightSchedulesResult.data[randomRoute].ident
    var departureTime = ausewr.AirlineFlightSchedulesResult.data[randomRoute].departuretime
    getFlightID(ident, departureTime)
  } else {
    var startUnixSecond = moment().subtract(7, 'days').unix()
    var endUnixSecond = moment().subtract(1, 'days').unix()

    console.log('Fetching flights between ' + origin + ' and ' + dest);

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
        var filename = 'storage/' + origin + '-' + dest + '-' + departureTime + '.json'
        fs.writeFile(filename, JSON.stringify(result), getFlightID(ident, departureTime))
      }
    })
  }
}

function getFlightID(ident, departureTime) {
  var filename = 'storage/' + ident + '-' + departureTime + '.json'
  if (fs.existsSync(filename)) {
    console.log('Getting FlightID from local storage');
    var GetFlightID = JSON.parse(fs.readFileSync(filename, 'utf-8'))
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
      fs.writeFile(filename, JSON.stringify(result,null,2), getLastTrack(FlightID))
    })
  }
}

function getLastTrack(FlightID) {
  var filename = 'storage/' + FlightID + '.json'
  if (fs.existsSync(filename)) {
    console.log('Reading track from local storage');
    var GetHistoricalTrackResult = JSON.parse(fs.readFileSync(filename, 'utf-8'))
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
        fs.writeFile(filename, JSON.stringify(result,null,2), parseTrack(track))
    })
    .on('error', function(error){
      console.log(error);
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
  var pathFeatureID = origin + ' to ' + dest
  lineFeature.id = pathFeatureID
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

  if (!map.getLayer(pathFeatureID)) {
    map.addLayer(lineFeature);
  }

  var targetPoint = turf.point(allCoords.pop())
  var originPoint = turf.point(allCoords[0])
  var bearing = turf.bearing(originPoint, targetPoint)

  sessionStorage.setItem("targetPoint", JSON.stringify(targetPoint));
  sessionStorage.setItem("originPoint", originPoint);
  sessionStorage.setItem("bearing", bearing);

  map.flyTo({
    center: originPoint.geometry.coordinates,
    zoom: 7,
    bearing: bearing,
    pitch: 80
  })
}

function beginFlight () {

  var target = JSON.parse(sessionStorage.targetPoint)
  var options = {
    duration: 10000,
    animate: true
  }

  map.panTo(target.geometry.coordinates, options)

}
