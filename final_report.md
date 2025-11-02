# Informe final — Prototipo "Caída libre"

Resumen del desarrollo
- Simulador interactivo con resistencia proporcional a la velocidad.
- Controles en tiempo real para g, k, m, h0 y v0.
- Gráficas y(t) y v(t) con Chart.js; overlay analítico opcional.
- Sección "Análisis" con métricas clave: tiempo de caída, velocidad de impacto y velocidad terminal.

Retos técnicos
- Balance precisión/rendimiento: dt fijo (1/60 s) y actualización limitada de gráficos.
- Casos límite (k=0) tratados explícitamente.
- Sincronización UI/simulación: se añadió "Actualizar en vivo" y botón "Aplicar".

Validación Laplace vs. simulación
- Solución analítica usada:
  v(t) = v_term + (v0 - v_term) e^{-(k/m)t}, v_term = m g / k
  y(t) = h0 - v_term t - (v0 - v_term)(1 - e^{-(k/m)t})/(k/m)
- Overlay demuestra coincidencia entre la solución analítica y la simulación numérica del mismo modelo.

Reflexión pedagógica
- Comparar soluciones analíticas y simulaciones facilita la comprensión de EDOs y su relación con fenómenos físicos reales.

Instrucciones de uso
- Desde la carpeta del proyecto: `python3 -m http.server 8000`
- Abrir: `http://localhost:8000/index.html` (usar $BROWSER desde el host)
- Ajustar constantes, activar "Mostrar Laplace", y presionar "Iniciar".
