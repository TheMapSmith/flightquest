const fs = require('fs')
const turf = require('@turf/turf')

var paths = []

paths.push(JSON.parse(fs.readFileSync('storage/UAL288-1522229678-airline-0064.json', 'utf-8')))
paths.push(JSON.parse(fs.readFileSync('storage/UAL494-1522229678-airline-0217.json', 'utf-8')))
paths.push(JSON.parse(fs.readFileSync('storage/UAL817-1522229678-airline-0064.json', 'utf-8')))
paths.push(JSON.parse(fs.readFileSync('storage/UAL1825-1522229678-airline-0540.json', 'utf-8')))


for (var i = 0; i <= paths.length; i++) {
  // a geojson for each path
  var geojson = {
    'type': 'FeatureCollection',
    'features': []
  }

  // path data array
  var path = paths[i].GetHistoricalTrackResult.data
  // filename for each
  if (i == 0) { var filename = 'storage/UAL288-polys.json' }
  else if (i == 1) { var filename = 'storage/UAL494-polys.json' }
  else if (i == 2) { var filename = 'storage/UAL817-polys.json' }
  else if (i == 3) { var filename = 'storage/UAL1824-polys.json' }

  for (var j = 0; j <= path.length; j++) {
    if (j == path.length) {
      fs.writeFileSync(filename, JSON.stringify(geojson, null, 2), 'utf-8')
    } else {
      var lat = Number(path[j].latitude)
      var lon = Number(path[j].longitude)
      var alt = Number(path[j].altitude * 100)
      var point = turf.point([lon, lat], {
        alt: alt
      })
      var buffered = turf.buffer(point, 5, {
        units: 'miles'
      });
      geojson.features.push(buffered)
    }
  }
}
