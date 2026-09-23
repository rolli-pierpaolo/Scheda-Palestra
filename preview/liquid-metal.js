// Presentation only. Two small GPU surfaces, clocked by the existing GSAP ticker.
// No workout state, storage, network, pointer handlers or global ticker settings.
(function(){
  'use strict';
  const vertex = 'attribute vec2 p; varying vec2 uv; void main(){uv=p*.5+.5;gl_Position=vec4(p,0.,1.);}';
  const fragment = `precision mediump float;
    varying vec2 uv; uniform float time; uniform float aspect; uniform vec3 tint; uniform float strength;
    float surface(vec2 p){
      p += .28*vec2(sin(p.y*2.1+time*.37),cos(p.x*1.7-time*.31));
      return sin(p.x*2.5+p.y*1.6+time*.48)*.38
        +sin(p.y*3.4-p.x*1.3-time*.39)*.23
        +sin(p.x*4.2+p.y*2.8+time*.23)*.09;
    }
    void main(){
      vec2 p=(uv-.5)*vec2(aspect,1.)*3.;
      float h=surface(p);
      vec3 normal=normalize(vec3((surface(p+vec2(.015,0.))-h)/.015,(surface(p+vec2(0.,.015))-h)/.015,1.));
      vec3 reflected=reflect(vec3(0.,0.,-1.),normal);
      float band=.5+.5*sin(reflected.x*4.8+reflected.y*2.9+h*1.8);
      float silver=pow(band,10.);
      float glow=pow(max(dot(normal,normalize(vec3(-.4,.65,1.))),0.),5.);
      vec3 graphite=vec3(.035,.047,.052)+vec3(.08,.095,.10)*band;
      vec3 metal=graphite + tint*(.07+.28*glow)+vec3(.62,.68,.70)*silver*.55;
      float vignette=1.-.23*length(uv-.5);
      gl_FragColor=vec4(metal*strength*vignette,1.);
    }`;
  let started=false;
  function start(){
    if(started || !document.body || !window.gsap) return;
    started=true;
    const body=document.body, keyboard=document.getElementById('quickNumberBar');
    body.classList.add('liquid-system');
    const motion=window.matchMedia('(prefers-reduced-motion: reduce)');
    const surfaces=[];
    let running=false, last=0, elapsed=0, suspended=false;
    let paletteTween=null;
    const palette={r:.49,g:.66,b:.24};
    function make(host, page){
      const canvas=document.createElement('canvas');
      canvas.className='viridis-liquid-canvas'+(page?' viridis-liquid-page':'');
      canvas.setAttribute('aria-hidden','true');
      host.prepend(canvas);
      const item={host,canvas,page,gl:null,program:null,buffer:null,uniforms:null,lost:false,failed:false};
      canvas.addEventListener('webglcontextlost',event=>{event.preventDefault();item.lost=true;host.classList.remove(page?'liquid-page-ready':'liquid-keyboard-ready');sync();});
      canvas.addEventListener('webglcontextrestored',()=>{item.lost=false;item.gl=null;item.program=null;item.buffer=null;item.failed=false;sync();});
      return item;
    }
    surfaces.push(make(body,true));
    if(keyboard) surfaces.push(make(keyboard,false));
    function init(item){
      if(item.failed || item.lost) return false;
      if(item.program) return true;
      let gl;
      try{
        gl=item.canvas.getContext('webgl',{alpha:false,antialias:false,depth:false,stencil:false,powerPreference:'low-power'});
        if(!gl) throw new Error('WebGL unavailable');
        item.gl=gl;
        const shaders=[];
        try{
          const program=gl.createProgram();item.program=program;
          for(const [kind,source] of [[gl.VERTEX_SHADER,vertex],[gl.FRAGMENT_SHADER,fragment]]){
            const shader=gl.createShader(kind);shaders.push(shader);gl.shaderSource(shader,source);gl.compileShader(shader);gl.attachShader(program,shader);
          }
          gl.bindAttribLocation(program,0,'p');gl.linkProgram(program);
          if(!gl.getProgramParameter(program,gl.LINK_STATUS)) throw new Error('Shader unavailable');
          gl.useProgram(program);
          item.buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,item.buffer);
          gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,3,-1,-1,3]),gl.STATIC_DRAW);
          gl.enableVertexAttribArray(0);gl.vertexAttribPointer(0,2,gl.FLOAT,false,0,0);
          item.uniforms={};
          for(const name of ['time','aspect','tint','strength']) item.uniforms[name]=gl.getUniformLocation(program,name);
        }finally{shaders.forEach(shader=>gl.deleteShader(shader));}
        return true;
      }catch(error){
        if(gl && item.program) gl.deleteProgram(item.program);
        if(gl && item.buffer) gl.deleteBuffer(item.buffer);
        item.program=null;item.buffer=null;item.failed=true;
        return false;
      }
    }
    function allowed(){return !body.classList.contains('theme-light') && !body.classList.contains('a11y-reduce-motion') && !body.classList.contains('a11y-high-contrast') && !motion.matches;}
    function visible(item){return item.page || (!keyboard.hidden && getComputedStyle(keyboard).display!=='none');}
    function draw(item){
      if(!visible(item)||item.lost||!init(item)) return false;
      const box=item.canvas.getBoundingClientRect();
      if(!box.width||!box.height) return false;
      const scale=Math.min(1,900/Math.max(box.width,box.height));
      const width=Math.max(1,Math.round(box.width*scale)),height=Math.max(1,Math.round(box.height*scale));
      if(item.canvas.width!==width||item.canvas.height!==height){item.canvas.width=width;item.canvas.height=height;}
      const gl=item.gl,u=item.uniforms;
      gl.viewport(0,0,width,height);gl.useProgram(item.program);
      gl.uniform1f(u.time,elapsed);gl.uniform1f(u.aspect,width/height);
      gl.uniform3f(u.tint,palette.r,palette.g,palette.b);
      gl.uniform1f(u.strength,!item.page?1.05:body.classList.contains('on-workout')?.85:.55);
      gl.drawArrays(gl.TRIANGLES,0,3);
      const readyClass=item.page?'liquid-page-ready':'liquid-keyboard-ready';
      if(!item.host.classList.contains(readyClass)) item.host.classList.add(readyClass);
      return true;
    }
    function tick(time){
      if(time-last<1/30) return;
      elapsed+=Math.min(.06,Math.max(0,time-last));last=time;
      surfaces.forEach(draw);
    }
    function sync(){
      const enabled=allowed()&&!document.hidden&&!suspended;
      if(enabled){surfaces.forEach(draw);}
      else surfaces.forEach(item=>{const c=item.page?'liquid-page-ready':'liquid-keyboard-ready';if(item.host.classList.contains(c)) item.host.classList.remove(c);});
      const shouldRun=enabled&&surfaces.some(item=>visible(item)&&!item.failed&&!item.lost&&item.program);
      if(shouldRun!==running){running=shouldRun;last=gsap.ticker.time;if(running)gsap.ticker.add(tick);else gsap.ticker.remove(tick);}
      const source=body.classList.contains('on-workout')?document.getElementById('viewActive'):body.classList.contains('on-home')?document.querySelector('.home-suggested-btn'):null;
      const hex=source?getComputedStyle(source).getPropertyValue('--accent').trim():'#7EA83C';
      const match=/^#([0-9a-f]{6})$/i.exec(hex);
      if(match && hex!==body.dataset.liquidTint){
        body.dataset.liquidTint=hex;
        const n=parseInt(match[1],16),color={r:((n>>16)&255)/255,g:((n>>8)&255)/255,b:(n&255)/255};
        if(paletteTween)paletteTween.kill();
        if(enabled) paletteTween=gsap.to(palette,{...color,duration:.7,ease:'sine.inOut'});
        else Object.assign(palette,color);
      }
      if(!enabled&&paletteTween){paletteTween.kill();paletteTween=null;}
    }
    new MutationObserver(sync).observe(body,{attributes:true,attributeFilter:['class','style']});
    if(keyboard)new MutationObserver(sync).observe(keyboard,{attributes:true,attributeFilter:['hidden']});
    const active=document.getElementById('viewActive');
    if(active)new MutationObserver(sync).observe(active,{attributes:true,attributeFilter:['style']});
    window.addEventListener('resize',sync);
    document.addEventListener('visibilitychange',sync);
    window.addEventListener('pagehide',()=>{suspended=true;sync();});
    window.addEventListener('pageshow',()=>{suspended=false;sync();});
    motion.addEventListener('change',sync);
    sync();
  }
  window.addEventListener('load',start,{once:true});
})();
