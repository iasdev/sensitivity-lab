# Sensitivity Lab

Simulador estático en español de campo de visión y Uniform Soldier Aiming. WebGL 1 renderiza un campo de tiro tridimensional mediante rayos y geometría analítica en un fragment shader; no necesita bibliotecas, backend ni claves.

## Ejecutar

```sh
python3 -m http.server 8080 --directory dist --bind 127.0.0.1
```

Abre http://localhost:8080. Para verificar la geometría con Node 18 o posterior: `npm test`.

## Controles

- FOV horizontal y vertical vinculados a una referencia fija 16:9. Ambos ajustes permanecen iguales al cambiar resolución; la cámara conserva el FOV vertical y amplía el FOV horizontal real según el aspecto, sin estirar la imagen. La métrica FOV se etiqueta como referencia 16:9. Campos numéricos junto a cada slider para introducir valores precisos, con sincronización bidireccional y límites.
- Resoluciones predefinidas, dimensiones personalizadas o ajuste al espacio disponible; botón de pantalla completa real.
- Fondo rojo y banda verde de referencia USA, retícula central y marcadores del recorrido de igualación. El toggle «Solo bordes» elimina el relleno verde y usa una paleta neutra para la escena, conservando los contornos rojo y verde; se guarda junto con los ajustes.
- Ajustes, métricas y controles del ratón integrados en la escena como overlays translúcidos; ajustes plegados inicialmente en móvil.
- Mira con aumento óptico 1–8×; FOV relativo al jugador o referencia fija de 55° verticales.
- USA activable, coeficiente 0–300%, sensibilidad base y dianas móviles por defecto.
- Cantidad de dianas de 1 a 24 y velocidad de 0× a 4×, con sliders e inputs. Las dianas avanzan, retroceden y se desplazan lateralmente en regiones separadas. Pausar o ajustar velocidad conserva la fase del movimiento.
- Iniciar/Detener activa o desactiva el control del ratón; arrastrar con el botón izquierdo no mueve la cámara; Espacio para iniciar/detener la captura; mantener clic derecho sobre la escena para ADS y soltar para volver a la cadera, con o sin captura; Esc libera el ratón.
- Rueda sobre la escena: arriba aumenta el zoom y abajo lo reduce en pasos de 0,25×, entre 1× y 8×; sincroniza el slider y funciona con el ratón capturado.

## Disparos

Con el ratón capturado, cada clic izquierdo dispara un rayo desde la retícula. Se usa la cámara y el tiempo del último frame mostrado para coincidir con los blancos móviles. La cantidad y el reloj de animación del último frame también se usan al detectar impactos. La geometría de tablero, cuerpo y cabeza se comparte entre shader y detector; suelo, postes y barandillas bloquean disparos. El tablero completo y la silueta cuentan como acierto; únicamente la esfera visible de la cabeza cuenta como headshot. Cada disparo cuenta una sola vez y la superficie más cercana decide el resultado.

El overlay superior izquierdo muestra aciertos, fallos, precisión (aciertos/disparos) y headshots (headshots/aciertos). Pausar conserva los contadores; el botón ↺ del overlay los reinicia. No se muestran marcadores ni textos en la retícula al disparar. Web Audio sintetiza un tono breve para aciertos y dos tonos agudos para headshots; los fallos no generan audio. El audio se desbloquea con Iniciar o Espacio.

## Movimiento de dianas

Tres columnas separadas por 5 unidades y filas separadas por 6. Cada diana recorre una elipse con desplazamiento lateral máximo de 1,1 y profundidad máxima de 2. Incluso con fases opuestas, las regiones conservan más separación que la geometría de cada diana, de modo que no pueden colisionar. El máximo de 24 mantiene todas las filas delante del muro. Los solapamientos en perspectiva y las oclusiones entre filas siguen siendo posibles.

El reloj avanza según la velocidad seleccionada, se congela al desactivar movimiento o poner 0×, y no se reinicia al cambiar la velocidad. Restablecer ajustes devuelve 9 dianas, movimiento activo y velocidad 1×.

## Movimiento del jugador y ajustes locales

WASD mueve al jugador en el plano horizontal según su orientación, solo con el ratón capturado. Velocidad de 0 a 12 m/s (4 por defecto), con diagonales normalizadas y límites en los bordes del campo. Soltar la captura, perder foco u ocultar la pestaña limpia las teclas para evitar movimientos atascados. Renderer y detección de impactos usan la misma posición del último frame.

Los ajustes se guardan automáticamente en localStorage, bajo `sensitivity-lab.settings.v1`, con esquema versionado y validación de campos y límites al restaurar. Incluye FOV, resolución, USA, sensibilidad, dianas, velocidades y opciones de movimiento y mira. No se guardan estadísticas, captura, ADS mantenido, posición de cámara ni reloj de animación. Restablecer ajustes guarda los predeterminados. La aplicación sigue funcionando si el navegador bloquea el almacenamiento y lo indica en el panel.

## Prueba cronometrada

Duración configurable de 0 a 300 segundos (60 por defecto); 0 representa tiempo infinito. Iniciar prueba solicita captura y solo entonces reinicia las estadísticas e inicia el reloj. La puntuación es max(0, 100 × aciertos + 50 × headshots − 25 × fallos); un headshot ya está incluido en los aciertos y suma 150 puntos en total.

El reloj usa tiempo monotónico real y sigue avanzando al liberar el ratón o cambiar de pestaña. Se comprueba el vencimiento antes de cada disparo: al cumplirse el límite se congela el resultado, se libera la captura y no se permiten más disparos hasta iniciar otra prueba o volver a práctica libre. El botón Finalizar prueba cierra anticipadamente, incluido el modo infinito. Mientras corre una prueba no se pueden reiniciar los contadores ni cambiar su duración. La duración se guarda con los ajustes; ni la sesión, ni la puntuación ni las estadísticas se persisten.

## Modelo

Para relación de aspecto A, H = 2 atan(A tan(V/2)). El aumento Z usa V_ads = 2 atan(tan(V_ref/2)/Z). Con FOV relativo desactivado V_ref = 55°; activado V_ref = V_base.

Para coeficiente c = porcentaje/100, el factor angular ADS/base es atan(c tan(V_ads/2)) / atan(c tan(V_base/2)). Para c=0 se usa el límite tan(V_ads/2)/tan(V_base/2).

La referencia horizontal ocupa c/A del semiancho desde el centro; la banda completa ocupa esa misma fracción del ancho. Si supera el borde se recorta visualmente y se indica. Para c=0 solo se dibuja la línea central. La banda representa un recorrido de referencia, no una zona de aplicación: la sensibilidad afecta a toda la cámara. No se puede igualar todo el espacio de pantalla simultáneamente para FOV distintos.

USA desactivado usa factor 1, conservación del giro angular. No emula el modo legacy de Battlefield ni sus multiplicadores particulares. La sensibilidad va de 0 a 200 y su valor predeterminado es 7. La captura del usuario se toma como referencia: a 7, 79 cm/360 a 800 DPI, 39,5 cm a 1600 DPI y 19,75 cm (19,8 redondeados) a 3200 DPI. Se usa una escala afín: grados/conteo = (360 × 2,54 / (79 × 800)) × ((sensibilidad + 4/3) / (7 + 4/3)). Es compatible con el modelo medido ≈ 0,00173623 × sensibilidad + 0,00231498 grados/conteo publicado por [SensitivityMatch](https://sensitivitymatch.com/mouse-sensitivity-converter/cs2-to-battlefield-6/), normalizado a la captura de sensibilidad 7. A sensibilidad 100 reproduce 6,5 / 3,2 / 1,6 cm a 800 / 1600 / 3200 DPI; los cálculos mantienen precisión completa antes de redondear. A 0 queda una sensibilidad mínima (aprox. 493,8 cm/360 a 800 DPI). No es una fórmula oficial verificada y las capturas solo validan dos puntos de la escala. Se solicita Pointer Lock sin aceleración cuando está disponible; el escalado de entrada del navegador/SO puede alterar las distancias físicas. La tabla muestra sensibilidad base; al apuntar se aplica el multiplicador USA. La resolución seleccionada determina aspecto y encuadre, mientras el raster WebGL se adapta al tamaño mostrado con un máximo de 1.5× DPR para limitar consumo.

## Referencias

- [DICE: Uniform Soldier Aiming](https://forums.ea.com/blog/battlefield-game-info-hub-en/dev-notes---uniform-soldier-aiming/7013669)
- [EA: ajustes de ratón y teclado](https://www.frostbite.com/able/resources/battlefield-2042/pc/mouse-and-keyboard)
- [Unity: geometría de la proyección](https://docs.unity.com/en-us/engine/6000.5/manual/cameras/camera-view/frustum-size-at-distance)
- [MDN: Pointer Lock](https://developer.mozilla.org/en-US/docs/Web/API/Pointer_Lock_API)
