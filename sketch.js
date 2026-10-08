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
 - explote al presionar el botón del mouse, soltando varias pelotitas
   que permanecen 10 segundos y luego desaparecen
 - genere un sistema de partículas desde la posición del mouse,
   con tiempo de vida y desvanecimiento
*/

let posX, posY;
let velX, velY;
let radio = 25;

// Estado de la explosión: al presionar el mouse salen pelotitas por 10 segundos.
let explotada = false;
let pelotitas = [];
let tiempoInicioExplosion = 0;
const DURACION_PELOTITAS = 10000;  // milisegundos (10 segundos)

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
    actualizarPelotitas();
  } else {
    dibujarPelota();
    moverPelota();
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

// Hace explotar la pelota: al presionar el mouse suelta varias pelotitas.
function explotar() {
  explotada = true;
  tiempoInicioExplosion = millis();
  pelotitas = [];

  const cantidad = 9;
  for (let i = 0; i < cantidad; i++) {
    const angulo = (TWO_PI / cantidad) * i + random(-0.3, 0.3);
    const rapidez = random(3, 9);
    pelotitas.push({
      x: posX,
      y: posY,
      vx: cos(angulo) * rapidez,
      vy: sin(angulo) * rapidez - random(0, 2),
      radio: radio * random(0.35, 0.6),
      color: color(random(255), random(255), random(255))
    });
  }

  sonarPop();
}

// Mueve/dibuja las pelotitas y las retira al cumplirse los 10 segundos.
function actualizarPelotitas() {
  // Pasado el tiempo de vida, desaparecen y vuelve la pelota principal.
  if (millis() - tiempoInicioExplosion >= DURACION_PELOTITAS) {
    pelotitas = [];
    reaparecer();
    return;
  }

  for (const b of pelotitas) {
    b.vy += 0.2;            // gravedad
    b.x += b.vx;
    b.y += b.vy;

    // Rebote en los bordes (sin sonido).
    if (b.x < b.radio || b.x > width - b.radio) {
      b.vx *= -0.9;
      b.x = constrain(b.x, b.radio, width - b.radio);
    }
    if (b.y < b.radio || b.y > height - b.radio) {
      b.vy *= -0.9;
      b.y = constrain(b.y, b.radio, height - b.radio);
    }

    dibujarCristal(b.x, b.y, b.radio, b.color);
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

// Dibuja la pelota principal.
function dibujarPelota() {
  dibujarCristal(posX, posY, radio, colorPelota);
}

// Dibuja un círculo con efecto de cristal (translúcido + reflejos) en x, y.
function dibujarCristal(x, y, r, col) {
  const ctx = drawingContext;

  // Cuerpo de cristal: gradiente radial con el color dado, semitransparente
  // para que se vea el patrón de fondo a través.
  const grad = ctx.createRadialGradient(
    x - r * 0.35, y - r * 0.35, r * 0.1,  // foco de luz
    x, y, r
  );
  const cr = red(col), cg = green(col), cb = blue(col);
  grad.addColorStop(0, "rgba(" + cr + "," + cg + "," + cb + ",0.30)");
  grad.addColorStop(0.6, "rgba(" + cr + "," + cg + "," + cb + ",0.55)");
  grad.addColorStop(1, "rgba(" + cr + "," + cg + "," + cb + ",0.85)");

  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fillStyle = grad;
  ctx.fill();

  // Borde luminoso (rim light) que refuerza el aspecto de vidrio.
  noFill();
  stroke(255, 255, 255, 150);
  strokeWeight(2);
  circle(x, y, r * 2);

  // Brillo especular principal (arriba a la izquierda).
  noStroke();
  fill(255, 255, 255, 220);
  ellipse(x - r * 0.35, y - r * 0.4, r * 0.55, r * 0.35);

  // Reflejo secundario (abajo a la derecha).
  fill(255, 255, 255, 90);
  ellipse(x + r * 0.32, y + r * 0.35, r * 0.4, r * 0.22);
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
  // Activar el audio (solo la primera vez).
  if (!audioListo && !audioIniciando) {
    audioIniciando = true;
    getAudioContext().resume().then(() => {
      osc.start();
      audioListo = true;
    });
  }

  // Presionar el botón hace explotar la pelota.
  if (!explotada) {
    explotar();
  }
}

// Mantener el lienzo del tamaño de la ventana.
function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  posX = constrain(posX, radio, width - radio);
  posY = constrain(posY, radio, height - radio);
  generarPatron();   // el patrón se reajusta al nuevo tamaño
}
