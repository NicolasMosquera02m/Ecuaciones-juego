# Informe final — Prototipo "Caída libre"

Resumen del desarrollo
- Se implementó un simulador interactivo de caída libre con resistencia proporcional a la velocidad (modelo lineal).
- Se añadieron controles en tiempo real para gravedad (g), coeficiente de arrastre (k), masa (m) y condiciones iniciales (h0, v0).
- Se integraron gráficos interactivos y(t) y v(t) con Chart.js que muestran la simulación y opcionalmente la solución analítica (obtenida por transformada de Laplace).
- Se añadió una sección de "Análisis" con métricas clave: tiempo de caída, velocidad de impacto y velocidad terminal.

Retos técnicos
- Precisión numérica vs. rendimiento: elección de dt fijo (1/60 s) y limitar la frecuencia de actualización de gráficos.
- Casos límite: cuando k → 0 la solución analítica cambia de carácter; se maneja explícitamente para evitar divisiones por cero.
- Sincronización UI/simulación: introducir "Actualizar en vivo" y un botón "Aplicar" para control fino.

Validación Laplace vs. simulación
- La solución analítica usada para overlay es la solución de la EDO lineal:
  v(t) = v_term + (v0 - v_term) e^{-(k/m)t}, con v_term = m g / k
  y(t) = h0 - v_term t - (v0 - v_term)(1 - e^{-(k/m)t})/(k/m)
- Al activar el overlay las curvas analíticas y la simulación numérica (modelo idéntico) coinciden dentro de tolerancias numéricas.

Reflexión pedagógica
- Comparar soluciones analíticas y simulaciones facilita la comprensión de EDOs y su relación con fenómenos físicos reales.
- El ejercicio mostró la necesidad de tratar casos especiales y equilibrar precisión con interactividad.

Instrucciones de uso rápidas
- Levantar servidor: `python3 -m http.server 8000`
- Abrir: `http://localhost:8000/index.html` (usar $BROWSER desde el host)
- Ajustar constantes; activar "Actualizar en vivo" o presionar "Aplicar"; activar "Mostrar Laplace" para overlay analítico; presionar "Iniciar".
