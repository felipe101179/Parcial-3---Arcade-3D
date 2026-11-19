# 🍦 Helado Explosivo

Juego arcade 3D hecho con **HTML, CSS, JavaScript y Three.js** para el Tercer Parcial de **Computación Gráfica**
(Ingeniería Multimedia — Universidad de San Buenaventura).

🎮 **Jugar en GitHub Pages:** _PEGAR AQUÍ EL ENLACE DE GITHUB PAGES_

🎬 **Video de gameplay (victoria y derrota):** _PEGAR AQUÍ EL ENLACE DEL VIDEO_

---

## 👥 Integrantes

- Felipe Florez Cruz
- Alejandro Palacios Cardenas

## 🧩 Opción elegida

**Opción A — Bombas en el laberinto (tipo Bomberman).**

Eres un helado atrapado en un laberinto de hielo. Pon bombas para romper los bloques de hielo y eliminar a las llamitas.
Cada llamita suelta una fruta al morir: cuando recoges todas las frutas, se abre la puerta escondida bajo uno de los bloques de hielo.

- **Ganas** cuando eliminas a todas las llamitas, recoges sus frutas y llegas a la puerta abierta.
- **Pierdes una vida** si te toca una llamita o tu propia explosión. Empiezas con 3 vidas.

## ⌨️ Controles

| Tecla | Acción |
|---|---|
| Flechas o W A S D | Moverse |
| Espacio | Poner bomba |
| P o Esc | Pausa / continuar |
| Enter | Empezar el juego (en la pantalla de inicio) |

## 🗺️ Leyenda del tilemap

El nivel está escrito como texto en `game.js` (sección 2, constante `MAPA`) y se construye recorriendo el mapa letra por letra.

| Símbolo | Significado |
|---|---|
| `#` | Bloque de nieve dura (no se rompe) |
| `B` | Bloque de hielo (se rompe con bombas; a veces suelta un premio) |
| `S` | Puerta de salida escondida debajo de un bloque de hielo |
| `P` | Posición inicial del helado (jugador) |
| `E` | Enemigo (llamita); al morir suelta una fruta |
| `.` | Piso vacío |

**Premios** (salen al azar al romper hielo):
- Rombo azul: +1 bomba a la vez.
- Rombo rojo: +1 casilla de alcance de la explosión.

## 🧠 3 decisiones de diseño

1. **Las frutas son la llave de la puerta.**
   El enunciado pide eliminar a todos los enemigos y llegar a la salida. Para que eso tenga sentido dentro de la temática,
   cada llamita suelta una fruta y la puerta solo se abre (pasa de roja a verde) cuando se recogen todas.
   Así el jugador sabe claramente cuánto le falta: el HUD muestra `FRUTAS 0 / 3`.

2. **Movimiento y colisiones por grilla.**
   El helado y las llamitas avanzan de casilla en casilla y el paso se anima de forma suave (interpolación con `dt`).
   Como todo vive en una grilla, las colisiones son sencillas: antes de moverse se revisa si la casilla de destino está libre
   (`sePuedeCaminar`), y para saber si algo se quema basta con mirar si hay fuego en su casilla (`hayFuego`).

3. **Enemigos de fuego y cámara cenital inclinada.**
   Los enemigos son llamitas porque el fuego derrite al helado: así el peligro se entiende sin explicarlo.
   La cámara está arriba y un poco inclinada para ver todo el laberinto a la vez sin perder la sensación 3D.
   Por eso la puerta tiene un **tapete brillante** en el piso: desde arriba se ve mucho mejor que la puerta sola.

## 🛠️ Aspectos técnicos

- Three.js **v0.186.1** cargado con *import map* en `index.html`; `game.js` es `type="module"`.
- Archivos separados: `index.html` (estructura), `style.css` (apariencia) y `game.js` (lógica).
- Game loop con `requestAnimationFrame` y *delta time*: toda velocidad y temporizador se multiplica por `dt`.
- Máquina de estados: `inicio`, `jugando`, `pausa`, `gameover` y `victoria`.
- Objeto `CONFIG` con todas las constantes ajustables (velocidades, tiempos, vidas, puntos).
- Modelos hechos con primitivas dentro de `THREE.Group`, luces con sombras y texturas generadas con `<canvas>`.
- Sistema de partículas y 7 efectos de sonido en archivos `.ogg` (carpeta `assets/sonidos`).

## 📁 Estructura del proyecto

```
├── index.html
├── style.css
├── game.js
├── assets/
│   ├── icono.png
│   └── sonidos/   (7 sonidos .ogg + licencias)
└── README.md
```

## 📦 Créditos y recursos externos

Los personajes, los modelos 3D y las texturas son **creación propia** y están hechos con código
(ver la sección **0. ASSETS** al inicio de `game.js`). El ícono `assets/icono.png` también es creación propia.

| Recurso | Uso | Licencia |
|---|---|---|
| [Three.js](https://threejs.org) v0.186.1 (desde el CDN jsDelivr) | Librería 3D | MIT |
| [Poppins](https://fonts.google.com/specimen/Poppins) (Google Fonts) | Fuente de la interfaz | SIL Open Font License |
| [Interface Sounds](https://kenney.nl/assets/interface-sounds) de Kenney | Sonidos: poner bomba, premio, fruta, perder vida, enemigo eliminado y victoria | CC0 |
| [Sci-fi Sounds](https://kenney.nl/assets/sci-fi-sounds) de Kenney | Sonido de la explosión | CC0 |

| Archivo en `assets/sonidos` | Archivo original (Kenney) |
|---|---|
| `poner-bomba.ogg` | `drop_002.ogg` |
| `premio.ogg` | `confirmation_001.ogg` |
| `fruta.ogg` | `pluck_001.ogg` |
| `perder-vida.ogg` | `error_006.ogg` |
| `enemigo-eliminado.ogg` | `glass_002.ogg` |
| `victoria.ogg` | `confirmation_002.ogg` |
| `explosion.ogg` | `explosionCrunch_000.ogg` |

- La temática (helado, bloques de hielo y frutas) está inspirada en el juego *Bad Ice-Cream*, pero no se copió ningún
  personaje, imagen ni sonido de ese juego. La mecánica de bombas es la clásica de *Bomberman*.
