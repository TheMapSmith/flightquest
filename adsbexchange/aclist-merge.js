const fs = require('fs');
const path = require('path');
const {Readable} = require('stream');

const dumpFolder = 'dump/2018-05-16/';

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
				createCoords(flight);
			}
			return false;
		}
		return false;
	});
	console.log('Found ' + Object.keys(vtFlights).length + ' flights in bbox. (' + count + ')');
}

function createCoords(vtFlight) {
	if (vtFlight.Cos) {
		const uid = vtFlight.Id + '-' + vtFlight.PosTime;
		const id = vtFlight.Id;
		const alt = vtFlight.Alt;
		let color = '#263D4C';
		if (vtFlight.Alt < 10000) {
			color = '#23B5F5';
		} else if (vtFlight.Alt > 10000 && vtFlight.Alt < 20000) {
			color = '#3A8AB5';
		} else if (vtFlight.Alt > 20000 && vtFlight.Alt < 30000) {
			color = '#35627D';
		}
		if (!vtFlights[id]) {
			vtFlights[id] = {};
		}
		if (!vtFlights[id][uid]) {
			vtFlights[id][uid] = {
				type: 'Feature',
				properties: {
					id,
					uid,
					alt,
					color
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
			if (lon && lat && vtFlights[id][uid]) {
				if (vtFlights[id][uid].geometry.coordinates.indexOf([lon, lat]) === -1) {
					vtFlights[id][uid].geometry.coordinates.push([lon, lat]);
				} else {
					console.log('Matches');
				}
			} else {
				console.log('something else');
			}
		}
	}
}

function lineStringValidate(vtFlights) {
	const foundIds = Object.values(vtFlights);
	const validLines = [];
	foundIds.forEach(item => {
		const j = Object.values(item);
		const vl = j.filter(item => {
			if (item.geometry.coordinates.length > 1) {
				return item;
			}
		});
		for (let i = 0; i < vl.length; i++) {
			validLines.push(vl[i]);
		}
	});
	makeGeoJSON(validLines);
}

function makeGeoJSON(validLines) {
	validLines.forEach(item => {
		geojson.features.push(item);
	});
	const geojsonReadStream = new Readable();
	const geojsonWriteStream = fs.createWriteStream('./stream-color.geojson');
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
