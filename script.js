const DEFAULT_COLOR = '#92dfec';
const FILL_ALPHA = 0.65;
const LABELS = ['Power', 'Speed', 'Trick', 'Recovery', 'Defense'];
const STEP = 0.1;

/*
  Growth model:
  - Level 1.0 = all five stats are exactly 1.0
  - Above level 1, extra total power grows exponentially
  - This is a model, not a canon formula
*/
const POWER_EXPONENT = 1.85;
const POWER_MULTIPLIER = 1.15;

let currentAbility = null;
let generatedTotal = 0;
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
  return round1(arr.reduce((a, b) => a + b, 0));
}

function rand(min, max) {
  return Math.random() * (max - min) + min;
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

function weightedLevelRoll() {
  const roll = Math.random() * 100;

  if (roll < 33) return round1(rand(1.0, 1.9));
  if (roll < 86) return round1(rand(2.0, 3.4));
  if (roll < 98) return round1(rand(3.5, 4.9));

  const highRoll = Math.random();
  if (highRoll < 0.99999) return round1(rand(5.0, 5.9));
  return round1(rand(6.0, 10.0));
}

function getStatCap(level) {
  return level < 6.5 ? 9.9 : 20.0;
}

function getTargetTotal(level) {
  if (level <= 1) {
    return 5.0;
  }

  const extra = POWER_MULTIPLIER * Math.pow(level - 1, POWER_EXPONENT);
  return round1(5 + extra);
}

function buildStatsFromLevel(level) {
  const statCap = getStatCap(level);

  if (level <= 1.0) {
    return {
      level,
      stats: [1, 1, 1, 1, 1],
      total: 5.0
    };
  }

  const targetTotal = getTargetTotal(level);

  let weights = Array.from({ length: 5 }, () => rand(0.7, 1.9));
  const weightSum = weights.reduce((a, b) => a + b, 0);

  let stats = weights.map(w => (w / weightSum) * targetTotal);

  // Base floor of 1, since level 1 means all basics are 1
  stats = stats.map(v => clamp(v + rand(-0.6, 0.6), 1.0, statCap));

  let currentSum = sum(stats);
  let loops = 0;

  while (currentSum > targetTotal && loops < 1200) {
    const i = Math.floor(Math.random() * 5);
    if (stats[i] > 1.0) {
      stats[i] = round1(Math.max(1.0, stats[i] - 0.1));
      currentSum = sum(stats);
    }
    loops++;
  }

  loops = 0;
  while (currentSum < targetTotal && loops < 1200) {
    const i = Math.floor(Math.random() * 5);
    if (stats[i] < statCap) {
      const add = Math.min(0.1, statCap - stats[i], targetTotal - currentSum);
      stats[i] = round1(stats[i] + add);
      currentSum = sum(stats);
    }
    loops++;
  }

  return {
    level,
    stats: stats.map(v => round1(v)),
    total: sum(stats)
  };
}

function generateAbility() {
  const level = weightedLevelRoll();
  return buildStatsFromLevel(level);
}

function getAvailablePoints() {
  return round1(generatedTotal - sum(currentAbility.stats));
}

function getMainChartMax() {
  const largest = Math.max(...currentAbility.stats, 10);
  return Math.ceil(largest);
}

function updateMainChart() {
  if (!currentAbility) return;
  mainChart.data.datasets[0].data = currentAbility.stats;
  mainChart.data.datasets[0].backgroundColor = hexToRGBA(currentColor, FILL_ALPHA);
  mainChart.data.datasets[0].borderColor = currentColor;
  mainChart.data.datasets[0].pointBorderColor = currentColor;
  mainChart.options.scales.r.max = getMainChartMax();
  mainChart.update();
}

function updateDisplay(ability) {
  document.getElementById('levelDisplay').textContent = ability.level.toFixed(1);
  document.getElementById('powerDisplay').textContent = ability.stats[0].toFixed(1);
  document.getElementById('speedDisplay').textContent = ability.stats[1].toFixed(1);
  document.getElementById('trickDisplay').textContent = ability.stats[2].toFixed(1);
  document.getElementById('recoveryDisplay').textContent = ability.stats[3].toFixed(1);
  document.getElementById('defenseDisplay').textContent = ability.stats[4].toFixed(1);
  updateMainChart();
}

function runGeneration() {
  const rolled = generateAbility();
  currentAbility = {
    level: rolled.level,
    stats: [...rolled.stats]
  };
  generatedTotal = rolled.total;

  updateDisplay(currentAbility);

  if (!hasGenerated) {
    hasGenerated = true;
    document.getElementById('generateBtn').textContent = 'Regenerate Ability';
  }
}

function adjustStat(index, direction) {
  if (!hasGenerated || !currentAbility) return;

  const statCap = getStatCap(currentAbility.level);
  const statFloor = currentAbility.level <= 1 ? 1.0 : 0.0;

  if (direction === 'down') {
    if (currentAbility.stats[index] <= statFloor) return;
    currentAbility.stats[index] = round1(Math.max(statFloor, currentAbility.stats[index] - STEP));
    updateDisplay(currentAbility);
    return;
  }

  const available = getAvailablePoints();
  if (available < STEP) return;
  if (currentAbility.stats[index] >= statCap) return;

  const add = Math.min(STEP, available, statCap - currentAbility.stats[index]);
  currentAbility.stats[index] = round1(currentAbility.stats[index] + add);
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

  generatedTotal = 0;
  currentColor = DEFAULT_COLOR;
  hasGenerated = false;

  document.getElementById('colorPicker').value = DEFAULT_COLOR;
  document.getElementById('generateBtn').textContent = 'Generate Ability';

  updateDisplay(currentAbility);
});
