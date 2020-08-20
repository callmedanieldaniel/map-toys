function init(id, width = 1200, height = 800, bgColor = '#ccc') {
    let canvas = document.getElementById(id);
    canvas.width = width;
    canvas.height = height;
    let ctx = canvas.getContext("2d");
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, width, height)
    return ctx;
}

function addElements(elements, cb) {
    let list = [];
    let doneList = [];
    let judgeCallback = () => {
        doneList.push(1);
        if (elements.length == doneList.length) {
            cb && cb(list);
        }
    }
    for (let e of elements) {
        switch (e.type) {
            case 'Dot':
                {
                    let dot = new Dot(~~e.x, ~~e.y, e.radius, e.color);
                    list.push(dot);
                    judgeCallback();
                    break;
                }
            case 'Text':
                {
                    let t = new Text(e.text, ~~e.x, ~~e.y, e.options);
                    list.push(t);
                    judgeCallback();
                    break;
                }
            case 'Line':
                {
                    let l = new Line(~~e.x, ~~e.y, ~~e.toX, ~~e.toY, ~~e.lineWidth, e.color, e.options);
                    list.push(l);
                    judgeCallback();
                    break;
                }
            case 'ImageIcon':
                {
                    if (e.image) {
                        // console.log('providid image');
                        let l = new ImageIcon(e.image, ~~e.x, ~~e.y, ~~e.width, ~~e.height, e.color, );
                        list.push(l);
                        judgeCallback();
                    } else {
                        let image = new Image(); // Create a new blank image.
                        image.crossOrigin = "";
                        image.src = e.src;
                        // console.log(e, '...');
                        if (image.complete) {
                            let l = new ImageIcon(image, ~~e.x, ~~e.y, ~~e.width, ~~e.height, e.color, );
                            list.push(l);
                            judgeCallback();
                        } else {
                            image.onload = function () {
                                // console.log(e.src, 'done');
                                let l = new ImageIcon(image, ~~e.x, ~~e.y, ~~e.width, ~~e.height, e.color, );
                                list.push(l);
                                judgeCallback();
                            }
                        }
                    }
                    break;
                }
        }
    }
    // return list;
}

function getVirtueCanvas(oneDir, cb) {
    let {
        width,
        height,
        bgColor,
        rotateAngle,
        images,
        lanes,
    } = oneDir;
    let vCanvas = document.createElement("CANVAS");
    vCanvas.width = width;
    vCanvas.height = height;
    let _ctx = vCanvas.getContext("2d");
    _ctx.fillStyle = bgColor;
    _ctx.fillRect(0, 0, width, height);
    var list = [];

    let roadW = width / 6;
    let roadH = height;

    let eles = [];
    for (let i = 1; i < 6; i++) {
        let lineW = 1;
        let color = '#ccc';
        let options = {
            dashed: true
        }
        if (i == 3) {
            lineW = 1.5;
            color = 'yellow';
            options = null;
        }
        eles.push({
            type: 'Line',
            x: i * roadW,
            y: 0,
            toX: i * roadW,
            toY: roadH,
            lineWidth: lineW,
            color: color,
            options: options
        })

        if (i > 2 && i < 6) {
            let lanePair = {
                3: 'turnLeft',
                4: 'straight',
                5: 'turnRight',
            }

            let _lanes = {};
            // Object.keys(lanePair).map(k => {
            //     let dirName = lanePair[k];
            //     _lanes[k] = {
            //         image: images && images[dirName],
            //         icon: `./${dirName}.png`,
            //         color: lanes[dirName].color,
            //         text: lanes[dirName].text || '',
            //     }
            // })
            // eles.push({
            //     type: 'Dot',
            //     x: i * roadW,
            //     y: roadW / 2,
            //     radius: roadW * .8,
            //     color: '#0f0'
            // });
            // eles.push({
            //     type: 'ImageIcon',
            //     src: _lanes[i].icon,
            //     image: _lanes[i].image,
            //     x: (i + .1) * roadW,
            //     y: roadW * (1 + ~~(i == 4) * .3),
            //     width: roadW * .8,
            //     height: roadW * (2 - ~~(i == 4) * .5),
            //     color: _lanes[i].color,
            // })
            // eles.push({
            //     type: 'Text',
            //     text: _lanes[i].text,
            //     x: (i + .5) * roadW,
            //     y: (0 + .1) * roadW,
            //     options: {
            //         color: 'white',
            //         angle: -rotateAngle || 0,
            //         font: `${~~(roadW*2/3)}px sans-serif`,
            //         // textAlign: 'left',
            //         // isChinese: false,
            //     }
            // });
        }
    }
    addElements(eles, (_list) => {
        for (let e of _list) {
            e.draw(_ctx);
        }
        cb && cb(vCanvas);
    })
}

function drawDirs(cWidth, cHeight, dirNums = 4, oneDir = {
    width: 150,
    height: 200,
    bgColor: '#333',
    images: null,
}) {
    context.clearRect(0, 0, cWidth, cHeight);
    context.fillStyle = oneDir.bgColor
    let _w = oneDir.width;
    // context.fillRect(
    //     cWidth / 2 - _w / 2,
    //     cHeight / 2 - _w / 2,
    //     _w,
    //     _w
    // );
    if (dirNums < 5) {
    }
    _w *= 1.5
    
    context.arc(cWidth / 2, cHeight / 2, _w / 2, 0, 2 * Math.PI);
    context.stroke();
    context.fill();

    let angleDiff = 2 * Math.PI / dirNums;
    let roadList = [];
    let roadDefaultStatus = {
        angle: 0,
        turnLeft: {
            color: '#f00',
            text: 30,
        },
        straight: {
            color: '#0f0',
            text: 9,
        },
        turnRight: {
            color: '#ccc',
            // text: 9,
        }
    };
    let lanes = JSON.parse(JSON.stringify(roadDefaultStatus))
    for (let i = 0; i < dirNums; i++) {
        lanes.angle = angleDiff * i;
        
        // console.log('angle', (angleDiff * i) / (2 * Math.PI) * 360);
        getVirtueCanvas({
            width: oneDir.width,
            height: oneDir.height,
            bgColor: oneDir.bgColor,
            rotateAngle: lanes.angle,
            lanes: lanes,
            images: oneDir.images
        }, _vCanvas => {
            document.body.appendChild(_vCanvas);
            context.save();
            if (i > 0) {
                context.translate(cWidth / 2, cHeight / 2);
                context.rotate(lanes.angle);
                context.translate(-cWidth / 2, -cHeight / 2);
            }
            context.drawImage(
                _vCanvas,
                cWidth / 2 - oneDir.width / 2,
                cHeight / 2 + oneDir.width / 2,
                oneDir.width, oneDir.height
            );
            context.restore();

        });
    }
}