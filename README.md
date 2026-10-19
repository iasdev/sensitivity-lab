# Sensitivity Lab

Simulador estático en español de campo de visión y Uniform Soldier Aiming. WebGL 1 renderiza un campo de tiro tridimensional mediante rayos y geometría analítica en un fragment shader; no necesita bibliotecas, backend ni claves.

## Ejecutar

```sh
python3 -m http.server 8080 --directory dist --bind 127.0.0.1
```

Abre http://localhost:8080. Para verificar la geometría con Node 18 o posterior: `npm test`.

## Controles

- FOV horizontal y vertical vinculados a la relación de aspecto.
- Resoluciones predefinidas, dimensiones personalizadas o ajuste al espacio disponible; botón de pantalla completa real.
- Fondo rojo y banda verde de referencia USA, retícula central y marcadores del recorrido de igualación.
- Mira con aumento óptico 1–8×; FOV relativo al jugador o referencia fija de 55° verticales.
- USA activable, coeficiente 0–300%, sensibilidad base y objetivos móviles.
- Arrastrar para mirar; capturar el ratón para probar libremente; Espacio o botón para alternar ADS; clic derecho sobre la escena para alternar ADS, con o sin captura; Esc libera el ratón.
- Rueda sobre la escena: arriba aumenta el zoom y abajo lo reduce en pasos de 0,25×, entre 1× y 8×; sincroniza el slider y funciona con el ratón capturado.

## Modelo

Para relación de aspecto A, H = 2 atan(A tan(V/2)). El aumento Z usa V_ads = 2 atan(tan(V_ref/2)/Z). Con FOV relativo desactivado V_ref = 55°; activado V_ref = V_base.

Para coeficiente c = porcentaje/100, el factor angular ADS/base es atan(c tan(V_ads/2)) / atan(c tan(V_base/2)). Para c=0 se usa el límite tan(V_ads/2)/tan(V_base/2).

La referencia horizontal ocupa c/A del semiancho desde el centro; la banda completa ocupa esa misma fracción del ancho. Si supera el borde se recorta visualmente y se indica. Para c=0 solo se dibuja la línea central. La banda representa un recorrido de referencia, no una zona de aplicación: la sensibilidad afecta a toda la cámara. No se puede igualar todo el espacio de pantalla simultáneamente para FOV distintos.

USA desactivado usa factor 1, conservación del giro angular. No emula el modo legacy de Battlefield ni sus multiplicadores particulares. La sensibilidad usa grados por 100 píxeles de entrada del navegador; no equivale a cm/360 sin calibración de DPI/entrada. La resolución seleccionada determina aspecto y encuadre, mientras el raster WebGL se adapta al tamaño mostrado con un máximo de 1.5× DPR para limitar consumo.

## Referencias

- [DICE: Uniform Soldier Aiming](https://forums.ea.com/blog/battlefield-game-info-hub-en/dev-notes---uniform-soldier-aiming/7013669)
- [EA: ajustes de ratón y teclado](https://www.frostbite.com/able/resources/battlefield-2042/pc/mouse-and-keyboard)
- [Unity: geometría de la proyección](https://docs.unity.com/en-us/engine/6000.5/manual/cameras/camera-view/frustum-size-at-distance)
- [MDN: Pointer Lock](https://developer.mozilla.org/en-US/docs/Web/API/Pointer_Lock_API)
