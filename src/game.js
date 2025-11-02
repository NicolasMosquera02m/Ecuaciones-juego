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

  // Nuevos controles
  const inputG = document.getElementById('inputG');
  const inputK = document.getElementById('inputK');
  const inputM = document.getElementById('inputM');
  const inputH0 = document.getElementById('inputH0');
  const inputV0 = document.getElementById('inputV0');
  const laplaceToggle = document.getElementById('laplaceToggle');
  const liveUpdate = document.getElementById('liveUpdate');
  const applyBtn = document.getElementById('applyBtn');

  // Analisis UI
  const fallTimeSimEl = document.getElementById('fallTimeSim');
  const fallTimeAnaEl = document.getElementById('fallTimeAna');
  const impactVelSimEl = document.getElementById('impactVelSim');
  const impactVelAnaEl = document.getElementById('impactVelAna');
  const vTerminalAnaEl = document.getElementById('vTerminalAna');

  // Chart contexts
  const chartYCtx = document.getElementById('chartY').getContext('2d');
  const chartVCtx = document.getElementById('chartV').getContext('2d');
  let chartY = null, chartV = null;

  // Mundo: parámetros únicos (g, arrastre k, color)
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

  // Series temporales para charts
  let series = { t:[], y:[], v:[], yAna:[], vAna:[] };

  function initCharts(){
    if(chartY) { chartY.destroy(); chartV.destroy(); }
    chartY = new Chart(chartYCtx, {
      type:'line',
      data:{
        datasets:[
          { label:'y(t) simulación (m)', data:[], borderColor:'#2b8cbe', tension:0.2, fill:false, pointRadius:0 },
          { label:'y(t) analítica', data:[], borderColor:'#ff7f0e', borderDash:[6,4], tension:0.2, fill:false, pointRadius:0 }
        ]
      },
      options:{ animation:false, scales:{ x:{ type:'linear', title:{display:true, text:'t (s)'} }, y:{ title:{display:true, text:'Altura (m)'} } } }
    });
    chartV = new Chart(chartVCtx, {
      type:'line',
      data:{
        datasets:[
          { label:'v(t) simulación (m/s)', data:[], borderColor:'#66a61e', tension:0.2, fill:false, pointRadius:0 },
          { label:'v(t) analítica', data:[], borderColor:'#d62728', borderDash:[6,4], tension:0.2, fill:false, pointRadius:0 }
        ]
      },
      options:{ animation:false, scales:{ x:{ type:'linear', title:{display:true, text:'t (s)'} }, y:{ title:{display:true, text:'Velocidad (m/s)'} } } }
    });
  }

  function syncInputsFromState(){
    inputG.value = state.world.g;
    inputK.value = state.world.k;
    inputM.value = state.ball.m;
    inputH0.value = state.pz.toFixed(2);
    inputV0.value = state.v.toFixed(2);
  }

  function generateObstacles(worldIndex){
    const arr = [];
    for(let i=1;i<=8;i++){
      const h = 100 - i*10 + (Math.random()*4-2);
      const x = 80 + Math.random()*(canvas.width-160);
      const w = 60 + Math.random()*100;
      const type = Math.random() < 0.7 ? 'platform' : 'block';
      arr.push({h,x,w,type});
    }
    return arr;
  }

  // Solución analítica para modelo de arrastre lineal
  function analyticAt(t, params){
    const {g,k,m,h0,v0} = params;
    if(k <= 0){
      // Sin resistencia: v = v0 + g t, y = h0 - v0 t - 0.5 g t^2
      const v = v0 + g * t;
      const y = h0 - v0 * t - 0.5 * g * t * t;
      return { y, v };
    } else {
      const lambda = k / m;
      const v_term = (m * g) / k; // velocidad terminal (positiva hacia abajo)
      const exp = Math.exp(-lambda * t);
      const v = v_term + (v0 - v_term) * exp;
      const y = h0 - v_term * t - (v0 - v_term) * (1 - exp) / lambda;
      return { y, v };
    }
  }

  // Encuentra tiempo de caída analítico (bisección)
  function findFallTimeAnalytic(params, tmax=1e4, tol=1e-6){
    const f = t => analyticAt(t, params).y;
    let a = 0, b = Math.max(1, params.h0/ (params.g || 9.81) * 2, 10);
    if(f(a) <= 0) return 0;
    // Aumentar b hasta f(b)<=0 o hasta tmax
    while(b < tmax && f(b) > 0) b *= 2;
    if(f(b) > 0) return NaN;
    for(let i=0;i<100;i++){
      const m = 0.5*(a+b);
      if(Math.abs(f(m)) < tol) return m;
      if(f(a)*f(m) <= 0) b = m; else a = m;
    }
    return 0.5*(a+b);
  }

  function updateAnalysis(){
    // Simulada
    if(state.score != null){
      fallTimeSimEl.textContent = (state.score).toFixed(3);
      impactVelSimEl.textContent = state.v.toFixed(3);
    } else {
      fallTimeSimEl.textContent = '-';
      impactVelSimEl.textContent = '-';
    }
    // Analítica
    const params = { g: parseFloat(inputG.value), k: parseFloat(inputK.value), m: parseFloat(inputM.value), h0: parseFloat(inputH0.value), v0: parseFloat(inputV0.value) };
    const tAna = findFallTimeAnalytic(params, 5000);
    vTerminalAnaEl.textContent = (params.k>0 ? (params.m*params.g/params.k).toFixed(3) : '∞');
    if(!isNaN(tAna)){
      fallTimeAnaEl.textContent = tAna.toFixed(3);
      const vAtImpact = analyticAt(tAna, params).v;
      impactVelAnaEl.textContent = vAtImpact.toFixed(3);
    } else {
      fallTimeAnaEl.textContent = '—';
      impactVelAnaEl.textContent = '—';
    }
  }

  function resetState(){
    const startX = canvas.width/2;
    state = {
      running:false,
      t:0,
      px:startX,
      pz:parseFloat(inputH0.value || 100.0),
      v:parseFloat(inputV0.value || 0.0),
      world: {name:'Custom', g: parseFloat(inputG.value || 9.81), k: parseFloat(inputK.value || 0.5), color:'#cfefff'},
      ball: {m: parseFloat(inputM.value || 1.0), r:12, color:'#66a3ff'},
      score:null,
      obstacles: generateObstacles(0)
    };
    syncInputsFromState();
    series = { t:[], y:[], v:[], yAna:[], vAna:[] };
    initCharts();
    updateUI();
    updateAnalysis();
    messageEl.textContent = 'Listo. Presiona Iniciar.';
  }

  // Controls horizontales simples
  const keys = {left:false,right:false};
  window.addEventListener('keydown', e=>{ if(e.key==='ArrowLeft') keys.left=true; if(e.key==='ArrowRight') keys.right=true; });
  window.addEventListener('keyup', e=>{ if(e.key==='ArrowLeft') keys.left=false; if(e.key==='ArrowRight') keys.right=false; });

  function start(){
    if(state.running) return;
    state.running = true;
    state.t = 0;
    state.score = null;
    if(!liveUpdate.checked){
      state.pz = parseFloat(inputH0.value);
      state.v = parseFloat(inputV0.value);
    }
    series = { t:[], y:[], v:[], yAna:[], vAna:[] };
    messageEl.textContent = 'Cayendo... usa ← → para esquivar obstáculos.';
    requestAnimationFrame(loop);
  }

  function stop(reason){
    state.running = false;
    state.score = state.t;
    messageEl.textContent = 'Final: ' + reason + '. Tiempo: ' + state.t.toFixed(2) + ' s';
    scoreEl.textContent = state.score.toFixed(2) + ' s';
    updateUI();
    updateAnalysis();
  }

  // Conversión metros -> canvas Y
  function metersToCanvasY(m){
    const padding=30; const y0=padding; const y1=canvas.height-padding;
    const t = 1 - (m/100);
    return y0 + t*(y1-y0);
  }

  function render(){
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

  // Loop con registro y actualización de charts
  let lastChartUpdate = 0;
  function loop(now){
    if(!state.running) { render(); return; }
    const dt = 1/60;
    state.t += dt;

    if(liveUpdate.checked){
      state.world.g = parseFloat(inputG.value);
      state.world.k = parseFloat(inputK.value);
      state.ball.m = parseFloat(inputM.value);
    }

    const g = state.world.g;
    const k = state.world.k;
    const m = state.ball.m;
    const a = g - (k/m)*state.v;
    state.v += a*dt;
    state.pz -= state.v*dt;
    if(state.pz <= 0){ state.pz = 0; stop('Tocaste el suelo'); render(); return; }

    const speedX = 200;
    if(keys.left) state.px -= speedX*dt;
    if(keys.right) state.px += speedX*dt;
    state.px = Math.max(0, Math.min(canvas.width, state.px));

    // Colisiones
    for(const ob of state.obstacles){
      const obY = metersToCanvasY(ob.h);
      const ballY = metersToCanvasY(state.pz);
      const dy = Math.abs(ballY - obY);
      const withinX = state.px >= ob.x - state.ball.r && state.px <= ob.x + ob.w + state.ball.r;
      if(dy < 12 && withinX){
        if(ob.type === 'platform'){
          stop('Tocaste plataforma'); return;
        } else {
          state.v = Math.max(0, state.v - 4);
          state.px += (Math.random()>0.5? -1:1)*30;
        }
      }
    }

    // Registrar series
    series.t.push(state.t);
    series.y.push(state.pz);
    series.v.push(state.v);

    const anaParams = { g: parseFloat(inputG.value), k: parseFloat(inputK.value), m: parseFloat(inputM.value), h0: parseFloat(inputH0.value), v0: parseFloat(inputV0.value) };
    const ana = analyticAt(state.t, anaParams);
    series.yAna.push(ana.y);
    series.vAna.push(ana.v);

    if(state.t - lastChartUpdate > 0.08){
      lastChartUpdate = state.t;
      if(series.t.length > 3000){
        const cut = series.t.length - 3000;
        series.t.splice(0,cut); series.y.splice(0,cut); series.v.splice(0,cut); series.yAna.splice(0,cut); series.vAna.splice(0,cut);
      }
      chartY.data.datasets[0].data = series.t.map((tt,i)=>({x:tt, y:series.y[i]}));
      chartV.data.datasets[0].data = series.t.map((tt,i)=>({x:tt, y:series.v[i]}));
      if(laplaceToggle.checked){
        chartY.data.datasets[1].data = series.t.map((tt,i)=>({x:tt, y:series.yAna[i]}));
        chartV.data.datasets[1].data = series.t.map((tt,i)=>({x:tt, y:series.vAna[i]}));
        chartY.getDatasetMeta(1).hidden = false;
        chartV.getDatasetMeta(1).hidden = false;
      } else {
        chartY.getDatasetMeta(1).hidden = true;
        chartV.getDatasetMeta(1).hidden = true;
      }
      chartY.update('none'); chartV.update('none');
      updateAnalysis();
    }

    updateUI();
    render();
    requestAnimationFrame(loop);
  }

  // Event bindings
  startBtn.addEventListener('click', ()=> start());
  resetBtn.addEventListener('click', ()=>{ resetState(); render(); });
  toggleTheory.addEventListener('click', ()=>{ theory.classList.toggle('hidden'); });
  worldSelect.addEventListener('change', ()=>{ 
    const w = worlds[+worldSelect.value];
    if(w) {
      inputG.value = w.g; inputK.value = w.k;
    }
  });
  ballSelect.addEventListener('change', ()=>{
    const b = balls[+ballSelect.value];
    if(b){
      inputM.value = b.m;
      if(state) state.ball.m = b.m;
    }
  });

  applyBtn.addEventListener('click', ()=>{
    resetState();
    render();
  });

  [inputG,inputK,inputM,inputH0,inputV0].forEach(el=>{
    el.addEventListener('change', ()=>{
      if(!state) return;
      if(liveUpdate.checked){
        state.world.g = parseFloat(inputG.value);
        state.world.k = parseFloat(inputK.value);
        state.ball.m = parseFloat(inputM.value);
        if(!state.running){
          state.pz = parseFloat(inputH0.value);
          state.v = parseFloat(inputV0.value);
        }
        updateAnalysis();
      }
    });
  });

  laplaceToggle.addEventListener('change', ()=>{ /* charts se actualizan en loop */ });

  // Iniciar por defecto
  resetState(); render();

  // Exponer estado para debugging
  window.__gameState = () => state;
})();
