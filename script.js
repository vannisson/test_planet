const canvas = document.getElementById("canvas");
const gl = canvas.getContext("webgl");

if (gl) {
  console.log("WebGL available");
} else {
  console.log("WebGL not available");
}

function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  gl.viewport(0, 0, canvas.width, canvas.height);
}

window.addEventListener("resize", resizeCanvas);
resizeCanvas();

gl.clearColor(0, 0, 0, 1);
gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

function createShader(gl, type, source) {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.error("Shader compilation failed:", gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

function createProgram(gl, vertexShader, fragmentShader) {
  const program = gl.createProgram();
  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.error("Program linking failed:", gl.getProgramInfoLog(program));
    gl.deleteProgram(program);
    return null;
  }
  return program;
}

const t = (1 + Math.sqrt(5)) / 2; // Razão áurea

const icosahedronVertices = new Float32Array([
  -1,
  t,
  0,
  1,
  t,
  0,
  -1,
  -t,
  0,
  1,
  -t,
  0,
  0,
  -1,
  t,
  0,
  1,
  t,
  0,
  -1,
  -t,
  0,
  1,
  -t,
  t,
  0,
  -1,
  t,
  0,
  1,
  -t,
  0,
  -1,
  -t,
  0,
  1,
]);

const normals = new Float32Array([
  // Normais para cada vértice do icosaedro
  -1,
  t,
  0,
  1,
  t,
  0,
  -1,
  -t,
  0,
  1,
  -t,
  0,
  0,
  -1,
  t,
  0,
  1,
  t,
  0,
  -1,
  -t,
  0,
  1,
  -t,
  t,
  0,
  -1,
  t,
  0,
  1,
  -t,
  0,
  -1,
  -t,
  0,
  1,
]);

const indices = new Uint16Array([
  0, 11, 5, 0, 5, 1, 0, 1, 7, 0, 7, 10, 0, 10, 11, 1, 5, 9, 5, 11, 4, 11, 10, 2,
  10, 7, 6, 7, 1, 8, 3, 9, 4, 3, 4, 2, 3, 2, 6, 3, 6, 8, 3, 8, 9, 4, 9, 5, 2, 4,
  11, 6, 2, 10, 8, 6, 7, 9, 8, 1,
]);

const vertexShaderSource = `
  attribute vec3 position;
  attribute vec3 normal;
  uniform mat4 u_matrix;
  uniform mat3 u_normalMatrix;

  varying vec3 v_normal;

  void main() {
    gl_Position = u_matrix * vec4(position, 1.0);
    v_normal = u_normalMatrix * normal;  // Normal em coordenadas do mundo
  }
`;

const fragmentShaderSource = `
  precision mediump float;
  varying vec3 v_normal;
  uniform vec3 u_lightDirection;

  void main() {
    vec3 normal = normalize(v_normal);
    float light = max(dot(normal, u_lightDirection), 0.0);
    vec3 color = vec3(1.0, 0.0, 0.0) * light; // Cor vermelha
    gl_FragColor = vec4(color, 1.0);
  }
`;

const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
const fragmentShader = createShader(
  gl,
  gl.FRAGMENT_SHADER,
  fragmentShaderSource
);
const program = createProgram(gl, vertexShader, fragmentShader);

const positionBuffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
gl.bufferData(gl.ARRAY_BUFFER, icosahedronVertices, gl.STATIC_DRAW);

const normalBuffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, normalBuffer);
gl.bufferData(gl.ARRAY_BUFFER, normals, gl.STATIC_DRAW);

const indexBuffer = gl.createBuffer();
gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);

gl.useProgram(program);

const positionAttributeLocation = gl.getAttribLocation(program, "position");
const normalAttributeLocation = gl.getAttribLocation(program, "normal");
gl.enableVertexAttribArray(positionAttributeLocation);
gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
gl.vertexAttribPointer(positionAttributeLocation, 3, gl.FLOAT, false, 0, 0);

gl.enableVertexAttribArray(normalAttributeLocation);
gl.bindBuffer(gl.ARRAY_BUFFER, normalBuffer);
gl.vertexAttribPointer(normalAttributeLocation, 3, gl.FLOAT, false, 0, 0);

const matrixLocation = gl.getUniformLocation(program, "u_matrix");
const lightDirectionLocation = gl.getUniformLocation(
  program,
  "u_lightDirection"
);

let rotation = [0, 0, 0]; // Vetor de rotação nos eixos X, Y, Z

function setMatrix() {
  const aspect = canvas.width / canvas.height;
  const fieldOfView = Math.PI / 4; // 45 graus
  const zNear = 0.1;
  const zFar = 100.0;
  const projectionMatrix = mat4.perspective(
    [],
    fieldOfView,
    aspect,
    zNear,
    zFar
  );

  const modelViewMatrix = mat4.create();
  mat4.translate(modelViewMatrix, modelViewMatrix, [0.0, 0.0, -10.0]); // Afastar da câmera

  // Aplicar rotação contínua
  mat4.rotateX(modelViewMatrix, modelViewMatrix, rotation[0]);
  mat4.rotateY(modelViewMatrix, modelViewMatrix, rotation[1]);
  mat4.rotateZ(modelViewMatrix, modelViewMatrix, rotation[2]);

  const normalMatrix = mat3.create();
  mat3.fromMat4(normalMatrix, modelViewMatrix); // Converter a matriz para espaço normal
  mat3.invert(normalMatrix, normalMatrix);
  mat3.transpose(normalMatrix, normalMatrix); // Transpor a matriz normal

  const matrix = mat4.multiply([], projectionMatrix, modelViewMatrix);
  gl.uniformMatrix4fv(matrixLocation, false, matrix);
  gl.uniformMatrix3fv(
    gl.getUniformLocation(program, "u_normalMatrix"),
    false,
    normalMatrix
  );

  // Definir a direção da luz
  gl.uniform3fv(lightDirectionLocation, [1, 1, 1]); // Luz vindo da diagonal
}

function drawIcosahedron() {
  gl.enable(gl.CULL_FACE);
  gl.enable(gl.DEPTH_TEST);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  setMatrix();
  gl.drawElements(gl.TRIANGLES, indices.length, gl.UNSIGNED_SHORT, 0);
}

function animate() {
  rotation[1] += 0.003; // Rotação em Y
  drawIcosahedron();
  requestAnimationFrame(animate);
}

animate(); // Iniciar a animação contínua
