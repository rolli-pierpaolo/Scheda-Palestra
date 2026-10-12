const ViridisMotion=(()=>{
  const running=new Set(),channels=new WeakMap();
  const ease='cubic-bezier(.16,1,.3,1)';
  function reduced(){return !document?.body||document.body.classList.contains('a11y-reduce-motion')||!!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;}
  function animate(element,frames,options={},channel='surface'){
    if(!element?.animate||reduced()||document.hidden)return null;
    let map=channels.get(element);if(!map){map=new Map();channels.set(element,map);}
    map.get(channel)?.cancel();
    const animation=element.animate(frames,{duration:280,easing:ease,...options});
    map.set(channel,animation);running.add(animation);
    const release=()=>{running.delete(animation);if(map.get(channel)===animation)map.delete(channel);};
    animation.addEventListener('finish',()=>{if(options.fill!=='forwards')release();},{once:true});animation.addEventListener('cancel',release,{once:true});
    return animation;
  }
  function resize(element,before){
    const after=element.getBoundingClientRect().height;
    if(!before||!after||Math.abs(before-after)<2)return;
    animate(element,[{height:before+'px',overflow:'clip'},{height:after+'px',overflow:'clip'}],{duration:320},'size');
    const summary=element.querySelector('.series-completed-summary');
    if(summary)animate(summary,[{opacity:0,transform:'translateY(6px)'},{opacity:1,transform:'translateY(0)'}],{duration:240,delay:50});
  }
  function enterMenu(box){
    [...box.querySelectorAll('.ex-context-action,.ex-context-quick-action,.viridis-option')].slice(0,12).forEach((row,index)=>animate(row,[{opacity:0,transform:'translateY(9px)'},{opacity:1,transform:'translateY(0)'}],{duration:240,delay:Math.min(index*18,90),fill:'backwards'}));
  }
  function depart(overlay){
    if(reduced()||document.hidden||!overlay.animate)return;
    // La copia e soltanto visiva: la chiusura e il ripristino del focus restano immediati.
    const ghost=overlay.cloneNode(true);
    ghost.removeAttribute('id');ghost.setAttribute('aria-hidden','true');ghost.inert=true;
    ghost.querySelectorAll('[id]').forEach(el=>el.removeAttribute('id'));
    ghost.classList.add('motion-exit-shell');
    if(overlay.id==='exContextMenu')ghost.classList.add('motion-exercise-exit');
    ghost.style.pointerEvents='none';ghost.style.animation='none';
    document.body.append(ghost);
    const originalScrollers=overlay.querySelectorAll('.ex-sheet-content');
    ghost.querySelectorAll('.ex-sheet-content').forEach((el,i)=>el.scrollTop=originalScrollers[i]?.scrollTop||0);
    const box=ghost.querySelector('.ex-context-sheet');
    if(box){box.style.animation='none';animate(box,[{transform:box.style.transform||'translateY(0)',opacity:1},{transform:'translateY(36px)',opacity:0}],{duration:180,easing:'cubic-bezier(.4,0,1,1)'});}
    const fade=animate(ghost,[{opacity:1},{opacity:0}],{duration:180,easing:'ease-in'});
    if(fade){fade.addEventListener('finish',()=>ghost.remove(),{once:true});fade.addEventListener('cancel',()=>ghost.remove(),{once:true});}else ghost.remove();
  }
  function stop(){[...running].forEach(animation=>animation.cancel());}
  new MutationObserver(()=>{if(reduced())stop();}).observe(document.body,{attributes:true,attributeFilter:['class']});
  const preference=window.matchMedia?.('(prefers-reduced-motion: reduce)');
  preference?.addEventListener?.('change',()=>{if(reduced())stop();});
  document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();});
  const controls='.series-finish,.series-completed-summary,.day-ex-chip,.ex-context-action,.viridis-option,#tabHomeBtn,#tabActiveBtn,#tabHistBtn';
  let pressed=null;
  document.addEventListener('pointerdown',event=>{
    const target=event.target.closest?.(controls);if(!target||target.disabled||event.button>0)return;
    pressed=target;animate(target,[{scale:'1'},{scale:'.97'}],{duration:100,easing:'ease-out',fill:'forwards'},'press');
  },{passive:true});
  function release(){if(pressed){animate(pressed,[{scale:'.97'},{scale:'1'}],{duration:240},'press');pressed=null;}}
  document.addEventListener('pointerup',release,{passive:true});document.addEventListener('pointercancel',release,{passive:true});
  return {animate,resize,enterMenu,depart,reduced,stop};
})();
