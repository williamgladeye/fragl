/*
    Contains functions modified from greggman/webgl-fundamentals, see WEBGL_FUNDAMENTALS_LICENSE
*/

class FraGL{

    _width = 0;
    _height = 0;
    _renderItems = {};
    _tUnit = 0;
    _imageLoadColor = [255, 150, 150, 255];
    _clearColor = [0,0,0,0];
    _imageCanvas = null;
    _imageCtx = null;
    trasparent = true;
    premultipliedAlpha = true;
    antialias = false;
    depth = false;
    blending = {
        src:'SRC_ALPHA',
        dst:'ONE_MINUS_SRC_ALPHA'
    }

    constructor(args = {}){
        this._setArgs(args)

        this.domElement = args.canvas || document.createElement('canvas');;
        this.gl = this.domElement.getContext("webgl",{
            premultipliedAlpha: this.premultipliedAlpha,
            alpha:this.trasparent,
            antialias: this.antialias,
            depth: this.depth,
        });

        this._resize();

        const { gl } = this;

        gl.clearColor(...this._clearColor);

        this.clear();

        gl.enable(gl.BLEND);
        gl.colorMask(1, 1, 1, 1);
        gl.blendFunc(gl[this.blending.src], gl[this.blending.dst])

    }

    _setArgs(args){
        if(args.imageLoadColor && Array.isArray(args.imageLoadColor) && args.imageLoadColor.length == 4) this._imageLoadColor = args.imageLoadColor;
        if(args.size){
            this._width = args.size.width
            this._height = args.size.height
        }else{
            this._width = window.innerWidth;
            this._height = window.innerHeight;
        }
        if(args.clearColor && Array.isArray(args.clearColor) && args.clearColor.length == 4) this._clearColor = args.clearColor;
        if(args.trasparent) this.trasparent = args.trasparent;
        if(args.premultipliedAlpha) this.premultipliedAlpha = args.premultipliedAlpha;
        if(args.antialias)  this.antialias = args.antialias
        if(args.depth) this.depth = args.depth
        if(args.blending && args.blending.src) this.blending.src = args.blending.src;
        if(args.blending && args.blending.dst) this.blending.dst = args.blending.dst;
    }

    _createShader(content, type){
        const { gl, error } = this;
        const shaderType = type == 'vertex' ? gl.VERTEX_SHADER : type == 'fragment' ?  gl.FRAGMENT_SHADER : false;

        if(!shaderType) return error('shader type issue');

        const shader = gl.createShader(shaderType);

        gl.shaderSource(shader, content);
        gl.compileShader(shader);

        const compiledShader = gl.getShaderParameter(shader, gl.COMPILE_STATUS);

        if(!compiledShader){
            error( `${type} shader compilation error: ${gl.getShaderInfoLog(shader)}` );
            gl.deleteShader(shader);
            return null;
        }

        return shader;
    }


    _nextPow2(val){
        let v = val;
        v--;
        v |= v >> 1;
        v |= v >> 2;
        v |= v >> 4;
        v |= v >> 8;
        v |= v >> 16;
        v++;
        return v;
    }

    _checkSize(image){
        const { naturalWidth:w, naturalHeight:h } = image;

        const nw = this._nextPow2(w);
        const nh = this._nextPow2(h);

        if(nw == w && nh == h) return image;

        console.log('resize');

        if(!this._imageCanvas) {
            this._imageCanvas = document.createElement('canvas');
            this._imageCtx = this._imageCanvas.getContext('2d');
        }

        this._imageCanvas.width = nw;
        this._imageCanvas.height = nh;

        this._imageCtx.drawImage(image, 0,0,nw, nh);

        image.src = this._imageCanvas.toDataURL();

        return image;
    }

    _loadImage(src){
        const _scope = this;
        return new Promise( resolve =>{
            let image = new Image();
            image.crossOrigin = "anonymous";
            image.addEventListener('load', function(){
                image = _scope._checkSize(image);
                resolve(image);
            })
            image.src = src;
        })
    }

    textureFromImage(src){
        const { gl, _imageLoadColor } = this;
        const texture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array(_imageLoadColor));

        this._loadImage(src).then(
            image => {
                gl.bindTexture(gl.TEXTURE_2D, texture);
                gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA,gl.UNSIGNED_BYTE, image);
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
                // gl.generateMipmap(gl.TEXTURE_2D);
            }
        )
        return texture;
    }

    _createProgram({ vertex = '', fragment = ''}){
        const { gl, error } = this;
        const vertexShader = this._createShader(vertex, 'vertex');
        const fragmentShader = this._createShader(fragment, 'fragment');
        const program = gl.createProgram();

        gl.attachShader(program, vertexShader);
        gl.attachShader(program, fragmentShader);

        gl.linkProgram(program);

        const linked = gl.getProgramParameter(program, gl.LINK_STATUS);

        if(!linked){
            error( `error linking program: ${gl.getProgramInfoLog(program)}` );
            gl.deleteProgram(program);

            return null;
        }

        return program;
    }

    setSize(w,h){
        this._width = w;
        this._height = h;
        this._resize();
    }

    _resize(){
        const { gl, _width, _height } = this;

        gl.canvas.width = _width;
        gl.canvas.height = _height;

        gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
    }

    createRenderLayer(name, args){
        const { uniforms } = args;
        const { gl } = this;
        const _scope = this;
        const program = this._createProgram({
            vertex: args.vertex,
            fragment: args.fragment
        });

        const pLocation = gl.getAttribLocation(program, "a_position");
        const tLocation = gl.getAttribLocation(program, "a_texcoord");
        const positionBuffer = gl.createBuffer();


        gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
        this._setGeometry();

        const texcoordBuffer = gl.createBuffer();

        gl.bindBuffer(gl.ARRAY_BUFFER, texcoordBuffer);
        this._setTexcoord();


        const uniformSetters = this._uniformSetters(program);
        const setAttribs = () => {
            var size = 2;
            var type = gl.FLOAT;
            var normalize = false;
            var stride = 0;
            var offset = 0;

            gl.enableVertexAttribArray(pLocation);
            gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
            gl.vertexAttribPointer( pLocation, size, type, normalize, stride, offset);

            gl.enableVertexAttribArray(tLocation);
            gl.bindBuffer(gl.ARRAY_BUFFER, texcoordBuffer);
            gl.vertexAttribPointer( tLocation, size, type, normalize, stride, offset);

        };

        this._renderItems[name] = {
            uniformSetters,
            setAttribs,
            uniforms,
            render: function(output){
                const { uniformSetters, setAttribs, uniforms } = this;
                gl.useProgram(program);

                setAttribs();
                Object.keys(uniformSetters).forEach( uniform => {
                    if(uniforms[uniform]) uniformSetters[uniform](uniforms[uniform].value)
                })

                if(output) gl.bindFramebuffer(gl.FRAMEBUFFER, output.fbo);
                else gl.bindFramebuffer(gl.FRAMEBUFFER, null);

                const primitiveType = gl.TRIANGLES;
                const offset = 0;
                const count = 6;

                gl.drawArrays(primitiveType, offset, count);
            }
        }

        return this._renderItems[name];
    }

    clear = () =>{
        const { gl } = this;
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)
    }

    // render = () =>{
    //     const _scope = this;
    //     this.clear();

    //     Object.keys(_scope._renderItems).forEach( function(key) {
    //         _scope._renderItems[key].render();
    //     })
    // }

    createRenderTexture({width, height}){
        const { gl } = this;
        const target = {};

        function generate(width, height){
            const targetTextureWidth = width;
            const targetTextureHeight = height;
            const targetTexture = gl.createTexture();
            gl.bindTexture(gl.TEXTURE_2D, targetTexture);

            const level = 0;
            const internalFormat = gl.RGBA;
            const border = 0;
            const format = gl.RGBA;
            const type = gl.UNSIGNED_BYTE;
            const data = null;

            gl.texImage2D(gl.TEXTURE_2D, level, internalFormat,
                            targetTextureWidth, targetTextureHeight, border,
                            format, type, data);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

            const fb = gl.createFramebuffer();
            gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
            const attachmentPoint = gl.COLOR_ATTACHMENT0;
            gl.framebufferTexture2D(gl.FRAMEBUFFER, attachmentPoint, gl.TEXTURE_2D, targetTexture, level);

            return { targetTexture, fb }
        }

        const obj = generate(width, height)

        target.fbo = obj.fb;
        target.texture = obj.targetTexture;

        target.setSize = function(width, height) {
            gl.deleteFramebuffer(target.fbo);
            gl.deleteTexture(target.texture);

            const obj = generate(width, height)

            this.fbo = obj.fb;
            this.texture = obj.targetTexture;
        }

        return target;
    }

    _getBindPointForSamplerType(type) {
        const { gl } = this;
        if (type === gl.SAMPLER_2D) return gl.TEXTURE_2D;
        if (type === gl.SAMPLER_CUBE) return gl.TEXTURE_CUBE_MAP;
    }

    _createUniformSetter(prog, uData){
        const { gl } = this;
        const { name, type, size } = uData;
        const location = gl.getUniformLocation(prog, name);
        const isArray = size > 1 && name.substr(-3) === "[0]";

        if (type === gl.FLOAT && isArray)  return v => { gl.uniform1fv(location, v); }
        if (type === gl.FLOAT)  return v => { gl.uniform1f(location, v); };
        if (type === gl.FLOAT_VEC2)  return v => { gl.uniform2fv(location, v); };
        if (type === gl.FLOAT_VEC3) return v => { gl.uniform3fv(location, v); }
        if (type === gl.FLOAT_VEC4) return v => { gl.uniform4fv(location, v); }
        if (type === gl.INT && isArray) return v => { gl.uniform1iv(location, v); }
        if (type === gl.INT) return v => { gl.uniform1i(location, v); }
        if (type === gl.INT_VEC2) return v => { gl.uniform2iv(location, v); }
        if (type === gl.INT_VEC3) return v => { gl.uniform3iv(location, v); }
        if (type === gl.INT_VEC4) return v => { gl.uniform4iv(location, v); }
        if (type === gl.BOOL) return v => { gl.uniform1iv(location, [v] ); }
        if (type === gl.BOOL_VEC2) return v => { gl.uniform2iv(location, v); }
        if (type === gl.BOOL_VEC3) return v => { gl.uniform3iv(location, v); }
        if (type === gl.BOOL_VEC4) return v => { gl.uniform4iv(location, v); }
        if (type === gl.FLOAT_MAT2) return v => { gl.uniformMatrix2fv(location, false, v); }
        if (type === gl.FLOAT_MAT3) return v => { gl.uniformMatrix3fv(location, false, v); }
        if (type === gl.FLOAT_MAT4) return v => { gl.uniformMatrix4fv(location, false, v); }

        if ((type === gl.SAMPLER_2D || type === gl.SAMPLER_CUBE) && isArray) {
            const units = [];
            for (let ii = 0; ii < info.size; ++ii) {
                units.push(this._tUnit++);
            }
            return function(bindPoint, units) {
                return textures => {
                    gl.uniform1iv(location, units);
                    textures.forEach(function(texture, index) {
                        gl.activeTexture(gl.TEXTURE0 + units[index]);
                        gl.bindTexture(bindPoint, texture);
                    });
                };
            }(this._getBindPointForSamplerType(type), units);
        }
        if (type === gl.SAMPLER_2D || type === gl.SAMPLER_CUBE) {
            return function(bindPoint, unit) {
                return texture => {
                    gl.uniform1i(location, unit);
                    gl.activeTexture(gl.TEXTURE0 + unit);
                    gl.bindTexture(bindPoint, texture);
                };
            }(this._getBindPointForSamplerType(type), this._tUnit++);
        }
        throw ("unknown type: 0x" + type.toString(16));
    }

    _uniformSetters(program){
        const { gl } = this;
        const uniformSetters = {};
        const numUniforms = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS);

        this._tUnit = 0;

        for (let ii = 0; ii < numUniforms; ++ii) {
            const uniformInfo = gl.getActiveUniform(program, ii);
            if (!uniformInfo) break;
            let { name } = uniformInfo;
            if (name.substr(-3) === "[0]") name = name.substr(0, name.length - 3);
            var setter = this._createUniformSetter(program, uniformInfo);
            uniformSetters[name] = setter;
        }
        return uniformSetters;
    }

    _setGeometry() {
        const { gl } = this;
        const top = -1;
        const bottom = 1;
        const left = -1;
        const right = 1;
        const geo = [
            left, top,
            right, top,
            left, bottom,

            right, top,
            right, bottom,
            left, bottom
        ]

        gl.bufferData(
            gl.ARRAY_BUFFER,
            new Float32Array(geo),
            gl.STATIC_DRAW);
    }

    _setTexcoord() {
        const { gl } = this;
        gl.bufferData(
            gl.ARRAY_BUFFER,
            new Float32Array([
                0, 1,
                1, 1,
                0, 0,

                1, 1,
                1, 0,
                0, 0,
            ]),
            gl.STATIC_DRAW);
    }

    error(msg){
        console.warn(msg);
        return null;
    }
}


export default FraGL;