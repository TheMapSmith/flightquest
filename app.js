const fs = require('fs')
const turf = require('@turf/turf')
const mapboxgl = require('mapbox-gl')
const restclient = require('restler');
const moment = require('moment');
moment().format();

const apiKeyFile = require('./keys.js')
const airportCodes = JSON.parse(fs.readFileSync('data/airportCodes.json', 'utf-8'))
const airportData = JSON.parse(fs.readFileSync('data/airportData.json', 'utf-8'))

var FlightID

const fxml_url = 'http://flightxml.flightaware.com/json/FlightXML2/';
const username = 'themapsmith';
const apiKey = apiKeyFile.apiKey;

mapboxgl.accessToken = "pk.eyJ1IjoidGhlbWFwc21pdGgiLCJhIjoiYTdmMDdiZjYxNzNmNzFiOGVjZDJiYzI5MGQ5N2VlMmQifQ.fUnAp-76Ka0d3v4oMNPhFw";
const map = new mapboxgl.Map({
  container: "map",
  style: "mapbox://styles/mapbox/satellite-v9",
  center: [-96, 38],
  zoom: 3
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
    FlightID = GetFlightID.GetFlightIDResult
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
      sessionStorage.setItem('FlightID', JSON.stringify(FlightID,null,2))
      fs.writeFile(filename, JSON.stringify(result, null, 2), getLastTrack(FlightID))
    })
  }
}

function getLastTrack(FlightID) {
  var filename = 'storage/' + FlightID + '.json'
  if (fs.existsSync(filename)) {
    console.log('Reading track from local storage');
    var GetHistoricalTrackResult = JSON.parse(fs.readFileSync(filename, 'utf-8'))
    var track = GetHistoricalTrackResult.GetHistoricalTrackResult.data
    // addPolys(FlightID)
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
        fs.writeFile(filename, JSON.stringify(result, null, 2), addPolys(FlightID))
        // TODO:  Future: pass path to the path-polys function
        // while in dev, just grab the polys and plop them in the map
      })
      .on('error', function(error) {
        console.log(error);
      })
  }
}

function parseTrack(track) {
  console.log('parsing track');
  var trackInfo = []
  var lineCoords = []
  for (var i = 0; i <= track.length; i++) {
    if (i == track.length) {
      sessionStorage.setItem('trackInfo', JSON.stringify(trackInfo))
      makePathFeature(trackInfo, lineCoords)
    } else {
      var each = {}
      var pair = []
      pair.push(Number(track[i].longitude))
      pair.push(Number(track[i].latitude))
      each.pair = pair
      each.properties = {}
      each.properties.altitude = track[i].altitude * 100
      each.properties.timestamp = track[i].timestamp
      each.properties.groundspeed = track[i].groundspeed

      trackInfo.push(each)
      lineCoords.push(pair)
    }
  }
}

function makePathFeature(trackInfo, lineCoords) {
  // make simple line
  var line = turf.lineString(lineCoords)
  var rightLine = turf.lineOffset(line, 300000, {units: 'feet'})
  rightLine.properties.name = 'left line'
  var leftLine = turf.lineOffset(line, -300000, {units: 'feet'})
  leftLine.properties.name = 'right line'

  sessionStorage.setItem('flightPath', JSON.stringify(line))
  sessionStorage.setItem('leftLine', JSON.stringify(leftLine))
  sessionStorage.setItem('rightLine', JSON.stringify(rightLine))
  // set necessary line attributes for rendering
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
  lineFeature.paint['line-opacity'] = 0.25
  // add line to map
  if (!map.getLayer(pathFeatureID)) {
    map.addLayer(lineFeature);
  }
  // determine initial view bearing from start/end coords
  var targetPoint = turf.point(lineCoords.pop())
  var originPoint = turf.point(lineCoords[0])
  var bearing = turf.bearing(originPoint, targetPoint)
  // fly to initial view
  map.flyTo({
    center: originPoint.geometry.coordinates,
    zoom: 7,
    bearing: bearing,
    pitch: 60
  })

  makePointFeatures(trackInfo)
}

function makePointFeatures(trackInfo){
  // make an array of turf.point objects
  var points = []
  for (var i = 0; i <= trackInfo.length; i++) {
    if (i == trackInfo.length) {
      sessionStorage.setItem('points', JSON.stringify(points))
      bufferPoints(points)
    } else {
      var point = turf.point(trackInfo[i].pair, trackInfo[i].properties)
      points.push(point)
    }
  }
}

function bufferPoints(points){
  var geojson = {
    'type': 'FeatureCollection',
    'features': []
  }

  for (var j = 0; j <= points.length; j++) {
    if (j == points.length) {
      var filename = 'storage/' + FlightID + '-polys.json'
      if (fs.existsSync(filename)) {
        addPolys(geojson)
      } else {
        fs.writeFile(filename, JSON.stringify(geojson, null, 2), 'utf-8', addPolys(geojson))
      }
    } else {
      var buffered = turf.buffer(points[j], 1, { units: 'miles' });
      geojson.features.push(buffered)
    }
  }
}

function addPolys(geojson) {

  var extrudedProperties = {
    // See the Mapbox Style Specification for details on data expressions.
    // https://www.mapbox.com/mapbox-gl-js/style-spec/#expressions
    'fill-extrusion-color': 'yellow',
    'fill-extrusion-height': ['get', 'altitude'],
    'fill-extrusion-opacity': 0.5
  };

  map.addLayer({
    "id": FlightID,
    "type": "fill-extrusion",
    "properties": {},
    "paint": extrudedProperties,
    "source": {
      "type": 'geojson',
      "data": geojson
    }
  })
}

function beginFlight() {
  var leftLine = JSON.parse(sessionStorage.leftLine)
  var coordinates = leftLine.geometry.coordinates
  var line = JSON.parse(sessionStorage.leftLine)

  line.geometry.coordinates = [coordinates[0]]

  // TODO: fly straight to the first point at z20

  map.addSource('trace', {
    type: 'geojson',
    data: line
  });
  map.addLayer({
    "id": "trace",
    "type": "line",
    "source": "trace",
    "paint": {
      "line-color": "yellow",
      "line-opacity": 0.85,
      "line-width": 12
    }
  });

  var aniOptions = {
    duration: 1000
  }

  // on a regular basis, add more coordinates from the saved list and update the map
  var i = 0;
  var timer = window.setInterval(function() {
    var points = JSON.parse(sessionStorage.points)
    if (i < coordinates.length) {
      var around = points[i].geometry.coordinates
      var alt = points[i].properties.altitude
      var zoom = 10
      // make sure there is an altitude value
      if (alt) {
        // set zoom level by alt
        if (alt < 1000) {
          zoom = 20
        } else if (alt > 1000 && alt < 2000) {
          zoom = 15
        } else if (alt > 2000 && alt < 8000) {
          zoom = 13
        } else if (alt > 8000 && alt < 12000) {
          zoom = 12
        } else if (alt > 12000 && alt < 15000) {
          zoom = 11
        } else if (alt > 15000 && alt < 25000) {
          zoom = 10
        } else if (alt > 25000) {
          zoom = 9
        } else {
          console.log('Altitude value was invalid: ' + alt);
        }
      }

      line.geometry.coordinates.push(coordinates[i]);
      map.getSource('trace').setData(line);
      var prevCoord = coordinates[i-1]

      if (prevCoord) {
        map.easeTo({
          center: coordinates[i],
          zoom: zoom,
          duration: 1000,
          bearing: turf.bearing(prevCoord, coordinates[i]) - 90,
          easing: function (t) { return t; },
          animate: true
        })
      }
      // map.panTo(coordinates[i], aniOptions);
      i++;
    } else {
      window.clearInterval(timer);
    }
  }, 500);
}
