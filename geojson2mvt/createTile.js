var fs = require('fs');
// var geojson2mvt = require('geojson2mvt');
var geojson2mvt = require(__dirname + '/geojson2mvt.js');

const route = JSON.parse(fs.readFileSync(__dirname + '/data.geojson', "utf8"))

const lngs = [];
const lats = [];
const points = route.features[0].geometry.coordinates[0];
points.forEach(ll => {
  lngs.push(ll[0])
  lats.push(ll[1])
})

lngs.sort((a, b) => a - b);
lats.sort((a, b) => a - b);
const lngMax = lngs[lngs.length - 1]
const lngMin = lngs[0]
const latMax = lats[lats.length - 1]
const latMin = lats[0]
const box = [
  latMin, lngMin, latMax, lngMax
]
console.log('box', latMin, lngMin, latMax, lngMax)
var options = {
  layers: {
    layer0: route,
    // layer1: stop
  },
  rootDir: 'tiles',
  bbox: box, //[south,west,north,east]
  zoom: {
    min: 8,
    max: 10,
  }
};
geojson2mvt(options);
