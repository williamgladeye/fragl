
```
___________               ________.____     
\_   _____/___________   /  _____/|    |    
 |    __) \_  __ \__  \ /   \  ___|    |    
 |     \   |  | \// __ \\    \_\  \    |___ 
 \___  /   |__|  (____  /\______  /_______ \
     \/               \/        \/        \/
```
---

This is a small lib for WebGl shader effects. 

- It is not intended for moving vertices or 3d work. 
- It is good for creating animated and interactive graphics within fragment shaders and rendering to frame buffers for multiple shader passes and also stacking graphical layers for compositions.


# Usage
  

```javascript
    // import the fragl lib
    import FraGL from 'FraGL'

    // get canvas
    const canvas = document.querySelector('.canvas');

    // pass canvas to fragl constructor
    const fragl = new FraGL(args)
```


So thats the basic setup, contructor args are all optional, if no canvas is given then it will create a canvas element and it will be stored at `fragl.domElement`

```javascript

    // defautls
    const args = {
        canvas: canvasDomEl, 
        clearColor: [0,0,0,0], 
        imageLoadColor = [255, 150, 150, 255], 
        size:{
            width: window.innerWidth, 
            height: window.innerHeight 
        },
        trasparent: false, 
        premultipliedAlpha: false,         
        antialias: false
        depth: false
    }
```

- canvas
  - canvas dom el
- clearColor
  - 4 part array (rgba) values between 0 and 1
- imageLoadColor 
  - 4 part array (rgba) values between 0 and 255;
- size
  - object of width and height
- trasparent
  - Boolean that indicates if the canvas contains an alpha buffer.
- premultipliedAlpha
  - Boolean that indicates that the page compositor will assume the drawing buffer contains colors with pre-multiplied 
- antialias
  - Boolean that indicates whether or not to perform anti-aliasing.
- depth
  - Boolean that indicates that the drawing buffer has a depth buffer of at least 16 bits.


### And to resize the FraGL renderer

```javascript
    fragl.setSize(width,height)
```


### Creating render layers


```javascript

    //.createRenderLayer( 'name'= String, args = Object );

    const renderLayer = fragl.createRenderLayer('render-layer', {
        uniforms:{ 
            // dummy uniforms made up for the sake of demonstration
            u_res:{
                value: [ width, height ] // vec2
            },
            u_texture:{
                value: texture // texture
            },
            u_val:{
                value: 1. // float
            }
        },
        vertex:vertexShader, // string
        fragment:fragmentShader // string
    })
```
### Updating uniforms

```javascript
    renderLayer.uniforms['u_res'].value = [ width, height ]
```

### Create a texture from an image

```
    const texture = fragl.textureFromImage('./path/to/image.jpg');
```



### Creating render texture

```javascript
    const renderTexture = fragl.createRenderTexture({
        width: window.innerWidth,
        height: window.innerHeight
    });

    renderLayer.uniforms['u_texture'].value = renderTexture.texture
```

and to resize  

```javascript
    renderTexture.setSize(w,h)
```


### Rendering

```javascript
    // render to canvas
    renderLayer.render()

    // render to renderTexture
    renderLayer.render(renderTexture)
```

an example

```javascript
    render(){
        renderLayer1.render(renderTexture)

        renderLayer2.uniforms['u_texure'].value = renderTexture.texture

        renderLayer2.render()
    }
```
