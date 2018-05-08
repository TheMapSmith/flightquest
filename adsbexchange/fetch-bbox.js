const fs = require('fs')
const turf = require('@turf/turf')
const restclient = require('restler');

const t = JSON.parse(fs.readFileSync('adsbexchange/AircraftList-5-3-1639.json', 'utf-8'))

const adsb_url = 'https://public-api.adsbexchange.com/VirtualRadar/AircraftList.json?';

restclient.get(adsb_url, {
  query: {
    fWBnd: -73.60,
    fSBnd: 42.60,
    fEBnd: -71.40,
    fNBnd: 45.20
  }
}).on('success', function(result, response) {
  if (result) {
    var filename = 'adsbexchange/scrape/AircraftList-' + result.stm + '.json'
    fs.writeFile(filename, JSON.stringify(result), 'utf-8', function(err){
      if (err) {
        console.log(err);
      } else {
        console.log(filename + ' written');
      }
    })
  }
})
