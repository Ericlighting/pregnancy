'use strict';
(() => {
  const P = window.BabyPlan;
  let state = P.defaults(), step = 0, report = null, imageUrl = null;
  const app = document.getElementById('app'), status = document.getElementById('status');
  const names = ['你们的想法', '经济底气', '照护队友', '预算与偏好'];
  const esc = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'}[c]));
  const money = n => n === null || n === undefined ? '待补充' : '¥' + Math.round(n).toLocaleString('zh-CN');
  const opts = {unknown: '还没确认', yes: '已确认', no: '暂不具备'};
  function select(key, label, options, hint = '') {
    return `<div class="field"><label for="${key}">${label}</label><select id="${key}" name="${key}">${Object.entries(options).map(([v,t]) => `<option value="${v}" ${state[key] === v ? 'selected' : ''}>${t}</option>`).join('')}</select><small>${hint}</small></div>`;
  }
  function number(key, label, hint = '不清楚可留空；没有这项请填0', max = 10000000, min = 0, integer = false) {
    return `<div class="field"><label for="${key}">${label}</label><input id="${key}" name="${key}" type="number" inputmode="decimal" min="${min}" max="${max}" step="${integer ? 1 : 'any'}" value="${esc(state[key])}"><small>${hint}</small></div>`;
  }
  function month(key, label, hint = '') {
    return `<div class="field"><label for="${key}">${label}</label><input type="month" id="${key}" name="${key}" min="2026-01" max="2031-12" value="${esc(state[key])}"><small>${hint}</small></div>`;
  }
  const section = (title, content, hint = '') => `<div class="subcard"><h3>${title}</h3>${hint ? `<p class="hint">${hint}</p>` : ''}<div class="grid">${content}</div></div>`;
  function stash() {
    const form = document.getElementById('form');
    if (!form) return;
    for (const [key, value] of new FormData(form)) if (!['avoidSelf', 'avoidFamily', 'respectFamily'].includes(key)) state[key] = value;
    if (step === 3) {
      state.avoidSelf = [...form.querySelectorAll('[name="avoidSelf"]:checked')].map(x => x.value);
      state.avoidFamily = [...form.querySelectorAll('[name="avoidFamily"]:checked')].map(x => x.value);
      state.respectFamily = form.querySelector('[name="respectFamily"]').checked;
    }
  }
  function parent(side) {
    const label = side === 'M' ? '男方父母' : '女方父母';
    return section(label, select('parent' + side, '本人是否愿意提供照护？', {unknown: '尚未明确问过', yes: '本人明确愿意', no: '不参与／不方便'}) +
      (state['parent' + side] === 'yes' ? select('ability' + side, '精力、健康与距离是否允许？', {unknown: '还需沟通确认', yes: '本人确认目前可安排', no: '暂不允许'}, '不根据年龄猜测照护能力。') + number('days' + side, '每周约可帮几天', '0—7天；不与其他人的天数简单相加', 7) + number('duration' + side, '出生后预计支持几个月', '支持结束后需要接续安排', 60, 0, true) + number('last' + side, '最晚可支持哪年出生的宝宝', '只填写家人明确讨论过的年份；未来需再次确认', 2030, 2026, true) : ''), '尚未承诺的支持，不算确定人手。');
  }
  function fields() {
    if (step === 0) return section('先说说你们自己', select('parity', '这次考虑', {first: '一胎', second: '二胎'}) + select('pregnant', '目前是否已经怀孕？', {no: '尚未怀孕／未确认', yes: '已经怀孕'}) + (state.pregnant === 'yes' ? month('due', '医生提供的预产月份', '仅用于预算对齐，不预测实际出生日期。') : '') + number('ageM', '男方当前周岁（选填）', '仅作沟通背景，不打年龄分', 80, 18, true) + number('ageF', '女方当前周岁（选填）', '仅作沟通背景，不判断生育能力', 80, 18, true)) + section('不必急着达成一致', select('willM', '男方对近期生育的想法', {unknown: '尚未讨论／不确定', yes: '愿意开始准备', concern: '愿意，但仍有顾虑', no: '暂时不想'}) + select('willF', '女方对近期生育的想法', {unknown: '尚未讨论／不确定', yes: '愿意开始准备', concern: '愿意，但仍有顾虑', no: '暂时不想'}) + select('concern', '此刻最想被理解的担心', {care: '怕照护主要落在一个人身上', money: '怕钱不够、生活没余地', career: '怕职业和自己的节奏受影响', pressure: '家人的期待让我有压力', recovery: '在意身体恢复和精力', unsure: '还说不清，就是有点犹豫'}) + select('consult', state.pregnant === 'yes' ? '个人健康及产检安排' : '孕前咨询与个人时间安排', {pending: '尚未咨询／仍有疑问', booked: '已预约，尚未明确', done: '已与医务人员讨论，目前无待答疑问'}, '仅记录咨询状态，不等于医学许可。涉及健康、用药、既往恢复等请咨询医生。')) + (state.parity === 'second' ? section('给大宝和现在的自己留个位置', number('bigAge', '大宝当前周岁', '用于年份对照，不自动假设入学后更省心', 25) + number('bigCost', '大宝现有月均支出（元）', '单独填写，不再计入下一步“其他必要支出”') + select('bigCare', '增加一个孩子后的大宝照护', {unknown: '还没有具体安排', yes: '已明确分工和接续', no: '主要照护者暂时分身乏术'}) + select('fatigue', '主要照护者目前的精力', {unknown: '还没认真讨论', manageable: '目前可承担，仍会留休息时间', tired: '已经明显疲惫，需要支持'})) : '');
    if (step === 1) return section('收入与可用资金', number('incomeM', '男方税后月收入（元）') + number('incomeF', '女方税后月收入（元）') + number('savings', '家庭可动用存款（元）', '双方愿意共同用于此计划的现金；不含房产估值、借款和未承诺的父母资助') + select('housing', '居住安排是否已落实？', {unknown: '还不确定', yes: '已有可稳定使用的安排（含租房）', no: '需要先解决搬家或居住问题'})) + section('已有的每月支出', number('living', '其他必要生活支出（元／月）', '含房租；不含还贷、大宝支出、新宝宝支出，避免重复') + number('debt', '每月还贷及债务支出（元）', '包含房贷等；无则填0') + select('jobM', '男方收入情况', {unknown: '还需估算', stable: '相对稳定', variable: '有波动（请按保守月收入填）'}) + select('jobF', '女方收入情况', {unknown: '还需估算', stable: '相对稳定', variable: '有波动（请按保守月收入填）'})) + section('休假时，账单会怎样变化？', number('lossM', '男方预计每月少收入（元）', '填减少额，不是剩余收入；不代查各地政策') + number('lossF', '女方预计每月少收入（元）') + number('leaveMonths', '收入减少持续几个月', '简化为双方同一时段，出生后开始；0—12个月', 12, 0, true) + number('buffer', '希望保留几个月支出作缓冲', '默认6个月只是可修改的演示目标，不是生育门槛', 24, 0, true)) + `<details ${state.change === 'yes' ? 'open' : ''}><summary>有已经确定的收入／支出变化？（可选）</summary><div class="grid">${select('change', '是否纳入一次确定变化', {no: '不纳入，按现状不变', yes: '有已确定的安排'})}${state.change === 'yes' ? month('changeMonth', '从哪个月生效') + number('incomeDelta', '家庭每月收入变化（元）', '增加填正数，减少填负数；不填预测涨薪', 1000000, -1000000) + number('expenseDelta', '家庭每月必要支出变化（元）', '如租金变化；不含新宝宝费用，减少填负数', 1000000, -1000000) : ''}</div></details>`;
    if (step === 2) return section('你们才是照护计划的主角', select('dayPlan', '白天主要依靠哪种安排？', {unknown:'尚未确定',couple:'夫妻自行安排',parents:'主要依靠父母',paid:'主要依靠付费照护',mixed:'夫妻与父母／付费服务配合'}) + number('hoursM', '男方每天能用于照护的小时数', '只用于讨论分工，不用小时数判定“够不够”', 24) + number('hoursF', '女方每天能用于照护的小时数', '注意工作、休息与恢复，不假定女方全天承担', 24) + select('schedule', '全天照护及交接是否明确？', {unknown: '尚未排出安排', yes: '白天、空档和支持结束后的接续已商量', no: '仍有时段无人接续'}) + select('night', '夜间分工和主要照护者休息', {unknown: '尚未讨论', yes: '已讨论有人接替、能够休息', no: '暂时主要靠一个人'})) + parent('M') + parent('F') + section('付费照护也可以是队友', select('paid', '是否计划付费照护', {none: '暂不使用', nanny: '育儿嫂', nursery: '托育'}) + (state.paid !== 'none' ? select('paidConfirmed', '安排是否确认', {unknown: '只是考虑，还没落实', yes: '已了解服务与接入条件', no: '暂时没有合适服务'}) + number('paidStart', '预计宝宝几月龄开始接入', '如托育需核实接收月龄；接入前需其他人照护', 36, 0, true) + number('paidCost', '预计每月照护费（元）', '自行询价，不维护城市报价；报告按全年12个月预留，偏保守') : ''));
    const animals = ['蛇','马','羊','猴','鸡','狗'];
    const checks = (key, label) => `<fieldset class="subcard"><legend>${label}</legend><div class="checks">${animals.map(a => `<label><input type="checkbox" name="${key}" value="${a}" ${state[key].includes(a) ? 'checked' : ''}>${a}</label>`).join('')}</div><p class="small">不介意则不勾选；这是偏好，不是吉凶评价。春节前可能属于上一生肖。</p></fieldset>`;
    return `<p class="note">以下金额只是方便试算的假设，不是全国均价或当地报价。点击模板会替换下方两项金额，可以继续修改。</p><div class="export-tools"><button type="button" class="btn secondary" data-preset="low">节省假设</button><button type="button" class="btn secondary" data-preset="mid">中等假设</button><button type="button" class="btn secondary" data-preset="high">较高支出假设</button></div><p class="small">当前来源：${esc(state.budgetSource)}</p>` + section('给新宝宝单独列一笔账', number('baseCost', '新增宝宝月均费用（元）', '不含大宝、付费照护及一次性费用；可填自己的估算') + number('onceCost', '一次性准备费用（元）', '自行估算用品及孕产相关自付支出；预留额不代表医疗报价')) + (state.pregnant !== 'yes' ? section('给准备留出时间', number('lead', '从现在到期望出生的规划提前量（月）', '默认12个月，可设9—36；仅为筛选时间的预算假设，不预测受孕或推荐尝试日期', 36, 9, true)) : '<p class="note">已怀孕：按提供的预产月份准备，不因生肖调整孕产安排。</p>') + checks('avoidSelf','你们本人介意的出生生肖') + checks('avoidFamily','家人介意的出生生肖（单独记录）') + `<label class="hint"><input type="checkbox" name="respectFamily" ${state.respectFamily ? 'checked' : ''}> 本次比较也纳入家人偏好（默认不纳入）</label><p class="hint">报告仍保留“不考虑生肖”的方案。健康咨询、双方意愿不会被年份偏好覆盖。</p>`;
  }
  function render(focus = false) {
    report = null;
    status.textContent = '';
    document.getElementById('steps').innerHTML = names.map((n,i) => `<li class="${i === step ? 'active' : ''}"><span>${i+1}</span>${n}</li>`).join('');
    app.innerHTML = `<p class="eyebrow">STEP 0${step + 1} / 04</p><h2 tabindex="-1">${names[step]}</h2><p class="hint">不确定可以如实保留。空白不会被当作“没有费用”或“已经准备好”。</p><form id="form">${fields()}<div class="controls"><button type="button" class="btn secondary" id="back" ${step === 0 ? 'disabled' : ''}>上一步</button><button type="submit" class="btn">${step === 3 ? '看看我的从容计划' : '下一步'}</button></div></form>${step === 0 ? '<button class="plain" id="demo" type="button">填入一份虚构示例</button>' : ''}`;
    document.getElementById('form').onsubmit = event => {event.preventDefault(); stash(); if (step < 3) {step++; render(true);} else showReport();};
    document.getElementById('back').onclick = () => {stash(); if (step > 0) {step--; render(true);}};
    for (const key of ['parity','pregnant','change','parentM','parentF','paid']) {
      document.getElementById(key)?.addEventListener('change', () => {stash(); render(); document.getElementById(key)?.focus();});
    }
    app.querySelectorAll('[data-preset]').forEach(b => b.onclick = () => {
      stash(); const options = {low: [1500,10000,'节省假设'], mid: [3000,20000,'中等假设'], high: [5000,40000,'较高支出假设']};
      const [base,once,label] = options[b.dataset.preset]; state.baseCost=base; state.onceCost=once; state.budgetSource=label+'（演示数值，非市场报价）'; render();
    });
    for (const key of ['baseCost','onceCost']) document.getElementById(key)?.addEventListener('input', () => {state.budgetSource='用户自行填写／修改';});
    document.getElementById('demo')?.addEventListener('click', () => {
      if (Object.keys(state).some(k => ['incomeM','incomeF','savings'].includes(k) && state[k] !== '') && !confirm('示例会替换当前填写内容，继续吗？')) return;
      state = {...P.defaults(), ageM:32, ageF:30, willM:'yes', willF:'yes', consult:'done', incomeM:12000,incomeF:10000,savings:160000,living:6500,debt:3000,jobM:'stable',jobF:'stable',housing:'yes',lossM:0,lossF:3000,leaveMonths:6,hoursM:4,hoursF:4,dayPlan:'parents',schedule:'yes',night:'yes',parentM:'no',parentF:'yes',abilityF:'yes',daysF:3,durationF:12,lastF:2028,baseCost:3000,onceCost:20000,budgetSource:'虚构示例',avoidFamily:['羊']}; render(); status.textContent='已填入虚构示例，请按自己的实际情况修改。';
    });
    if (focus) focusTop();
  }
  function focusTop() {app.querySelector('[tabindex="-1"]')?.focus({preventScroll:true}); app.scrollIntoView({block:'start'});}
  function review(title, ok, unknown, text) {return `<div class="review"><span class="tag ${ok ? 'good' : unknown ? 'unknown' : 'wait'}">${ok ? '已有支持' : unknown ? '信息待补充' : '需要商量'}</span><strong>${title}</strong><p>${esc(text)}</p></div>`;}
  function windowText(candidate, r, preferred = false) {
    if (r.pregnant) return `围绕填写的预产月份 ${r.due} 准备，不筛选替代出生时间。`;
    if (!candidate) return preferred ? '当前条件下没有筛出同时满足所选偏好和已填准备条件的月份；不代表不适合生育。' : '这次先不替你选年份。先补齐报告中标出的信息和支持，再比较时间。';
    const start = new Date(candidate.month + '-01T12:00:00');
    const prep = new Date(start.getFullYear(), start.getMonth() - Number(state.lead), 1);
    const current = new Date();
    const p = prep < current ? current : prep;
    return `可进一步讨论的期望出生月份：${candidate.month}。准备事项可从 ${p.getFullYear()} 年第 ${Math.floor(p.getMonth()/3)+1} 季度展开。这只是按提前量回推的行政、预算与家庭沟通安排，不是建议受孕日期。`;
  }
  function showReport() {
    stash();
    try {report = P.analyze(state);} catch(e) {status.textContent=e.message;return;}
    const r = report;
    const anyFinance = r.all.some(c => c.financial);
    const anyCare = r.all.some(c => c.care.ready);
    const familyOnly = state.avoidFamily.filter(a => !state.avoidSelf.includes(a));
    const statuses = review('双方意愿',r.agreed,state.willM==='unknown'||state.willF==='unknown',r.agreed?'双方填写为愿意开始准备；这不要求立刻实施。':'至少一方仍有顾虑、暂时不想或尚未讨论。物质条件不能替代本人意愿。') + review('现金与缓冲',r.all.some(c=>c.financial?.meets),!anyFinance,!anyFinance?'关键金额未补齐，本次不输出完整现金结论。':'按填写金额进行首年逐月试算；缓冲目标由你设置，不是生育门槛。') + review('照护与休息',anyCare,[state.dayPlan,state.schedule,state.night].includes('unknown'),'以明确分工为依据，不把父母的可能支持当成承诺，也不把多人可帮天数相加当作覆盖。') + review('个人健康沟通',r.healthReady,!r.healthReady,r.healthReady?'记录为已讨论，仍需按个人情况持续咨询，不代表系统给出医学许可。':'先进行孕前咨询／产检沟通；年龄不计分，不预测受孕概率。') + review('住房与收入信息',r.housingReady&&r.jobsKnown,state.housing==='unknown'||!r.jobsKnown,'稳定租房也属于居住安排；收入有波动时应采用保守估算。');
    const years = r.rows.map(row => {
      const c=row.first, f=c?.financial;
      const label = !c ? r.pregnant?'不在本次预产月份':'已过去或早于填写的规划提前量' : !f ? '预算信息待补充' : f.meets ? '符合自选缓冲假设' : '低于自选缓冲假设';
      const cal = row.ranges.map(x=>`${x.start.slice(5)}—${x.end.slice(5)}：${x.animal}${r.excluded.includes(x.animal)?'（所选介意项）':''}`).join('；');
      return `<article class="year"><div class="year-head"><strong>${row.year}</strong><span class="tag ${f?.meets?'good':'unknown'}">${label}</span></div><p>${cal}</p><p>年龄粗略对照：男方 ${row.ageM ?? '未填'} ／ 女方 ${row.ageF ?? '未填'}${state.parity==='second'?` ／ 大宝 ${row.bigAge ?? '未填'}`:''}（未按生日细分，不用于医学判断）</p>${c?`<p>金额示例月：${c.month}（该年最早达到自选缓冲目标的候选月；若无，则展示首个候选月）</p><div class="metrics"><div class="metric"><small>出生当月前可用现金估算</small><b>${money(f?.cash)}</b></div><div class="metric"><small>新增宝宝后常态月结余</small><b>${money(f?.monthly)}</b></div><div class="metric"><small>首年最低现金余额</small><b>${money(f?.lowest)}</b></div><div class="metric"><small>自选缓冲目标／差额</small><b>${money(f?.reserve)}</b><small>低于目标：${money(f?.gap)}</small></div></div>${f?`<p>扣除一次性准备后：${money(f.afterOnce)}；首年末：${money(f.end)}。休假损失时段月结余示例：${money(f.leaveMonthly)}。</p>`:''}`:'<p>不为这个年份推荐新的出生窗口，也不据此计算候选月金额。</p>'}<p><strong>照护状态：</strong>${row.care.ready?'已填明交接安排，临近时仍需重核':'仍需落实分工或接续安排'}</p>${row.care.details.map(t=>`<p>${esc(t)}</p>`).join('')}</article>`;
    }).join('');
    const sample = r.rows.find(row=>row.first)?.first;
    const scenarios = sample ? [['节省假设',1500,10000],['中等假设',3000,20000],['较高支出假设',5000,40000]].map(([label,base,once])=>{
      const alt = P.analyze({...state,baseCost:base,onceCost:once});
      const c = alt.all.find(x=>x.month===sample.month), f=c?.financial;
      return `<li>${label}：新增月费 ${money(base)}，一次性 ${money(once)}；同在 ${sample.month}，首年最低现金余额 ${money(f?.lowest)}。</li>`;
    }).join('') : '<li>没有范围内的候选月份，暂不计算替代预算。</li>';
    app.innerHTML = `<div class="result"><p class="eyebrow">YOUR FAMILY PLAN / ${r.now}</p><div class="lead"><h2 tabindex="-1">${r.headline}</h2><p>${r.empathy}</p></div>${r.expired?'<p class="note">本版只覆盖2026—2030，不能用于范围外的时间建议。</p>':''}${r.pregnant?'<p class="note">已怀孕：本报告不筛选替代年份，不按生肖建议改变分娩时间。如双方想法不一致或有压力，可寻求可信赖的支持和专业咨询。</p>':''}<h3>先看清已有的支持</h3>${statuses}<h3>不催促你的时间讨论</h3><div class="compare"><div><strong>不考虑生肖偏好</strong><p>${windowText(r.baseline,r)}</p></div><div><strong>考虑本次选定偏好</strong><p>${windowText(r.preferred,r,true)}</p></div></div><p class="hint">本人介意：${state.avoidSelf.join('、')||'无'}；家人介意：${state.avoidFamily.join('、')||'无'}。${state.respectFamily?'本次纳入家人偏好。':'未自动纳入家人偏好。'}${familyOnly.length?'家人与本人存在不同偏好，值得讨论，而不是默认听从其中一方。':''}</p>${!r.pregnant&&r.baseline&&r.preferred&&r.baseline.month!==r.preferred.month?`<p class="note">满足偏好后，候选月从 ${r.baseline.month} 变为 ${r.preferred.month}。预算和照护可能随等待改变；是否等待还需结合个人健康咨询，不因生肖替你作决定。</p>`:''}<p class="hint">月级筛选采取保守口径：春节跨生肖的月份，只要其中一个生肖被介意，就不作为“满足偏好”候选月。实际出生可能提前或延后，无法保证生肖。</p><h3>2026—2030 · 五年条件对照</h3>${years}<h3>接下来，先做这几件就好</h3><ol class="actions-list">${r.actions.map(t=>`<li>${t}</li>`).join('')}</ol><details><summary>如果预算不同，会怎样？</summary><p class="hint">三组演示数值，不是当地报价；只改变新宝宝基础月费与一次性准备费，付费照护仍按你填写的金额。同月比较，不挑选对某种方案更有利的日期。</p><ul class="rule-list">${scenarios}</ul></details><details><summary>计算假设与遗漏项，展开看清楚</summary><div class="rules"><p>当前预算来源：${esc(state.budgetSource)}。新宝宝基础月费 ${money(r.costs.base)}，付费照护月预留 ${money(r.costs.paid)}，一次性准备 ${money(r.costs.once)}。</p><p>出生前现金＝当前可用存款＋从下个完整月到候选月前的月结余。首年模拟12个月，减去一次性支出、新增月费和设定休假收入损失；另与自选缓冲月数×候选月家庭总月支出比较。不假定存款利息、涨薪、补贴、房价变化或家人出资。</p><p>大宝支出单列，不在其他生活费中重复；不自动假设上学后支出下降。付费照护一律按首年12个月预算预留，即使接入更晚也不自动减费，属于偏保守假设。休假损失简化为双方同一时段、出生后开始；孕期收入变化及更复杂支出需自行调整。</p><p>父母支持按本人意愿、可行性、时长和最后支持年份记录；未来健康情况不作预测。已填“接续安排明确”仍需逐项核实，并非系统证明照护充足。</p><p>“可讨论月份”必须同时满足双方愿意、咨询状态已讨论、住房安排、收入信息、照护接续及自选现金目标。它是产品规则，不是最佳生育年龄或医学建议。留空不按零处理。</p></div></details><details><summary>历法与健康信息来源</summary><p class="sources">生肖以春节切换，只作用户偏好展示：<a href="https://www.hko.gov.hk/sc/gts/time/conversion.htm" target="_blank" rel="noopener noreferrer">香港天文台公农历对照表</a>。孕前应讨论个人健康情况：<a href="https://www.cdc.gov/pregnancy/about/index.html" target="_blank" rel="noopener noreferrer">CDC 孕前规划说明</a>。页面不会自动连接这些网站。</p></details><div class="export-tools"><button id="export" class="btn">保存报告摘要长图</button><button id="edit" class="btn secondary">返回修改</button><button id="reset" class="plain">清空重新填写</button></div><p class="small">报告包含家庭经济与生育信息，分享前请确认愿意披露。长图是摘要，详细假设保留在本页。</p><div id="image-output"></div></div>`;
    status.textContent='';
    document.getElementById('edit').onclick=()=>{step=0;render(true);};
    document.getElementById('reset').onclick=()=>{if(confirm('清空当前信息并重新填写？')){state=P.defaults();step=0;render(true);}};
    document.getElementById('export').onclick=exportImage;
    focusTop();
  }
  function exportImage() {
    try {
      const r=report;
      const lines=['什么时候要宝宝，更从容？',r.now+' · 2026—2030家庭规划版',r.headline,r.empathy,'','不考虑生肖：'+windowText(r.baseline,r),'考虑所选偏好：'+windowText(r.preferred,r,true),'',...r.rows.map(row=>`${row.year}：${row.first ? `预算示例月${row.first.month}，首年最低现金 ${money(row.first.financial?.lowest)}；${row.care.ready?'接续已填明确':'照护仍需确认'}` : '不在本次候选范围'}`),'','先做这几件：',...r.actions,'','预算为用户估算／演示假设，不是报价。首年含一次性支出及收入损失，付费照护按12个月预留。','不预测受孕或出生日期；不按生肖调整医学安排。仅供家庭讨论，不是诊断或生育资格评价。','含个人敏感信息，请谨慎分享。'];
      const canvas=document.createElement('canvas'),ctx=canvas.getContext('2d');canvas.width=1000;ctx.font='28px "Microsoft YaHei",sans-serif';
      const wrapped=[];
      lines.forEach(text=>{let s='';for(const c of text){if(ctx.measureText(s+c).width>840){wrapped.push(s);s=c;}else s+=c;}wrapped.push(s);});
      canvas.height=140+wrapped.length*48;ctx.fillStyle='#f2f5fb';ctx.fillRect(0,0,1000,canvas.height);ctx.fillStyle='#23477b';ctx.fillRect(0,0,1000,16);ctx.font='28px "Microsoft YaHei",sans-serif';
      wrapped.forEach((text,i)=>{ctx.fillStyle=i<3?'#23477b':'#3e5069';ctx.fillText(text,80,90+i*48);});
      canvas.toBlob(blob=>{if(report!==r)return;if(!blob){status.textContent='图片生成失败，请截图保存。';return;}if(imageUrl)URL.revokeObjectURL(imageUrl);imageUrl=URL.createObjectURL(blob);document.getElementById('image-output').innerHTML=`<p class="hint">手机可长按图片保存，电脑点击下载。</p><a href="${imageUrl}" download="宝宝从容计划摘要.png">下载报告摘要 PNG</a><img src="${imageUrl}" alt="家庭从容计划摘要">`;status.textContent='报告摘要已生成，请注意分享隐私。';},'image/png');
    }catch{status.textContent='此浏览器暂不支持生成图片，请使用截图。';}
  }
  render();
  if(document.modelContext?.registerTool)try{Promise.resolve(document.modelContext.registerTool({name:'read_plan_status',description:'仅读取当前填写阶段及报告是否已生成，不返回敏感家庭输入。',inputSchema:{type:'object',properties:{},additionalProperties:false},annotations:{readOnlyHint:true},execute:()=>({step:step+1,reportReady:!!report})})).catch(()=>{});}catch{}
})();
