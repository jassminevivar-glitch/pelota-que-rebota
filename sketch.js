/*
Este código hace que la pelota:
 - se mueva sola con un comportamiento "vivo"
   (a veces rebota mucho, a veces poco)
 - rebote en los bordes laterales de la pantalla
   (y también en los bordes superior e inferior)
 - cambie de color y genere un patrón de fondo distinto
   cada vez que rebota
 - emita un sonido cada vez que rebota
   (usando la librería p5.sound.js)
 - explote como una burbuja cuando el cursor la toca
   (suelta gotas que se desvanecen y luego reaparece en otro lugar)
 - genere un sistema de partículas desde la posición del mouse,
   con tiempo de vida y desvanecimiento
*/

let posX, posY;
let velX, velY;
let radio = 25;

// Estado de la explosión "burbuja".
let explotada = false;
let particulas = [];        // gotas que salen al explotar
let tiempoExplosion = 0;

// Sistema de partículas que nace en la posición del mouse.
let chispas = [];
const MAX_CHISPAS = 400;

// Color de la pelota y patrón de fondo actuales.
let colorPelota;
let patronTipo = -1;
let patronFondo, patronColorA, patronColorB;
let patronGrosor, patronCentroX, patronCentroY, patronAngulo;

let osc, env;        // oscilador y envolvente para el sonido
let audioListo = false;
let audioIniciando = false;

function setup() {
  createCanvas(windowWidth, windowHeight);

  posX = width / 2;
  posY = height / 3;
  velX = random(-8, 8);
  velY = random(-8, 8);

  // Estado visual inicial: color de pelota y primer patrón de fondo.
  colorPelota = color(255, 150, 0);
  generarPatron();

  // Sonido: un oscilador con una envolvente corta hace un "blip" por rebote.
  // Creamos el sonido, pero NO arrancamos el oscilador aquí:
  // los navegadores exigen un gesto del usuario para iniciar el AudioContext.
  osc = new p5.Oscillator("sine");
  osc.disconnect();            // quitamos la salida directa para pasar por la envolvente
  env = new p5.Envelope(0.01, 0.1, 0.05, 0.15);
  osc.connect(env);            // oscilador -> envolvente -> altavoces
}

function draw() {
  dibujarPatron();

  if (explotada) {
    actualizarParticulas();
  } else {
    dibujarPelota();

    // Si el cursor toca la pelota, explota como una burbuja.
    if (dist(mouseX, mouseY, posX, posY) < radio) {
      explotar();
    } else {
      moverPelota();
    }
  }

  // Sistema de partículas del mouse.
  emitirChispas();
  actualizarChispas();

  // Aviso para activar el audio (el navegador lo exige con un clic).
  if (!audioListo) {
    fill(255);
    noStroke();
    textAlign(CENTER);
    text("Haz clic para activar el sonido", width / 2, 70);
  }
}

// Física de la pelota: empujones, gravedad, movimiento y rebotes.
function moverPelota() {
  // Movimiento "vivo": pequeños empujones aleatorios y algo de gravedad.
  velX += random(-0.2, 0.2);
  velY += random(-0.1, 0.1) + 0.15;

  // Evitamos que la velocidad se descontrole.
  velX = constrain(velX, -15, 15);
  velY = constrain(velY, -15, 15);

  posX += velX;
  posY += velY;

  // Rebotes en los bordes laterales (y superior/inferior).
  if (posX < radio || posX > width - radio) {
    rebotar("x");
  }
  if (posY < radio || posY > height - radio) {
    rebotar("y");
  }
}

// Hace explotar la pelota como una burbuja: crea las gotas y suena el "pop".
function explotar() {
  explotada = true;
  tiempoExplosion = 0;
  particulas = [];

  const cantidad = 18;
  for (let i = 0; i < cantidad; i++) {
    const angulo = (TWO_PI / cantidad) * i + random(-0.2, 0.2);
    const rapidez = random(2, 7);
    particulas.push({
      x: posX,
      y: posY,
      vx: cos(angulo) * rapidez,
      vy: sin(angulo) * rapidez - random(0, 2),
      tam: random(4, 12),
      vida: 1,
      color: colorPelota
    });
  }

  sonarPop();
}

// Anima y dibuja las gotas de la explosión; cuando terminan, reaparece la pelota.
function actualizarParticulas() {
  tiempoExplosion++;
  noStroke();

  for (let i = particulas.length - 1; i >= 0; i--) {
    const p = particulas[i];
    p.vy += 0.15;          // gravedad suave
    p.x += p.vx;
    p.y += p.vy;
    p.vx *= 0.99;
    p.vida -= 0.02;

    if (p.vida <= 0) {
      particulas.splice(i, 1);
      continue;
    }

    const alfa = p.vida * 255;
    fill(red(p.color), green(p.color), blue(p.color), alfa);
    circle(p.x, p.y, p.tam * p.vida);

    // Pequeño brillo de cristal en cada gota.
    fill(255, 255, 255, alfa * 0.7);
    circle(p.x - p.tam * 0.15, p.y - p.tam * 0.2, p.tam * 0.3 * p.vida);
  }

  if (particulas.length === 0 && tiempoExplosion > 15) {
    reaparecer();
  }
}

// La pelota vuelve a aparecer en un lugar al azar, lejos del cursor.
function reaparecer() {
  explotada = false;
  do {
    posX = random(radio * 2, width - radio * 2);
    posY = random(radio * 2, height - radio * 2);
  } while (dist(mouseX, mouseY, posX, posY) < radio * 3);

  velX = random(-8, 8);
  velY = random(-8, 8);
  colorPelota = color(random(255), random(255), random(255));
  generarPatron();
}

// Partícula del sistema que nace en la posición del mouse.
class Chispa {
  constructor(x, y) {
    this.x = x;
    this.y = y;

    const angulo = random(TWO_PI);
    const rapidez = random(0.5, 2.5);
    this.vx = cos(angulo) * rapidez;
    this.vy = sin(angulo) * rapidez;

    this.tam = random(4, 10);
    this.vidaMax = random(50, 90);  // tiempo de vida en frames
    this.vida = this.vidaMax;
    this.color = colorCalido();
  }

  actualizar() {
    this.x += this.vx;
    this.y += this.vy;
    this.vy += 0.03;      // caída muy suave
    this.vx *= 0.98;
    this.vy *= 0.98;
    this.vida--;
  }

  get viva() {
    return this.vida > 0;
  }

  dibujar() {
    const t = this.vida / this.vidaMax;  // va de 1 a 0
    const alfa = 255 * t;
    noStroke();
    fill(red(this.color), green(this.color), blue(this.color), alfa);
    circle(this.x, this.y, this.tam * t);

    // Núcleo brillante.
    fill(255, 255, 255, alfa * 0.6);
    circle(this.x, this.y, this.tam * t * 0.4);
  }
}

// Emite partículas desde la posición del mouse (más al moverse rápido).
function emitirChispas() {
  // Solo si el cursor está dentro del lienzo.
  if (mouseX < 0 || mouseY < 0 || mouseX > width || mouseY > height) {
    return;
  }

  const velocidad = dist(mouseX, mouseY, pmouseX, pmouseY);
  const cantidad = 2 + Math.min(6, floor(velocidad / 3));

  for (let i = 0; i < cantidad && chispas.length < MAX_CHISPAS; i++) {
    chispas.push(new Chispa(mouseX, mouseY));
  }
}

// Actualiza (y descarta por tiempo de vida) las partículas del mouse.
function actualizarChispas() {
  for (let i = chispas.length - 1; i >= 0; i--) {
    chispas[i].actualizar();
    if (!chispas[i].viva) {
      chispas.splice(i, 1);
    } else {
      chispas[i].dibujar();
    }
  }
}

// Dibuja la pelota con un efecto de cristal (translúcido + reflejos).
function dibujarPelota() {
  const d = radio * 2;
  const ctx = drawingContext;

  // Cuerpo de cristal: gradiente radial con el color actual, semitransparente
  // para que se vea el patrón de fondo a través de la pelota.
  const grad = ctx.createRadialGradient(
    posX - radio * 0.35, posY - radio * 0.35, radio * 0.1,  // foco de luz
    posX, posY, radio
  );
  const r = red(colorPelota), g = green(colorPelota), b = blue(colorPelota);
  grad.addColorStop(0, "rgba(" + r + "," + g + "," + b + ",0.30)");
  grad.addColorStop(0.6, "rgba(" + r + "," + g + "," + b + ",0.55)");
  grad.addColorStop(1, "rgba(" + r + "," + g + "," + b + ",0.85)");

  ctx.beginPath();
  ctx.arc(posX, posY, radio, 0, Math.PI * 2);
  ctx.fillStyle = grad;
  ctx.fill();

  // Borde luminoso (rim light) que refuerza el aspecto de vidrio.
  noFill();
  stroke(255, 255, 255, 150);
  strokeWeight(2);
  circle(posX, posY, d);

  // Brillo especular principal (arriba a la izquierda).
  noStroke();
  fill(255, 255, 255, 220);
  ellipse(posX - radio * 0.35, posY - radio * 0.4, radio * 0.55, radio * 0.35);

  // Reflejo secundario (abajo a la derecha).
  fill(255, 255, 255, 90);
  ellipse(posX + radio * 0.32, posY + radio * 0.35, radio * 0.4, radio * 0.22);
}

function rebotar(eje) {
  if (eje === "x") {
    posX = constrain(posX, radio, width - radio);
    velX *= random(-1.0, -0.8);   // rebota más: casi no pierde energía
    velX += random(-0.5, 0.5);
    if (abs(velX) < 4) {
      velX = 4 * (velX < 0 ? -1 : 1);  // velocidad mínima para que no se apague
    }
  } else {
    posY = constrain(posY, radio, height - radio);
    velY *= random(-1.0, -0.8);
    velY += random(-0.5, 0.5);
    if (abs(velY) < 4) {
      velY = 4 * (velY < 0 ? -1 : 1);
    }
  }

  // Cada rebote: la pelota cambia de color y aparece un patrón de fondo nuevo.
  colorPelota = color(random(255), random(255), random(255));
  generarPatron();

  sonar();
}

// Elige un patrón de fondo al azar (distinto al anterior) y sus colores.
function generarPatron() {
  let nuevo;
  do {
    nuevo = floor(random(6));   // 6 patrones posibles
  } while (nuevo === patronTipo);
  patronTipo = nuevo;

  patronFondo = color(random(130, 190), random(45, 95), random(0, 35)); // terracota cálido y vivo
  patronColorA = colorCalido();
  patronColorB = colorCalido();
  patronGrosor = random(28, 70);
  patronCentroX = random(width);
  patronCentroY = random(height);
  patronAngulo = random(TWO_PI);
}

// Devuelve un color de la paleta cálida y viva: rojo alto, verde variable
// (rojo -> naranja -> amarillo) y azul bajo, con brillo alto.
function colorCalido() {
  return color(random(225, 255), random(110, 215), random(0, 70));
}

// Dibuja el patrón de fondo actual.
function dibujarPatron() {
  background(patronFondo);
  noStroke();

  if (patronTipo === 0) {
    // Franjas horizontales.
    fill(patronColorA);
    for (let y = 0; y < height; y += patronGrosor * 2) {
      rect(0, y, width, patronGrosor);
    }
  } else if (patronTipo === 1) {
    // Franjas verticales.
    fill(patronColorA);
    for (let x = 0; x < width; x += patronGrosor * 2) {
      rect(x, 0, patronGrosor, height);
    }
  } else if (patronTipo === 2) {
    // Puntos en cuadrícula.
    fill(patronColorA);
    for (let y = patronGrosor / 2; y < height; y += patronGrosor) {
      for (let x = patronGrosor / 2; x < width; x += patronGrosor) {
        circle(x, y, patronGrosor * 0.5);
      }
    }
  } else if (patronTipo === 3) {
    // Círculos concéntricos desde un centro al azar.
    noFill();
    stroke(patronColorA);
    strokeWeight(patronGrosor * 0.25);
    for (let r = patronGrosor; r < max(width, height); r += patronGrosor) {
      circle(patronCentroX, patronCentroY, r * 2);
    }
  } else if (patronTipo === 4) {
    // Franjas diagonales.
    push();
    translate(width / 2, height / 2);
    rotate(patronAngulo);
    fill(patronColorA);
    const diag = sqrt(width * width + height * height);
    for (let x = -diag / 2; x < diag / 2; x += patronGrosor * 2) {
      rect(x, -diag / 2, patronGrosor, diag);
    }
    pop();
  } else {
    // Tablero de cuadros.
    const celda = patronGrosor;
    for (let y = 0; y < height; y += celda) {
      for (let x = 0; x < width; x += celda) {
        fill((floor(x / celda) + floor(y / celda)) % 2 === 0 ? patronColorA : patronColorB);
        rect(x, y, celda, celda);
      }
    }
  }
}

function sonar() {
  if (!audioListo) {
    return;
  }
  osc.freq(random(180, 880));  // altura distinta en cada rebote
  env.play();                  // dispara el "blip"
}

// Sonido corto y agudo para la explosión de la burbuja.
function sonarPop() {
  if (!audioListo) {
    return;
  }
  osc.freq(random(600, 1200));
  env.play();
}

// El navegador pide un gesto del usuario para poder reproducir audio.
// Reanudamos el AudioContext con este clic y, recién entonces, arrancamos el oscilador.
function mousePressed() {
  if (audioListo || audioIniciando) {
    return;
  }
  audioIniciando = true;
  getAudioContext().resume().then(() => {
    osc.start();
    audioListo = true;
  });
}

// Mantener el lienzo del tamaño de la ventana.
function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  posX = constrain(posX, radio, width - radio);
  posY = constrain(posY, radio, height - radio);
  generarPatron();   // el patrón se reajusta al nuevo tamaño
}
