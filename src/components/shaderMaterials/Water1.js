import * as THREE from "three";

const water1Material = new THREE.ShaderMaterial({
    uniforms: {
        iTime: { value: 0 },
        iResolution: { value: new THREE.Vector3(window.innerWidth, window.innerHeight, 1) }
    },
    vertexShader: `
            varying vec2 vUv;
            void main() {
                vUv = uv;
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
        `,
    fragmentShader: `
            #define TAU 6.28318530718
            #define MAX_ITER 5

            uniform float iTime;
            uniform vec3 iResolution;
            varying vec2 vUv;

            void mainImage( out vec4 fragColor, in vec2 fragCoord ) {
                float time = iTime * .5 + 23.0;
                vec2 uv = fragCoord.xy / iResolution.xy;

                vec2 p = mod(uv * TAU, TAU) - 250.0;
                vec2 i = vec2(p);
                float c = 1.0;
                float inten = .005;

                for (int n = 0; n < MAX_ITER; n++) {
                    float t = time * (1.0 - (3.5 / float(n + 1)));
                    i = p + vec2(cos(t - i.x) + sin(t + i.y), sin(t - i.y) + cos(t + i.x));
                    c += 1.0 / length(vec2(p.x / (sin(i.x + t) / inten), p.y / (cos(i.y + t) / inten)));
                }
                c /= float(MAX_ITER);
                c = 1.17 - pow(c, 1.4);
                vec3 colour = vec3(pow(abs(c), 8.0));
                colour = clamp(colour + vec3(0.0, 0.35, 0.5), 0.0, 1.0);

                fragColor = vec4(colour, 1.0);
            }

            void main() {
                mainImage(gl_FragColor, vUv * iResolution.xy);
            }
        `,

    depthTest: false,  // 禁用深度测试
    depthWrite: false, // 禁用深度写入
    transparent: true,  // 启用透明度

    side: THREE.DoubleSide
});

const water3Material = new THREE.ShaderMaterial({
    uniforms: {
        uOpacity: { value: 0.75 },
        iTime: { value: 0 },
        iResolution: { value: new THREE.Vector3(window.innerWidth, window.innerHeight, 1) },
    },
    vertexShader: `
            varying vec2 vUv;
            void main() {
                vUv = uv;
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
        `,
    fragmentShader: `
uniform vec2 iResolution;
uniform float iTime;
uniform float uOpacity;
varying vec2 vUv;

float sdcircle(vec2 st, vec2 origin, float r){
  return length(st - origin) - r;
}

vec2 floor2d(vec2 st){
  return vec2(floor(st.x), floor(st.y));
}

vec2 fract2d(vec2 st){
  return vec2(fract(st.x), fract(st.y));
}

vec2 random2d(vec2 st){
  float r1 = fract(sin(dot(st.xy, vec2(127.9898, 311.233))) * 43758.5453123);
  float r2 = fract(sin(dot(st.xy, vec2(269.5, 183.3))) * 43758.5453123);
  return 2.0 * vec2(r1, r2) - 1.0;
}

float noise(vec2 st){
  vec2 i = floor2d(st);
  vec2 f = fract2d(st);
  
  vec2 a = random2d(i);
  vec2 b = random2d(i + vec2(1.0, 0.0));
  vec2 c = random2d(i + vec2(0.0, 1.0));
  vec2 d = random2d(i + vec2(1.0, 1.0));
  
  vec2 u = smoothstep(0.0, 1.0, f);
  
  float e = mix(dot(a, f), dot(b, f - vec2(1.0, 0.0)), u.x);
  float g = mix(dot(c, f - vec2(0.0, 1.0)), dot(d, f - vec2(1.0, 1.0)), u.x);
  float h = mix(e, g, u.y);
  return h;
}

float fbm(vec2 st){
  const int OCTAVES = 10;
  float value = 0.0;
  float amplitude = 0.5;
  
  for(int i = 0; i < OCTAVES; i++){
    value += amplitude * abs(noise(st));
    st *= 2.0;
    amplitude *= 0.5;
  }
  return value;
}

vec2 distort(vec2 uv){
  return uv + fbm(uv + vec2(0.24, 0.025) + iTime * 0.125);
}

vec2 distort2(vec2 uv){
  return uv + fbm(uv + vec2(0.12, 0.52) + iTime * 0.324);
}

vec4 wave(vec2 uv){
  uv = uv * 2.0;
  vec2 p = distort(uv);
  p = distort(p);
  float c = fbm(p);
  c = c * 4.0 - 0.2;
  vec4 color = vec4(vec3(c), 1.0);
  color = color * vec4(1.0, 0.5, 0.3, 1.0);
  color = 1.0 - color;
  color.w = uOpacity;
  return color;
}

void main() {
  vec2 uv = gl_FragCoord.xy / iResolution.xy - 0.5;
  uv = uv * 1.0;
  vec4 wave1 = wave(uv);
  vec4 wave2 = wave(vec2(uv.x, -uv.y) + 1.5);
  vec4 wave3 = wave(vec2(-uv.x, -uv.y) + 3.0);
  vec4 wave4 = wave(vec2(-uv.x, -uv.y) + 4.5);
  gl_FragColor = 0.25 * wave1 + 0.25 * wave2 + 0.25 * wave3 + 0.25 * wave4;
}
        `,
/*    depthTest: false,  // 禁用深度测试
    depthWrite: false, // 禁用深度写入*/
    transparent: true,  // 启用透明度
    side: THREE.DoubleSide,
    wireframe: false
});

function createWater2Material(points){
    const pointsLength = points.length;

    const pointTexture = new THREE.DataTexture(
        new Float32Array(points), // 假设points是一个二维数组，需要将其展平为一维
        points.length, // 宽度为points的长度
        1, // 高度为1
        THREE.RGBFormat,
        THREE.FloatType
    );

    const vs = `
            varying vec2 vUv;
            varying vec3 vPosition;
            void main() {
                vUv = uv;
                vPosition = position; // 将顶点位置传递到片段着色器
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
        `;
    const fs =`
uniform vec2 iResolution;
uniform float iTime;
uniform float uOpacity;
varying vec2 vUv;
varying vec3 vPosition;
uniform sampler2D pointTexture;
uniform int numPoints;

float sdcircle(vec2 st, vec2 origin, float r){
  return length(st - origin) - r;
}

vec2 floor2d(vec2 st){
  return vec2(floor(st.x), floor(st.y));
}

vec2 fract2d(vec2 st){
  return vec2(fract(st.x), fract(st.y));
}

vec2 random2d(vec2 st){
  float r1 = fract(sin(dot(st.xy, vec2(127.9898, 311.233))) * 43758.5453123);
  float r2 = fract(sin(dot(st.xy, vec2(269.5, 183.3))) * 43758.5453123);
  return 2.0 * vec2(r1, r2) - 1.0;
}

float noise(vec2 st){
  vec2 i = floor2d(st);
  vec2 f = fract2d(st);
  
  vec2 a = random2d(i);
  vec2 b = random2d(i + vec2(1.0, 0.0));
  vec2 c = random2d(i + vec2(0.0, 1.0));
  vec2 d = random2d(i + vec2(1.0, 1.0));
  
  vec2 u = smoothstep(0.0, 1.0, f);
  
  float e = mix(dot(a, f), dot(b, f - vec2(1.0, 0.0)), u.x);
  float g = mix(dot(c, f - vec2(0.0, 1.0)), dot(d, f - vec2(1.0, 1.0)), u.x);
  float h = mix(e, g, u.y);
  return h;
}

float fbm(vec2 st){
  const int OCTAVES = 10;
  float value = 0.0;
  float amplitude = 0.5;
  
  for(int i = 0; i < OCTAVES; i++){
    value += amplitude * abs(noise(st));
    st *= 2.0;
    amplitude *= 0.5;
  }
  return value;
}

vec2 distort(vec2 uv){
  return uv + fbm(uv + vec2(0.24, 0.025) + iTime * 0.125);
}

vec2 distort2(vec2 uv){
  return uv + fbm(uv + vec2(0.12, 0.52) + iTime * 0.324);
}

vec4 wave(vec2 uv){
  uv = uv * 2.0;
  vec2 p = distort(uv);
  p = distort(p);
  float c = fbm(p);
  c = c * 4.0 - 0.2;
  vec4 color = vec4(vec3(c), 1.0);
  color = color * vec4(1.0, 0.5, 0.3, 1.0);
  color = 1.0 - color;
  color.w = uOpacity;
  return color;
}

bool isInside(vec3 p) {
    float threshold = 180.0; // 影响范围的阈值
    for (int i = 0; i < numPoints; i++) {
        vec3 point = texture2D(pointTexture, vec2(float(i) / float(numPoints), 0.5)).rgb;
        float distance = length(p - point); // 计算距离
        if (distance < threshold) {
            return true;
        }
    }
    return false;
}

void main() {
    
    //if (!isInside(vPosition)) {
    //    discard; // 裁剪片段
    //}

  vec2 uv = gl_FragCoord.xy / iResolution.xy - 0.5;
  uv = uv * 1.0;
  vec4 wave1 = wave(uv);
  vec4 wave2 = wave(vec2(uv.x, -uv.y) + 1.5);
  vec4 wave3 = wave(vec2(-uv.x, -uv.y) + 3.0);
  vec4 wave4 = wave(vec2(-uv.x, -uv.y) + 4.5);
  gl_FragColor = 0.25 * wave1 + 0.25 * wave2 + 0.25 * wave3 + 0.25 * wave4;
}
        `;

    return new THREE.ShaderMaterial({
        uniforms: {
            uOpacity: { value: 1.0 },
            iTime: { value: 0 },
            iResolution: { value: new THREE.Vector3(window.innerWidth, window.innerHeight, 1) },
            pointTexture: { value: pointTexture },
            numPoints: { value: points.length }
        },
        vertexShader: vs,
        fragmentShader: fs,
        transparent: true,
        side: THREE.DoubleSide,
        wireframe: false
    });

}


export {water1Material,createWater2Material,water3Material}