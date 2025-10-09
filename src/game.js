// Prototipo educativo: caída libre con resistencia simple.
(function(){
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');

  // UI
  const heightEl = document.getElementById('height');
  const velocityEl = document.getElementById('velocity');
  const timeEl = document.getElementById('time');
  const scoreEl = document.getElementById('score');
  const messageEl = document.getElementById('message');
  const worldSelect = document.getElementById('worldSelect');
  const ballSelect = document.getElementById('ballSelect');
  const startBtn = document.getElementById('startBtn');
  const resetBtn = document.getElementById('resetBtn');
  const toggleTheory = document.getElementById('toggleTheory');
  const theory = document.getElementById('theory');

  // Mundo: parámetros únicos (g, arrastre k, obstáculos)
  const worlds = [
    {name:'Plano ideal', g:9.81, k:0.0, color:'#cfefff'},
    {name:'Viento leve', g:9.81, k:0.5, color:'#e8f0ff'},
    {name:'Resistencia alta', g:9.81, k:2.0, color:'#fff0f0'},
    {name:'Gravedad baja', g:6.0, k:0.6, color:'#f0fff0'},
    {name:'Gravedad alta', g:15.0, k:0.3, color:'#fff7e0'}
  ];

  // Llenar selector de mundos
  worlds.forEach((w,i)=>{
    const opt = document.createElement('option'); opt.value = i; opt.textContent = w.name; worldSelect.appendChild(opt);
  });

  // Pelotas: masa y radio en px relativo
  const balls = [ {m:0.2, r:8, color:'#ff6666'}, {m:1.0, r:12, color:'#66a3ff'}, {m:5.0, r:16, color:'#ffd166'} ];

  // Estado del juego
  let state = null;

  function resetState(){
    const startX = canvas.width/2;
    state = {
      running:false,
      t:0,
      px:startX, // posición horizontal px
      pz:100.0, // altura en metros
      v:0, // velocidad vertical m/s (positivo hacia abajo)
      world: worlds[+worldSelect.value || 0],
      ball: balls[+ballSelect.value || 1],
      score:null,
      obstacles: generateObstacles(+worldSelect.value || 0)
    };
    updateUI();
    messageEl.textContent = 'Listo. Presiona Iniciar.';
  }

  function generateObstacles(worldIndex){
    // Genera plataformas y bloques a distintas alturas (en metros)
    const arr = [];
    const base = worldIndex; // para variar
    for(let i=1;i<=8;i++){
      const h = 100 - i*10 + (Math.random()*4-2);
      const x = 80 + Math.random()*(canvas.width-160);
      const w = 60 + Math.random()*100;
      const type = Math.random() < 0.7 ? 'platform' : 'block';
      arr.push({h,x,w,type});
    }
    return arr;
  }

  function start(){
    if(state.running) return;
    state.running = true;
    state.t = 0;
    state.v = 0;
    state.pz = 100;
    state.score = null;
    messageEl.textContent = 'Cayendo... usa ← → para esquivar obstáculos.';
    requestAnimationFrame(loop);
  }

  function stop(reason){
    state.running = false;
    state.score = state.t;
    messageEl.textContent = 'Final: ' + reason + '. Tiempo: ' + state.t.toFixed(2) + ' s';
    scoreEl.textContent = state.score.toFixed(2) + ' s';
    updateUI();
  }

  // Controles horizontales simples
  const keys = {left:false,right:false};
  window.addEventListener('keydown', e=>{ if(e.key==='ArrowLeft') keys.left=true; if(e.key==='ArrowRight') keys.right=true; });
  window.addEventListener('keyup', e=>{ if(e.key==='ArrowLeft') keys.left=false; if(e.key==='ArrowRight') keys.right=false; });

  function loop(now){
    if(!state.running) { render(); return; }
    const dt = 1/60; // fija dt para simplicidad
    state.t += dt;

    // Física vertical con resistencia proporcional a v: a = g - (k/m)*v
    const g = state.world.g;
    const k = state.world.k;
    const m = state.ball.m;
    const a = g - (k/m)*state.v;
    state.v += a*dt;
    state.pz -= state.v*dt; // bajar la altura
    if(state.pz <= 0){ state.pz = 0; stop('Tocaste el suelo'); render(); return; }

    // Movimiento horizontal
    const speedX = 200; // px/s
    if(keys.left) state.px -= speedX*dt;
    if(keys.right) state.px += speedX*dt;
    state.px = Math.max(0, Math.min(canvas.width, state.px));

    // Chequeo de colisiones con plataformas/blocks
    for(const ob of state.obstacles){
      const obY = metersToCanvasY(ob.h);
      const ballY = metersToCanvasY(state.pz);
      const dy = Math.abs(ballY - obY);
      const withinX = state.px >= ob.x - state.ball.r && state.px <= ob.x + ob.w + state.ball.r;
      if(dy < 12 && withinX){
        if(ob.type === 'platform'){
          stop('Tocaste plataforma'); return;
        } else {
          // block = obstáculo, chocar hace perder tiempo (rebote simple)
          state.v = Math.max(0, state.v - 4);
          state.px += (Math.random()>0.5? -1:1)*30; // empuja
        }
      }
    }

    updateUI();
    render();
    requestAnimationFrame(loop);
  }

  function metersToCanvasY(m){
    // 100m -> top (cerca del y=60), 0m -> bottom
    const padding=30; const y0=padding; const y1=canvas.height-padding;
    const t = 1 - (m/100);
    return y0 + t*(y1-y0);
  }

  function render(){
    // Fondo según mundo
    ctx.fillStyle = state ? state.world.color : '#aee';
    ctx.fillRect(0,0,canvas.width,canvas.height);

    // Obstáculos
    if(state){
      for(const ob of state.obstacles){
        const y = metersToCanvasY(ob.h);
        if(ob.type==='platform'){
          ctx.fillStyle = '#444'; ctx.fillRect(ob.x, y, ob.w, 8);
        } else {
          ctx.fillStyle = '#8b0000'; ctx.fillRect(ob.x, y-12, ob.w, 24);
        }
      }
    }

    // Pelota
    if(state){
      const x = state.px;
      const y = metersToCanvasY(state.pz);
      ctx.beginPath(); ctx.fillStyle = state.ball.color; ctx.arc(x,y,state.ball.r,0,Math.PI*2); ctx.fill();
      ctx.strokeStyle = '#222'; ctx.stroke();
    }

    // Suelo
    ctx.fillStyle = '#3b3'; ctx.fillRect(0, canvas.height-10, canvas.width, 10);
  }

  function updateUI(){
    if(!state) return;
    heightEl.textContent = state.pz.toFixed(2);
    velocityEl.textContent = state.v.toFixed(2);
    timeEl.textContent = state.t.toFixed(2);
    if(state.score==null) scoreEl.textContent = '-';
  }

  // Event bindings
  startBtn.addEventListener('click', ()=> start());
  resetBtn.addEventListener('click', ()=>{ resetState(); render(); });
  toggleTheory.addEventListener('click', ()=>{ theory.classList.toggle('hidden'); });
  worldSelect.addEventListener('change', ()=>{ resetState(); render(); });
  ballSelect.addEventListener('change', ()=>{ resetState(); render(); });

  // Iniciar
  resetState(); render();

  // Exponer repositorio mínimo para debugging (no obligatorio)
  window.__gameState = () => state;
})();
