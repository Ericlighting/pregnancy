'use strict';
window.BabyPlan = (() => {
  const years = [2026, 2027, 2028, 2029, 2030];
  // 香港天文台公农历对照表；以春节为边界，不使用立春流派。
  const calendar = [
    {start: '2026-01-01', animal: '蛇'},
    {start: '2026-02-17', animal: '马'},
    {start: '2027-02-06', animal: '羊'},
    {start: '2028-01-26', animal: '猴'},
    {start: '2029-02-13', animal: '鸡'},
    {start: '2030-02-03', animal: '狗'}
  ];
  const num = v => v === '' || v === null || v === undefined || !Number.isFinite(Number(v)) ? null : Number(v);
  const monthIndex = d => d.getFullYear() * 12 + d.getMonth();
  const monthDate = n => new Date(Math.floor(n / 12), n % 12, 1, 12);
  const iso = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const ym = d => iso(d).slice(0, 7);
  const parseMonth = value => /^\d{4}-(0[1-9]|1[0-2])$/.test(value || '') ? new Date(Number(value.slice(0, 4)), Number(value.slice(5)), 0, 12) : null;
  const zodiac = date => {
    const str = typeof date === 'string' ? date : iso(date);
    if (str < '2026-01-01' || str > '2030-12-31') return null;
    return calendar.filter(c => c.start <= str).at(-1).animal;
  };
  function ranges(year, excluded = []) {
    const start = `${year}-01-01`, end = `${year}-12-31`;
    const cuts = [start, ...calendar.map(c => c.start).filter(s => s > start && s <= end)];
    return cuts.map((s, i) => {
      let e = end;
      if (cuts[i + 1]) {const d = new Date(cuts[i + 1] + 'T12:00:00'); d.setDate(d.getDate() - 1); e = iso(d);}
      return {start: s, end: e, animal: zodiac(s), allowed: !excluded.includes(zodiac(s))};
    });
  }
  function defaults() {
    return {
      parity: 'first', pregnant: 'no', due: '', ageM: '', ageF: '', willM: 'unknown', willF: 'unknown', concern: 'care', consult: 'pending',
      bigAge: '', bigCost: '', bigCare: 'unknown', fatigue: 'unknown',
      incomeM: '', incomeF: '', savings: '', living: '', debt: '', jobM: 'unknown', jobF: 'unknown', housing: 'unknown',
      lossM: '', lossF: '', leaveMonths: '', buffer: 6,
      change: 'no', changeMonth: '', incomeDelta: 0, expenseDelta: 0,
      hoursM: '', hoursF: '', dayPlan: 'unknown', schedule: 'unknown', night: 'unknown',
      parentM: 'unknown', abilityM: 'unknown', daysM: '', durationM: '', lastM: '',
      parentF: 'unknown', abilityF: 'unknown', daysF: '', durationF: '', lastF: '',
      paid: 'none', paidConfirmed: 'unknown', paidStart: '', paidCost: '',
      baseCost: '', onceCost: '', budgetSource: '未选假设', lead: 12,
      avoidSelf: [], avoidFamily: [], respectFamily: false
    };
  }
  function careFor(d, year) {
    const helpers = [], details = [];
    for (const side of ['M', 'F']) {
      const label = side === 'M' ? '男方父母' : '女方父母';
      const confirmed = d['parent' + side] === 'yes' && d['ability' + side] === 'yes';
      const days = num(d['days' + side]), duration = num(d['duration' + side]), last = num(d['last' + side]);
      const active = confirmed && days > 0 && duration > 0 && last >= year;
      if (active) helpers.push(label);
      details.push(`${label}：${active ? `已确认每周约${days}天、出生后约${duration}个月；${duration < 12 ? '不足首年，需接续安排' : '仍需临近时复核'}` : d['parent' + side] === 'no' ? '不计入照护人手' : last !== null && last < year ? '超出填写的可支持年份，不再计入' : '信息或意愿未落实，不计入确定支持'}`);
    }
    const paidReady = d.paid !== 'none' && d.paidConfirmed === 'yes' && num(d.paidCost) !== null && num(d.paidStart) !== null;
    if (d.paid !== 'none') details.push(`${d.paid === 'nanny' ? '育儿嫂' : '托育'}：${paidReady ? `计划从宝宝${d.paidStart}月龄接入` : '价格、接入月龄或安排待确认'}。接入前和非服务时段仍需照护。`);
    const adultsKnown = num(d.hoursM) !== null && num(d.hoursF) !== null;
    const adultsAvailable = (num(d.hoursM) || 0) + (num(d.hoursF) || 0) > 0;
    const usableSupport = d.dayPlan === 'couple' ? adultsAvailable : d.dayPlan === 'parents' ? helpers.length > 0 : d.dayPlan === 'paid' ? paidReady : d.dayPlan === 'mixed' ? adultsAvailable && (helpers.length > 0 || paidReady) : false;
    const ready = d.schedule === 'yes' && d.night === 'yes' && adultsKnown && usableSupport && (d.paid === 'none' || paidReady) && (d.parity !== 'second' || (d.bigCare === 'yes' && d.fatigue === 'manageable'));
    return {ready, helpers, details};
  }
  function financeAt(d, target, now, costs) {
    const keys = ['incomeM', 'incomeF', 'savings', 'living', 'debt', 'lossM', 'lossF', 'leaveMonths', 'buffer'];
    if (d.parity === 'second') keys.push('bigCost');
    if (keys.some(k => num(d[k]) === null) || costs.base === null || costs.once === null || costs.paid === null) return null;
    if (d.change === 'yes' && (!parseMonth(d.changeMonth) || num(d.incomeDelta) === null || num(d.expenseDelta) === null)) return null;
    const income = Number(d.incomeM) + Number(d.incomeF);
    const spending = Number(d.living) + Number(d.debt) + (d.parity === 'second' ? Number(d.bigCost) : 0);
    const changeIndex = d.change === 'yes' ? monthIndex(parseMonth(d.changeMonth)) : Infinity;
    const monthly = index => {
      const inc = income + (index >= changeIndex ? Number(d.incomeDelta) : 0);
      const exp = spending + (index >= changeIndex ? Number(d.expenseDelta) : 0);
      if (inc < 0 || exp < 0) throw new Error('变化后的收入或必要支出不能为负数，请检查已确定变化。');
      return {inc, exp};
    };
    const nowIndex = monthIndex(now), targetIndex = monthIndex(target);
    let cash = Number(d.savings);
    // 从下个完整月起累计，到候选月之前；不把当前未过完月份当作完整储蓄月。
    for (let m = nowIndex + 1; m < targetIndex; m++) {const x = monthly(m); cash += x.inc - x.exp;}
    const add = costs.base + costs.paid;
    const at = monthly(targetIndex);
    const reserve = (at.exp + add) * Number(d.buffer);
    let balance = cash - costs.once, lowest = balance;
    const leaveLoss = Number(d.lossM) + Number(d.lossF);
    for (let m = 0; m < 12; m++) {
      const x = monthly(targetIndex + m);
      const loss = m < Number(d.leaveMonths) ? leaveLoss : 0;
      if (loss > x.inc) throw new Error('某个未来月份的休假收入减少额超过家庭收入，请核对收入变化与休假假设。');
      balance += x.inc - x.exp - add - loss;
      lowest = Math.min(lowest, balance);
    }
    return {cash, reserve, lowest, end: balance, afterOnce: cash - costs.once, monthly: at.inc - at.exp - add, leaveMonthly: at.inc - at.exp - add - leaveLoss, gap: Math.max(0, reserve - lowest), meets: lowest >= reserve};
  }
  function analyze(d, now = new Date()) {
    const numeric = ['ageM','ageF','bigAge','bigCost','incomeM','incomeF','savings','living','debt','lossM','lossF','leaveMonths','buffer','hoursM','hoursF','daysM','daysF','durationM','durationF','lastM','lastF','paidStart','paidCost','baseCost','onceCost','lead'];
    for (const k of numeric) if (d[k] !== '' && d[k] !== null && d[k] !== undefined && (num(d[k]) === null || Number(d[k]) < 0)) throw new Error('请填写有效非负数字，不清楚的金额可留空。');
    if (!Number.isInteger(Number(d.leaveMonths)) || Number(d.leaveMonths) > 12 || Number(d.buffer) < 0 || Number(d.buffer) > 24 || Number(d.lead) < 9 || Number(d.lead) > 36) throw new Error('请检查休假月数、缓冲月数和规划提前量。');
    const due = parseMonth(d.due);
    if (d.pregnant === 'yes' && (!due || monthIndex(due) < monthIndex(now) || monthIndex(due) > monthIndex(now) + 10)) throw new Error('已怀孕时，请填写本月至未来10个月内的预产月份；如不清楚请先向医生确认。');
    if (num(d.lossM) !== null && num(d.incomeM) !== null && Number(d.lossM) > Number(d.incomeM)) throw new Error('男方休假月收入减少额不能超过其当前月收入。');
    if (num(d.lossF) !== null && num(d.incomeF) !== null && Number(d.lossF) > Number(d.incomeF)) throw new Error('女方休假月收入减少额不能超过其当前月收入。');
    const costs = {base: num(d.baseCost), once: num(d.onceCost), paid: d.paid === 'none' ? 0 : num(d.paidCost)};
    const earliest = d.pregnant === 'yes' ? monthIndex(due) : monthIndex(now) + Number(d.lead);
    const selfAvoid = d.avoidSelf || [], familyAvoid = d.avoidFamily || [];
    const excluded = [...new Set([...selfAvoid, ...(d.respectFamily ? familyAvoid : [])])];
    const rows = years.map(year => {
      const care = careFor(d, year);
      const months = Array.from({length: 12}, (_, i) => year * 12 + i).filter(m => m >= earliest && (d.pregnant !== 'yes' || m === monthIndex(due)));
      const candidates = months.map(m => {
        const date = monthDate(m), end = new Date(year, date.getMonth() + 1, 0, 12);
        const animals = [...new Set([zodiac(date), zodiac(end)])];
        const allowed = animals.every(a => !excluded.includes(a));
        return {month: ym(date), date, animals, allowed, financial: financeAt(d, date, now, costs)};
      });
      const first = candidates.find(c => c.financial?.meets) || candidates[0] || null;
      const preferred = candidates.find(c => c.allowed && c.financial?.meets) || null;
      return {year, care, candidates, first, preferred, ranges: ranges(year, excluded), ageM: num(d.ageM) === null ? null : Number(d.ageM) + year - now.getFullYear(), ageF: num(d.ageF) === null ? null : Number(d.ageF) + year - now.getFullYear(), bigAge: d.parity === 'second' && num(d.bigAge) !== null ? Number(d.bigAge) + year - now.getFullYear() : null};
    });
    const all = rows.flatMap(row => row.candidates.map(c => ({...c, year: row.year, care: row.care})));
    const agreed = d.willM === 'yes' && d.willF === 'yes';
    const healthReady = d.consult === 'done';
    const housingReady = d.housing === 'yes';
    const jobsKnown = d.jobM !== 'unknown' && d.jobF !== 'unknown';
    const recoveryReady = d.parity !== 'second' || d.consult === 'done';
    const canDiscuss = agreed && healthReady && housingReady && jobsKnown && recoveryReady;
    const baseline = canDiscuss ? all.find(c => c.care.ready && c.financial?.meets) || null : null;
    const preferred = canDiscuss ? all.find(c => c.allowed && c.care.ready && c.financial?.meets) || null : null;
    const messages = {
      care: '你担心的可能不只是带娃有多忙，而是生活改变后，会不会主要由一个人承担。想先谈清楚分工，不代表你不喜欢孩子。',
      money: '你想算清楚的，可能不只是一张账单，而是生活改变后还能不能留一点选择的余地。认真考虑钱，不等于把爱算得太细。',
      career: '你可能在意的不只是工作本身，还有自己的节奏、成长和选择。希望这些被看见，并不是自私。',
      pressure: '家人的期待可以被听见，但不需要替你们作决定。你可以喜欢孩子，也可以需要更多时间想清楚。',
      recovery: '身体和精力的感受值得被认真听见。想先照顾好自己，不需要用更多理由来证明。',
      unsure: '还没有一个确定答案，也是一种真实状态。你不必为了完成一份计划，就把犹豫藏起来。'
    };
    let headline = !agreed ? '先对齐彼此的想法，不急着选年份' : !healthReady ? '先把个人健康安排聊清楚，再谈时间' : baseline ? '已有一些基础，可以把准备提上日程' : '不是给你判“不行”，是把支持再补齐';
    if (d.pregnant === 'yes') headline = '围绕眼前的时间，一起把支持接上';
    if (now.getFullYear() > 2030) headline = '本版年份已结束，请更新规划范围';
    const actions = [];
    if (!agreed) actions.push('找一次不催促的对话：分别说出愿意、不愿意或担心的部分，不用先说服对方。');
    if (!healthReady) actions.push(d.pregnant === 'yes' ? '与产检医务人员确认当前健康、预产时间和需要的支持。' : '预约孕前咨询，说明双方年龄、既往生育与恢复情况；不要仅因生肖推迟医学咨询。');
    if (!all.some(c => c.care.ready)) actions.push('一起写一张照护交接表：白天、夜间、父母支持结束后，以及托育接入前分别由谁承担。');
    if (!all.some(c => c.financial)) actions.push('补齐收入、休假损失及育儿预算；不确定可先用明确标注的假设，不把空白当作零。');
    else if (!all.some(c => c.financial?.meets)) actions.push('核对首年现金流与自选缓冲目标，调整预算或安排支持；缓冲缺口不是生育资格标准。');
    if (!housingReady) actions.push('把住房安排从想法变成可讨论的计划，确认稳定使用空间及新增费用。');
    if (excluded.length) actions.push('把年份偏好和实际照护条件分开谈；留意等待带来的支持变化，不为生肖改变医学安排。');
    if (!actions.length) actions.push('把已商量的分工和预算再核对一次，接近实施时重新评估；这份报告不需要你立刻做决定。');
    return {now: iso(now), costs, rows, all, baseline, preferred, excluded, agreed, healthReady, housingReady, jobsKnown, headline, empathy: messages[d.concern] || messages.unsure, actions: actions.slice(0, 3), pregnant: d.pregnant === 'yes', due: due ? ym(due) : null, expired: now.getFullYear() > 2030};
  }
  return {years, calendar, defaults, num, zodiac, ranges, analyze, monthIndex};
})();
