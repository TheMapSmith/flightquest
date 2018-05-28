const fs = require('fs');
const path = require('path');

const dumpFolder = 'dump/2018-05-16/vt/';

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
	for (let i = 0; i <= scrapeFiles.length; i++) {
		if (i === scrapeFiles.length) {
			makeGeoJSON(vtFlights);
		} else {
			// Var savefile = 'dump/2018-05-16/vt/' + path.basename(filename, '.json') + '-vt.json'
			const savefile = 'dump/2018-05-16/' + path.basename(scrapeFiles[i]);
			if (fs.existsSync(savefile)) {
				console.log(path.basename(savefile, '.json') + ' already exists');
			} else {
				console.log('Reading ' + scrapeFiles[i]);
				const file = fs.readFileSync(scrapeFiles[i], 'utf-8');
				vermontFilter(file, vtbbox, vtFlights);
			}
		}
	}
}

function vermontFilter(file, vtbbox, vtFlights) {
	try {
		const AircraftList = JSON.parse(file);
		AircraftList.map(flight => {
			if (flight.Lat && flight.Long) {
				if (flight.Lat >= vtbbox.lat.min && flight.Lat <= vtbbox.lat.max &&
					flight.Long >= vtbbox.long.min && flight.Long <= vtbbox.long.max) {
					createCoords(flight, vtFlights);
				}
				return false;
			}
			return false;
		});
		console.log('Found ' + Object.keys(vtFlights).length + ' flights in VT.');
	} catch (e) {
		console.log(e);
	}
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
		for (let j = 0; j <= vtFlight.Cos.length; j += 4) {
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
