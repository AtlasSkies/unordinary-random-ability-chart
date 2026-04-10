const DEFAULT_COLOR = '#92dfec';
const FILL_ALPHA = 0.65;
const LABELS = ['Power', 'Speed', 'Trick', 'Recovery', 'Defense'];
const STEP = 0.1;

let currentAbility = null;
let generatedMaxStats = [0, 0, 0, 0, 0];
let lockedStats = [false, false, false, false, false];
let currentColor = DEFAULT_COLOR;
let overlayChart = null;
let hasGenerated = false;

function hexToRGBA(hex, alpha) {
  if (!hex) hex = DEFAULT_COLOR;
  if (hex.startsWith('rgb')) {
    return hex.replace(')', `, ${alpha})`).replace('rgb', 'rgba');
  }
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

function round1(value) {
  return Math.round(value * 10) / 10;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function sum(arr) {
  return arr.reduce((a, b) => a + b, 0);
}

const radarBackgroundPlugin = {
  id: 'customPentagonBackground',
  beforeDatasetsDraw(chart) {
    const opts = chart.config.options.customBackground;
    if (!opts?.enabled) return;

    const r = chart.scales.r;
    const ctx = chart.ctx;
    const cx = r.xCenter;
    const cy = r.yCenter;
    const radius = r.drawingArea;
    const count = chart.data.labels.length;
    const start = -Math.PI / 2;

    const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
    gradient.addColorStop(0, '#f8fcff');
    gradient.addColorStop(0.33, DEFAULT_COLOR);
    gradient.addColorStop(1, DEFAULT_COLOR);

    ctx.save();
    ctx.beginPath();
    for (let i = 0; i < count; i++) {
      const angle = start + (i * 2 * Math.PI / count);
      const x = cx + radius * Math.cos(angle);
      const y = cy + radius * Math.sin(angle);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fillStyle = gradient;
    ctx.fill();
    ctx.restore();
  },
  afterDatasetsDraw(chart) {
    const opts = chart.config.options.customBackground;
    if (!opts?.enabled) return;

    const r = chart.scales.r;
    const ctx = chart.ctx;
    const cx = r.xCenter;
    const cy = r.yCenter;
    const radius = r.drawingArea;
    const count = chart.data.labels.length;
    const start = -Math.PI / 2;

    ctx.save();
    ctx.beginPath();
    for (let i = 0; i < count; i++) {
      const angle = start + (i * 2 * Math.PI / count);
      const x = cx + radius * Math.cos(angle);
      const y = cy + radius * Math.sin(angle);
      ctx.moveTo(cx, cy);
      ctx.lineTo(x, y);
    }
    ctx.strokeStyle = '#35727d';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.beginPath();
    for (let i = 0; i < count; i++) {
      const angle = start + (i * 2 * Math.PI / count);
      const x = cx + radius * Math.cos(angle);
      const y = cy + radius * Math.sin(angle);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.strokeStyle = '#184046';
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.restore();
  }
};

const axisTitlesPlugin = {
  id: 'axisTitles',
  afterDraw(chart) {
    const ctx = chart.ctx;
    const r = chart.scales.r;
    const labels = chart.data.labels;
    if (!labels) return;

    const cx = r.xCenter;
    const cy = r.yCenter;
    const base = -Math.PI / 2;
    const baseRadius = r.drawingArea * 1.1;

    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = 'italic 16px Arial';
    ctx.strokeStyle = currentColor;
    ctx.fillStyle = 'white';
    ctx.lineWidth = 4;

    labels.forEach((label, i) => {
      const angle = base + (i * 2 * Math.PI / labels.length);
      const x = cx + baseRadius * Math.cos(angle);
      let y = cy + baseRadius * Math.sin(angle);

      if (i === 0) y -= 5;
      if (chart.canvas.id === 'overlayChartCanvas' && (i === 1 || i === 4)) {
        y -= 25;
      }

      ctx.strokeText(label, x, y);
      ctx.fillText(label, x, y);
    });

    ctx.restore();
  }
};

function createRadar(canvasId, withBackground) {
  const ctx = document.getElementById(canvasId).getContext('2d');

  return new Chart(ctx, {
    type: 'radar',
    data: {
      labels: LABELS,
      datasets: [{
        data: [0, 0, 0, 0, 0],
        backgroundColor: hexToRGBA(currentColor, FILL_ALPHA),
        borderColor: currentColor,
        borderWidth: 2,
        pointBackgroundColor: '#fff',
        pointBorderColor: currentColor,
        pointRadius: canvasId === 'mainChart' ? 4 : 0
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      layout: {
        padding: { top: 22, bottom: 22, left: 8, right: 8 }
      },
      scales: {
        r: {
          min: 0,
          max: 10,
          ticks: { display: false },
          grid: { display: false },
          angleLines: { color: '#6db5c0', lineWidth: 1 },
          pointLabels: { color: 'transparent' }
        }
      },
      customBackground: { enabled: withBackground },
      plugins: { legend: { display: false } }
    },
    plugins: [axisTitlesPlugin, radarBackgroundPlugin]
  });
}

const mainChart = createRadar('mainChart', true);

function rand(min, max) {
  return Math.random() * (max - min) + min;
}

function weightedLevelRoll() {
  const roll = Math.random() * 100;

  if (roll < 33) return round1(rand(1.0, 1.9));
  if (roll < 86) return round1(rand(2.0, 3.4));
  if (roll < 98) return round1(rand(3.5, 4.9));

  const highRoll = Math.random();
  if (highRoll < 0.99999) return round1(rand(5.0, 5.9));
  return round1(rand(6.0, 10.0));
}

function getBudgetRange(level) {
  if (level < 2.0) return [4.0, 11.0];
  if (level < 3.5) return [7.0, 17.0];
  if (level < 5.0) return [11.0, 24.0];
  if (level < 6.5) return [16.0, 31.0];
  if (level < 8.0) return [22.0, 39.0];
  return [28.0, 46.0];
}

function getStatCap(level) {
  return level < 6.5 ? 9.9 : 10.0;
}

function buildStatsFromLevel(level) {
  const [budgetMin, budgetMax] = getBudgetRange(level);
  const statCap = getStatCap(level);
  const totalBudget = rand(budgetMin, budgetMax);

  let weights = Array.from({ length: 5 }, () => rand(0.4, 1.7));
  const weightSum = sum(weights);

  let stats = weights.map(w => (w / weightSum) * totalBudget);
  stats = stats.map(v => clamp(v + rand(-0.45, 0.45), 0.8, statCap));

  let currentSum = sum(stats);
  let loops = 0;

  while (currentSum > totalBudget && loops < 400) {
    const i = Math.floor(Math.random() * 5);
    if (stats[i] > 0.8) {
      stats[i] = Math.max(0.8, stats[i] - 0.1);
      currentSum = sum(stats);
    }
    loops++;
  }

  loops = 0;
  while (currentSum < totalBudget - 0.15 && loops < 500) {
    const i = Math.floor(Math.random() * 5);
    if (stats[i] < statCap) {
      const add = Math.min(0.1, totalBudget - currentSum, statCap - stats[i]);
      stats[i] += add;
      currentSum = sum(stats);
    }
    loops++;
  }

  stats = stats.map(round1);

  return {
    level,
    stats,
    budget: round1(totalBudget)
  };
}

function generateAbility() {
  const level = weightedLevelRoll();
  return buildStatsFromLevel(level);
}

function updateLockButtons() {
  lockedStats.forEach((locked, i) => {
    const btn = document.getElementById(`lock${i}`);
    btn.textContent = locked ? 'Locked' : 'Lock';
    btn.classList.toggle('locked', locked);
  });
}

function updateMainChart() {
  if (!currentAbility) return;
  mainChart.data.datasets[0].data = currentAbility.stats;
  mainChart.data.datasets[0].backgroundColor = hexToRGBA(currentColor, FILL_ALPHA);
  mainChart.data.datasets[0].borderColor = currentColor;
  mainChart.data.datasets[0].pointBorderColor = currentColor;
  mainChart.update();
}

function updateDisplay(ability) {
  document.getElementById('levelDisplay').textContent = ability.level.toFixed(1);
  document.getElementById('powerDisplay').textContent = ability.stats[0].toFixed(1);
  document.getElementById('speedDisplay').textContent = ability.stats[1].toFixed(1);
  document.getElementById('trickDisplay').textContent = ability.stats[2].toFixed(1);
  document.getElementById('recoveryDisplay').textContent = ability.stats[3].toFixed(1);
  document.getElementById('defenseDisplay').textContent = ability.stats[4].toFixed(1);
  updateLockButtons();
  updateMainChart();
}

function setStatus(message) {
  document.getElementById('statusNote').textContent = message;
}

function resetLocks() {
  lockedStats = [false, false, false, false, false];
}

function runGeneration() {
  currentAbility = generateAbility();
  generatedMaxStats = [...currentAbility.stats];
  resetLocks();
  updateDisplay(currentAbility);
  setStatus('Generated max values saved. You can lower stats and raise them back up to those max values.');

  if (!hasGenerated) {
    hasGenerated = true;
    document.getElementById('generateBtn').textContent = 'Regenerate Ability';
  }
}

function toggleLock(index) {
  if (!hasGenerated) return;
  lockedStats[index] = !lockedStats[index];
  updateLockButtons();
}

function redistribute(indices, amount, mode) {
  let remaining = round1(amount);

  while (remaining > 0.0001) {
    const eligible = indices.filter(i => {
      const value = currentAbility.stats[i];
      const maxValue = generatedMaxStats[i];

      if (mode === 'decrease') {
        return value > 0;
      }
      return value < maxValue;
    });

    if (eligible.length === 0) break;

    let movedSomething = false;

    for (const i of eligible) {
      if (remaining <= 0.0001) break;

      const value = currentAbility.stats[i];
      const maxValue = generatedMaxStats[i];
      let possible = 0;

      if (mode === 'decrease') {
        possible = round1(value);
      } else {
        possible = round1(maxValue - value);
      }

      const move = Math.min(STEP, possible, remaining);
      if (move <= 0) continue;

      if (mode === 'decrease') {
        currentAbility.stats[i] = round1(value - move);
      } else {
        currentAbility.stats[i] = round1(value + move);
      }

      remaining = round1(remaining - move);
      movedSomething = true;
    }

    if (!movedSomething) break;
  }

  return round1(amount - remaining);
}

function adjustStat(index, direction) {
  if (!hasGenerated || !currentAbility) {
    setStatus('Generate an ability first.');
    return;
  }

  if (lockedStats[index]) {
    setStatus(`${LABELS[index]} is locked.`);
    return;
  }

  const currentValue = currentAbility.stats[index];
  const maxValue = generatedMaxStats[index];
  const otherUnlocked = [0, 1, 2, 3, 4].filter(i => i !== index && !lockedStats[i]);

  if (direction === 'up') {
    if (currentValue >= maxValue) {
      setStatus(`${LABELS[index]} is already at its generated max.`);
      return;
    }

    if (otherUnlocked.length === 0) {
      setStatus('No unlocked stats available to lower.');
      return;
    }

    const roomUp = round1(maxValue - currentValue);
    const amount = Math.min(STEP, roomUp);
    const redistributed = redistribute(otherUnlocked, amount, 'decrease');

    if (redistributed <= 0) {
      setStatus('The other unlocked stats cannot go any lower.');
      return;
    }

    currentAbility.stats[index] = round1(currentAbility.stats[index] + redistributed);
    setStatus(`${LABELS[index]} increased.`);
  } else {
    if (currentValue <= 0) {
      setStatus(`${LABELS[index]} is already at 0.`);
      return;
    }

    if (otherUnlocked.length === 0) {
      setStatus('No unlocked stats available to increase.');
      return;
    }

    const roomDown = round1(currentValue);
    const amount = Math.min(STEP, roomDown);
    const redistributed = redistribute(otherUnlocked, amount, 'increase');

    if (redistributed <= 0) {
      setStatus('The other unlocked stats are already at their generated max values.');
      return;
    }

    currentAbility.stats[index] = round1(currentAbility.stats[index] - redistributed);
    setStatus(`${LABELS[index]} decreased.`);
  }

  updateDisplay(currentAbility);
}

document.getElementById('generateBtn').addEventListener('click', runGeneration);

document.getElementById('colorPicker').addEventListener('input', (e) => {
  currentColor = e.target.value;
  updateMainChart();

  if (overlayChart && !document.getElementById('overlay').classList.contains('hidden')) {
    overlayChart.data.datasets[0].backgroundColor = hexToRGBA(currentColor, FILL_ALPHA);
    overlayChart.data.datasets[0].borderColor = currentColor;
    overlayChart.update();
  }
});

document.querySelectorAll('.stat-row').forEach(row => {
  const index = Number(row.dataset.stat);
  row.querySelector('.minus').addEventListener('click', () => adjustStat(index, 'down'));
  row.querySelector('.plus').addEventListener('click', () => adjustStat(index, 'up'));
});

[0, 1, 2, 3, 4].forEach(i => {
  document.getElementById(`lock${i}`).addEventListener('click', () => toggleLock(i));
});

document.getElementById('imgInput').addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (ev) => {
    document.getElementById('uploadedImg').src = ev.target.result;
  };
  reader.readAsDataURL(file);
});

document.getElementById('viewBtn').addEventListener('click', () => {
  if (!currentAbility) {
    currentAbility = {
      level: 0,
      stats: [0, 0, 0, 0, 0]
    };
  }

  document.getElementById('overlay').classList.remove('hidden');
  document.getElementById('overlayImg').src = document.getElementById('uploadedImg').src;
  document.getElementById('overlayName').textContent =
    document.getElementById('nameInput').value || '-';
  document.getElementById('overlayAbility').textContent =
    document.getElementById('abilityInput').value || '-';
  document.getElementById('overlayLevel').textContent =
    currentAbility.level.toFixed(1);

  const ctx = document.getElementById('overlayChartCanvas').getContext('2d');

  if (overlayChart) {
    overlayChart.destroy();
  }

  overlayChart = new Chart(ctx, {
    type: 'radar',
    data: {
      labels: LABELS,
      datasets: [{
        data: currentAbility.stats.map(v => Math.min(v, 10)),
        backgroundColor: hexToRGBA(currentColor, FILL_ALPHA),
        borderColor: currentColor,
        borderWidth: 2,
        pointRadius: 0
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      layout: {
        padding: { top: 25, bottom: 25, left: 10, right: 10 }
      },
      scales: {
        r: {
          min: 0,
          max: 10,
          ticks: { display: false },
          grid: { display: false },
          angleLines: { color: '#6db5c0', lineWidth: 1 },
          pointLabels: { color: 'transparent' }
        }
      },
      customBackground: { enabled: true },
      plugins: { legend: { display: false } }
    },
    plugins: [radarBackgroundPlugin, axisTitlesPlugin]
  });
});

document.getElementById('closeBtn').addEventListener('click', () => {
  document.getElementById('overlay').classList.add('hidden');
});

document.getElementById('downloadBtn').addEventListener('click', async () => {
  const box = document.getElementById('characterBox');
  const downloadBtn = document.getElementById('downloadBtn');
  const closeBtn = document.getElementById('closeBtn');

  window.scrollTo(0, 0);
  downloadBtn.style.visibility = 'hidden';
  closeBtn.style.visibility = 'hidden';

  await html2canvas(box, {
    scale: 2,
    useCORS: true,
    backgroundColor: null,
    logging: false
  }).then((canvas) => {
    const link = document.createElement('a');
    const cleanName = (
      document.getElementById('nameInput').value || 'Unnamed'
    ).replace(/\s+/g, '_');
    link.download = `${cleanName}_CharacterChart.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  });

  downloadBtn.style.visibility = 'visible';
  closeBtn.style.visibility = 'visible';
});

window.addEventListener('load', () => {
  currentAbility = {
    level: 0,
    stats: [0, 0, 0, 0, 0]
  };

  generatedMaxStats = [0, 0, 0, 0, 0];
  resetLocks();
  currentColor = DEFAULT_COLOR;
  hasGenerated = false;

  document.getElementById('colorPicker').value = DEFAULT_COLOR;
  document.getElementById('generateBtn').textContent = 'Generate Ability';

  updateDisplay(currentAbility);
  setStatus('Generate an ability, then use + / − and Lock to rebalance the stats.');
});
