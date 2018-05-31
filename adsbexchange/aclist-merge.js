const fs = require('fs');
const path = require('path');
const Readable = require('stream').Readable;

const dumpFolder = 'dump/2018-05-16/';

const vtFlights = {};

const bbox = {
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
	const len = scrapeFiles.length;
	for (let i = 0; i <= len; i++) {
		if (i === len) {
			lineStringValidate(vtFlights);
		} else {
			const file = fs.readFileSync(scrapeFiles[i], 'utf-8');
			try {
				const AircraftList = JSON.parse(file);
				const acList = AircraftList.acList;
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
			if (flight.Lat >= bbox.lat.min && flight.Lat <= bbox.lat.max &&
					flight.Long >= bbox.long.min && flight.Long <= bbox.long.max) {
				createCoords(flight, vtFlights);
			}
			return false;
		}
		return false;
	});
	console.log('Found ' + Object.keys(vtFlights).length + ' flights in bbox. (' + count + ')');
}

function createCoords(vtFlight, vtFlights) {
	if (vtFlight.Cos) {
		const id = vtFlight.Id + '-' + vtFlight.PosTime;
		let alt = 0.25;
		if (vtFlight.Alt < 10000) {
			alt = 1;
		} else if (vtFlight.Alt > 10000 && vtFlight.Alt < 15000) {
			alt = 0.75;
		} else if (vtFlight.Alt > 15000 && vtFlight.Alt < 20000) {
			alt = 0.50;
		}
		if (!vtFlights[id]) {
			vtFlights[id] = {
				type: 'Feature',
				properties: {
					id,
					alt
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
				vtFlights[id].geometry.coordinates.push([lon, lat]);
			} else {
				console.log('Missing coords');
			}
		}
	}
}

function lineStringValidate(vtFlights) {
	Object.values(vtFlights).filter(item => {
		return item.geometry.coordinates.length > 1;
	});
	makeGeoJSON(vtFlights);
}

function makeGeoJSON(vtFlights) {
	Object.keys(vtFlights).forEach(item => {
		geojson.features.push(vtFlights[item]);
	});
	const geojsonReadStream = new Readable();
	const geojsonWriteStream = fs.createWriteStream('./stream.geojson');
	geojsonReadStream.push(JSON.stringify(geojson))
		.pipe(geojsonWriteStream)
		.on('error', err => {
			console.log(err);
		});
	geojsonReadStream.on('end', () => {
		console.log('Ended!');
	});
}
