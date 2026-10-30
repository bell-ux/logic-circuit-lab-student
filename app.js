// 授業用スプレッドシートへの接続先。生徒に入力させる必要はありません。
const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzXBhfwTNkOTqxv7IntzelggV6Mk_sHjMIiglwIPBray8MbIJP0OjRvEFHyjTlWGj8u/exec';
const LOG_KEY = 'logicLabRecords';

const problems = [
  {id:'P1', title:'AND回路', level:'01 · 基本', prompt:'AとBの両方が1のときだけ、出力が1になる回路を作ろう。', inputs:['A','B'], slots:['g1'], positions:{g1:{x:360,y:120}}, wires:[['A','g1'],['B','g1'],['g1','Y']], target:{g1:'AND'}, hints:['ANDは、2つの入力が両方1のときに1を出します。','片方でも0なら、出力はどうなるでしょう？','AとBをそのままANDゲートにつなぎます。']},
  {id:'P2', title:'条件に合う回路', level:'02 · 標準', prompt:'A=0、B=1のとき、出力Yを1にしよう。条件を満たす回路は複数あります。', requiredTest:{input:{A:0,B:1},output:1}, inputs:['A','B'], slots:['g1','g2'], positions:{g1:{x:230,y:62},g2:{x:530,y:122}}, wires:[['A','g1'],['g1','g2'],['B','g2'],['g2','Y']], target:{g1:'NOT',g2:'OR'}, hints:['NOTゲートは入力の0と1を反対にします。','AをNOTにした結果とBをORに入れると、条件を満たします。','NOT＋ORは答えの一例です。別のゲートの組み合わせも試せます。']},
  {id:'P3', title:'NANDだけで条件回路を作る', level:'03 · 発展', prompt:'AとBが両方1、またはCとDが両方1で、さらにEも1のときだけ、Yを0にしよう。ほかの組み合わせではY=1です。4つのゲートをすべてNANDにします。', inputs:['A','B','C','D','E'], slots:['g1','g2','g3','g4'], positions:{g1:{x:220,y:52},g2:{x:220,y:200},g3:{x:430,y:125},g4:{x:640,y:125}}, wires:[['A','g1'],['B','g1'],['C','g2'],['D','g2'],['g1','g3'],['g2','g3'],['g3','g4'],['E','g4'],['g4','Y']], target:{g1:'NAND',g2:'NAND',g3:'NAND',g4:'NAND'}, hints:['AとB、CとDの2組に分けます。最後にEの値も使います。','最初の2つのNAND出力を次のNANDに入れると、2組のAND条件の「どちらか」を表せます。','最後はその値とEをNANDに入れます。出力が0になるのは、条件が成立しE=1のときです。']},
  {id:'P4', title:'NAND回路', level:'04 · 発展', prompt:'ANDの結果を反転するNAND回路を作ろう。', inputs:['A','B'], slots:['g1'], positions:{g1:{x:360,y:120}}, wires:[['A','g1'],['B','g1'],['g1','Y']], target:{g1:'NAND'}, hints:['NANDはANDの出力を反転します。','ANDが1になる入力はどの組み合わせでしょう？','AとBをNANDゲートにつなぎます。']}
];
let publishedAnswers = {};
let answersLoaded = false;
let problemIndex = 0;
let inputValues = {A:0, B:0, C:0};
let hintCounts = {};

const $ = id => document.getElementById(id);
const studentId = $('studentId');
function getSavedStudentId() {
  try { return localStorage.getItem('logicLabStudentId') || ''; }
  catch (error) { return ''; }
}
function saveStudentId(value) {
  try { localStorage.setItem('logicLabStudentId', value); }
  catch (error) { /* 保存できなくても、このタブでの学習は続けられます。 */ }
}
studentId.value = getSavedStudentId();

function requestJsonp(parameters, prefix) {
  return new Promise((resolve, reject) => {
    const callback = prefix + Date.now();
    const script = document.createElement('script');
    const timer = setTimeout(() => finish(new Error('timeout')), 10000);
    function finish(error, data) {
      clearTimeout(timer); delete window[callback]; script.remove();
      if (error) reject(error); else resolve(data);
    }
    window[callback] = data => data && data.ok === true ? finish(null, data) : finish(new Error('denied'));
    script.onerror = () => finish(new Error('network'));
    script.src = SCRIPT_URL + '?' + new URLSearchParams({...parameters, callback}).toString();
    document.body.appendChild(script);
  });
}
async function refreshPublishedAnswers() {
  $('answerReleaseStatus').textContent = '公開状況を確認しています…';
  try {
    const data = await requestJsonp({mode:'publishedAnswers'}, 'logicStudentAnswers');
    publishedAnswers = Object.fromEntries((data.answers || []).map(item => [item.problem, item.text]));
    answersLoaded = true; renderPublishedAnswer();
  } catch (error) {
    answersLoaded = false; publishedAnswers = {};
    renderPublishedAnswer('公開状況を取得できません。ページを再読み込みして、もう一度確認してください。');
  }
}
function renderPublishedAnswer(message) {
  const answer = publishedAnswers[problems[problemIndex].id];
  $('answerReleaseStatus').textContent = message || (answersLoaded ? answer ? '先生がこの問題の答えを公開しています。' : 'この問題の答えはまだ公開されていません。' : '公開状態を確認してください。');
  $('showPublishedAnswer').hidden = !answer;
  $('publishedAnswerText').hidden = true;
  $('publishedAnswerText').textContent = answer || '';
  $('showPublishedAnswer').textContent = '答えを見る';
}

function logEvent(type, extra = {}) {
  const row = {time:new Date().toISOString(), studentId:studentId.value.trim(), problem:problems[problemIndex].id,
    title:problems[problemIndex].title, type, ...extra};
  try {
    const saved = JSON.parse(localStorage.getItem(LOG_KEY) || '[]');
    saved.unshift(row);
    localStorage.setItem(LOG_KEY, JSON.stringify(saved.slice(0,300)));
  } catch (error) {
    // 保存領域が使えない場合も、スプレッドシートへの送信は続けます。
  }
  fetch(SCRIPT_URL, {method:'POST', mode:'no-cors', headers:{'Content-Type':'text/plain;charset=utf-8'}, body:JSON.stringify(row)}).catch(() => {});
}

$('entryForm').addEventListener('submit', event => {
  event.preventDefault();
  const value = studentId.value.trim();
  if (!/^\d{1,12}$/.test(value)) { $('entryError').textContent = '数字の出席番号を入力してください。'; return; }
  $('currentStudentId').textContent = value;
  $('entryScreen').hidden = true;
  $('lessonScreen').hidden = false;
  saveStudentId(value);
});
$('changeNumber').onclick = () => { $('lessonScreen').hidden = true; $('entryScreen').hidden = false; studentId.focus(); };
document.querySelectorAll('.tab').forEach(button => button.addEventListener('click', () => showView(button.dataset.view)));
document.querySelectorAll('[data-go-practice]').forEach(button => button.addEventListener('click', () => showView('practice')));
function showView(view) {
  $('lectureView').hidden = view !== 'lecture';
  $('practiceView').hidden = view !== 'practice';
  document.querySelectorAll('.tab').forEach(tab => tab.classList.toggle('active', tab.dataset.view === view));
}
$('showPublishedAnswer').addEventListener('click', () => { $('publishedAnswerText').hidden = false; });

function evaluateGate(type, values) {
  if (type === 'NOT') return 1 - values[0];
  if (type === 'AND') return values.every(value => value === 1) ? 1 : 0;
  if (type === 'OR') return values.some(value => value === 1) ? 1 : 0;
  if (type === 'NAND') return values.every(value => value === 1) ? 0 : 1;
  return 0;
}
function gatesForSlot(problem, slot) {
  return slotInputs(problem, slot).length === 1 ? ['NOT'] : ['AND','OR','NAND'];
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
  const map = {P1:{g1:['A','B']},P2:{g1:['A'],g2:['N1','B']},P3:{g1:['A','B'],g2:['C','D'],g3:['N1','N2'],g4:['S','E']},P4:{g1:['A','B']}};
  return map[problem.id][slot];
}
function slotOutput(problem, slot) {
  const map = {P1:{g1:'Y'},P2:{g1:'N1',g2:'Y'},P3:{g1:'N1',g2:'N2',g3:'S',g4:'Y'},P4:{g1:'Y'}};
  return map[problem.id][slot];
}

function renderProblemList() {
  $('problemList').innerHTML = problems.map((problem,index) => `<button class="problem-item ${index===problemIndex?'selected':''}" data-problem="${index}"><b>${problem.id}　${problem.title}</b><small>${problem.level.split(' · ')[1]}</small></button>`).join('');
  document.querySelectorAll('[data-problem]').forEach(button => button.addEventListener('click', () => { problemIndex=Number(button.dataset.problem); hintCounts={}; renderPractice(); }));
}
function renderCircuit() {
  const problem = problems[problemIndex];
  const gates = currentGates();
  const svgWidth = 850, svgHeight = problem.inputs.length > 3 ? 270 : 250, gateWidth = 100;
  const inputPosition = Object.fromEntries(problem.inputs.map((name,index) => {
    const defaults = problem.inputs.length===2 ? [82,170] : [42,122,202];
    const y = problem.inputs.length <= 3 ? defaults[index] : 26 + index * (svgHeight - 52) / (problem.inputs.length - 1);
    return [name,{x:84,y}];
  }));
  const sourcePoint = name => name === 'Y' ? {x:795,y:125} : problem.positions[name] ? {x:problem.positions[name].x+gateWidth,y:problem.positions[name].y} : inputPosition[name];
  const targetPoint = (slot,index,total) => {const pos=problem.positions[slot];return {x:pos.x,y:pos.y+(total===1?0:(index-(total-1)/2)*22)};};
  let wires = '';
  problem.wires.forEach(([from,to]) => {
    let start, end;
    if (problem.inputs.includes(from)) start = inputPosition[from]; else start = sourcePoint(from);
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
      const choices=gatesForSlot(problem, gateElement.dataset.slot);
      gateElement.dataset.gate=choices[(choices.indexOf(oldGate)+1)%choices.length];
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
    const actual=evaluateCircuit(problem,currentGates(),input).output;
    const required=problem.requiredTest && problem.inputs.every(name=>input[name]===problem.requiredTest.input[name]);
    rows.push({input,actual,target:problem.requiredTest?(required?problem.requiredTest.output:null):evaluateCircuit(problem,problem.target,input).output});
  }
  return rows;
}
function renderTruthTable() {
  const problem=problems[problemIndex],rows=allRows();
  $('truthHead').innerHTML=problem.inputs.map(name=>`<th>${name}</th>`).join('')+'<th>目標Y</th><th>自分のY</th><th>判定</th>';
  $('truthBody').innerHTML=rows.map(row=>{const applicable=row.target!==null;return `<tr>${problem.inputs.map(name=>`<td>${row.input[name]}</td>`).join('')}<td>${applicable?row.target:'—'}</td><td>${row.actual}</td><td class="${!applicable?'':row.actual===row.target?'match':'mismatch'}">${!applicable?'対象外':row.actual===row.target?'○':'×'}</td></tr>`;}).join('');
  const correct=problem.requiredTest?evaluateCircuit(problem,currentGates(),problem.requiredTest.input).output===problem.requiredTest.output:rows.every(row=>row.actual===row.target);
  $('truthVerdict').textContent=correct?(problem.requiredTest?'指定条件クリア':'全パターン正解'):(problem.requiredTest?'指定条件を見直そう':'目標と違う組み合わせがあります');
  $('truthVerdict').classList.toggle('pill-good',correct);
  renderPublishedAnswer();
  return correct;
}
function renderPractice() {
  const problem=problems[problemIndex];
  problem.inputs.forEach(name => { if (!(name in inputValues)) inputValues[name]=0; });
  if(problem.requiredTest) inputValues={...inputValues,...problem.requiredTest.input};
  $('problemLevel').textContent=problem.level;$('problemTitle').textContent=problem.title;$('problemPrompt').textContent=problem.prompt;$('problemCount').textContent=`問題 ${problemIndex+1} / ${problems.length}`;
  $('inputControls').innerHTML=problem.inputs.map(name=>`<label class="bit-control"><span>${name}</span><select data-input="${name}" ${problem.requiredTest?'disabled':''}><option value="0" ${inputValues[name]===0?'selected':''}>0</option><option value="1" ${inputValues[name]===1?'selected':''}>1</option></select></label>`).join('');
  document.querySelectorAll('[data-input]').forEach(select=>select.addEventListener('change',()=>{inputValues[select.dataset.input]=Number(select.value);renderCircuit();}));
  renderProblemList();renderCircuit();renderTruthTable();renderPublishedAnswer();renderPublishedAnswer();
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
  const problem=problems[problemIndex],gates=currentGates(),testInput=problem.requiredTest?problem.requiredTest.input:inputValues,calculated=evaluateCircuit(problem,gates,testInput),targetOutput=problem.requiredTest?problem.requiredTest.output:evaluateCircuit(problem,problem.target,testInput).output;
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
  $('actualOutput').textContent=calculated.output;$('targetOutput').textContent=targetOutput;
  const correct=renderTruthTable();
  $('runVerdict').textContent=correct?(problem.requiredTest?'指定条件クリア':'回路全体が正解'):'回路を見直そう';$('runVerdict').className='verdict '+(correct?'good':'bad');
  $('animationMessage').textContent=`この入力の出力は ${calculated.output}。目標の出力は ${targetOutput} です。`;
  logEvent('run',{input:{...testInput},output:calculated.output,target:targetOutput,correct,gates,hints:Object.values(hintCounts).reduce((sum,count)=>sum+count,0)});
  $('runButton').disabled=false;
}
$('runButton').addEventListener('click',runCircuit);
$('checkPublishedAnswers').addEventListener('click',refreshPublishedAnswers);
$('showPublishedAnswer').addEventListener('click',()=>{
  const text=$('publishedAnswerText'); text.hidden=!text.hidden;
  $('showPublishedAnswer').textContent=text.hidden?'答えを見る':'答えを隠す';
});
document.querySelectorAll('[data-hint]').forEach(button=>button.addEventListener('click',()=>{const level=Number(button.dataset.hint),problem=problems[problemIndex];hintCounts[level]=(hintCounts[level]||0)+1;$('hintText').textContent=`ヒント ${level+1}：${problem.hints[level]}`;$('hintStatus').textContent=`${level+1}段階目を表示中`;logEvent('hint',{hintLevel:level+1});}));
$('consultButton').addEventListener('click',()=>{const message=$('consultText').value.trim();if(!message){$('consultText').focus();return;}logEvent('consult',{message});$('consultText').value='';$('animationMessage').textContent='相談を送りました。先生に確認してもらいましょう。';});

renderPractice();
refreshPublishedAnswers();

