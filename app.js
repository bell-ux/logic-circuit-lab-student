// 授業用スプレッドシートへの接続先。生徒に入力させる必要はありません。
const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzXBhfwTNkOTqxv7IntzelggV6Mk_sHjMIiglwIPBray8MbIJP0OjRvEFHyjTlWGj8u/exec';
const LOG_KEY = 'logicLabRecords';

const problems = [
  {id:'P1', title:'AND回路', level:'01 · 基本', prompt:'AとBの両方が1のときだけ、出力が1になる回路を作ろう。', inputs:['A','B'], slots:['g1'], positions:{g1:{x:360,y:120}}, wires:[['A','g1'],['B','g1'],['g1','Y']], target:{g1:'AND'}, hints:['ANDは、2つの入力が両方1のときに1を出します。','片方でも0なら、出力はどうなるでしょう？','AとBをそのままANDゲートにつなぎます。']},
  {id:'P2', title:'NOT＋OR回路', level:'02 · 標準', prompt:'A=0、B=1のとき、出力Yを1にしよう。', inputs:['A','B'], slots:['g1','g2'], positions:{g1:{x:230,y:62},g2:{x:530,y:122}}, wires:[['A','g1'],['g1','g2'],['B','g2'],['g2','Y']], target:{g1:'NOT',g2:'OR'}, hints:['NOTゲートは入力の0と1を反対にします。','AをNOTに通した結果とBをORに入れます。','左の枠をNOT、右の枠をORにします。']},
  {id:'P3', title:'4つのゲートをつなぐ', level:'03 · 応用', prompt:'(NOT A AND B) OR (NOT C) を作ろう。', inputs:['A','B','C'], slots:['g1','g2','g3','g4'], positions:{g1:{x:215,y:42},g2:{x:425,y:88},g3:{x:215,y:190},g4:{x:640,y:125}}, wires:[['A','g1'],['g1','g2'],['B','g2'],['C','g3'],['g2','g4'],['g3','g4'],['g4','Y']], target:{g1:'NOT',g2:'AND',g3:'NOT',g4:'OR'}, hints:['AとCをそれぞれNOTゲートで反転します。','NOT AとBをANDに入れ、その出力とNOT CをORに入れます。','枠の順にNOT、AND、NOT、ORを選びます。']},
  {id:'P4', title:'NAND回路', level:'04 · 発展', prompt:'ANDの結果を反転するNAND回路を作ろう。', inputs:['A','B'], slots:['g1'], positions:{g1:{x:360,y:120}}, wires:[['A','g1'],['B','g1'],['g1','Y']], target:{g1:'NAND'}, hints:['NANDはANDの出力を反転します。','ANDが1になる入力はどの組み合わせでしょう？','AとBをNANDゲートにつなぎます。']}
];
const gateTypes = ['AND','OR','NOT','NAND'];
let problemIndex = 0;
let inputValues = {A:0, B:0, C:0};
let hintCounts = {};

const $ = id => document.getElementById(id);
const studentId = $('studentId');
studentId.value = localStorage.getItem('logicLabStudentId') || '';

function logEvent(type, extra = {}) {
  const row = {time:new Date().toISOString(), studentId:studentId.value.trim(), problem:problems[problemIndex].id,
    title:problems[problemIndex].title, type, ...extra};
  const saved = JSON.parse(localStorage.getItem(LOG_KEY) || '[]');
  saved.unshift(row);
  localStorage.setItem(LOG_KEY, JSON.stringify(saved.slice(0,300)));
  fetch(SCRIPT_URL, {method:'POST', mode:'no-cors', headers:{'Content-Type':'text/plain;charset=utf-8'}, body:JSON.stringify(row)}).catch(() => {});
}

$('entryForm').addEventListener('submit', event => {
  event.preventDefault();
  const value = studentId.value.trim();
  if (!/^\d{1,12}$/.test(value)) { $('entryError').textContent = '数字の出席番号を入力してください。'; return; }
  localStorage.setItem('logicLabStudentId', value);
  $('currentStudentId').textContent = value;
  $('entryScreen').hidden = true;
  $('lessonScreen').hidden = false;
});
$('changeNumber').onclick = () => { $('lessonScreen').hidden = true; $('entryScreen').hidden = false; studentId.focus(); };
document.querySelectorAll('.tab').forEach(button => button.addEventListener('click', () => showView(button.dataset.view)));
document.querySelectorAll('[data-go-practice]').forEach(button => button.addEventListener('click', () => showView('practice')));
function showView(view) {
  $('lectureView').hidden = view !== 'lecture';
  $('practiceView').hidden = view !== 'practice';
  document.querySelectorAll('.tab').forEach(tab => tab.classList.toggle('active', tab.dataset.view === view));
}

function evaluateGate(type, values) {
  if (type === 'NOT') return 1 - values[0];
  if (type === 'AND') return values.every(value => value === 1) ? 1 : 0;
  if (type === 'OR') return values.some(value => value === 1) ? 1 : 0;
  if (type === 'NAND') return values.every(value => value === 1) ? 0 : 1;
  return 0;
}
function currentGates() {
  const problem = problems[problemIndex];
  return Object.fromEntries(problem.slots.map(slot => [slot, document.querySelector(`[data-slot="${slot}"]`)?.dataset.gate || problem.target[slot]]));
}
function evaluateCircuit(problem, gates, inputs) {
  const result = {...inputs};
  const steps = [];
  for (const [slot, gate] of Object.entries(gates)) {
    const portNames = slotInputs(problem, slot);
    const values = portNames.map(name => result[name]);
    const output = evaluateGate(gate, values);
    result[slotOutput(problem, slot)] = output;
    steps.push({slot, gate, names:portNames, values, output});
  }
  return {output:result.Y, steps};
}
function slotInputs(problem, slot) {
  const map = {P1:{g1:['A','B']},P2:{g1:['A'],g2:['N1','B']},P3:{g1:['A'],g2:['N1','B'],g3:['C'],g4:['D','N2']},P4:{g1:['A','B']}};
  return map[problem.id][slot];
}
function slotOutput(problem, slot) {
  const map = {P1:{g1:'Y'},P2:{g1:'N1',g2:'Y'},P3:{g1:'N1',g2:'D',g3:'N2',g4:'Y'},P4:{g1:'Y'}};
  return map[problem.id][slot];
}

function renderProblemList() {
  $('problemList').innerHTML = problems.map((problem,index) => `<button class="problem-item ${index===problemIndex?'selected':''}" data-problem="${index}"><b>${problem.id}　${problem.title}</b><small>${problem.level.split(' · ')[1]}</small></button>`).join('');
  document.querySelectorAll('[data-problem]').forEach(button => button.addEventListener('click', () => { problemIndex=Number(button.dataset.problem); hintCounts={}; renderPractice(); }));
}
function renderCircuit() {
  const problem = problems[problemIndex];
  const gates = currentGates();
  const svgWidth = 850, svgHeight = 250, gateWidth = 100;
  const inputPosition = Object.fromEntries(problem.inputs.map((name,index) => [name,{x:84,y:problem.inputs.length===2?(index===0?82:170):[42,122,202][index]}]));
  const sourcePoint = name => name === 'Y' ? {x:795,y:125} : problem.positions[name] ? {x:problem.positions[name].x+gateWidth,y:problem.positions[name].y} : inputPosition[name];
  const targetPoint = (slot,index,total) => {const pos=problem.positions[slot];return {x:pos.x,y:pos.y+(total===1?0:(index-(total-1)/2)*22)};};
  let wires = '';
  problem.wires.forEach(([from,to]) => {
    let start, end;
    if (from === 'A' || from === 'B' || from === 'C') start = inputPosition[from]; else start = sourcePoint(from);
    if (to === 'Y') end = {x:775,y:125};
    else {const names=slotInputs(problem,to);const portIndex=names.indexOf(from);end=targetPoint(to,Math.max(portIndex,0),names.length);}
    const middle=(start.x+end.x)/2;
    wires += `<path class="wire" data-wire="${from}-${to}" d="M ${start.x} ${start.y} C ${middle} ${start.y}, ${middle} ${end.y}, ${end.x} ${end.y}"/>`;
  });
  let inputNodes = '';
  problem.inputs.forEach((name,index) => {
    const y=inputPosition[name].y;
    inputNodes += `<text class="diagram-label" x="20" y="${y+4}">${name}</text><circle class="value-node" cx="64" cy="${y}" r="17"/><text class="value-text" x="64" y="${y+5}">${inputValues[name]}</text>`;
  });
  const gateNodes = problem.slots.map(slot => {
    const pos=problem.positions[slot],gate=gates[slot];
    return `<g class="gate-slot" data-slot="${slot}" data-gate="${gate}" tabindex="0" role="button" aria-label="${slot}ゲート。押して変更"><rect x="${pos.x}" y="${pos.y-27}" width="${gateWidth}" height="54" rx="13"/><text class="gate-text" x="${pos.x+gateWidth/2}" y="${pos.y+5}">${gate}</text></g>`;
  }).join('');
  $('circuit').innerHTML = `<svg viewBox="0 0 ${svgWidth} ${svgHeight}" role="img" aria-label="${problem.title}の信号経路"><defs><marker id="arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="#9aada0"/></marker></defs>${wires}${inputNodes}${gateNodes}<circle class="output-node" cx="810" cy="125" r="20"/><text class="diagram-label output-label" x="810" y="130">Y</text><circle id="movingBit" class="moving-bit" r="11" visibility="hidden"/><text id="movingBitText" class="moving-bit-text" visibility="hidden">0</text></svg><div class="diagram-key"><span><i class="key-dot zero"></i>0：信号なし</span><span><i class="key-dot one"></i>1：信号あり</span><span>線の矢印に沿って計算します</span></div>`;
  document.querySelectorAll('.gate-slot').forEach(gateElement => {
    const change = () => {
      const oldGate=gateElement.dataset.gate;
      gateElement.dataset.gate=gateTypes[(gateTypes.indexOf(oldGate)+1)%gateTypes.length];
      gateElement.querySelector('.gate-text').textContent=gateElement.dataset.gate;
      renderTruthTable();
    };
    gateElement.addEventListener('click',change);
    gateElement.addEventListener('keydown',event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();change();}});
  });
}

function allRows() {
  const problem=problems[problemIndex],rows=[];
  for(let bits=0;bits<2**problem.inputs.length;bits++){
    const input=Object.fromEntries(problem.inputs.map((name,index)=>[name,(bits>>(problem.inputs.length-index-1))&1]));
    rows.push({input,actual:evaluateCircuit(problem,currentGates(),input).output,target:evaluateCircuit(problem,problem.target,input).output});
  }
  return rows;
}
function renderTruthTable() {
  const problem=problems[problemIndex],rows=allRows();
  $('truthHead').innerHTML=problem.inputs.map(name=>`<th>${name}</th>`).join('')+'<th>目標Y</th><th>自分のY</th><th>判定</th>';
  $('truthBody').innerHTML=rows.map(row=>`<tr>${problem.inputs.map(name=>`<td>${row.input[name]}</td>`).join('')}<td>${row.target}</td><td>${row.actual}</td><td class="${row.actual===row.target?'match':'mismatch'}">${row.actual===row.target?'○':'×'}</td></tr>`).join('');
  const correct=rows.every(row=>row.actual===row.target);
  $('truthVerdict').textContent=correct?'全パターン正解':'目標と違う組み合わせがあります';
  $('truthVerdict').classList.toggle('pill-good',correct);
  return correct;
}
function renderPractice() {
  const problem=problems[problemIndex];
  $('problemLevel').textContent=problem.level;$('problemTitle').textContent=problem.title;$('problemPrompt').textContent=problem.prompt;$('problemCount').textContent=`問題 ${problemIndex+1} / ${problems.length}`;
  $('inputControls').innerHTML=problem.inputs.map(name=>`<label class="bit-control"><span>${name}</span><select data-input="${name}"><option value="0" ${inputValues[name]===0?'selected':''}>0</option><option value="1" ${inputValues[name]===1?'selected':''}>1</option></select></label>`).join('');
  document.querySelectorAll('[data-input]').forEach(select=>select.addEventListener('change',()=>{inputValues[select.dataset.input]=Number(select.value);renderCircuit();}));
  renderProblemList();renderCircuit();renderTruthTable();
  $('actualOutput').textContent='—';$('targetOutput').textContent='—';$('runVerdict').textContent='未判定';$('runVerdict').className='verdict';
  $('animationMessage').textContent='入力を選び、「回路を実行」を押してください。';$('hintText').textContent='段階が進むほど、答えに近づくヒントです。';$('hintStatus').textContent='必要なときに開いてください';
}

function animatePath(path, bit) {
  return new Promise(resolve=>{
    if(!path){resolve();return;}
    const circle=$('movingBit'),text=$('movingBitText'),length=path.getTotalLength(),start=performance.now(),duration=650;
    circle.setAttribute('visibility','visible');text.setAttribute('visibility','visible');circle.classList.add('moving');
    function frame(now){const progress=Math.min((now-start)/duration,1),point=path.getPointAtLength(length*progress);circle.setAttribute('cx',point.x);circle.setAttribute('cy',point.y);text.setAttribute('x',point.x);text.setAttribute('y',point.y+4);text.textContent=bit;if(progress<1)requestAnimationFrame(frame);else{circle.classList.remove('moving');resolve();}}
    requestAnimationFrame(frame);
  });
}
async function runCircuit() {
  const problem=problems[problemIndex],gates=currentGates(),calculated=evaluateCircuit(problem,gates,inputValues),target=evaluateCircuit(problem,problem.target,inputValues);
  $('runButton').disabled=true;
  for(const step of calculated.steps){
    const gate=document.querySelector(`[data-slot="${step.slot}"]`),pos=problem.positions[step.slot];
    gate.classList.add('gate-active');
    for(let i=0;i<step.names.length;i++){
      const sourceSlot=problem.slots.find(slot=>slotOutput(problem,slot)===step.names[i]);
      const sourceName=sourceSlot||step.names[i];
      const path=document.querySelector(`[data-wire="${sourceName}-${step.slot}"]`);
      if(path){path.classList.add('wire-active');await animatePath(path,step.values[i]);path.classList.remove('wire-active');}
    }
    $('animationMessage').textContent=`${step.gate}の前で確認：${step.names.map((name,index)=>`${name}=${step.values[index]}`).join('、')}`;
    await new Promise(resolve=>setTimeout(resolve,450));
    $('animationMessage').textContent=`${step.gate}ゲートの計算結果は ${step.output} です。`;
    await new Promise(resolve=>setTimeout(resolve,450));
    const outgoing=problem.wires.find(([from])=>from===step.slot);
    if(outgoing){const path=document.querySelector(`[data-wire="${outgoing[0]}-${outgoing[1]}"]`);if(path){path.classList.add('wire-active');await animatePath(path,step.output);path.classList.remove('wire-active');}}
    gate.classList.remove('gate-active');
  }
  $('actualOutput').textContent=calculated.output;$('targetOutput').textContent=target.output;
  const correct=renderTruthTable();
  $('runVerdict').textContent=correct?'回路全体が正解':'回路を見直そう';$('runVerdict').className='verdict '+(correct?'good':'bad');
  $('animationMessage').textContent=`この入力の出力は ${calculated.output}。目標の出力は ${target.output} です。`;
  logEvent('run',{input:{...inputValues},output:calculated.output,target:target.output,correct,gates,hints:Object.values(hintCounts).reduce((sum,count)=>sum+count,0)});
  $('runButton').disabled=false;
}
$('runButton').addEventListener('click',runCircuit);
document.querySelectorAll('[data-hint]').forEach(button=>button.addEventListener('click',()=>{const level=Number(button.dataset.hint),problem=problems[problemIndex];hintCounts[level]=(hintCounts[level]||0)+1;$('hintText').textContent=`ヒント ${level+1}：${problem.hints[level]}`;$('hintStatus').textContent=`${level+1}段階目を表示中`;logEvent('hint',{hintLevel:level+1});}));
$('consultButton').addEventListener('click',()=>{const message=$('consultText').value.trim();if(!message){$('consultText').focus();return;}logEvent('consult',{message});$('consultText').value='';$('animationMessage').textContent='相談を送りました。先生に確認してもらいましょう。';});

renderPractice();

