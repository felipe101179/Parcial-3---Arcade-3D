/* =====================================================================
   HELADO EXPLOSIVO — Opción A: bombas en el laberinto (tipo Bomberman)
   Computación Gráfica - Tercer Parcial

   ÍNDICE
     0.  Assets (de dónde sale cada cosa)
     1.  Configuración
     2.  Diseño del nivel (TILEMAP)
     3.  Escena, cámara, renderer y luces
     4.  Texturas hechas con <canvas>
     5.  Modelos 3D: helado, llamita, bomba, frutas y puerta
     6.  Variables del juego
     7.  Construcción del nivel
     8.  Colisiones por grilla
     9.  Sonidos (Web Audio API)
     10. Partículas
     11. Entrada del teclado
     12. Jugador
     13. Bombas y explosión en cruz
     14. Enemigos
     15. Estados del juego y pantallas
     16. Interfaz (HUD)
     17. Bucle principal (animate)

   SISTEMA DE COORDENADAS:
     - Cada casilla mide CONFIG.TAM_CASILLA
     - Eje X -> columnas del mapa (derecha)
     - Eje Z -> filas del mapa (hacia la cámara)
     - Eje Y -> Arriba (solo visual: el juego se mueve en X y Z)
   ===================================================================== */

/* =====================================================================
   0. ASSETS (de dónde sale cada cosa)

   Este juego NO usa modelos 3D descargados (.obj, .glb, .fbx),
   ni imágenes, ni archivos de sonido. Todo se crea con código.

   PERSONAJES Y MODELOS 3D  -> creación propia, sección 5
     Se arman juntando figuras básicas de Three.js (primitivas)
     dentro de un THREE.Group:
     - Helado (jugador): ConeGeometry (cono) + 2 SphereGeometry (bolas)
                         + esfera pequeña (cereza) + 2 esferas (ojos)
     - Llamita (enemigo): SphereGeometry (cuerpo) + ConeGeometry (punta)
                          + esferas para ojos y pupilas
     - Bomba: SphereGeometry + CylinderGeometry (mecha) + esfera (chispa)
     - Frutas: fresa (cono + cilindro), banano (CapsuleGeometry),
               uvas (4 esferas)
     - Puerta: BoxGeometry (marco, hoja y tapete)
     - Premios: OctahedronGeometry (rombo que gira)
     - Bloques de hielo, muros y piso: BoxGeometry y PlaneGeometry
     Idea de la temática: inspirada en el juego "Bad Ice-Cream"
     (helado, bloques de hielo y frutas). No se copió ningún modelo
     ni imagen de ese juego.

   TEXTURAS  -> creación propia, sección 4
     Se dibujan con <canvas> (crearTexturaHielo y crearTexturaPiso)
     y se convierten en textura con THREE.CanvasTexture.

   SONIDOS  -> creación propia, sección 9
     Se generan con la Web Audio API del navegador (osciladores),
     sin archivos .mp3 ni .wav.

   LIBRERÍAS Y RECURSOS EXTERNOS
     - Three.js v0.186.1 (licencia MIT) - https://threejs.org
       Se carga desde el CDN jsDelivr (ver import map en index.html).
     - Fuente "Poppins" (licencia SIL Open Font License)
       Se carga desde Google Fonts (ver index.html).
   ===================================================================== */
import * as THREE from 'three';

/* =====================================================================
   1. CONFIGURACIÓN (todas las constantes que se pueden ajustar)
   ===================================================================== */
const CONFIG = {
    TAM_CASILLA: 2,          // tamaño de cada casilla en el mundo 3D
    TIEMPO_PASO_JUGADOR: 0.18, // segundos que tarda el jugador en pasar de una casilla a otra
    TIEMPO_PASO_ENEMIGO: 0.45, // los enemigos son más lentos
    TIEMPO_BOMBA: 2.5,       // segundos antes de que la bomba explote
    TIEMPO_FUEGO: 0.6,       // cuánto dura el fuego en pantalla
    ALCANCE_INICIAL: 2,      // cuántas casillas llega la explosión
    BOMBAS_INICIALES: 1,     // cuántas bombas puede tener a la vez
    VIDAS: 3,
    TIEMPO_INVENCIBLE: 2,    // segundos sin recibir daño después de perder una vida
    PROB_PREMIO: 0.3,        // probabilidad de que un bloque de hielo suelte premio
    PUNTOS_ENEMIGO: 100,
    PUNTOS_MURO: 10,
    PUNTOS_PREMIO: 50,
    PUNTOS_FRUTA: 200,
};

/* =====================================================================
   2. TILEMAP (el nivel escrito como texto)
   Leyenda:
     #  = bloque de nieve dura (irrompible)
     B  = bloque de hielo (se rompe con bombas)
     S  = puerta escondida debajo de un bloque de hielo
     P  = posición inicial del helado (jugador)
     E  = enemigo (llamita): al morir suelta una fruta
     .  = piso vacío
   ===================================================================== */
const MAPA = [
    '#############',
    '#P..BBB.B..E#',
    '#.#B#.#B#.#.#',
    '#..B..B..BB.#',
    '#B#.#B#.#.#B#',
    '#.B..E..B...#',
    '#B#B#.#B#.#.#',
    '#...B..S.B..#',
    '#.#.#B#.#B#.#',
    '#E.B...B...B#',
    '#############',
];

const ANCHO = MAPA[0].length;
const ALTO = MAPA.length;

// Números que usamos en la grilla lógica
const VACIO = 0;
const DURO = 1;
const ROMPIBLE = 2;

/* =====================================================================
   3. ESCENA, CÁMARA, RENDERIZADOR Y LUCES
   ===================================================================== */
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xbfe6ff);

const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 200);

// Centro del mapa en el mundo (para apuntar la cámara)
const centroX = (ANCHO - 1) * CONFIG.TAM_CASILLA / 2;
const centroZ = (ALTO - 1) * CONFIG.TAM_CASILLA / 2;

// Cámara cenital inclinada: arriba y un poco hacia atrás
camera.position.set(centroX, 30, centroZ + 9);
camera.lookAt(centroX, 0, centroZ);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
document.body.appendChild(renderer.domElement);

// Luz ambiental (ilumina todo un poco)
scene.add(new THREE.AmbientLight(0xffffff, 0.5));

// Luz direccional (como el sol) que genera sombras
const sol = new THREE.DirectionalLight(0xffffff, 1.2);
sol.position.set(centroX + 10, 30, centroZ + 10);
sol.target.position.set(centroX, 0, centroZ);
sol.castShadow = true;
sol.shadow.camera.left = -20;
sol.shadow.camera.right = 20;
sol.shadow.camera.top = 20;
sol.shadow.camera.bottom = -20;
sol.shadow.mapSize.set(2048, 2048);
scene.add(sol);
scene.add(sol.target);

// Si cambia el tamaño de la ventana, ajustamos la cámara
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

/* =====================================================================
   4. TEXTURAS HECHAS CON <canvas>
   ===================================================================== */

// Textura de hielo para los bloques rompibles:
// fondo celeste, borde más oscuro y dos rayas blancas de "brillo"
function crearTexturaHielo() {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#9fe3ff'; // celeste del hielo
    ctx.fillRect(0, 0, 64, 64);

    ctx.strokeStyle = '#4fb3e0'; // borde del bloque
    ctx.lineWidth = 6;
    ctx.strokeRect(3, 3, 58, 58);

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)'; // brillos
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(14, 40);
    ctx.lineTo(40, 14);
    ctx.moveTo(22, 48);
    ctx.lineTo(48, 22);
    ctx.stroke();

    const textura = new THREE.CanvasTexture(canvas);
    textura.colorSpace = THREE.SRGBColorSpace;
    return textura;
}

// Textura del piso: nieve en cuadritos blanco y celeste
function crearTexturaPiso() {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#f4fbff';
    ctx.fillRect(0, 0, 64, 64);
    ctx.fillStyle = '#ddf1fb';
    ctx.fillRect(0, 0, 32, 32);
    ctx.fillRect(32, 32, 32, 32);
    const textura = new THREE.CanvasTexture(canvas);
    textura.colorSpace = THREE.SRGBColorSpace;
    textura.wrapS = THREE.RepeatWrapping;
    textura.wrapT = THREE.RepeatWrapping;
    textura.repeat.set(ANCHO / 2, ALTO / 2);
    return textura;
}

// Materiales que se reutilizan
// el hielo es un poco transparente para que se vea más "frío"
const matHielo = new THREE.MeshStandardMaterial({ map: crearTexturaHielo(), transparent: true, opacity: 0.9, roughness: 0.2 });
const matNieveDura = new THREE.MeshStandardMaterial({ color: 0x5b7fb8 });
const geoCubo = new THREE.BoxGeometry(CONFIG.TAM_CASILLA, CONFIG.TAM_CASILLA, CONFIG.TAM_CASILLA);

/* =====================================================================
   5. MODELOS 3D CON PRIMITIVAS (THREE.Group)
   ===================================================================== */

// Jugador: un helado (cono + dos bolas + cereza + ojos)
function crearJugador() {
    const grupo = new THREE.Group();

    // cono de galleta: ConeGeometry apunta hacia arriba, por eso lo volteamos
    const cono = new THREE.Mesh(
        new THREE.ConeGeometry(0.45, 1.0, 16),
        new THREE.MeshStandardMaterial({ color: 0xd9a066 })
    );
    cono.rotation.x = Math.PI;
    cono.position.y = 0.5;
    grupo.add(cono);

    // bola de abajo (vainilla) y bola de arriba (fresa)
    const bolaVainilla = new THREE.Mesh(
        new THREE.SphereGeometry(0.5, 16, 16),
        new THREE.MeshStandardMaterial({ color: 0xfff3d6 })
    );
    bolaVainilla.position.y = 1.1;
    grupo.add(bolaVainilla);

    const bolaFresa = new THREE.Mesh(
        new THREE.SphereGeometry(0.4, 16, 16),
        new THREE.MeshStandardMaterial({ color: 0xff8fb8 })
    );
    bolaFresa.position.y = 1.6;
    grupo.add(bolaFresa);

    // cereza encima
    const cereza = new THREE.Mesh(
        new THREE.SphereGeometry(0.12, 8, 8),
        new THREE.MeshStandardMaterial({ color: 0xd1123f })
    );
    cereza.position.y = 2.05;
    grupo.add(cereza);

    // ojos en la bola de vainilla (mirando hacia +Z)
    const matOjo = new THREE.MeshStandardMaterial({ color: 0x222222 });
    const ojoIzq = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 8), matOjo);
    ojoIzq.position.set(-0.17, 1.2, 0.45);
    const ojoDer = ojoIzq.clone();
    ojoDer.position.x = 0.17;
    grupo.add(ojoIzq, ojoDer);

    // todas las piezas proyectan sombra
    grupo.traverse((obj) => { obj.castShadow = true; });
    return grupo;
}

// Enemigo: una "llamita" (bola naranja + punta amarilla + ojos)
// Tiene sentido en el juego: el fuego derrite al helado
function crearEnemigo() {
    const grupo = new THREE.Group();

    const cuerpo = new THREE.Mesh(
        new THREE.SphereGeometry(0.55, 16, 16),
        new THREE.MeshStandardMaterial({ color: 0xff6a00, emissive: 0xff3300, emissiveIntensity: 0.4 })
    );
    cuerpo.position.y = 0.6;
    grupo.add(cuerpo);

    // la punta de la llama es un cono
    const punta = new THREE.Mesh(
        new THREE.ConeGeometry(0.4, 0.9, 16),
        new THREE.MeshStandardMaterial({ color: 0xffc400, emissive: 0xff9900, emissiveIntensity: 0.4 })
    );
    punta.position.y = 1.35;
    grupo.add(punta);

    const matOjo = new THREE.MeshStandardMaterial({ color: 0xffffff });
    const matPupila = new THREE.MeshStandardMaterial({ color: 0x000000 });
    for (const lado of [-1, 1]) {
        const ojo = new THREE.Mesh(new THREE.SphereGeometry(0.14, 8, 8), matOjo);
        ojo.position.set(0.2 * lado, 0.7, 0.45);
        const pupila = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 8), matPupila);
        pupila.position.set(0.2 * lado, 0.7, 0.57);
        grupo.add(ojo, pupila);
    }

    grupo.traverse((obj) => { obj.castShadow = true; });
    return grupo;
}

// Frutas que sueltan las llamitas al morir (3 tipos)
function crearFruta(tipo) {
    const grupo = new THREE.Group();

    if (tipo === 'fresa') {
        const cuerpo = new THREE.Mesh(
            new THREE.ConeGeometry(0.4, 0.7, 12),
            new THREE.MeshStandardMaterial({ color: 0xe8253a })
        );
        cuerpo.rotation.x = Math.PI; // punta hacia abajo
        cuerpo.position.y = 0.6;
        const hojas = new THREE.Mesh(
            new THREE.CylinderGeometry(0.35, 0.35, 0.08, 8),
            new THREE.MeshStandardMaterial({ color: 0x2e9e3a })
        );
        hojas.position.y = 0.97;
        grupo.add(cuerpo, hojas);
    } else if (tipo === 'banano') {
        const cuerpo = new THREE.Mesh(
            new THREE.CapsuleGeometry(0.18, 0.7, 4, 8),
            new THREE.MeshStandardMaterial({ color: 0xffe135 })
        );
        cuerpo.rotation.z = Math.PI / 2.5;
        cuerpo.position.y = 0.6;
        grupo.add(cuerpo);
    } else {
        // uvas: un racimo de esferas moradas
        const matUva = new THREE.MeshStandardMaterial({ color: 0x7b3fa0 });
        const posiciones = [[0, 0.9], [-0.18, 0.7], [0.18, 0.7], [0, 0.5]];
        for (const [x, y] of posiciones) {
            const uva = new THREE.Mesh(new THREE.SphereGeometry(0.17, 8, 8), matUva);
            uva.position.set(x, y, 0);
            grupo.add(uva);
        }
    }

    grupo.traverse((obj) => { obj.castShadow = true; });
    return grupo;
}

// Puerta de salida: marco + hoja. La hoja cambia de color cuando se abre.
function crearPuerta() {
    const grupo = new THREE.Group();
    const matMarco = new THREE.MeshStandardMaterial({ color: 0x8b5a2b });

    const izquierda = new THREE.Mesh(new THREE.BoxGeometry(0.2, 1.8, 0.3), matMarco);
    izquierda.position.set(-0.7, 0.9, 0);
    const derecha = izquierda.clone();
    derecha.position.x = 0.7;
    const arriba = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.2, 0.3), matMarco);
    arriba.position.y = 1.8;

    const hoja = new THREE.Mesh(
        new THREE.BoxGeometry(1.2, 1.6, 0.15),
        new THREE.MeshStandardMaterial({ color: 0xcc3333 }) // roja = cerrada
    );
    hoja.position.y = 0.8;
    hoja.name = 'hoja'; // nombre para encontrarla después

    // tapete brillante en el piso: desde la cámara de arriba se ve mejor que la puerta
    const tapete = new THREE.Mesh(
        new THREE.BoxGeometry(1.8, 0.06, 1.8),
        new THREE.MeshStandardMaterial({ color: 0xcc3333, emissive: 0xcc3333, emissiveIntensity: 0.4 })
    );
    tapete.position.y = 0.03;
    tapete.name = 'tapete';

    grupo.add(izquierda, derecha, arriba, hoja, tapete);
    grupo.traverse((obj) => { obj.castShadow = true; });
    return grupo;
}

// Bomba: esfera negra, mecha y chispa
function crearBomba() {
    const grupo = new THREE.Group();

    const esfera = new THREE.Mesh(
        new THREE.SphereGeometry(0.6, 16, 16),
        new THREE.MeshStandardMaterial({ color: 0x222222 })
    );
    esfera.position.y = 0.6;
    grupo.add(esfera);

    const mecha = new THREE.Mesh(
        new THREE.CylinderGeometry(0.06, 0.06, 0.4, 8),
        new THREE.MeshStandardMaterial({ color: 0x8b5a2b })
    );
    mecha.position.y = 1.3;
    grupo.add(mecha);

    const chispa = new THREE.Mesh(
        new THREE.SphereGeometry(0.12, 8, 8),
        new THREE.MeshBasicMaterial({ color: 0xffaa00 })
    );
    chispa.position.y = 1.55;
    grupo.add(chispa);

    grupo.traverse((obj) => { obj.castShadow = true; });
    return grupo;
}

/* =====================================================================
   6. VARIABLES DEL JUEGO
   ===================================================================== */
let estado = 'inicio'; // inicio, jugando, pausa, gameover, victoria

let grilla = [];       // grilla lógica: grilla[z][x] = VACIO, DURO o ROMPIBLE
let murosRompibles = []; // mallas de los muros rompibles: murosRompibles[z][x]
let salida = { x: 0, z: 0, visible: false, malla: null };
let inicioJugador = { x: 1, z: 1 };

let jugador = null;    // datos del jugador
let enemigos = [];
let bombas = [];
let fuegos = [];
let premios = [];
let frutas = [];         // frutas que soltaron las llamitas y están en el piso
let frutasRecogidas = 0;
let totalFrutas = 0;     // una fruta por cada enemigo del mapa
let particulas = [];

let vidas = CONFIG.VIDAS;
let puntaje = 0;

// Grupo donde va todo lo del nivel (para borrarlo fácil al reiniciar)
let grupoNivel = new THREE.Group();
scene.add(grupoNivel);

// Pasar de casilla (x, z) a posición en el mundo
function aMundo(casilla) {
    return casilla * CONFIG.TAM_CASILLA;
}

/* =====================================================================
   7. CONSTRUIR EL NIVEL RECORRIENDO EL TILEMAP
   ===================================================================== */
function construirNivel() {
    // borrar el nivel anterior
    scene.remove(grupoNivel);
    grupoNivel = new THREE.Group();
    scene.add(grupoNivel);

    grilla = [];
    murosRompibles = [];
    enemigos = [];
    bombas = [];
    fuegos = [];
    premios = [];
    frutas = [];
    frutasRecogidas = 0;
    particulas = [];
    salida = { x: 0, z: 0, visible: false, malla: null };

    // Piso
    const piso = new THREE.Mesh(
        new THREE.PlaneGeometry(ANCHO * CONFIG.TAM_CASILLA, ALTO * CONFIG.TAM_CASILLA),
        new THREE.MeshStandardMaterial({ map: crearTexturaPiso() })
    );
    piso.rotation.x = -Math.PI / 2;
    piso.position.set(centroX, 0, centroZ);
    piso.receiveShadow = true;
    grupoNivel.add(piso);

    // Recorremos el mapa fila por fila (z) y columna por columna (x)
    for (let z = 0; z < ALTO; z++) {
        grilla[z] = [];
        murosRompibles[z] = [];
        for (let x = 0; x < ANCHO; x++) {
            const letra = MAPA[z][x];
            grilla[z][x] = VACIO;
            murosRompibles[z][x] = null;

            if (letra === '#') {
                grilla[z][x] = DURO;
                const muro = new THREE.Mesh(geoCubo, matNieveDura);
                muro.position.set(aMundo(x), CONFIG.TAM_CASILLA / 2, aMundo(z));
                muro.castShadow = true;
                muro.receiveShadow = true;
                grupoNivel.add(muro);
            } else if (letra === 'B' || letra === 'S') {
                grilla[z][x] = ROMPIBLE;
                const muro = new THREE.Mesh(geoCubo, matHielo);
                muro.position.set(aMundo(x), CONFIG.TAM_CASILLA / 2, aMundo(z));
                muro.castShadow = true;
                muro.receiveShadow = true;
                grupoNivel.add(muro);
                murosRompibles[z][x] = muro;
                if (letra === 'S') {
                    salida.x = x;
                    salida.z = z;
                }
            } else if (letra === 'P') {
                inicioJugador = { x, z };
            } else if (letra === 'E') {
                crearEnemigoEn(x, z);
            }
        }
    }

    // cada enemigo suelta una fruta, así que hay tantas frutas como enemigos
    totalFrutas = enemigos.length;

    // Crear al jugador
    jugador = {
        x: inicioJugador.x, z: inicioJugador.z, // casilla actual
        desdeX: inicioJugador.x, desdeZ: inicioJugador.z, // para animar el paso
        progreso: 1,          // 1 = quieto en su casilla
        maxBombas: CONFIG.BOMBAS_INICIALES,
        alcance: CONFIG.ALCANCE_INICIAL,
        invencible: 0,
        modelo: crearJugador(),
    };
    jugador.modelo.position.set(aMundo(jugador.x), 0, aMundo(jugador.z));
    grupoNivel.add(jugador.modelo);
}

function crearEnemigoEn(x, z) {
    const enemigo = {
        x, z, desdeX: x, desdeZ: z,
        progreso: 1,
        dirX: 0, dirZ: 0,
        vivo: true,
        modelo: crearEnemigo(),
    };
    enemigo.modelo.position.set(aMundo(x), 0, aMundo(z));
    grupoNivel.add(enemigo.modelo);
    enemigos.push(enemigo);
}

/* =====================================================================
   8. COLISIONES POR GRILLA
   ===================================================================== */

// ¿Hay una bomba en esa casilla?
function hayBomba(x, z) {
    return bombas.some((b) => b.x === x && b.z === z);
}

// ¿Se puede caminar a esa casilla?
function sePuedeCaminar(x, z) {
    if (x < 0 || z < 0 || x >= ANCHO || z >= ALTO) return false;
    if (grilla[z][x] !== VACIO) return false;
    if (hayBomba(x, z)) return false;
    return true;
}

// ¿Hay fuego en esa casilla?
function hayFuego(x, z) {
    return fuegos.some((f) => f.x === x && f.z === z);
}

/* =====================================================================
   9. SONIDOS (Web Audio API, sin archivos)
   ===================================================================== */
let audio = null;

function iniciarAudio() {
    if (!audio) audio = new (window.AudioContext || window.webkitAudioContext)();
}

// Hace un pitido simple: frecuencia inicial, final, duración y tipo de onda
function pitido(frecInicio, frecFin, duracion, tipo = 'square', volumen = 0.15) {
    if (!audio) return;
    const osc = audio.createOscillator();
    const vol = audio.createGain();
    osc.type = tipo;
    osc.frequency.setValueAtTime(frecInicio, audio.currentTime);
    osc.frequency.exponentialRampToValueAtTime(frecFin, audio.currentTime + duracion);
    vol.gain.setValueAtTime(volumen, audio.currentTime);
    vol.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + duracion);
    osc.connect(vol);
    vol.connect(audio.destination);
    osc.start();
    osc.stop(audio.currentTime + duracion);
}

const sonidos = {
    ponerBomba: () => pitido(300, 150, 0.1),
    explosion: () => pitido(120, 30, 0.5, 'sawtooth', 0.3),
    premio: () => pitido(500, 1200, 0.2, 'triangle'),
    fruta: () => { pitido(700, 1400, 0.12, 'triangle'); setTimeout(() => pitido(900, 1800, 0.12, 'triangle'), 100); },
    perderVida: () => pitido(400, 60, 0.6, 'square', 0.2),
    enemigoMuerto: () => pitido(800, 200, 0.25, 'triangle'),
    victoria: () => { pitido(400, 800, 0.3, 'triangle'); setTimeout(() => pitido(600, 1200, 0.4, 'triangle'), 300); },
};

/* =====================================================================
   10. PARTÍCULAS
   ===================================================================== */
const geoParticula = new THREE.BoxGeometry(0.2, 0.2, 0.2);

function crearParticulas(x, z, color, cantidad = 12) {
    const mat = new THREE.MeshBasicMaterial({ color });
    for (let i = 0; i < cantidad; i++) {
        const malla = new THREE.Mesh(geoParticula, mat);
        malla.position.set(aMundo(x), 1, aMundo(z));
        grupoNivel.add(malla);
        particulas.push({
            malla,
            // velocidad aleatoria hacia los lados y hacia arriba
            vx: (Math.random() - 0.5) * 8,
            vy: Math.random() * 6 + 2,
            vz: (Math.random() - 0.5) * 8,
            vida: 0.8,
        });
    }
}

function actualizarParticulas(dt) {
    for (let i = particulas.length - 1; i >= 0; i--) {
        const p = particulas[i];
        p.vy -= 15 * dt; // gravedad
        p.malla.position.x += p.vx * dt;
        p.malla.position.y += p.vy * dt;
        p.malla.position.z += p.vz * dt;
        p.vida -= dt;
        if (p.vida <= 0) {
            grupoNivel.remove(p.malla);
            particulas.splice(i, 1);
        }
    }
}

/* =====================================================================
   11. TECLADO
   ===================================================================== */
const teclas = {};

window.addEventListener('keydown', (e) => {
    teclas[e.code] = true;

    if (e.code === 'Space') {
        e.preventDefault();
        if (estado === 'jugando') ponerBomba();
    }
    if (e.code === 'KeyP' || e.code === 'Escape') {
        if (estado === 'jugando') cambiarEstado('pausa');
        else if (estado === 'pausa') cambiarEstado('jugando');
    }
    if (e.code === 'Enter' && estado === 'inicio') iniciarJuego();
});

window.addEventListener('keyup', (e) => {
    teclas[e.code] = false;
});

/* =====================================================================
   12. JUGADOR
   ===================================================================== */
function actualizarJugador(dt) {
    // Si está en medio de un paso, seguimos animando
    if (jugador.progreso < 1) {
        jugador.progreso += dt / CONFIG.TIEMPO_PASO_JUGADOR;
        if (jugador.progreso > 1) jugador.progreso = 1;
    } else {
        // Está quieto: miramos qué tecla está presionada
        let dx = 0;
        let dz = 0;
        if (teclas['ArrowUp'] || teclas['KeyW']) dz = -1;
        else if (teclas['ArrowDown'] || teclas['KeyS']) dz = 1;
        else if (teclas['ArrowLeft'] || teclas['KeyA']) dx = -1;
        else if (teclas['ArrowRight'] || teclas['KeyD']) dx = 1;

        if (dx !== 0 || dz !== 0) {
            // girar el modelo hacia donde camina
            jugador.modelo.rotation.y = Math.atan2(dx, dz);

            if (sePuedeCaminar(jugador.x + dx, jugador.z + dz)) {
                jugador.desdeX = jugador.x;
                jugador.desdeZ = jugador.z;
                jugador.x += dx;
                jugador.z += dz;
                jugador.progreso = 0;
            }
        }
    }

    // Posición suave entre la casilla de antes y la nueva (interpolación)
    const px = jugador.desdeX + (jugador.x - jugador.desdeX) * jugador.progreso;
    const pz = jugador.desdeZ + (jugador.z - jugador.desdeZ) * jugador.progreso;
    jugador.modelo.position.set(aMundo(px), 0, aMundo(pz));

    // Parpadeo cuando es invencible
    if (jugador.invencible > 0) {
        jugador.invencible -= dt;
        jugador.modelo.visible = Math.floor(jugador.invencible * 10) % 2 === 0;
    } else {
        jugador.modelo.visible = true;
    }

    // ¿Recogió un premio?
    for (let i = premios.length - 1; i >= 0; i--) {
        const premio = premios[i];
        if (premio.x === jugador.x && premio.z === jugador.z) {
            if (premio.tipo === 'bomba') jugador.maxBombas++;
            else jugador.alcance++;
            puntaje += CONFIG.PUNTOS_PREMIO;
            sonidos.premio();
            grupoNivel.remove(premio.malla);
            premios.splice(i, 1);
        }
    }

    // ¿Lo tocó el fuego?
    if (hayFuego(jugador.x, jugador.z)) perderVida();

    // ¿Recogió una fruta?
    for (let i = frutas.length - 1; i >= 0; i--) {
        const fruta = frutas[i];
        if (fruta.x === jugador.x && fruta.z === jugador.z) {
            frutasRecogidas++;
            puntaje += CONFIG.PUNTOS_FRUTA;
            sonidos.fruta();
            crearParticulas(fruta.x, fruta.z, 0xffe135, 10);
            grupoNivel.remove(fruta.malla);
            frutas.splice(i, 1);
            // con la última fruta se abre la puerta (si ya se descubrió)
            if (frutasRecogidas === totalFrutas) abrirPuerta();
        }
    }

    // ¿Llegó a la puerta abierta?
    // La puerta solo se abre con TODAS las frutas, y las frutas solo salen
    // al eliminar enemigos: así se cumple "eliminar a todos y llegar a la salida"
    const puertaAbierta = frutasRecogidas === totalFrutas;
    if (salida.visible && puertaAbierta && jugador.x === salida.x && jugador.z === salida.z && jugador.progreso === 1) {
        sonidos.victoria();
        cambiarEstado('victoria');
    }
}

function perderVida() {
    if (jugador.invencible > 0) return;
    vidas--;
    sonidos.perderVida();
    crearParticulas(jugador.x, jugador.z, 0xff8fb8, 20); // el helado se derrite

    if (vidas <= 0) {
        cambiarEstado('gameover');
        return;
    }
    // volver al inicio y ser invencible un rato
    jugador.x = inicioJugador.x;
    jugador.z = inicioJugador.z;
    jugador.desdeX = jugador.x;
    jugador.desdeZ = jugador.z;
    jugador.progreso = 1;
    jugador.invencible = CONFIG.TIEMPO_INVENCIBLE;
}

/* =====================================================================
   13. BOMBAS Y EXPLOSIÓN EN CRUZ
   ===================================================================== */
function ponerBomba() {
    // la bomba va en la casilla donde está el jugador
    const x = jugador.x;
    const z = jugador.z;
    if (hayBomba(x, z)) return;
    if (bombas.length >= jugador.maxBombas) return;

    const modelo = crearBomba();
    modelo.position.set(aMundo(x), 0, aMundo(z));
    grupoNivel.add(modelo);
    bombas.push({ x, z, tiempo: CONFIG.TIEMPO_BOMBA, alcance: jugador.alcance, modelo });
    sonidos.ponerBomba();
}

function actualizarBombas(dt) {
    for (let i = bombas.length - 1; i >= 0; i--) {
        const bomba = bombas[i];
        bomba.tiempo -= dt; // temporizador con dt

        // la bomba "late" (crece y se encoge) mientras espera
        const escala = 1 + Math.sin(bomba.tiempo * 15) * 0.08;
        bomba.modelo.scale.set(escala, escala, escala);

        if (bomba.tiempo <= 0) {
            bombas.splice(i, 1);
            grupoNivel.remove(bomba.modelo);
            explotar(bomba);
        }
    }
}

// La explosión avanza casilla por casilla en las 4 direcciones
// hasta chocar con un muro
function explotar(bomba) {
    sonidos.explosion();
    ponerFuego(bomba.x, bomba.z);

    const direcciones = [
        { dx: 1, dz: 0 },
        { dx: -1, dz: 0 },
        { dx: 0, dz: 1 },
        { dx: 0, dz: -1 },
    ];

    for (const dir of direcciones) {
        for (let paso = 1; paso <= bomba.alcance; paso++) {
            const x = bomba.x + dir.dx * paso;
            const z = bomba.z + dir.dz * paso;

            if (grilla[z][x] === DURO) break; // muro duro: se detiene

            if (grilla[z][x] === ROMPIBLE) {
                romperMuro(x, z);
                ponerFuego(x, z);
                break; // el muro rompible también detiene el fuego
            }

            ponerFuego(x, z);

            // reacción en cadena: si hay otra bomba, explota ya
            const otraBomba = bombas.find((b) => b.x === x && b.z === z);
            if (otraBomba) otraBomba.tiempo = 0;
        }
    }
}

const geoFuego = new THREE.BoxGeometry(CONFIG.TAM_CASILLA * 0.9, 0.8, CONFIG.TAM_CASILLA * 0.9);
const matFuego = new THREE.MeshBasicMaterial({ color: 0xff5500, transparent: true, opacity: 0.85 });

function ponerFuego(x, z) {
    const malla = new THREE.Mesh(geoFuego, matFuego);
    malla.position.set(aMundo(x), 0.4, aMundo(z));
    grupoNivel.add(malla);
    fuegos.push({ x, z, tiempo: CONFIG.TIEMPO_FUEGO, malla });
    crearParticulas(x, z, 0xffaa00, 5);
}

function actualizarFuegos(dt) {
    for (let i = fuegos.length - 1; i >= 0; i--) {
        fuegos[i].tiempo -= dt;
        if (fuegos[i].tiempo <= 0) {
            grupoNivel.remove(fuegos[i].malla);
            fuegos.splice(i, 1);
        }
    }
}

function romperMuro(x, z) {
    grilla[z][x] = VACIO;
    grupoNivel.remove(murosRompibles[z][x]);
    murosRompibles[z][x] = null;
    puntaje += CONFIG.PUNTOS_MURO;
    crearParticulas(x, z, 0x9fe3ff, 10); // pedacitos de hielo

    // ¿Debajo estaba la puerta?
    if (x === salida.x && z === salida.z) {
        mostrarSalida();
        return;
    }

    // Premio aleatorio
    if (Math.random() < CONFIG.PROB_PREMIO) {
        const tipo = Math.random() < 0.5 ? 'bomba' : 'alcance';
        const color = tipo === 'bomba' ? 0x00ccff : 0xff3333;
        const malla = new THREE.Mesh(
            new THREE.OctahedronGeometry(0.5),
            new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.4 })
        );
        malla.position.set(aMundo(x), 0.8, aMundo(z));
        malla.castShadow = true;
        grupoNivel.add(malla);
        premios.push({ x, z, tipo, malla });
    }
}

function mostrarSalida() {
    salida.visible = true;
    const puerta = crearPuerta();
    puerta.position.set(aMundo(salida.x), 0, aMundo(salida.z));
    grupoNivel.add(puerta);
    salida.malla = puerta;
    // si ya tenía todas las frutas antes de descubrirla, se abre de una vez
    if (frutasRecogidas === totalFrutas) abrirPuerta();
}

// La hoja de la puerta pasa de roja (cerrada) a verde brillante (abierta)
function abrirPuerta() {
    if (!salida.malla) return; // todavía está escondida bajo el hielo
    // la hoja y el tapete pasan a verde
    for (const nombre of ['hoja', 'tapete']) {
        const pieza = salida.malla.getObjectByName(nombre);
        pieza.material.color.set(0x33dd66);
        pieza.material.emissive = new THREE.Color(0x33dd66);
        pieza.material.emissiveIntensity = 0.5;
    }
    sonidos.premio();
}

// Cuando muere una llamita deja una fruta en su casilla
const TIPOS_FRUTA = ['fresa', 'banano', 'uva'];

function soltarFruta(x, z) {
    const tipo = TIPOS_FRUTA[frutas.length % TIPOS_FRUTA.length];
    const malla = crearFruta(tipo);
    malla.position.set(aMundo(x), 0, aMundo(z));
    grupoNivel.add(malla);
    frutas.push({ x, z, tipo, malla });
}

/* =====================================================================
   14. ENEMIGOS (patrullan al azar por los pasillos)
   ===================================================================== */
function actualizarEnemigos(dt) {
    for (const enemigo of enemigos) {
        if (!enemigo.vivo) continue;

        if (enemigo.progreso < 1) {
            enemigo.progreso += dt / CONFIG.TIEMPO_PASO_ENEMIGO;
            if (enemigo.progreso > 1) enemigo.progreso = 1;
        } else {
            elegirDireccion(enemigo);
        }

        // posición suave
        const px = enemigo.desdeX + (enemigo.x - enemigo.desdeX) * enemigo.progreso;
        const pz = enemigo.desdeZ + (enemigo.z - enemigo.desdeZ) * enemigo.progreso;
        enemigo.modelo.position.set(aMundo(px), 0, aMundo(pz));
        enemigo.modelo.rotation.y += dt * 2; // gira para verse vivo

        // ¿Le cayó fuego?
        if (hayFuego(enemigo.x, enemigo.z)) {
            enemigo.vivo = false;
            grupoNivel.remove(enemigo.modelo);
            puntaje += CONFIG.PUNTOS_ENEMIGO;
            sonidos.enemigoMuerto();
            crearParticulas(enemigo.x, enemigo.z, 0xff6a00, 20);
            soltarFruta(enemigo.x, enemigo.z);
            continue;
        }

        // ¿Tocó al jugador? (distancia en casillas)
        const jx = jugador.desdeX + (jugador.x - jugador.desdeX) * jugador.progreso;
        const jz = jugador.desdeZ + (jugador.z - jugador.desdeZ) * jugador.progreso;
        const distancia = Math.hypot(px - jx, pz - jz);
        if (distancia < 0.7) perderVida();
    }
}

// El enemigo sigue derecho si puede; si no, o a veces al azar, cambia de dirección
function elegirDireccion(enemigo) {
    const opciones = [
        { dx: 1, dz: 0 }, { dx: -1, dz: 0 }, { dx: 0, dz: 1 }, { dx: 0, dz: -1 },
    ].filter((d) => sePuedeCaminar(enemigo.x + d.dx, enemigo.z + d.dz));

    if (opciones.length === 0) return; // está encerrado, se queda quieto

    const puedeSeguir = opciones.some((d) => d.dx === enemigo.dirX && d.dz === enemigo.dirZ);
    if (!puedeSeguir || Math.random() < 0.3) {
        const elegida = opciones[Math.floor(Math.random() * opciones.length)];
        enemigo.dirX = elegida.dx;
        enemigo.dirZ = elegida.dz;
    }

    enemigo.desdeX = enemigo.x;
    enemigo.desdeZ = enemigo.z;
    enemigo.x += enemigo.dirX;
    enemigo.z += enemigo.dirZ;
    enemigo.progreso = 0;
}

/* =====================================================================
   15. MÁQUINA DE ESTADOS Y PANTALLAS
   ===================================================================== */
const pantallaInicio = document.getElementById('pantalla-inicio');
const pantallaPausa = document.getElementById('pantalla-pausa');
const pantallaFinal = document.getElementById('pantalla-fin');

function cambiarEstado(nuevo) {
    estado = nuevo;

    // primero escondemos todas las pantallas
    pantallaInicio.classList.add('oculto');
    pantallaPausa.classList.add('oculto');
    pantallaFinal.classList.add('oculto');

    // luego mostramos la que toca
    if (estado === 'inicio') pantallaInicio.classList.remove('oculto');
    if (estado === 'pausa') pantallaPausa.classList.remove('oculto');
    if (estado === 'gameover' || estado === 'victoria') {
        document.getElementById('fin-titulo').textContent = estado === 'victoria' ? '¡NIVEL COMPLETADO!' : 'GAME OVER';
        document.getElementById('fin-detalle').textContent =
            'Puntos: ' + puntaje + '  |  Frutas: ' + frutasRecogidas + ' / ' + totalFrutas;
        pantallaFinal.classList.remove('oculto');
    }
}

function iniciarJuego() {
    iniciarAudio();
    vidas = CONFIG.VIDAS;
    puntaje = 0;
    construirNivel();
    cambiarEstado('jugando');
}

document.getElementById('btn-jugar').addEventListener('click', iniciarJuego);
document.getElementById('btn-reiniciar').addEventListener('click', iniciarJuego);

/* =====================================================================
   16. HUD
   ===================================================================== */
function actualizarHUD() {
    document.getElementById('hud-vidas').textContent = vidas;
    document.getElementById('hud-puntos').textContent = puntaje;
    document.getElementById('hud-frutas').textContent = frutasRecogidas + ' / ' + totalFrutas;
    document.getElementById('hud-bombas').textContent = jugador.maxBombas;
    document.getElementById('hud-alcance').textContent = jugador.alcance;
}

/* =====================================================================
   17. GAME LOOP (requestAnimationFrame + delta time)
   ===================================================================== */
// THREE.Timer mide el tiempo entre cuadros (reemplaza a THREE.Clock, que ya está obsoleto)
const reloj = new THREE.Timer();

function animate(tiempo) {
    requestAnimationFrame(animate);
    reloj.update(tiempo);

    // dt = segundos desde el cuadro anterior (máximo 0.05 para evitar saltos)
    const dt = Math.min(reloj.getDelta(), 0.05);

    if (estado === 'jugando') {
        actualizarJugador(dt);
        actualizarBombas(dt);
        actualizarFuegos(dt);
        actualizarEnemigos(dt);
        actualizarParticulas(dt);
        for (const premio of premios) premio.malla.rotation.y += dt * 3; // premios giran
        for (const fruta of frutas) fruta.malla.rotation.y += dt * 2;   // frutas giran
        actualizarHUD();
    }

    renderer.render(scene, camera);
}

// Arrancamos: construimos el nivel para que se vea detrás de la pantalla de inicio
construirNivel();
cambiarEstado('inicio');
animate();
