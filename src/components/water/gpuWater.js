import * as THREE from 'three';

/*
import { GPUComputationRenderer } from 'three/addons/misc/GPUComputationRenderer.js';
import { SimplexNoise } from 'three/addons/math/SimplexNoise.js';*/

import { GPUComputationRenderer } from "three/addons";
import { SimplexNoise } from "three/addons";

console.log(GPUComputationRenderer,SimplexNoise);

let waterMaterial;
let meshRay;
let gpuCompute;
let heightmapVariable;
let waterUniforms;
let smoothShader;
let readWaterLevelShader;
let readWaterLevelRenderTarget;
let readWaterLevelImage;
const waterNormal = new THREE.Vector3();

const simplex = new SimplexNoise();

const heightmapFragmentShader =
    `#include <common>

   tuniform vec2 mousePos;
   tuniform float mouseSize;
   tuniform float viscosityConstant;
   tuniform float heightCompensation;

   tvoid main() {

    tvec2 cellSize = 1.0 / resolution.xy;

    tvec2 uv = gl_FragCoord.xy * cellSize;

    // heightmapValue.x == height from previous frame
    // heightmapValue.y == height from penultimate frame
    // heightmapValue.z, heightmapValue.w not used
    tvec4 heightmapValue = texture2D( heightmap, uv );

    // Get neighbours
    tvec4 north = texture2D( heightmap, uv + vec2( 0.0, cellSize.y ) );
    tvec4 south = texture2D( heightmap, uv + vec2( 0.0, - cellSize.y ) );
    tvec4 east = texture2D( heightmap, uv + vec2( cellSize.x, 0.0 ) );
    tvec4 west = texture2D( heightmap, uv + vec2( - cellSize.x, 0.0 ) );

    // https://web.archive.org/web/20080618181901/http://freespace.virgin.net/hugo.elias/graphics/x_water.htm

    tfloat newHeight = ( ( north.x + south.x + east.x + west.x ) * 0.5 - heightmapValue.y ) * viscosityConstant;

    // Mouse influence
    tfloat mousePhase = clamp( length( ( uv - vec2( 0.5 ) ) * BOUNDS - vec2( mousePos.x, - mousePos.y ) ) * PI / mouseSize, 0.0, PI );
    tnewHeight += ( cos( mousePhase ) + 1.0 ) * 0.28;

    theightmapValue.y = heightmapValue.x;
    theightmapValue.x = newHeight;

    tgl_FragColor = heightmapValue;

   }
    
    `;

const smoothFragmentShader =
    `
        uniform sampler2D smoothTexture;

        void main()  {

          vec2 cellSize = 1.0 / resolution.xy;
    
          vec2 uv = gl_FragCoord.xy * cellSize;
    
            // Computes the mean of texel and 4 neighbours
          vec4 textureValue = texture2D( smoothTexture, uv );
          textureValue += texture2D( smoothTexture, uv + vec2( 0.0, cellSize.y ) );
          textureValue += texture2D( smoothTexture, uv + vec2( 0.0, - cellSize.y ) );
          textureValue += texture2D( smoothTexture, uv + vec2( cellSize.x, 0.0 ) );
          textureValue += texture2D( smoothTexture, uv + vec2( - cellSize.x, 0.0 ) );
    
          textureValue /= 5.0;
    
          gl_FragColor = textureValue;

      }
    `;

const readWaterLevelFragmentShader =
    `
      uniform vec2 point1;

      uniform sampler2D levelTexture;

      // Integer to float conversion from https://stackoverflow.com/questions/17981163/webgl-read-pixels-from-floating-point-render-target

      float shift_right( float v, float amt ) {

        v = floor( v ) + 0.5;
        return floor( v / exp2( amt ) );

      }

      float shift_left( float v, float amt ) {

        return floor( v * exp2( amt ) + 0.5 );

      }

      float mask_last( float v, float bits ) {

        return mod( v, shift_left( 1.0, bits ) );

      }

      float extract_bits( float num, float from, float to ) {

        from = floor( from + 0.5 ); to = floor( to + 0.5 );
        return mask_last( shift_right( num, from ), to - from );

      }

      vec4 encode_float( float val ) {
        if ( val == 0.0 ) return vec4( 0, 0, 0, 0 );
        float sign = val > 0.0 ? 0.0 : 1.0;
        val = abs( val );
        float exponent = floor( log2( val ) );
        float biased_exponent = exponent + 127.0;
        float fraction = ( ( val / exp2( exponent ) ) - 1.0 ) * 8388608.0;
        float t = biased_exponent / 2.0;
        float last_bit_of_biased_exponent = fract( t ) * 2.0;
        float remaining_bits_of_biased_exponent = floor( t );
        float byte4 = extract_bits( fraction, 0.0, 8.0 ) / 255.0;
        float byte3 = extract_bits( fraction, 8.0, 16.0 ) / 255.0;
        float byte2 = ( last_bit_of_biased_exponent * 128.0 + extract_bits( fraction, 16.0, 23.0 ) ) / 255.0;
        float byte1 = ( sign * 128.0 + remaining_bits_of_biased_exponent ) / 255.0;
        return vec4( byte4, byte3, byte2, byte1 );
      }

      void main()  {

        vec2 cellSize = 1.0 / resolution.xy;

        float waterLevel = texture2D( levelTexture, point1 ).x;

        vec2 normal = vec2(
          ( texture2D( levelTexture, point1 + vec2( - cellSize.x, 0 ) ).x - texture2D( levelTexture, point1 + vec2( cellSize.x, 0 ) ).x ) * WIDTH / BOUNDS,
          ( texture2D( levelTexture, point1 + vec2( 0, - cellSize.y ) ).x - texture2D( levelTexture, point1 + vec2( 0, cellSize.y ) ).x ) * WIDTH / BOUNDS );

        if ( gl_FragCoord.x < 1.5 ) {

          gl_FragColor = encode_float( waterLevel );

        } else if ( gl_FragCoord.x < 2.5 ) {

          gl_FragColor = encode_float( normal.x );

        } else if ( gl_FragCoord.x < 3.5 ) {

          gl_FragColor = encode_float( normal.y );

        } else {

          gl_FragColor = encode_float( 0.0 );

        }

      }
    `;

const waterVertexShader =
    `
      uniform sampler2D heightmap;

      #define PHONG

      varying vec3 vViewPosition;

      #ifndef FLAT_SHADED

        varying vec3 vNormal;

      #endif

      #include <common>
      #include <uv_pars_vertex>
      #include <displacementmap_pars_vertex>
      #include <envmap_pars_vertex>
      #include <color_pars_vertex>
      #include <morphtarget_pars_vertex>
      #include <skinning_pars_vertex>
      #include <shadowmap_pars_vertex>
      #include <logdepthbuf_pars_vertex>
      #include <clipping_planes_pars_vertex>

      void main() {

        vec2 cellSize = vec2( 1.0 / WIDTH, 1.0 / WIDTH );

        #include <uv_vertex>
        #include <color_vertex>

        // # include <beginnormal_vertex>
        // Compute normal from heightmap
        vec3 objectNormal = vec3(
          ( texture2D( heightmap, uv + vec2( - cellSize.x, 0 ) ).x - texture2D( heightmap, uv + vec2( cellSize.x, 0 ) ).x ) * WIDTH / BOUNDS,
          ( texture2D( heightmap, uv + vec2( 0, - cellSize.y ) ).x - texture2D( heightmap, uv + vec2( 0, cellSize.y ) ).x ) * WIDTH / BOUNDS,
          1.0 );
        //<beginnormal_vertex>

        #include <morphnormal_vertex>
        #include <skinbase_vertex>
        #include <skinnormal_vertex>
        #include <defaultnormal_vertex>

      #ifndef FLAT_SHADED // Normal computed with derivatives when FLAT_SHADED

        vNormal = normalize( transformedNormal );

      #endif

        //# include <begin_vertex>
        float heightValue = texture2D( heightmap, uv ).x;
        vec3 transformed = vec3( position.x, position.y, heightValue );
        //<begin_vertex>

        #include <morphtarget_vertex>
        #include <skinning_vertex>
        #include <displacementmap_vertex>
        #include <project_vertex>
        #include <logdepthbuf_vertex>
        #include <clipping_planes_vertex>

        vViewPosition = - mvPosition.xyz;

        #include <worldpos_vertex>
        #include <envmap_vertex>
        #include <shadowmap_vertex>

      }
    `

function initWater() {
    const materialColor = 0x0080C0;

    const material = new THREE.ShaderMaterial( {
        uniforms: THREE.UniformsUtils.merge( [
            THREE.ShaderLib[ 'phong' ].uniforms,
            {
                'heightmap': { value: null }
            }
        ] ),
        vertexShader: waterVertexShader,
        fragmentShader: THREE.ShaderChunk[ 'meshphong_frag' ]
    } );

    material.lights = true;

    material.uniforms[ 'diffuse' ].value = new THREE.Color( materialColor );
    material.uniforms[ 'specular' ].value = new THREE.Color( 0x111111 );
    material.uniforms[ 'shininess' ].value = Math.max( 50, 1e-4 );
    material.uniforms[ 'opacity' ].value = material.opacity;

    waterMaterial = material;
}
