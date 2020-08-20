(function () {
    locationsToMercator = (glMap, locations) => {
        ar = locations.split(',');
        let mPos = [];
        for (let i = 0; i < ar.length; i += 2) {
            let m = glMap.lnglatToMercator(ar[i], ar[i + 1]);
            mPos.push(m);
        }
        return mPos;
    };
    updateVector = (position, vector) => {
        Object.keys(vector).map(k => {
            position[k] = vector[k];
        })
    };
}());