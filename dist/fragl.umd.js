(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
    typeof define === 'function' && define.amd ? define(factory) :
    (global.fragl = factory());
}(this, (function () { 'use strict';

    var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

    function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

    function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

    /*
        Contains functions modified from greggman/webgl-fundamentals, see WEBGL_FUNDAMENTALS_LICENSE
    */

    var FraGL = function () {
        function FraGL() {
            var args = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};

            _classCallCheck(this, FraGL);

            _initialiseProps.call(this);

            this._setArgs(args);

            this.domElement = args.canvas || document.createElement('canvas');        this.gl = this.domElement.getContext("webgl", {
                premultipliedAlpha: this.premultipliedAlpha,
                alpha: this.trasparent,
                antialias: this.antialias,
                depth: this.depth
            });

            this._resize();

            var gl = this.gl;


            gl.clearColor.apply(gl, _toConsumableArray(this._clearColor));
            gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
            gl.enable(gl.BLEND);
        }

        _createClass(FraGL, [{
            key: '_setArgs',
            value: function _setArgs(args) {
                if (args.imageLoadColor && Array.isArray(args.imageLoadColor) && args.imageLoadColor.length == 4) this._imageLoadColor = args.imageLoadColor;
                if (args.size) {
                    this._width = args.size.width;
                    this._height = args.size.height;
                } else {
                    this._width = window.innerWidth;
                    this._height = window.innerHeight;
                }
                if (args.clearColor && Array.isArray(args.clearColor) && args.clearColor.length == 4) this._clearColor = args.clearColor;
                if (args.trasparent) this.trasparent = args.trasparent;
                if (args.premultipliedAlpha) this.premultipliedAlpha = args.premultipliedAlpha;
                if (args.antialias) this.antialias = args.antialias;
                if (args.depth) this.depth = args.depth;
            }
        }, {
            key: '_createShader',
            value: function _createShader(content, type) {
                var gl = this.gl,
                    error = this.error;

                var shaderType = type == 'vertex' ? gl.VERTEX_SHADER : type == 'fragment' ? gl.FRAGMENT_SHADER : false;

                if (!shaderType) return error('shader type issue');

                var shader = gl.createShader(shaderType);

                gl.shaderSource(shader, content);
                gl.compileShader(shader);

                var compiledShader = gl.getShaderParameter(shader, gl.COMPILE_STATUS);

                if (!compiledShader) {
                    error(type + ' shader compilation error: ' + gl.getShaderInfoLog(shader));
                    gl.deleteShader(shader);
                    return null;
                }

                return shader;
            }
        }, {
            key: '_nextPow2',
            value: function _nextPow2(val) {
                var v = val;
                v--;
                v |= v >> 1;
                v |= v >> 2;
                v |= v >> 4;
                v |= v >> 8;
                v |= v >> 16;
                v++;
                return v;
            }
        }, {
            key: '_checkSize',
            value: function _checkSize(image) {
                var w = image.naturalWidth,
                    h = image.naturalHeight;


                var nw = this._nextPow2(w);
                var nh = this._nextPow2(h);

                if (nw == w && nh == h) return image;

                if (!this._imageCanvas) {
                    this._imageCanvas = document.createElement('canvas');
                    this._imageCtx = this._imageCanvas.getContext('2d');
                }

                this._imageCanvas.width = nw;
                this._imageCanvas.height = nh;

                this._imageCtx.drawImage(image, 0, 0, nw, nh);

                image.src = this._imageCanvas.toDataURL();

                return image;
            }
        }, {
            key: '_loadImage',
            value: function _loadImage(src) {
                var _scope = this;
                return new Promise(function (resolve) {
                    var image = new Image();
                    image.addEventListener('load', function () {
                        image = _scope._checkSize(image);
                        resolve(image);
                    });
                    image.src = src;
                });
            }
        }, {
            key: 'textureFromImage',
            value: function textureFromImage(src) {
                var gl = this.gl,
                    _imageLoadColor = this._imageLoadColor;

                var texture = gl.createTexture();
                gl.bindTexture(gl.TEXTURE_2D, texture);
                gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array(_imageLoadColor));

                this._loadImage(src).then(function (image) {
                    gl.bindTexture(gl.TEXTURE_2D, texture);
                    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
                    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
                    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
                    // gl.generateMipmap(gl.TEXTURE_2D);
                });
                return texture;
            }
        }, {
            key: '_createProgram',
            value: function _createProgram(_ref) {
                var _ref$vertex = _ref.vertex,
                    vertex = _ref$vertex === undefined ? '' : _ref$vertex,
                    _ref$fragment = _ref.fragment,
                    fragment = _ref$fragment === undefined ? '' : _ref$fragment;
                var gl = this.gl,
                    error = this.error;

                var vertexShader = this._createShader(vertex, 'vertex');
                var fragmentShader = this._createShader(fragment, 'fragment');
                var program = gl.createProgram();

                gl.attachShader(program, vertexShader);
                gl.attachShader(program, fragmentShader);

                gl.linkProgram(program);

                var linked = gl.getProgramParameter(program, gl.LINK_STATUS);

                if (!linked) {
                    error('error linking program: ' + gl.getProgramInfoLog(program));
                    gl.deleteProgram(program);

                    return null;
                }

                return program;
            }
        }, {
            key: 'setSize',
            value: function setSize(w, h) {
                this._width = w;
                this._height = h;
                this._resize();
            }
        }, {
            key: '_resize',
            value: function _resize() {
                var gl = this.gl,
                    _width = this._width,
                    _height = this._height;


                gl.canvas.width = _width;
                gl.canvas.height = _height;

                gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
            }
        }, {
            key: 'createRenderLayer',
            value: function createRenderLayer(name, args) {
                var uniforms = args.uniforms;
                var gl = this.gl;
                var program = this._createProgram({
                    vertex: args.vertex,
                    fragment: args.fragment
                });

                var pLocation = gl.getAttribLocation(program, "a_position");
                var tLocation = gl.getAttribLocation(program, "a_texcoord");
                var positionBuffer = gl.createBuffer();

                gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
                this._setGeometry();

                var texcoordBuffer = gl.createBuffer();

                gl.bindBuffer(gl.ARRAY_BUFFER, texcoordBuffer);
                this._setTexcoord();

                var uniformSetters = this._uniformSetters(program);
                var setAttribs = function setAttribs() {
                    var size = 2;
                    var type = gl.FLOAT;
                    var normalize = false;
                    var stride = 0;
                    var offset = 0;

                    gl.enableVertexAttribArray(pLocation);
                    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
                    gl.vertexAttribPointer(pLocation, size, type, normalize, stride, offset);

                    gl.enableVertexAttribArray(tLocation);
                    gl.bindBuffer(gl.ARRAY_BUFFER, texcoordBuffer);
                    gl.vertexAttribPointer(tLocation, size, type, normalize, stride, offset);
                };

                this._renderItems[name] = {
                    uniformSetters: uniformSetters,
                    setAttribs: setAttribs,
                    uniforms: uniforms,
                    render: function render(output) {
                        var uniformSetters = this.uniformSetters,
                            setAttribs = this.setAttribs,
                            uniforms = this.uniforms;

                        gl.useProgram(program);

                        setAttribs();
                        Object.keys(uniformSetters).forEach(function (uniform) {
                            if (uniforms[uniform]) uniformSetters[uniform](uniforms[uniform].value);
                        });

                        if (output) gl.bindFramebuffer(gl.FRAMEBUFFER, output.fbo);else gl.bindFramebuffer(gl.FRAMEBUFFER, null);

                        var primitiveType = gl.TRIANGLES;
                        var offset = 0;
                        var count = 6;

                        gl.drawArrays(primitiveType, offset, count);
                    }
                };

                return this._renderItems[name];
            }
        }, {
            key: 'createRenderTexture',


            // render = () =>{
            //     const _scope = this;
            //     this.clear();

            //     Object.keys(_scope._renderItems).forEach( function(key) {
            //         _scope._renderItems[key].render();
            //     })
            // }

            value: function createRenderTexture(_ref2) {
                var width = _ref2.width,
                    height = _ref2.height;
                var gl = this.gl;

                var target = {};

                function generate(width, height) {
                    var targetTextureWidth = width;
                    var targetTextureHeight = height;
                    var targetTexture = gl.createTexture();
                    gl.bindTexture(gl.TEXTURE_2D, targetTexture);

                    var level = 0;
                    var internalFormat = gl.RGBA;
                    var border = 0;
                    var format = gl.RGBA;
                    var type = gl.UNSIGNED_BYTE;
                    var data = null;

                    gl.texImage2D(gl.TEXTURE_2D, level, internalFormat, targetTextureWidth, targetTextureHeight, border, format, type, data);
                    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
                    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
                    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

                    var fb = gl.createFramebuffer();
                    gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
                    var attachmentPoint = gl.COLOR_ATTACHMENT0;
                    gl.framebufferTexture2D(gl.FRAMEBUFFER, attachmentPoint, gl.TEXTURE_2D, targetTexture, level);

                    return { targetTexture: targetTexture, fb: fb };
                }

                var obj = generate(width, height);

                target.fbo = obj.fb;
                target.texture = obj.targetTexture;

                target.setSize = function (width, height) {
                    gl.deleteFramebuffer(target.fbo);
                    gl.deleteTexture(target.texture);

                    var obj = generate(width, height);

                    this.fbo = obj.fb;
                    this.texture = obj.targetTexture;
                };

                return target;
            }
        }, {
            key: '_getBindPointForSamplerType',
            value: function _getBindPointForSamplerType(type) {
                var gl = this.gl;

                if (type === gl.SAMPLER_2D) return gl.TEXTURE_2D;
                if (type === gl.SAMPLER_CUBE) return gl.TEXTURE_CUBE_MAP;
            }
        }, {
            key: '_createUniformSetter',
            value: function _createUniformSetter(prog, uData) {
                var gl = this.gl;
                var name = uData.name,
                    type = uData.type,
                    size = uData.size;

                var location = gl.getUniformLocation(prog, name);
                var isArray = size > 1 && name.substr(-3) === "[0]";

                if (type === gl.FLOAT && isArray) return function (v) {
                    gl.uniform1fv(location, v);
                };
                if (type === gl.FLOAT) return function (v) {
                    gl.uniform1f(location, v);
                };
                if (type === gl.FLOAT_VEC2) return function (v) {
                    gl.uniform2fv(location, v);
                };
                if (type === gl.FLOAT_VEC3) return function (v) {
                    gl.uniform3fv(location, v);
                };
                if (type === gl.FLOAT_VEC4) return function (v) {
                    gl.uniform4fv(location, v);
                };
                if (type === gl.INT && isArray) return function (v) {
                    gl.uniform1iv(location, v);
                };
                if (type === gl.INT) return function (v) {
                    gl.uniform1i(location, v);
                };
                if (type === gl.INT_VEC2) return function (v) {
                    gl.uniform2iv(location, v);
                };
                if (type === gl.INT_VEC3) return function (v) {
                    gl.uniform3iv(location, v);
                };
                if (type === gl.INT_VEC4) return function (v) {
                    gl.uniform4iv(location, v);
                };
                if (type === gl.BOOL) return function (v) {
                    gl.uniform1iv(location, [v]);
                };
                if (type === gl.BOOL_VEC2) return function (v) {
                    gl.uniform2iv(location, v);
                };
                if (type === gl.BOOL_VEC3) return function (v) {
                    gl.uniform3iv(location, v);
                };
                if (type === gl.BOOL_VEC4) return function (v) {
                    gl.uniform4iv(location, v);
                };
                if (type === gl.FLOAT_MAT2) return function (v) {
                    gl.uniformMatrix2fv(location, false, v);
                };
                if (type === gl.FLOAT_MAT3) return function (v) {
                    gl.uniformMatrix3fv(location, false, v);
                };
                if (type === gl.FLOAT_MAT4) return function (v) {
                    gl.uniformMatrix4fv(location, false, v);
                };

                if ((type === gl.SAMPLER_2D || type === gl.SAMPLER_CUBE) && isArray) {
                    var units = [];
                    for (var ii = 0; ii < info.size; ++ii) {
                        units.push(this._tUnit++);
                    }
                    return function (bindPoint, units) {
                        return function (textures) {
                            gl.uniform1iv(location, units);
                            textures.forEach(function (texture, index) {
                                gl.activeTexture(gl.TEXTURE0 + units[index]);
                                gl.bindTexture(bindPoint, texture);
                            });
                        };
                    }(this._getBindPointForSamplerType(type), units);
                }
                if (type === gl.SAMPLER_2D || type === gl.SAMPLER_CUBE) {
                    return function (bindPoint, unit) {
                        return function (texture) {
                            gl.uniform1i(location, unit);
                            gl.activeTexture(gl.TEXTURE0 + unit);
                            gl.bindTexture(bindPoint, texture);
                        };
                    }(this._getBindPointForSamplerType(type), this._tUnit++);
                }
                throw "unknown type: 0x" + type.toString(16);
            }
        }, {
            key: '_uniformSetters',
            value: function _uniformSetters(program) {
                var gl = this.gl;

                var uniformSetters = {};
                var numUniforms = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS);

                this._tUnit = 0;

                for (var ii = 0; ii < numUniforms; ++ii) {
                    var uniformInfo = gl.getActiveUniform(program, ii);
                    if (!uniformInfo) break;
                    var name = uniformInfo.name;

                    if (name.substr(-3) === "[0]") name = name.substr(0, name.length - 3);
                    var setter = this._createUniformSetter(program, uniformInfo);
                    uniformSetters[name] = setter;
                }
                return uniformSetters;
            }
        }, {
            key: '_setGeometry',
            value: function _setGeometry() {
                var gl = this.gl;

                var top = -1;
                var bottom = 1;
                var left = -1;
                var right = 1;
                var geo = [left, top, right, top, left, bottom, right, top, right, bottom, left, bottom];

                gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(geo), gl.STATIC_DRAW);
            }
        }, {
            key: '_setTexcoord',
            value: function _setTexcoord() {
                var gl = this.gl;

                gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([0, 1, 1, 1, 0, 0, 1, 1, 1, 0, 0, 0]), gl.STATIC_DRAW);
            }
        }, {
            key: 'error',
            value: function error(msg) {
                console.warn(msg);
                return null;
            }
        }]);

        return FraGL;
    }();

    var _initialiseProps = function _initialiseProps() {
        var _this = this;

        this._width = 0;
        this._height = 0;
        this._renderItems = {};
        this._tUnit = 0;
        this._imageLoadColor = [255, 150, 150, 255];
        this._clearColor = [0, 0, 0, 0];
        this._imageCanvas = null;
        this._imageCtx = null;
        this.trasparent = true;
        this.premultipliedAlpha = false;
        this.antialias = false;
        this.depth = false;

        this.clear = function () {
            var gl = _this.gl;

            gl.clear(gl.COLOR_BUFFER_BIT);
        };
    };

    return FraGL;

})));
