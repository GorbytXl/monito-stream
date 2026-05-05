// =============================================
//  CONFIGURACIÓN
// =============================================
const CANAL_TWITCH          = 'gorbyt_x';
const ESCALA                = 4;
const VELOCIDAD             = 2;
const COLOR_NOMBRE_COMIDA   = '#FFD700';
const COLOR_NOMBRE_COMIENDO = '#FF6B6B';
const COLOR_SALUDO          = '#88EEFF';
const COMANDOS_COMIDA       = ['!comida', '!comer', '!feed', '!comiendo'];
const SALUDOS_CHAT          = ['hola', 'hello', 'hi', 'buenas', 'ola', 'saludos', 'hey'];
// =============================================

const canvas   = document.getElementById('lienzo');
const ctx      = canvas.getContext('2d');

function resizarCanvas() {
  canvas.width  = window.innerWidth;
  canvas.height = window.innerHeight;
}
resizarCanvas();
window.addEventListener('resize', resizarCanvas);

// -----------------------------------------------
// Imágenes
// -----------------------------------------------
function cargarImagen(src) {
  const img = new Image();
  img.src = src;
  return img;
}
function imagenValida(img) {
  return img && img.complete && img.naturalWidth > 0;
}

const framesWalk = [];
for (let i = 1; i <= 6; i++) framesWalk.push(cargarImagen(`img/caminar_0${i}.png`));

const framesIdle = [];
for (let i = 1; i <= 4; i++) framesIdle.push(cargarImagen(`img/parado_0${i}.png`));

const framesEat = [];
for (let i = 1; i <= 4; i++) framesEat.push(cargarImagen(`img/comer_0${i}.png`));

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
// Texto con borde
// -----------------------------------------------
function dibujarTexto(texto, x, y, color = '#FFF', fontSize = 14) {
  ctx.save();
  ctx.font         = `bold ${fontSize}px Arial, sans-serif`;
  ctx.textAlign    = 'center';
  ctx.textBaseline = 'bottom';
  ctx.strokeStyle  = '#000';
  ctx.lineWidth    = 4;
  ctx.strokeText(texto, x, y);
  ctx.fillStyle = color;
  ctx.fillText(texto, x, y);
  ctx.restore();
}

// -----------------------------------------------
// Saludos flotantes en pantalla
// -----------------------------------------------
const saludosFlotantes = [];

function agregarSaludoFlotante(usuario) {
  const respuestas = [
    `¡Hola @${usuario}! 👋`,
    `¡Buenas @${usuario}! 🐒`,
    `¡Qué tal @${usuario}! 😄`,
    `¡Hola hola @${usuario}! 🎉`,
    `¡Bienvenido @${usuario}! 🍌`,
  ];
  const texto = respuestas[Math.floor(Math.random() * respuestas.length)];
  const x = Math.random() * (canvas.width - 200) + 100;
  saludosFlotantes.push({ texto, x, y: canvas.height * 0.3, alpha: 1.0, vy: -1.2 });
}

function actualizarYDibujarSaludos() {
  for (let i = saludosFlotantes.length - 1; i >= 0; i--) {
    const s = saludosFlotantes[i];
    s.y += s.vy;
    s.alpha -= 0.008;
    if (s.alpha <= 0) {
      saludosFlotantes.splice(i, 1);
      continue;
    }
    ctx.save();
    ctx.globalAlpha = s.alpha;
    ctx.font         = 'bold 22px Arial, sans-serif';
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'bottom';
    ctx.strokeStyle  = '#000';
    ctx.lineWidth    = 5;
    ctx.strokeText(s.texto, s.x, s.y);
    ctx.fillStyle = COLOR_SALUDO;
    ctx.fillText(s.texto, s.x, s.y);
    ctx.restore();
  }
}

// -----------------------------------------------
// Monito
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
    this.nombreEncima   = null;
    this.comidaObjetivo = null;
    this.textoBurbuja   = null;
    this.tiempoBurbuja  = 0;
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

  mostrarBurbuja(texto) {
    this.textoBurbuja  = texto;
    this.tiempoBurbuja = 200;
  }

  saludar(usuario) {
    const frases = [
      `¡Hola @${usuario}!`,
      `¡Buenas @${usuario}!`,
      `¡Hola, como tas @${usuario}!`,
      `¡Bienvenido @${usuario}!`,
    ];
    this.mostrarBurbuja(frases[Math.floor(Math.random() * frases.length)]);
    agregarSaludoFlotante(usuario);
  }

  actualizar() {
    this.contadorFrame++;
    this.tiempoEnEstado++;

    if (this.tiempoBurbuja > 0) this.tiempoBurbuja--;

    const frames = obtenerFrames(this.estado);
    if (frames.length > 0 && this.contadorFrame % 8 === 0) {
      this.frame = (this.frame + 1) % frames.length;
    }

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
          const comidaActual = this.comidaObjetivo;
          this.nombreEncima = comidaActual ? comidaActual.usuario : null;
          this.cambiarEstado('eat');
          setTimeout(() => {
            this.cambiarEstado('idle');
            this.objetivo      = null;
            this.comiendo      = false;
            this.nombreEncima  = null;
            if (comidaActual) {
              const idx = colaComida.indexOf(comidaActual);
              if (idx !== -1) colaComida.splice(idx, 1);
            }
            this.comidaObjetivo = null;
            irSiguienteComida();
          }, 2500);
        }
      }
      return;
    }

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

  dibujar() {
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

    if (this.nombreEncima && this.comiendo) {
      dibujarTexto(`@${this.nombreEncima}`, this.x + w / 2, this.y - 6, COLOR_NOMBRE_COMIENDO, 15);
    }

    // Burbuja de saludo
    if (this.tiempoBurbuja > 0 && this.textoBurbuja) {
      const alpha = Math.min(1, this.tiempoBurbuja / 30);
      ctx.save();
      ctx.globalAlpha = alpha;
      const bx = this.x + w / 2;
      const by = this.y - 18;
      ctx.font         = 'bold 15px Arial, sans-serif';
      ctx.textAlign    = 'center';
      ctx.textBaseline = 'bottom';
      ctx.strokeStyle  = '#000';
      ctx.lineWidth    = 4;
      ctx.strokeText(this.textoBurbuja, bx, by);
      ctx.fillStyle = COLOR_SALUDO;
      ctx.fillText(this.textoBurbuja, bx, by);
      ctx.restore();
    }
  }
}

// -----------------------------------------------
// Estado global — COLA DE COMIDAS (múltiples)
// -----------------------------------------------
const monito = new Mono(200, 400);
const colaComida = [];

const EMOJIS_FRUTAS = ['🍌', '🍎', '🍊', '🍇', '🍓', '🍉', '🍑', '🥝', '🍍', '🥭'];

// -----------------------------------------------
// Lanzar comida
// -----------------------------------------------
function lanzarComida(usuario) {
  const posX      = Math.random() * (canvas.width  - 150) + 50;
  const posYFinal = Math.random() * (canvas.height - 200) + 100;
  const emoji     = EMOJIS_FRUTAS[Math.floor(Math.random() * EMOJIS_FRUTAS.length)];
  colaComida.push({ x: posX, y: -60, posFinalY: posYFinal, cayendo: true, usuario, emoji });
}

function irSiguienteComida() {
  if (monito.comiendo) return;
  const siguiente = colaComida.find(c => !c.cayendo && c !== monito.comidaObjetivo);
  if (siguiente) {
    monito.comidaObjetivo = siguiente;
    monito.setObjetivo(siguiente.x, siguiente.y);
  }
}

// -----------------------------------------------
// Dibujar todas las comidas
// -----------------------------------------------
function dibujarTodasLasComidas() {
  for (const comida of colaComida) {
    if (comida.cayendo) {
      comida.y += 6;
      if (comida.y >= comida.posFinalY) {
        comida.y       = comida.posFinalY;
        comida.cayendo = false;
        irSiguienteComida();
      }
    }

    const cx = comida.x;
    const cy = comida.y;

    if (imagenValida(comidaImg)) {
      ctx.drawImage(comidaImg, cx, cy, 40, 40);
    } else {
      ctx.save();
      ctx.font = '36px serif';
      ctx.textBaseline = 'top';
      ctx.fillText(comida.emoji || '🍌', cx, cy);
      ctx.restore();
    }

    if (comida.usuario && !(monito.comiendo && monito.comidaObjetivo === comida)) {
      dibujarTexto(`@${comida.usuario}`, cx + 18, cy - 6, COLOR_NOMBRE_COMIDA, 14);
    }
  }
}

// -----------------------------------------------
// Usuarios saludados recientemente (anti-spam)
// -----------------------------------------------
const usuariosSaludados = new Set();

// -----------------------------------------------
// Game loop
// -----------------------------------------------
function gameLoop() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  monito.actualizar();
  monito.dibujar();
  dibujarTodasLasComidas();
  actualizarYDibujarSaludos();
  requestAnimationFrame(gameLoop);
}
gameLoop();

// -----------------------------------------------
// Twitch IRC via WebSocket puro
// -----------------------------------------------
function conectarTwitch() {
  const ws = new WebSocket('wss://irc-ws.chat.twitch.tv:443');

  ws.onopen = () => {
    ws.send('CAP REQ :twitch.tv/tags twitch.tv/commands');
    ws.send('PASS SCHMOOPIIE');
    ws.send('NICK justinfan' + Math.floor(Math.random() * 999999));
    ws.send('JOIN #' + CANAL_TWITCH.toLowerCase());
  };

  ws.onmessage = (event) => {
    const lineas = event.data.split('\r\n');
    for (const linea of lineas) {
      if (linea.startsWith('PING')) {
        ws.send('PONG :tmi.twitch.tv');
        continue;
      }

      // Detectar JOIN — alguien entra al canal
      const joinMatch = linea.match(/:([^!]+)![^\s]+ JOIN #/);
      if (joinMatch && !linea.includes('PRIVMSG')) {
        const usuarioJoin = joinMatch[1];
        if (!usuarioJoin.startsWith('justinfan') && !usuariosSaludados.has(usuarioJoin)) {
          usuariosSaludados.add(usuarioJoin);
          setTimeout(() => usuariosSaludados.delete(usuarioJoin), 120000);
          monito.saludar(usuarioJoin);
        }
        continue;
      }

      if (!linea.includes('PRIVMSG')) continue;

      try {
        let usuario = 'anon';
        const tagMatch = linea.match(/display-name=([^;]+)/);
        if (tagMatch && tagMatch[1]) {
          usuario = tagMatch[1];
        } else {
          const nickMatch = linea.match(/:([^!]+)!/);
          if (nickMatch) usuario = nickMatch[1];
        }

        const msgMatch = linea.match(/PRIVMSG #\S+ :(.+)/);
        if (!msgMatch) continue;
        const mensaje = msgMatch[1].trim().toLowerCase();

        // Comando de comida
        if (COMANDOS_COMIDA.includes(mensaje)) {
          lanzarComida(usuario);
          continue;
        }

        // Saludo en el chat
        const esSaludo = SALUDOS_CHAT.some(s =>
          mensaje === s ||
          mensaje.startsWith(s + ' ') ||
          mensaje.startsWith(s + '!') ||
          mensaje.startsWith(s + ',')
        );
        if (esSaludo) {
          monito.saludar(usuario);
        }

      } catch (e) {
        // ignorar líneas malformadas
      }
    }
  };

  ws.onerror = () => {};
  ws.onclose = () => { setTimeout(conectarTwitch, 3000); };
}

conectarTwitch();
