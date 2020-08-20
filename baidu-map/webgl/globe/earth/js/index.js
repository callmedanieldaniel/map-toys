/* VARIABLES */

var canvas, scene, renderer, raycaster, mouse, intersects;
var INTERSECTED;
var gl;
var lineObjects = [];
// Cache DOM selectors
var container = document.getElementsByClassName('js-globe')[0];
// Object for country HTML elements and variables
var elements = {};
var data = {};
var initWindowSize = {};
// Three group objects
var groups = {
	main: null, // A group containing everything
	globe: null, // A group containing the globe sphere (and globe dots)
	globeDots: null, // A group containing the globe dots
	lines: null, // A group containing the lines between each country
	lineDots: null // A group containing the line dots
};

// Map properties for creation and rendering
var props = {
	mapSize: {
		// Size of the map from the intial source image (on which the dots are positioned on)
		width: 400,
		height: 300
	},
	control: {},
	globeRadius: 50, // Radius of the globe (used for many calculations)
	dotsAmount: 10, // Amount of dots to generate and animate randomly across the lines
	startingCountry: 'hongkong', // The key of the country to rotate the camera to during the introduction animation (and which country to start the cycle at)
	colours: {
		// Cache the colours
		globeDots: 'rgb(61, 137, 164)', // No need to use the Three constructor as this value is used for the HTML canvas drawing 'fillStyle' property
		lines: new THREE.Color('#18FFFF'),
		lineDots: new THREE.Color('#18FFFF')
	},
	alphas: {
		// Transparent values of materials
		globe: 0.4,
		lines: 0.5
	}
};

// Angles used for animating the camera
var camera = {
	object: null, // Three object of the camera
	controls: null, // Three object of the orbital controls
	angles: {
		// Object of the camera angles for animating
		current: {
			azimuthal: null,
			polar: null
		},
		target: {
			azimuthal: null,
			polar: null
		}
	}
};

// Booleans and values for animations
var animations = {
	finishedIntro: false, // Boolean of when the intro animations have finished
	dots: {
		current: 0, // Animation frames of the globe dots introduction animation
		total: 170, // Total frames (duration) of the globe dots introduction animation,
		points: [] // Array to clone the globe dots coordinates to
	},
	globe: {
		current: 0, // Animation frames of the globe introduction animation
		total: 80, // Total frames (duration) of the globe introduction animation,
	},
	countries: {
		active: false, // Boolean if the country elements have been added and made active
		animating: false, // Boolean if the countries are currently being animated
		current: 0, // Animation frames of country elements introduction animation
		total: 120, // Total frames (duration) of the country elements introduction animation
		selected: null, // Three group object of the currently selected country
		index: null, // Index of the country in the data array
		timeout: null, // Timeout object for cycling to the next country
		initialDuration: 5000, // Initial timeout duration before starting the country cycle
		duration: 2000 // Timeout duration between cycling to the next country
	}
};

// Boolean to enable or disable rendering when window is in or out of focus
var isHidden = false;



/* SETUP */

function getData() {

	// var request = new XMLHttpRequest();
	// // request.open('GET', 'https://s3-us-west-2.amazonaws.com/s.cdpn.io/617753/globe-points.json', true);
	// request.open('GET', './globe-points.json', true);
	// request.onload = function () {
	// 	if (request.status >= 200 && request.status < 400) {
	// 		data = JSON.parse(request.responseText);
	// 	} else {
	// 		showFallback();
	// 	}
	// };
	// request.onerror = showFallback;
	// request.send();
	getBoundaryPoints(ps => {
		data['points'] = ps;
		useTestCountryData()
		formatCountryData(data.countries);
		let firstCountryName = Object.keys(data.countries)[0];
		props.startingCountry = firstCountryName;
		setupScene();
	});
}

function getBoundaryPoints(cb) {
	var request = new XMLHttpRequest();
	request.open('GET', './custom.geo.json', true);
	request.onload = function () {
		if (request.status >= 200 && request.status < 400) {
			let gj = JSON.parse(request.responseText);
			let points = [];
			for (let c of gj.features) {
				for (let cors of c.geometry.coordinates) {
					if (c.geometry.type == 'MultiPolygon') {
						for (let locs of cors) {
							for (let loc of locs) {
								points.push(lnglatToScreenPos(loc[0], loc[1]));
							}
						}
					} else {
						for (let loc of cors) {
							points.push(lnglatToScreenPos(loc[0], loc[1]))
						}
					}
				}
			}
			cb && cb(points);
		} else {}
	};
	request.onerror = showFallback;
	request.send();
}

function useTestCountryData() {
	// data.countries = {
	// 	"pakistan": {
	// 		"x": 525,
	// 		"y": 279,
	// 		"name": "WalletPAK",
	// 		"country": "Pakistan"
	// 	},
	// 	"hongkong": {
	// 		"x": 768,
	// 		"y": 342,
	// 		"name": "TNG Wallet",
	// 		"country": "Hong Kong"
	// 	},

	// }
	data.countries = {
		"test": {
			"name": "test",
			"country": "test",
			"lat": 0,
			"lng": 0
		},
		"Canada": {
			"name": "Canada",
			"country": "Canada",
			"lat": 62.110521,
			"lng": 111.7530810
		},
		"India": {
			"name": "India",
			"country": "India",
			"lat": 21.682407,
			"lng": 77.816056,
		},
		"China": {
			"name": "China",
			"country": "China",
			"lat": 33.207797,
			"lng": 106.589429,
		},
	}
}

function formatCountryData(countries) {
	Object.keys(countries).map(k => {
		let country = countries[k];
		if (country.hasOwnProperty('lng') && country.hasOwnProperty('lat')) {
			let {
				x,
				y
			} = lnglatToScreenPos(country['lng'], country['lat']);
			country['x'] = x;
			country['y'] = y;
		} else {
			if (country.hasOwnProperty('x') && country.hasOwnProperty('y')) {
				let {
					lat,
					lng
				} = screenPosToLngLat(country['x'], country['y']);
				country['lat'] = lat;
				country['lng'] = lng;
			}
		}
	})
}

function showFallback() {
	alert('WebGL not supported. Please use a browser that supports WebGL.');
}

function setupScene() {
	canvas = container.getElementsByClassName('js-canvas')[0];
	gl = canvas.getContext('webgl');

	initWindowSize = {
		width: window.innerWidth,
		height: window.innerHeight,
	}
	scene = new THREE.Scene();
	renderer = new THREE.WebGLRenderer({
		canvas: canvas,
		antialias: true,
		alpha: true,
		shadowMapEnabled: false
	});
	renderer.setSize(canvas.clientWidth, canvas.clientHeight);
	renderer.setPixelRatio(1);
	renderer.setClearColor(0x000000, 0);

	// Main group that contains everything
	groups.main = new THREE.Group();
	groups.main.name = 'Main';

	// Group that contains lines for each country
	groups.lines = new THREE.Group();
	groups.lines.name = 'Lines';
	groups.main.add(groups.lines);

	// Group that contains dynamically created dots
	groups.lineDots = new THREE.Group();
	groups.lineDots.name = 'Dots';
	groups.main.add(groups.lineDots);

	// Add the main group to the scene
	scene.add(groups.main);

	// Render camera and add orbital controls
	addCamera();
	addControls();

	// Render objects
	addGlobe();

	if (Object.keys(data.countries).length > 0) {
		addLines();
		createListElements();
	}
	addMouseEvents()
	// Start the requestAnimationFrame loop
	render();
	animate();

	var canvasResizeBehaviour = function () {
		// let cs = window.getComputedStyle(container)
		// let width = cs.width.replace('px', '');
		// let height = cs.height.replace('px', '');
		// if (width && height) {
		// 	let w = ~~(width * window.innerWidth / initWindowSize.width);
		// 	let h = ~~(height * window.innerHeight / initWindowSize.height);
		// 	container.width = w;
		// 	container.height = h;
		// 	container.style.width = w + 'px';
		// 	container.style.height = h + 'px';
		// }
		camera.object.aspect = container.offsetWidth / container.offsetHeight;
		camera.object.updateProjectionMatrix();
		renderer.setSize(container.offsetWidth, container.offsetHeight);

	};

	window.addEventListener('resize', canvasResizeBehaviour);
	window.addEventListener('orientationchange', function () {
		setTimeout(canvasResizeBehaviour, 0);
	});
	canvasResizeBehaviour();
}
/* Mouse Events And RayCaster to get clicked Objects */
function addMouseEvents() {
	try {
		raycaster = new THREE.Raycaster();
		mouse = new THREE.Vector2();
		window.addEventListener('resize', onWindowResize, false);
		document.addEventListener('mousemove', onDocumentMouseMove, false);
		raycaster.setFromCamera(mouse, camera.object);
	} catch (error) {
		console.log('RayCaster error', scene.children, error);
	}

}

function onDocumentMouseMove(event) {
	event.preventDefault();
	mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
	mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
}

function onWindowResize() {
	camera.aspect = window.innerWidth / window.innerHeight;
	camera.updateProjectionMatrix();
	renderer.setSize(window.innerWidth, window.innerHeight);
}

/* CAMERA AND CONTROLS */
function addCamera() {
	camera.object = new THREE.PerspectiveCamera(60, canvas.clientWidth / canvas.clientHeight, 1, 10000);
	camera.object.position.z = props.globeRadius * 2.2;
}

function addControls() {
	camera.controls = new OrbitControls(camera.object, canvas);
	// camera.controls.enableKeys = false;
	// camera.controls.enablePan = false;
	// camera.controls.enableZoom = false;
	// camera.controls.enableDamping = false;
	// camera.controls.enableRotate = false;
	camera.controls.autoRotate = !!props.control.autoRotate

	// Set the initial camera angles to something crazy for the introduction animation
	camera.angles.current.azimuthal = -Math.PI;
	camera.angles.current.polar = 0;
}



/* RENDERING */

function render() {
	renderer.render(scene, camera.object);
}

if ('hidden' in document) {
	document.addEventListener('visibilitychange', onFocusChange);
} else if ('mozHidden' in document) {
	document.addEventListener('mozvisibilitychange', onFocusChange);
} else if ('webkitHidden' in document) {
	document.addEventListener('webkitvisibilitychange', onFocusChange);
} else if ('msHidden' in document) {
	document.addEventListener('msvisibilitychange', onFocusChange);
} else if ('onfocusin' in document) {
	document.onfocusin = document.onfocusout = onFocusChange;
} else {
	window.onpageshow = window.onpagehide = window.onfocus = window.onblur = onFocusChange;
}

function onFocusChange(event) {

	var visible = 'visible';
	var hidden = 'hidden';
	var eventMap = {
		focus: visible,
		focusin: visible,
		pageshow: visible,
		blur: hidden,
		focusout: hidden,
		pagehide: hidden
	};

	event = event || window.event;

	if (event.type in eventMap) {
		isHidden = true;
	} else {
		isHidden = false;
	}

}

function animate() {
	// intersects = raycaster.intersectObjects(scene.children);
	intersects = raycaster.intersectObjects(groups.globeDots.children, false);
	console.log(intersects, groups.globeDots.children)
	if (intersects && intersects.length > 0) {
		if (INTERSECTED != intersects[0].index) {}
	}

	if (isHidden === false) {
		requestAnimationFrame(animate);
	}

	if (groups.globeDots) {
		introAnimate();
	}

	if (animations.finishedIntro === true) {
		animateDots();
	}

	if (animations.countries.animating === true) {
		animateCountryCycle();
	}

	positionElements();

	camera.controls.update();

	render();

}



/* GLOBE */

function addGlobe() {
	var radius = props.globeRadius - (props.globeRadius * 0.02);
	var segments = 128;
	var rings = 128;

	// Make gradient
	var canvasSize = 128;
	var textureCanvas = document.createElement('canvas');
	textureCanvas.width = canvasSize;
	textureCanvas.height = canvasSize;
	var canvasContext = textureCanvas.getContext('2d');
	canvasContext.rect(0, 0, canvasSize, canvasSize);
	var canvasGradient = canvasContext.createLinearGradient(0, 0, 0, canvasSize);
	canvasGradient.addColorStop(0, '#ff0000');
	canvasGradient.addColorStop(0.5, '#0000ff');
	canvasGradient.addColorStop(1, '#fff');
	canvasContext.fillStyle = canvasGradient;
	canvasContext.fill();

	var textureLoader = new THREE.TextureLoader();
	textureLoader.setCrossOrigin(true);
	// var MapIndexBase64 = require();

	var mapIndexedTexture = textureLoader.load('./data/MapIndex.js');

	// Make texture
	// var texture = new THREE.Texture(textureCanvas);
	// texture.needsUpdate = true;

	var geometry = new THREE.SphereGeometry(radius, segments, rings);
	var material = new THREE.MeshBasicMaterial({
		// map: texture,
		map: mapIndexedTexture,
		transparent: true,
		opacity: 1
	});

	// var u_Sampler0 = gl.getUniformLocation(gl.program, 'u_Sampler0');


	globe = new THREE.Mesh(geometry, material);

	groups.globe = new THREE.Group();
	groups.globe.name = 'Globe';

	groups.globe.add(globe);
	groups.main.add(groups.globe);

	addGlobeDots();

}

// Specify whether the texture unit is ready to use
var g_texUnit0 = false,
	g_texUnit1 = false;

function loadTexture(gl, n, texture, u_Sampler, image, texUnit) {
	gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1); // Flip the image's y-axis
	// Make the texture unit active
	if (texUnit == 0) {
		gl.activeTexture(gl.TEXTURE0);
		g_texUnit0 = true;
	} else {
		gl.activeTexture(gl.TEXTURE1);
		g_texUnit1 = true;
	}
	// Bind the texture object to the target
	gl.bindTexture(gl.TEXTURE_2D, texture);

	// Set texture parameters
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
	// Set the image to texture
	gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);

	gl.uniform1i(u_Sampler, texUnit); // Pass the texure unit to u_Sampler

	// Clear <canvas>
	gl.clear(gl.COLOR_BUFFER_BIT);

	if (g_texUnit0 && g_texUnit1) {
		gl.drawArrays(gl.TRIANGLE_STRIP, 0, n); // Draw the rectangle
	}
}

function addGlobeDots() {

	var geometry = new THREE.Geometry();

	// Make circle
	var canvasSize = 16;
	var halfSize = canvasSize / 2;
	var textureCanvas = document.createElement('canvas');
	textureCanvas.width = canvasSize;
	textureCanvas.height = canvasSize;
	var canvasContext = textureCanvas.getContext('2d');
	canvasContext.beginPath();
	canvasContext.arc(halfSize, halfSize, halfSize, 0, 2 * Math.PI);
	canvasContext.fillStyle = props.colours.globeDots;
	canvasContext.fill();

	// Make texture
	var texture = new THREE.Texture(textureCanvas);
	texture.needsUpdate = true;

	var material = new THREE.PointsMaterial({
		map: texture,
		size: props.globeRadius / 120
	});

	var addDot = function (targetX, targetY) {

		// Add a point with zero coordinates
		var point = new THREE.Vector3(0, 0, 0);
		geometry.vertices.push(point);

		// Add the coordinates to a new array for the intro animation
		var result = returnSphericalCoordinates(
			targetX,
			targetY
		);
		animations.dots.points.push(new THREE.Vector3(result.x, result.y, result.z));

	};

	for (var i = 0; i < data.points.length; i++) {
		addDot(data.points[i].x, data.points[i].y);
	}

	for (var country in data.countries) {
		addDot(data.countries[country].x, data.countries[country].y);
	}

	// Add the points to the scene
	groups.globeDots = new THREE.Points(geometry, material);
	groups.globe.add(groups.globeDots);

}


/* COUNTRY LINES AND DOTS */

function addLines() {

	// Create the geometry
	var geometry = new THREE.Geometry();

	for (var countryStart in data.countries) {
		var group = new THREE.Group();
		group.name = countryStart;

		for (var countryEnd in data.countries) {

			// Skip if the country is the same
			if (countryStart === countryEnd) {
				continue;
			}

			// Get the spatial coordinates
			var result = returnCurveCoordinates(
				data.countries[countryStart].x,
				data.countries[countryStart].y,
				data.countries[countryEnd].x,
				data.countries[countryEnd].y
			);

			// Calcualte the curve in order to get points from
			var curve = new THREE.QuadraticBezierCurve3(
				new THREE.Vector3(result.start.x, result.start.y, result.start.z),
				new THREE.Vector3(result.mid.x, result.mid.y, result.mid.z),
				new THREE.Vector3(result.end.x, result.end.y, result.end.z)
			);

			// Get verticies from curve
			geometry.vertices = curve.getPoints(200);

			// Create mesh line using plugin and set its geometry
			var line = new MeshLine();
			line.setGeometry(geometry);

			// // Create the mesh line material using the plugin
			var material = new MeshLineMaterial({
				color: props.colours.lines,
				transparent: true,
				opacity: props.alphas.lines
			});
			// var material = new THREE.LineBasicMaterial( { vertexColors: THREE.VertexColors } );

			// Create the final object to add to the scene
			var curveObject = new THREE.Mesh(line.geometry, material);
			curveObject._path = geometry.vertices;
			// lineObjects.push(curveObject);
			group.add(curveObject);

		}

		group.visible = false;
		groups.lines.add(group);

	}

}

function addLineDots() {

	/*
		This function will create a number of dots (props.dotsAmount) which will then later be
		animated along the lines. The dots are set to not be visible as they are later
		assigned a position after the introduction animation.
	*/

	var radius = props.globeRadius / 120;
	var segments = 32;
	var rings = 32;

	var geometry = new THREE.SphereGeometry(radius, segments, rings);
	var material = new THREE.MeshBasicMaterial({
		color: props.colours.lineDots
	});

	// Returns a sphere geometry positioned at coordinates
	var returnLineDot = function () {
		var sphere = new THREE.Mesh(geometry, material);
		return sphere;
	};

	for (var i = 0; i < props.dotsAmount; i++) {

		// Get the country path geometry vertices and create the dot at the first vertex
		var targetDot = returnLineDot();
		targetDot.visible = false;

		// Add custom variables for custom path coordinates and index
		targetDot._pathIndex = null;
		targetDot._path = null;

		// Add the dot to the dots group
		groups.lineDots.add(targetDot);

	}

}

function assignDotsToRandomLine(target) {

	// Get a random line from the current country
	var randomLine = Math.random() * (animations.countries.selected.children.length - 1);
	randomLine = animations.countries.selected.children[randomLine.toFixed(0)];

	// Assign the random country path to the dot and set the index at 0
	target._path = randomLine._path;

}

function reassignDotsToNewLines() {

	for (var i = 0; i < groups.lineDots.children.length; i++) {

		var target = groups.lineDots.children[i];
		if (target._path !== null && target._pathIndex !== null) {
			assignDotsToRandomLine(target);
		}

	}

}

function animateDots() {

	// Loop through the dots children group
	for (var i = 0; i < groups.lineDots.children.length; i++) {

		var dot = groups.lineDots.children[i];

		if (dot._path === null) {

			// Create a random seed as a pseudo-delay
			var seed = Math.random();

			if (seed > 0.99) {
				assignDotsToRandomLine(dot);
				dot._pathIndex = 0;
			}

		} else if (dot._path !== null && dot._pathIndex < dot._path.length - 1) {

			// Show the dot
			if (dot.visible === false) {
				dot.visible = true;
			}

			// Move the dot along the path vertice coordinates
			dot.position.x = dot._path[dot._pathIndex].x;
			dot.position.y = dot._path[dot._pathIndex].y;
			dot.position.z = dot._path[dot._pathIndex].z;

			// Advance the path index by 1
			dot._pathIndex++;

		} else {

			// Hide the dot
			dot.visible = false;

			// Remove the path assingment
			dot._path = null;

		}

	}

}



/* ELEMENTS */

var list;

function createListElements() {

	list = document.getElementsByClassName('js-list')[0];

	var pushObject = function (coordinates, countryName) {

		// Create the element
		var element = document.createElement('li');

		var innerContent;
		var targetCountry = data.countries[countryName];

		element.innerHTML = '<span class="text">' + targetCountry.country + '</span>';
		element.addEventListener('click', (e) => {
			console.log('click start', e)
			changeCountry(countryName, false)
		})
		var object = {
			position: coordinates,
			element: element
		};

		// Add the element to the DOM and add the object to the array
		list.appendChild(element);
		elements[countryName] = object;

	};

	// Loop through each country line
	var i = 0;

	for (var country in data.countries) {

		var group = groups.lines.getObjectByName(country);
		var coordinates = group.children[0]._path[0];
		pushObject(coordinates, country);

		if (country === props.startingCountry) {

			// Set the country cycle index and selected line object for the starting country
			animations.countries.index = i;
			animations.countries.selected = groups.lines.getObjectByName(country);

			// Set the line opacity to 0 so they can be faded-in during the introduction animation
			var lineGroup = animations.countries.selected;
			lineGroup.visible = true;
			for (var ii = 0; ii < lineGroup.children.length; ii++) {
				lineGroup.children[ii].material.uniforms.opacity.value = 0;
			}

			// Set the target camera angles for the starting country for the introduction animation
			var angles = returnCameraAngles(data.countries[country].x, data.countries[country].y);
			camera.angles.target.azimuthal = angles.azimuthal;
			camera.angles.target.polar = angles.polar;

		} else {
			i++;
		}

	}

}

function positionElements() {

	var widthHalf = canvas.clientWidth / 2;
	var heightHalf = canvas.clientHeight / 2;

	// Loop through the elements array and reposition the elements
	for (var key in elements) {

		var targetElement = elements[key];

		var position = getProjectedPosition(widthHalf, heightHalf, targetElement.position);

		// Construct the X and Y position strings
		var positionX = position.x + 'px';
		var positionY = position.y + 'px';

		// Construct the 3D translate string
		var elementStyle = targetElement.element.style;
		elementStyle.webkitTransform = 'translate3D(' + positionX + ', ' + positionY + ', 0)';
		elementStyle.WebkitTransform = 'translate3D(' + positionX + ', ' + positionY + ', 0)'; // Just Safari things (capitalised property name prefix)...
		elementStyle.mozTransform = 'translate3D(' + positionX + ', ' + positionY + ', 0)';
		elementStyle.msTransform = 'translate3D(' + positionX + ', ' + positionY + ', 0)';
		elementStyle.oTransform = 'translate3D(' + positionX + ', ' + positionY + ', 0)';
		elementStyle.transform = 'translate3D(' + positionX + ', ' + positionY + ', 0)';

	}

}



/* INTRO ANIMATIONS */

// Easing reference: https://gist.github.com/gre/1650294

var easeInOutCubic = function (t) {
	return t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1;
};

var easeOutCubic = function (t) {
	return (--t) * t * t + 1;
};

var easeInOutQuad = function (t) {
	return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
};

function introAnimate() {

	if (animations.dots.current <= animations.dots.total) {

		var points = groups.globeDots.geometry.vertices;
		var totalLength = points.length;

		for (var i = 0; i < totalLength; i++) {

			// Get ease value
			var dotProgress = easeInOutCubic(animations.dots.current / animations.dots.total);

			// Add delay based on loop iteration
			dotProgress = dotProgress + (dotProgress * (i / totalLength));

			if (dotProgress > 1) {
				dotProgress = 1;
			}

			// Move the point
			points[i].x = animations.dots.points[i].x * dotProgress;
			points[i].y = animations.dots.points[i].y * dotProgress;
			points[i].z = animations.dots.points[i].z * dotProgress;

			// Animate the camera at the same rate as the first dot
			if (i === 0) {

				var azimuthalDifference = (camera.angles.current.azimuthal - camera.angles.target.azimuthal) * dotProgress;
				azimuthalDifference = camera.angles.current.azimuthal - azimuthalDifference;
				camera.controls.setAzimuthalAngle(azimuthalDifference);

				var polarDifference = (camera.angles.current.polar - camera.angles.target.polar) * dotProgress;
				polarDifference = camera.angles.current.polar - polarDifference;
				camera.controls.setPolarAngle(polarDifference);

			}

		}

		animations.dots.current++;

		// Update verticies
		groups.globeDots.geometry.verticesNeedUpdate = true;

	}

	if (animations.dots.current >= (animations.dots.total * 0.65) && animations.globe.current <= animations.globe.total) {

		var globeProgress = easeOutCubic(animations.globe.current / animations.globe.total);
		globe.material.opacity = props.alphas.globe * globeProgress;

		// Fade-in the country lines
		var lines = animations.countries.selected.children;
		for (var ii = 0; ii < lines.length; ii++) {
			lines[ii].material.uniforms.opacity.value = props.alphas.lines * globeProgress;
		}

		animations.globe.current++;

	}

	if (animations.dots.current >= (animations.dots.total * 0.7) && animations.countries.active === false) {

		list.classList.add('active');

		var key = Object.keys(data.countries)[animations.countries.index];
		changeCountry(key, true);

		animations.countries.active = true;

	}

	if (animations.countries.active === true && animations.finishedIntro === false) {

		animations.finishedIntro = true;
		// Start country cycle
		animations.countries.timeout = setTimeout(showNextCountry, animations.countries.initialDuration);
		addLineDots();

	}

}



/* COUNTRY CYCLE */

function changeCountry(key, init) {

	if (animations.countries.selected !== undefined) {
		animations.countries.selected.visible = false;
	}

	for (var name in elements) {
		if (name === key) {
			elements[name].element.classList.add('active');
		} else {
			elements[name].element.classList.remove('active');
		}
	}

	// Show the select country lines
	animations.countries.selected = groups.lines.getObjectByName(key);
	animations.countries.selected.visible = true;

	if (init !== true) {

		camera.angles.current.azimuthal = camera.controls.getAzimuthalAngle();
		camera.angles.current.polar = camera.controls.getPolarAngle();

		var targetAngles = returnCameraAngles(data.countries[key].x, data.countries[key].y);
		camera.angles.target.azimuthal = targetAngles.azimuthal;
		camera.angles.target.polar = targetAngles.polar;

		animations.countries.animating = true;
		reassignDotsToNewLines();

	}

}

function animateCountryCycle() {

	if (animations.countries.current <= animations.countries.total) {

		var progress = easeInOutQuad(animations.countries.current / animations.countries.total);

		var azimuthalDifference = (camera.angles.current.azimuthal - camera.angles.target.azimuthal) * progress;
		azimuthalDifference = camera.angles.current.azimuthal - azimuthalDifference;
		camera.controls.setAzimuthalAngle(azimuthalDifference);

		var polarDifference = (camera.angles.current.polar - camera.angles.target.polar) * progress;
		polarDifference = camera.angles.current.polar - polarDifference;
		camera.controls.setPolarAngle(polarDifference);

		animations.countries.current++;

	} else {

		animations.countries.animating = false;
		animations.countries.current = 0;

		animations.countries.timeout = setTimeout(showNextCountry, animations.countries.duration);

	}

}

function showNextCountry() {

	animations.countries.index++;

	if (animations.countries.index >= Object.keys(data.countries).length) {
		animations.countries.index = 0;
	}

	var key = Object.keys(data.countries)[animations.countries.index];
	// changeCountry(key, false);

}



function lnglatToScreenPos(lng, lat) {
	let x = ((lng + 180) / (360)) * props.mapSize.width;
	let y = ((lat + 90) / (180)) * props.mapSize.height;
	return {
		x,
		y
	}
}

function screenPosToLngLat(x, y) {
	let lng = ((x % props.mapSize.width) / props.mapSize.width) * 360 - 180;
	let lat = ((y % props.mapSize.height) / props.mapSize.height) * 180 - 90;

	return {
		lat,
		lng
	}
}


/* COORDINATE CALCULATIONS */

// Returns an object of 3D spherical coordinates
function returnSphericalCoordinates(x, y) {

	/*
		This function will take a x and y and calcualte the
		projected 3D coordiantes using Mercator projection rexive to the
		radius of the globe.

		Reference: https://stackoverflow.com/a/12734509
	*/

	// Convert x and y on the 90/180 degree axis
	lng = ((x % props.mapSize.width) / props.mapSize.width) * 360 - 180;
	lat = ((y % props.mapSize.height) / props.mapSize.height) * 180 - 90;
	// Calcuxe the projected starting point
	var equatorProjectL = Math.cos(lat / 180 * Math.PI) * props.globeRadius;
	var targetX = Math.cos(lng / 180 * Math.PI) * equatorProjectL;
	var targetY = Math.sin(lat / 180 * Math.PI) * props.globeRadius;
	var targetZ = Math.sin(lng / 180 * Math.PI) * equatorProjectL;

	return {
		x: targetX,
		y: targetY,
		z: targetZ
	};

}

// Reference: https://codepen.io/ya7gisa0/pen/pisrm?editors=0010
function returnCurveCoordinates(xA, yA, xB, yB) {

	// Calculate the starting point
	var start = returnSphericalCoordinates(xA, yA);

	// Calculate the end point
	var end = returnSphericalCoordinates(xB, yB);

	// Calculate the mid-point
	var midPointX = (start.x + end.x) / 2;
	var midPointY = (start.y + end.y) / 2;
	var midPointZ = (start.z + end.z) / 2;

	// Calculate the distance between the two coordinates
	var distance = Math.pow(end.x - start.x, 2);
	distance += Math.pow(end.y - start.y, 2);
	distance += Math.pow(end.z - start.z, 2);
	distance = Math.sqrt(distance);

	// Calculate the multiplication value
	var multipleVal = Math.pow(midPointX, 2);
	multipleVal += Math.pow(midPointY, 2);
	multipleVal += Math.pow(midPointZ, 2);
	multipleVal = Math.pow(distance, 2) / multipleVal;
	multipleVal = multipleVal * 0.5;
	if (multipleVal > 10) {
		multipleVal /= 2
	}
	// Apply the vector length to get new mid-points
	var midX = midPointX + multipleVal * midPointX;
	var midY = midPointY + multipleVal * midPointY;
	var midZ = midPointZ + multipleVal * midPointZ;

	// Return set of coordinates
	return {
		start: {
			x: start.x,
			y: start.y,
			z: start.z
		},
		mid: {
			x: midX,
			y: midY,
			z: midZ
		},
		end: {
			x: end.x,
			y: end.y,
			z: end.z
		}
	};

}

// Returns an object of 2D coordinates for projected 3D position
function getProjectedPosition(width, height, position) {

	/*
		Using the coordinates of a country in the 3D space, this function will
		return the 2D coordinates using the camera projection method.
	*/

	position = position.clone();
	var projected = position.project(camera.object);

	return {
		x: (projected.x * width) + width,
		y: -(projected.y * height) + height
	};

}


// Returns an object of the azimuthal and polar angles of a given map latitude and longitude
function returnCameraAngles(latitude, longitude) {

	/*
		This function will convert given latitude and longitude coordinates that are
		proportional to the map dimensions into values relative to PI (which the
		camera uses as angles).

		Note that the azimuthal angle ranges from 0 to PI, whereas the polar angle
		ranges from -PI (negative PI) to PI (positive PI).

		A small offset is added to the azimuthal angle as angling the camera directly on top of a point makes the lines appear flat.
	*/

	var targetAzimuthalAngle = ((latitude - props.mapSize.width) / props.mapSize.width) * Math.PI;
	targetAzimuthalAngle = targetAzimuthalAngle + (Math.PI / 2);
	targetAzimuthalAngle = targetAzimuthalAngle + 0.1; // Add a small offset

	var targetPolarAngle = (longitude / (props.mapSize.height * 2)) * Math.PI;

	return {
		azimuthal: targetAzimuthalAngle,
		polar: targetPolarAngle
	};

}



/* INITIALISATION */

if (!window.WebGLRenderingContext) {
	showFallback();
} else {
	getData();
}