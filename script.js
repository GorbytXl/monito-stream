// =============================================
//  CONFIGURACIÓN
// =============================================
const CANAL_TWITCH = 'gorbyt_x';
const ESCALA       = 4;    // Tamaño del monito (35px * 4 = 140px)
const VELOCIDAD    = 2;    // Velocidad de movimiento

// Color del nombre según el estado
const COLOR_NOMBRE_COMIDA  = '#FFD700'; // amarillo dorado mientras la comida está en el suelo
const COLOR_NOMBRE_COMIENDO = '#FF6B6B'; // rojo/rosa mientras el monito come
// =============================================

const canvas = document.getElementById('lienzo');
const ctx    = canvas.getContext('2d');
canvas.width  = window.innerWidth;
canvas.height = window.innerHeight;

window.addEventListener('resize', () => {
  canvas.width  = window.innerWidth;
  canvas.height = window.innerHeight;
});

// -----------------------------------------------
// Utilidades de imagen
// -----------------------------------------------
function cargarImagen(src) {
  const img = new Image();
  img.src = src;
  return img;
}
function imagenValida(img) {
  return img && img.complete && img.naturalWidth > 0;
}

// Frames de caminar (caminar_01 … caminar_06)
const framesWalk = [];
for (let i = 1; i <= 6; i++) framesWalk.push(cargarImagen(`img/caminar_0${i}.png`));

// Frames de parado (parado_01 … parado_04)
const framesIdle = [];
for (let i = 1; i <= 4; i++) framesIdle.push(cargarImagen(`img/parado_0${i}.png`));

// Frames de comer (comer_01 … comer_04) — opcionales
const framesEat = [];
for (let i = 1; i <= 4; i++) framesEat.push(cargarImagen(`img/comer_0${i}.png`));

// Imagen de comida — fallback a emoji si no existe
const comidaImg = cargarImagen('img/comida.png');

function obtenerFrames(estado) {
  switch (estado) {
    case 'walk': {
      const v = framesWalk.filter(imagenValida);
      return v.length > 0 ? v : framesIdle.filter(imagenValida);
    }
    case 'idle': {
      const v = framesIdle.filter(imagenValida);
      return v.length > 0 ? v : framesWalk.filter(imagenValida);
    }
    case 'eat': {
      const v = framesEat.filter(imagenValida);
      if (v.length > 0) return v;
      const w = framesWalk.filter(imagenValida);
      return w.length >= 3 ? [w[2], w[3] || w[2]] : w;
    }
    default:
      return framesIdle.filter(imagenValida);
  }
}

// -----------------------------------------------
// Dibujar texto con borde (para que se vea sobre cualquier fondo)
// -----------------------------------------------
function dibujarTexto(texto, x, y, color = '#FFFFFF', fontSize = 14) {
  ctx.save();
  ctx.font = `bold ${fontSize}px "Arial", sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';

  // Sombra/borde negro
  ctx.strokeStyle = '#000000';
  ctx.lineWidth   = 4;
  ctx.strokeText(texto, x, y);

  // Texto principal
  ctx.fillStyle = color;
  ctx.fillText(texto, x, y);
  ctx.restore();
}

// -----------------------------------------------
// Clase Monito
// -----------------------------------------------
class Mono {
  constructor(x, y) {
    this.x              = x;
    this.y              = y;
    this.vx             = 0;
    this.vy             = 0;
    this.estado         = 'idle';
    this.frame          = 0;
    this.contadorFrame  = 0;
    this.objetivo       = null;
    this.comiendo       = false;
    this.tiempoEnEstado = 0;
    this.nombreEncima   = null; // nombre del usuario mientras come
  }

  cambiarEstado(nuevo) {
    if (this.estado !== nuevo) {
      this.estado         = nuevo;
      this.frame          = 0;
      this.tiempoEnEstado = 0;
    }
  }

  setObjetivo(x, y) {
    this.objetivo = { x, y };
    this.comiendo = false;
    this.cambiarEstado('walk');
  }

  actualizar() {
    this.contadorFrame++;
    this.tiempoEnEstado++;

    const frames = obtenerFrames(this.estado);
    if (frames.length > 0 && this.contadorFrame % 8 === 0) {
      this.frame = (this.frame + 1) % frames.length;
    }

    // ---- Con objetivo (ir a comer) ----
    if (this.objetivo) {
      const dx   = this.objetivo.x - this.x;
      const dy   = this.objetivo.y - this.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist > 6) {
        this.vx = (dx / dist) * VELOCIDAD;
        this.vy = (dy / dist) * VELOCIDAD;
        this.cambiarEstado('walk');
        this.x += this.vx;
        this.y += this.vy;
      } else {
        this.vx = 0;
        this.vy = 0;
        if (!this.comiendo) {
          this.comiendo     = true;
          // El nombre pasa del suelo al monito
          this.nombreEncima = comidaEnPantalla ? comidaEnPantalla.usuario : null;
          this.cambiarEstado('eat');
          setTimeout(() => {
            this.cambiarEstado('idle');
            this.objetivo     = null;
            this.comiendo     = false;
            this.nombreEncima = null;
            comidaEnPantalla  = null;
          }, 2500);
        }
      }
      return;
    }

    // ---- Sin objetivo: movimiento autónomo ----
    if (this.tiempoEnEstado > 180) {
      const r = Math.random();
      if (this.estado === 'idle' && r < 0.02) {
        const angulo = Math.random() * Math.PI * 2;
        const spd    = VELOCIDAD * (0.6 + Math.random() * 0.7);
        this.vx = Math.cos(angulo) * spd;
        this.vy = Math.sin(angulo) * spd;
        this.cambiarEstado('walk');
      } else if (this.estado === 'walk' && r < 0.01) {
        this.vx = 0;
        this.vy = 0;
        this.cambiarEstado('idle');
      }
    }

    this.x += this.vx;
    this.y += this.vy;

    const margen = 35 * ESCALA;
    if (this.x < 0)                      { this.x = 0;                      this.vx =  Math.abs(this.vx); }
    if (this.x > canvas.width  - margen) { this.x = canvas.width  - margen; this.vx = -Math.abs(this.vx); }
    if (this.y < 0)                      { this.y = 0;                      this.vy =  Math.abs(this.vy); }
    if (this.y > canvas.height - margen) { this.y = canvas.height - margen; this.vy = -Math.abs(this.vy); }

    if (this.estado === 'idle' && (Math.abs(this.vx) > 0 || Math.abs(this.vy) > 0)) {
      this.cambiarEstado('walk');
    }
  }

  dibujar(ctx) {
    const frames = obtenerFrames(this.estado);
    if (frames.length === 0) return;

    const idx = Math.min(this.frame, frames.length - 1);
    const img = frames[idx];
    if (!imagenValida(img)) return;

    const w = img.width  * ESCALA;
    const h = img.height * ESCALA;

    ctx.save();
    if (this.vx < 0) {
      ctx.translate(this.x + w, this.y);
      ctx.scale(-1, 1);
      ctx.drawImage(img, 0, 0, w, h);
    } else {
      ctx.drawImage(img, this.x, this.y, w, h);
    }
    ctx.restore();

    // Nombre encima del monito mientras come
    if (this.nombreEncima && this.comiendo) {
      dibujarTexto(
        `@${this.nombreEncima}`,
        this.x + w / 2,
        this.y - 6,
        COLOR_NOMBRE_COMIENDO,
        15
      );
    }
  }
}

// -----------------------------------------------
// Estado global
// -----------------------------------------------
const monito = new Mono(200, 400);
let comidaEnPantalla = null; // { x, y, posFinalY, cayendo, usuario }

// -----------------------------------------------
// Dibujar comida + nombre del usuario sobre ella
// -----------------------------------------------
function dibujarComida() {
  if (!comidaEnPantalla) return;

  // Animación de caída
  if (comidaEnPantalla.cayendo) {
    comidaEnPantalla.y += 6;
    if (comidaEnPantalla.y >= comidaEnPantalla.posFinalY) {
      comidaEnPantalla.y      = comidaEnPantalla.posFinalY;
      comidaEnPantalla.cayendo = false;
      monito.setObjetivo(comidaEnPantalla.x, comidaEnPantalla.y);
    }
  }

  const cx = comidaEnPantalla.x;
  const cy = comidaEnPantalla.y;

  // Dibujar imagen o emoji
  if (imagenValida(comidaImg)) {
    ctx.drawImage(comidaImg, cx, cy, 40, 40);
  } else {
    ctx.font = '32px serif';
    ctx.textBaseline = 'top';
    ctx.fillText('🍌', cx, cy);
  }

  // Nombre del usuario ENCIMA de la comida (mientras está en el suelo)
  if (comidaEnPantalla.usuario && !monito.comiendo) {
    dibujarTexto(
      `@${comidaEnPantalla.usuario}`,
      cx + 20,
      cy - 6,
      COLOR_NOMBRE_COMIDA,
      14
    );
  }
}

// -----------------------------------------------
// Game loop
// -----------------------------------------------
function gameLoop() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  monito.actualizar();
  monito.dibujar(ctx);
  dibujarComida();
  requestAnimationFrame(gameLoop);
}
gameLoop();

// -----------------------------------------------
// Twitch chat
// -----------------------------------------------
try {
  const cliente = new tmi.Client({ channels: [CANAL_TWITCH] });
  cliente.connect().catch(err => console.warn('Twitch connect error:', err));

  cliente.on('message', (canal, tags, mensaje, self) => {
    if (self) return;
    const comando  = mensaje.trim().toLowerCase();
    const usuario  = tags['display-name'] || tags.username || 'anon';

    if (comando === '!comida') {
      const posX      = Math.random() * (canvas.width  - 150) + 50;
      const posYFinal = Math.random() * (canvas.height - 200) + 100;

      comidaEnPantalla = {
        x:        posX,
        y:        -50,
        posFinalY: posYFinal,
        cayendo:  true,
        usuario:  usuario   // <-- nombre guardado aquí
      };

      // Interrumpir lo que esté haciendo el monito
      monito.objetivo     = null;
      monito.comiendo     = false;
      monito.nombreEncima = null;
      monito.cambiarEstado('idle');
    }
  });
} catch (e) {
  console.warn('tmi.js no disponible:', e);
}
