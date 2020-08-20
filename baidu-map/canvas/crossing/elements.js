    Function.prototype.method = function (k, v) {
        return this.prototype[k] = v, this;
    };
    color_convert = function () {
        var pub = {},
            canvas, context;
        canvas = document.createElement('canvas');
        canvas.height = 1;
        canvas.width = 1;
        context = canvas.getContext('2d');

        function byte_to_hex(byte) {
            // Turns a number (0-255) into a 2-character hex number (00-ff)
            return ('0' + byte.toString(16)).slice(-2);
        }

        pub.to_rgba_array = function (color) {
            /**
             * Turns any valid canvas fillStyle into a 4-element Uint8ClampedArray with bytes
             * for R, G, B, and A. Invalid styles will return [0, 0, 0, 0]. Examples:
             * color_convert.to_rgb_array('red')  # [255, 0, 0, 255]
             * color_convert.to_rgb_array('#ff0000')  # [255, 0, 0, 255]
             * color_convert.to_rgb_array('garbagey')  # [0, 0, 0, 0]
             */
            // Setting an invalid fillStyle leaves this unchanged
            context.fillStyle = 'rgba(0, 0, 0, 0)';
            // We're reusing the canvas, so fill it with something predictable
            context.clearRect(0, 0, 1, 1);
            context.fillStyle = color;
            context.fillRect(0, 0, 1, 1);
            return context.getImageData(0, 0, 1, 1).data;
        }

        pub.to_rgba = function (color) {
            /**
             * Turns any valid canvas fill style into an rgba() string. Returns
             * 'rgba(0,0,0,0)' for invalid colors. Examples:
             * color_convert.to_rgba('red')  # 'rgba(255,0,0,1)'
             * color_convert.to_rgba('#f00')  # 'rgba(255,0,0,1)'
             * color_convert.to_rgba('garbagey')  # 'rgba(0,0,0,0)'
             * color_convert.to_rgba(some_pattern)  # Depends on the pattern
             *
             * @param color  A string, pattern, or gradient
             * @return  A valid rgba CSS color string
             */
            var a = pub.to_rgba_array(color);
            return 'rgba(' + a[0] + ',' + a[1] + ',' + a[2] + ',' + (a[3] / 255) + ')';
        }

        pub.to_hex = function (color) {
            /**
             * Turns any valid canvas fill style into a hex triple. Returns
             * '#000000' for invalid colors. Examples:
             * color_convert.to_hex('red')  # '#ff0000'
             * color_convert.to_hex('rgba(255,0,0,1)')  # '#ff0000'
             * color_convert.to_hex('garbagey')  # '#000000'
             * color_convert.to_hex(some_pattern)  # Depends on the pattern
             *
             * @param color  A string, pattern, or gradient
             * @return  A valid rgba CSS color string
             */
            var a = pub.to_rgba_array(color);
            // Sigh, you can't map() typed arrays
            var hex = [0, 1, 2].map(function (i) {
                return byte_to_hex(a[i])
            }).join('');
            return '#' + hex;
        }

        return pub;
    }();

    function Dot(x, y, radius, fillStyle, border) {
        this.x = ~~x;
        this.y = ~~y;
        this.radius = ~~radius;
        this.fillStyle = fillStyle;
        if (border) {
            border['width'] && (this.lineWidth = border['width']);
            border['color'] && (this.strokeStyle = border['color']);
        }
    }

    Dot.method("draw", function (ctx) {
        let {
            x,
            y,
            radius,
            fillStyle
        } = this;

        let _fillStyle = ctx.fillStyle;
        let _strokeStyle = ctx.strokeStyle;
        let _lineWidth = ctx.lineWidth;
        if (fillStyle) {
            ctx.fillStyle = fillStyle;
        }
        ctx.moveTo(this.x, this.y);
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fill();
        if (this.lineWidth && this.strokeStyle) {
            ctx.lineWidth = this.lineWidth;
            ctx.strokeStyle = this.strokeStyle;
            ctx.stroke();
        }
        ctx.fillStyle = _fillStyle;
        ctx.strokeStyle = _strokeStyle;
        ctx.lineWidth = _lineWidth;
    });

    function Text(_text, x, y, options) {
        this._text = _text;
        this.x = ~~x;
        this.y = ~~y;
        this.options = {
            width: null,
            height: null,
            color: 'red',
            angle: 0,
            font: '25px sans-serif',
            textAlign: 'left',
            isChinese: false,
        };
        if (options) {
            for (let k in this.options) {
                options.hasOwnProperty(k) && (this.options[k] = options[k]);
            }
        }

    }

    Text.method("draw", function (ctx) {
        let {
            x,
            y,
            _text,
            options
        } = this;

        ctx.save();
        _text = _text.toString();
        if (!options.width || !options.height) {
            let h = parseInt(options.font.split('px')[0]);
            let n = _text.split('').length;
            options.height = h
            options.width = (options.isChinese ? 1 : .5) * h * n;
        }
        ctx.font = options.font;
        ctx.fillStyle = options.color;
        ctx.textAlign = options.textAlign;

        let modifiedXY = {
            x: x,
            y: y,
        }
        // ctx.fillText(_text, x, y);

        modifiedXY = {
            x: x - (options.width * .5),
            y: y + (options.height * .5),
        }
        ctx.translate(modifiedXY.x + (options.width / 2), modifiedXY.y + (options.height) / 2);
        ctx.rotate(options.angle);
        ctx.translate(-modifiedXY.x - (options.width / 2), -modifiedXY.y - (options.height / 2));
        // ctx.translate(modifiedXY.x + (options.width / 2), modifiedXY.y + (options.height) / 2);
        // ctx.rotate(options.angle);
        // ctx.translate(-modifiedXY.x - (options.width / 2), -modifiedXY.y - (options.height / 2));
        // console.log('tttt',~~(options.angle/Math.PI*180), _text)
        // ctx.fillRect(modifiedXY.x, modifiedXY.y, options.width, options.height);
        ctx.translate(0, options.height);
        // ctx.fillStyle = 'red';
        ctx.fillText(_text, modifiedXY.x, modifiedXY.y);
        // ctx.fillRect(x, y, options.width, options.height);
        // ctx.fillRect(modifiedXY.x, modifiedXY.y, options.width, options.height);
        ctx.restore();

    });

    function ImageIcon(image, dx, dy, dWidth, dHeight, color) {
        this.image = image;
        this.dx = ~~dx;
        this.dy = ~~dy;
        this.dWidth = dWidth;
        this.dHeight = dHeight;
        this.color = color;
    }

    ImageIcon.method("getCanvasImage", function (image, picWidth, picHeight, uint8Array) {
        let picLength = picWidth * picHeight; // number of chunks
        // // Get the canvas element.
        let vCanvas = document.createElement("CANVAS");
        vCanvas.width = picWidth;
        vCanvas.height = picHeight;
        let ctx = vCanvas.getContext("2d");
        ctx.drawImage(image, 0, 0, picWidth, picHeight);
        // Get and modify the image data.
        image = ctx.getImageData(0, 0, picWidth, picHeight);
        for (let i = 0; i < picLength * 4; i += 4) {
            if (uint8Array.length == 4) {
                for (let j = 0; j < 3; j++) {
                    image.data[i + j] = uint8Array[j];
                    // First bytes are red bytes.        
                    // Second bytes are green bytes.
                    // Third bytes are blue bytes.
                    // Fourth bytes are alpha bytes
                }
            }
        }
        ctx.putImageData(image, 0, 0);
        // document.body.appendChild(vCanvas)
        return vCanvas;
    });
    ImageIcon.method("draw", function (ctx) {
        let _image = this.image
        if (this.color) {
            let color = this.color;
            let uint8Array = color_convert.to_rgba_array(color)
            _image = this.getCanvasImage(this.image, this.dWidth, this.dHeight, uint8Array);
        }
        ctx.drawImage(_image, this.dx, this.dy, this.dWidth, this.dHeight);
    });

    function Line(x, y, toX, toY, lineWidth = 2, strokeStyle, options) {
        this.lineWidth = lineWidth;
        this.strokeStyle = strokeStyle;
        this.lines = [];
        let _options = {
            length: 10,
            dashed: false,
        }
        if (options) {
            Object.keys(options).map(k => {
                _options[k] = options[k];
            })
        }

        if (_options.dashed) {
            let d = Math.sqrt((x - toX) ** 2 + (y - toY) ** 2);
            let n = d / _options.length;
            if (n & 1 == 0) {
                //偶数
                n += 1;
            }
            let xdiff = ~~((toX - x) / n);
            let ydiff = ~~((toY - y) / n);
            for (let i = 0; i < n; i += 2) {
                let sx = x + xdiff * i;
                let sy = y + ydiff * i;
                this.lines.push([sx, sy, sx + xdiff, sy + ydiff])
            }
        } else {
            this.lines.push([~~x, ~~y, ~~toX, ~~toY])
        }
    }

    Line.method("draw", function (ctx) {
        let {
            lineWidth,
            strokeStyle,
            lines
        } = this;
        let _strokeStyle = ctx.strokeStyle;
        let _lineWidth = ctx.lineWidth;
        lineWidth && (ctx.lineWidth = lineWidth);
        strokeStyle && (ctx.strokeStyle = strokeStyle);
        for (let line of lines) {
            ctx.beginPath();
            ctx.moveTo(line[0], line[1])
            ctx.lineTo(line[2], line[3]);
            ctx.stroke();
        }
        ctx.lineWidth = _lineWidth;
        ctx.strokeStyle = _strokeStyle;
    });