const fs = require('fs')
const turf = require('@turf/turf')
const path = require('path')

// const scrapeFolder = 'adsbexchange/scrape/'
const scrapeFolder = 'scrape/'

var allCoords = []
var geojson = {
  "type": "FeatureCollection",
  "features": []
}

var scrapeFolderFiles = fs.readdir(scrapeFolder, (err, files) => {
  if (err) {
    console.log(err);
  } else {
    procFiles(files)
  }
})

function procFiles(files){
    var scrapeFiles = files.filter((file) => {
      return path.extname(file).toLowerCase() === '.json';
    }).map((file) => {
      return scrapeFolder + file
    })
  fileIterate(scrapeFiles)
}

function fileIterate (scrapeFiles) {
  for (var i = 0; i <= scrapeFiles.length; i++) {
    if (i == scrapeFiles.length) {
      makePoints(allCoords)
    } else {
      var AircraftList = JSON.parse(fs.readFileSync(scrapeFiles[i], 'utf-8'))
      var acList = AircraftList.acList
      getCoords(acList)
    }
  }
}

function getCoords(acList){
  for (var i = 0; i < acList.length; i++) {
    var flight = acList[i]
    if (flight.Lat && flight.Long) {
      var pair = [flight.Long, flight.Lat]
      allCoords.push(pair)
    }
  }
}

function makePoints(allCoords) {
  var pointFeatures = allCoords.map((item) => {
    var point = turf.point(item)
    return turf.point(item)
  })
  for (var i = 0; i <= pointFeatures.length; i++) {
    if (i == pointFeatures.length) {
      console.log(geojson);
      fs.writeFile('vt-flights.geojson', JSON.stringify(geojson, null, 2), 'utf-8', (err) => {
        if (err) {
          console.log(err);
        } else {
          console.log('file written');
        }
      } )
    } else {
      geojson.features.push(pointFeatures[i])
    }
  }
}

function filterKBTV(t) {
  var u = t.AircraftList
  let kbtv_flights = u.filter(function(item) {
    if (item.From && item.To) {
      if (item.From.substring(0, 4) == 'KBTV' || item.To.substring(0, 4) == 'KBTV') {
        return item
      }
    }
  })
  console.log(kbtv_flights.length);
}
