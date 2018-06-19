const fs = require('fs');
const path = require('path');
const {Readable} = require('stream');

const dumpFolder = 'dump/2018-06-01/';
const dev = 'OD';
const airports = ['EGLL'];

const vtFlights = {};

const bbox = {
	long: {
		min: -74,
		max: -71
	},
	lat: {
		min: 42,
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
			makeGeoJSON(vtFlights);
		} else {
			const file = fs.readFileSync(scrapeFiles[i], 'utf-8');
			try {
				const AircraftList = JSON.parse(file);
				const acList = AircraftList.acList;
				const count = `${i} / ${len}`;
				flightFilter(acList, count);
			} catch (e) {
				console.log(e.message);
			}
		}
	}
}

function flightFilter(acList, count) {
	acList.map(flight => {
		if (dev === 'OD') {
			if (flight.To && flight.To.substring(0, 4) === airports[0]) {
				setProperties(flight);
			}
		} else if (dev === 'bbox') {
			if (flight.Lat && flight.Long && flight.Gnd === false) {
				if (flight.Lat >= bbox.lat.min && flight.Lat <= bbox.lat.max &&
					flight.Long >= bbox.long.min && flight.Long <= bbox.long.max) {
					setProperties(flight);
				}
				return false;
			}
		}
		return false;
	});
	console.log('Found ' + Object.keys(vtFlights).length + ' flights in bbox. (' + count + ')');
}

function setProperties(vtFlight) {
	if (vtFlight.Cos) {
		const id = vtFlight.Id;
		const timestamp = vtFlight.PosTime;
		const alt = vtFlight.Alt;
		const type = vtFlight.Type;
		const operator = vtFlight.Op;
		const EngType = vtFlight.EngType;
		const engCount = vtFlight.Engines;
		const mil = String(vtFlight.Mil);
		let engine = '';
		if (EngType === 0) {
			engine = 'Glider';
		}
		if (EngType === 1) {
			engine = 'Piston';
		}
		if (EngType === 2) {
			engine = 'Turboprop';
		}
		if (EngType === 3) {
			engine = 'Jet';
		}
		if (EngType === 4) {
			engine = 'Electric';
		}
		if (!EngType) {
			engine = '';
		}

		let color = '#263D4C';

		if (vtFlight.Alt < 10000) {
			color = '#23B5F5';
		} else if (vtFlight.Alt > 10000 && vtFlight.Alt < 20000) {
			color = '#3A8AB5';
		} else if (vtFlight.Alt > 20000 && vtFlight.Alt < 30000) {
			color = '#35627D';
		}
		if (vtFlight.Cos.length >= 8) {
			if (!vtFlights[id]) {
				vtFlights[id] = {};
			}

			vtFlights[id][timestamp] = {
				type: 'Feature',
				properties: {
					timestamp,
					id,
					alt,
					color,
					type,
					operator,
					engine,
					engCount,
					mil
				},
				geometry: {
					type: 'LineString',
					coordinates: []
				}
			};
			createCoords(vtFlight, id, timestamp);
		}
	}

	function createCoords(vtFlight, id, timestamp) {
		if (timestamp === 1526429059058) {
			console.log('log');
		}
		for (let j = 0; j <= vtFlight.Cos.length; j += 4) {
			const lon = vtFlight.Cos[j + 1];
			const lat = vtFlight.Cos[j];
			if (lon && lat) {
				vtFlights[id][timestamp].geometry.coordinates.push([lon, lat]);
			}
		}
	}
}

function makeGeoJSON(vtFlights) {
	for (let i = 0; i < Object.keys(vtFlights).length; i++) {
		const key = Object.keys(vtFlights)[i];
		const ts = Object.keys(vtFlights[key]);
		for (let k = 0; k < ts.length; k++) {
			geojson.features.push(vtFlights[key][ts[k]]);
		}
	}

	const geojsonReadStream = new Readable();
	const geojsonWriteStream = fs.createWriteStream(`./${airports[0]}.geojson`);
	geojsonReadStream.push(JSON.stringify(geojson, null, 2));
	geojsonReadStream.push(null);
	geojsonReadStream.pipe(geojsonWriteStream)
		.on('error', err => {
			console.log(err);
		});
	geojsonReadStream.on('end', () => {
		console.log('Ended!');
	});
}
