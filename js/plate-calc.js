// ---------------- CALCOLATORE DISCHI BILANCIERE ----------------
// il peso del bilanciere e' per ESERCIZIO (ex.barKg), non un'impostazione unica
// per tutta l'app: panca/squat usano l'olimpionico da 20kg, ma il curl usa lo
// EZ (peso diverso, spesso nemmeno noto), quindi non ha senso un default fisso
const PLATE_SIZES = [20,15,10,5,2.5,1.25];
const BAR_PRESETS = [
  {label:'Olimpionico 20 kg', kg:20},
  {label:'Olimpionico donna 15 kg', kg:15},
  {label:'EZ curl ~10 kg', kg:10},
  {label:'EZ curl ~7 kg', kg:7},
];
let plateCalcExi = null;
let plateLastTotal = '';
function openPlateCalc(exi){
  plateCalcExi = exi;
  plateLastTotal = '';
  const ex = state.days[activeDayIdx].esercizi[exi];
  document.getElementById('plateTitle').textContent = 'Dischi — ' + (ex.nome || 'Esercizio');
  renderPlateBody();
  document.getElementById('plateModal').style.display = 'flex';
}
function closePlateCalc(){
  document.getElementById('plateModal').style.display = 'none';
  plateCalcExi = null;
}
function setExerciseBarKg(kg){
  const ex = state.days[activeDayIdx].esercizi[plateCalcExi];
  ex.barKg = kg;
  saveState();
  renderPlateBody();
}
function promptCustomBarKg(){
  const val = prompt('Peso del bilanciere in kg (es. 8):');
  if(val===null) return;
  const kg = parseFloat(String(val).replace(',','.'));
  if(isNaN(kg) || kg<0){ alert('Numero non valido'); return; }
  setExerciseBarKg(kg);
}
function resetExerciseBarKg(){
  const ex = state.days[activeDayIdx].esercizi[plateCalcExi];
  ex.barKg = null;
  saveState();
  renderPlateBody();
}
// scompone il peso per lato nei dischi standard disponibili, i piu' grandi
// per primi, cosi' ne servono il meno possibile
function computePlatesPerSide(totalKg, barKg){
  let remaining = Math.max(0, (totalKg - barKg) / 2);
  const plates = [];
  PLATE_SIZES.forEach(p=>{
    while(remaining + 1e-9 >= p){
      plates.push(p);
      remaining = Math.round((remaining - p)*100)/100;
    }
  });
  return {plates, leftover: remaining};
}
function onPlateTotalInput(val){
  plateLastTotal = val;
  renderPlateBody();
}
function renderPlateBody(){
  const ex = state.days[activeDayIdx].esercizi[plateCalcExi];
  const body = document.getElementById('plateBody');
  if(!ex) return;
  if(ex.barKg===undefined || ex.barKg===null){
    body.innerHTML = `<div class="footer-note" style="padding:0 0 10px;">Che bilanciere usi per "${escapeHtml(ex.nome||'questo esercizio')}"?</div>
      <div class="cal-editor-list">
        ${BAR_PRESETS.map(p=>`<button class="cal-day-toggle" onclick="setExerciseBarKg(${p.kg})">${escapeHtml(p.label)}</button>`).join('')}
        <button class="cal-day-toggle" onclick="promptCustomBarKg()">Personalizzato...</button>
      </div>`;
    return;
  }
  const total = plateLastTotal;
  const parsedTotal = parseFloat(String(total).replace(',','.'));
  const calc = total!=='' && !isNaN(parsedTotal) ? computePlatesPerSide(parsedTotal, ex.barKg) : null;
  body.innerHTML = `
    <div class="footer-note" style="padding:0 0 8px;text-align:left;">Bilanciere: <b style="color:var(--text)">${ex.barKg} kg</b> — <button class="link-btn" onclick="resetExerciseBarKg()">cambia</button></div>
    <div class="meta-row"><span class="meta-label">Peso totale</span><input class="meta-input" inputmode="decimal" placeholder="es. 82.5" value="${escapeAttr(total)}" oninput="onPlateTotalInput(this.value)"></div>
    ${calc ? `<div class="plate-result">${calc.plates.length ? calc.plates.map(p=>`<span class="plate-chip">${p}</span>`).join('') : 'nessun disco'} per lato${calc.leftover>0.01 ? `<div class="footer-note" style="padding-top:6px;">(${calc.leftover} kg non ottenibili con i dischi standard)</div>` : ''}</div>` : ''}
  `;
}
