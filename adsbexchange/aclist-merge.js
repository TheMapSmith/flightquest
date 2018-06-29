const fs = require('fs');
const path = require('path');
const {Readable} = require('stream');

const dumpFolder = 'dump/2018-06-01/';
const dev = 'OD';
const airports = ['KDFW'];

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
				const [...acList] = AircraftList.acList;
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
			if (flight.To) {
				for (let i = 0; i < airports.length; i++) {
					if (flight.To.substring(0, 4) === airports[i]) {
						createObject(flight);
					}
				}
			}
		} else if (dev === 'bbox') {
			if (flight.Lat && flight.Long && flight.Gnd === false) {
				if (flight.Lat >= bbox.lat.min && flight.Lat <= bbox.lat.max &&
					flight.Long >= bbox.long.min && flight.Long <= bbox.long.max) {
					createObject(flight);
				}
				return false;
			}
		}
		return false;
	});
	console.log('Found ' + Object.keys(vtFlights).length + ' flights in bbox. (' + count + ')');
}

function createObject(vtFlight) {
	if (vtFlight.Cos && vtFlight.Cos.length >= 8) {
		const id = vtFlight.Id;
		if (!vtFlights[id]) {
			vtFlights[id] = {
				type: 'Feature',
				properties: {
					id
				},
				geometry: {
					type: 'LineString',
					coordinates: []
				},
				Cos: []
			};
		}

		vtFlights[id].properties.type = vtFlight.Type;
		vtFlights[id].properties.operator = vtFlight.Op;
		vtFlights[id].properties.engCount = vtFlight.Engines;
		vtFlights[id].properties.mil = String(vtFlight.Mil);

		if (vtFlight.EngType === 0) {
			vtFlights[id].properties.engine = 'Glider';
		}
		if (vtFlight.EngType === 1) {
			vtFlights[id].properties.engine = 'Piston';
		}
		if (vtFlight.EngType === 2) {
			vtFlights[id].properties.engine = 'Turboprop';
		}
		if (vtFlight.EngType === 3) {
			vtFlights[id].properties.engine = 'Jet';
		}
		if (vtFlight.EngType === 4) {
			vtFlights[id].properties.engine = 'Electric';
		}
		if (!vtFlight.EngType) {
			vtFlights[id].properties.engine = '';
		}
		const CosString = [];
		for (let i = 0; i < vtFlight.Cos.length; i += 4) {
			const set = {
				lat: Number(vtFlight.Cos[i]),
				lon: Number(vtFlight.Cos[i + 1]),
				alt: Number(vtFlight.Cos[i + 3]),
				ts: Number(vtFlight.Cos[i + 2])
			};
			const latlon = String(set.lon) + String(set.lat);
			const prevSet = vtFlights[id].Cos[vtFlights[id].Cos.length - 1];
			if (prevSet) {
				const prevTs = prevSet.ts;
				if (CosString.indexOf(latlon) === -1 && set.ts > prevTs) {
					vtFlights[id].Cos.push(set);
				}
				CosString.push(latlon);
			} else {
				vtFlights[id].Cos.push(set);
				CosString.push(latlon);
			}
		}
	}
}

function makeGeoJSON(vtFlights) {
	for (let i = 0; i < Object.keys(vtFlights).length; i++) {
		const key = Object.keys(vtFlights)[i];
		const flight = vtFlights[key];
		const [...Cos] = flight.Cos;
		let prevAlt = 0;
		let coordinates = [];
		for (let m = 0; m <= Cos.length; m++) {
			if (m === Cos.length) {
				flight.geometry.coordinates = coordinates;
				delete flight.Cos;
				geojson.features.push(flight);
			} else {
				const coordPair = [Cos[m].lon, Cos[m].lat];
				const alt = Cos[m].alt;
				if (m === 0) {
					coordinates.push(coordPair);
				} else if (m > 0 && Math.abs(alt - prevAlt) > 2000 && coordinates.length > 1) {
					flight.geometry.coordinates = coordinates;
					delete flight.Cos;
					geojson.features.push(flight);
					flight.geometry.coordinates = [];
					coordinates = [];
					coordinates.push(coordPair);
				} else {
					coordinates.push(coordPair);
				}
				prevAlt = alt;
			}
		}
	}

	const geojsonReadStream = new Readable();
	let filename = '';
	for (let i = 0; i < airports.length; i++) {
		if (i === airports.length - 1) {
			filename += airports[i] + '.geojson';
		} else {
			filename += airports[i] + '-';
		}
	}
	console.log(filename);
	const geojsonWriteStream = fs.createWriteStream(filename);
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
