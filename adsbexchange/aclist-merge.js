const fs = require('fs');
const path = require('path');

const dumpFolder = 'dump/2018-05-16/';

const vtFlights = {};

const vtbbox = {
	long: {
		min: -73.5,
		max: -71.5
	},
	lat: {
		min: 42.7,
		max: 45
	}
};

const geojson = {
	type: 'FeatureCollection',
	features: []
};

listFiles(dumpFolder);

function listFiles(folder) {
	fs.readdir(folder, (err, files) => {
		if (err) {
			console.log(err);
		} else {
			const scrapeFiles = files.filter(file => {
				return path.extname(file).toLowerCase() === '.json';
			}).map(file => {
				return dumpFolder + file;
			});
			fileIterate(scrapeFiles);
		}
	});
}

function fileIterate(scrapeFiles) {
	const len = scrapeFiles.length + 1;
	for (let i = 0; i <= len; i++) {
		if (i === scrapeFiles.length) {
			makeGeoJSON(vtFlights);
		} else {
			const file = fs.readFileSync(scrapeFiles[i], 'utf-8');
			try {
				const AircraftList = JSON.parse(file);
				const {acList} = AircraftList.acList;
				const count = `${i} / ${len}`;
				vermontFilter(acList, count);
			} catch (e) {
				console.log(e.message);
			}
		}
	}
}

function vermontFilter(acList, count) {
	acList.map(flight => {
		if (flight.Lat && flight.Long) {
			if (flight.Lat >= vtbbox.lat.min && flight.Lat <= vtbbox.lat.max &&
					flight.Long >= vtbbox.long.min && flight.Long <= vtbbox.long.max) {
				createCoords(flight, vtFlights);
			}
			return false;
		}
		return false;
	});
	console.log('Found ' + Object.keys(vtFlights).length + ' flights in VT. (' + count + ')');
}

function createCoords(vtFlight, vtFlights) {
	if (vtFlight.Cos) {
		if (!vtFlights[vtFlight.Id]) {
			vtFlights[vtFlight.Id] = {
				type: 'Feature',
				properties: {
					id: vtFlight.Id
				},
				geometry: {
					type: 'LineString',
					coordinates: []
				}
			};
		}
		for (let j = 0; j < vtFlight.Cos.length; j += 4) {
			const lon = vtFlight.Cos[j + 1];
			const lat = vtFlight.Cos[j];
			if (lon && lat) {
				vtFlights[vtFlight.Id].geometry.coordinates.push([lon, lat]);
			} else {
				console.log('Missing coords');
			}
		}
	}
}

function makeGeoJSON(vtFlights) {
	Object.keys(vtFlights).forEach(item => {
		geojson.features.push(vtFlights[item]);
	});
	fs.writeFileSync('VT-flights.geojson', JSON.stringify(geojson, null, 2));
}
