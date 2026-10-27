/* =========================================================
   Stackly AI Agency — Chart.js dashboards
   All chart data below is clearly-labelled demo data.
   ========================================================= */
(function () {
  'use strict';

  const $ = (selector) => document.querySelector(selector);
  const page = document.body.dataset.page || 'overview';
  const charts = {};
  let lastTheme = '';
  const filters = { overview: { range: '30', metric: 'activity' }, analytics: { range: '30', metric: 'revenue' }, reports: { range: '90' } };

  const palette = {
    purple: '#7c5cff',
    cyan: '#22d3ee',
    pink: '#ff4ecd',
    orange: '#ff9f68',
    blue: '#3b82f6',
    green: '#38d996',
    lime: '#baf94d',
    violet: '#a78bfa'
  };

  const cssVar = (name, fallback) => getComputedStyle(document.body).getPropertyValue(name).trim() || fallback;

  function themeColors() {
    const light = document.body.dataset.dashTheme === 'light';
    return {
      text: light ? '#626580' : '#a8abc9',
      strong: light ? '#15152b' : '#f7f7ff',
      grid: light ? 'rgba(21,21,43,.075)' : 'rgba(255,255,255,.065)',
      tooltipBg: light ? 'rgba(255,255,255,.98)' : 'rgba(17,17,36,.98)',
      tooltipText: light ? '#15152b' : '#f7f7ff',
      border: light ? '#fff' : '#111124'
    };
  }

  function chartBase() {
    if (!window.Chart) return null;
    const theme = themeColors();
    try {
      Chart.defaults.color = theme.text;
      Chart.defaults.font.family = "'Manrope', sans-serif";
      Chart.defaults.font.size = 10;
      Chart.defaults.plugins.legend.labels.usePointStyle = true;
      Chart.defaults.plugins.legend.labels.pointStyle = 'circle';
      Chart.defaults.plugins.legend.labels.boxWidth = 6;
      Chart.defaults.plugins.legend.labels.padding = 14;
      Chart.defaults.plugins.tooltip.backgroundColor = theme.tooltipBg;
      Chart.defaults.plugins.tooltip.titleColor = theme.strong;
      Chart.defaults.plugins.tooltip.bodyColor = theme.text;
      Chart.defaults.plugins.tooltip.borderColor = theme.grid;
      Chart.defaults.plugins.tooltip.borderWidth = 1;
      Chart.defaults.plugins.tooltip.padding = 10;
      Chart.defaults.plugins.tooltip.cornerRadius = 8;
      Chart.defaults.plugins.tooltip.displayColors = true;
    } catch (_) { /* ignore older Chart versions */ }
    return theme;
  }

  function makeChart(id, config) {
    if (!window.Chart) return null;
    const canvas = document.getElementById(id);
    if (!canvas) return null;
    if (charts[id]) {
      charts[id].destroy();
      delete charts[id];
    }
    try {
      charts[id] = new Chart(canvas, config);
      return charts[id];
    } catch (error) {
      console.warn('Chart could not render:', id, error);
      return null;
    }
  }

  function gradient(ctx, area, from, to) {
    const g = ctx.createLinearGradient(0, area.top, 0, area.bottom);
    g.addColorStop(0, from);
    g.addColorStop(1, to);
    return g;
  }

  function fallbackForMissingLibrary() {
    document.querySelectorAll('.chart-wrap').forEach((wrap) => {
      if (!wrap.querySelector('canvas')) return;
      wrap.innerHTML = '<div class="chart-empty">Charts need the Chart.js CDN and an internet connection.<br>All dashboard features and demo data remain available.</div>';
    });
  }

  /* ---------- Demo data generators ---------- */
  function getProjects() {
    try {
      const projects = JSON.parse(localStorage.getItem('stackly_demo_projects') || '[]');
      return Array.isArray(projects) && projects.length ? projects : [];
    } catch (_) {
      return [];
    }
  }

  function dateLabels(count, range) {
    const labels = [];
    const now = new Date();
    if (range === '7') {
      for (let i = count - 1; i >= 0; i--) {
        const date = new Date(now);
        date.setDate(now.getDate() - i);
        labels.push(date.toLocaleDateString('en-US', { weekday: 'short' }));
      }
      return labels;
    }
    if (range === '90' || range === '365') {
      const step = range === '365' ? 30 : 9;
      for (let i = count - 1; i >= 0; i--) {
        const date = new Date(now);
        date.setDate(now.getDate() - i * step);
        labels.push(date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
      }
      return labels;
    }
    for (let i = count - 1; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(now.getDate() - i * 3);
      labels.push(date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
    }
    return labels;
  }

  function overviewData(range) {
    const labels = dateLabels(range === '7' ? 7 : range === '90' ? 10 : 10, range);
    const factor = range === '7' ? 0.68 : range === '90' ? 1.45 : 1;
    return {
      labels,
      activity: [58, 72, 66, 91, 84, 103, 96, 122, 114, 137, 129, 151].map((v) => Math.round(v * factor)).slice(0, labels.length),
      revenue: [21, 26, 24, 34, 31, 39, 36, 47, 44, 53, 49, 58].map((v) => Math.round(v * factor)),
      hours: [14, 18, 16, 23, 21, 27, 25, 31, 30, 36, 34, 39].map((v) => Math.round(v * factor))
    };
  }

  function analyticsData(range, metric) {
    const counts = { 7: 7, 30: 10, 90: 12, 365: 12 };
    const labels = dateLabels(counts[range] || 10, range);
    const factor = { 7: 0.55, 30: 1, 90: 2.1, 365: 6.8 }[range] || 1;
    const revenue = [32, 38, 35, 46, 52, 48, 61, 66, 72, 69, 84, 91].map((v) => Math.round(v * factor / 10) * 10);
    const hours = [18, 22, 20, 27, 31, 29, 38, 41, 44, 47, 55, 60].map((v) => Math.round(v * factor));
    const interactions = [120, 148, 141, 176, 203, 188, 240, 268, 291, 314, 360, 392].map((v) => Math.round(v * factor));
    return {
      labels,
      values: metric === 'hours' ? hours.slice(0, labels.length) : metric === 'interactions' ? interactions.slice(0, labels.length) : revenue.slice(0, labels.length),
      metric
    };
  }

  /* ---------- Overview ---------- */
  function buildOverview() {
    const theme = chartBase();
    if (!theme) return;
    const { range, metric } = filters.overview;

    const projects = getProjects();
    const categories = {};
    projects.forEach((project) => {
      const key = project.category || 'Other';
      categories[key] = (categories[key] || 0) + 1;
    });
    const pieLabels = Object.keys(categories).length ? Object.keys(categories) : ['Automation', 'Analytics', 'AI Tools', 'Machine Learning'];
    const pieValues = Object.keys(categories).length ? Object.values(categories) : [3, 2, 1, 1];
    const pieColors = [palette.purple, palette.cyan, palette.pink, palette.orange, palette.blue, palette.green, palette.violet];

    makeChart('projectPieChart', {
      type: 'doughnut',
      data: {
        labels: pieLabels,
        datasets: [{
          data: pieValues,
          backgroundColor: pieColors,
          borderColor: theme.border,
          borderWidth: 3,
          hoverOffset: 5
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '68%',
        plugins: {
          legend: { position: 'bottom', labels: { color: theme.text, padding: 10, boxWidth: 6 } },
          tooltip: {
            callbacks: {
              label(context) {
                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                const pct = total ? Math.round(context.parsed / total * 100) : 0;
                return ` ${context.label}: ${context.parsed} project${context.parsed === 1 ? '' : 's'} (${pct}%)`;
              }
            }
          }
        }
      }
    });

    const data = overviewData(range);
    const metricMap = {
      activity: { label: 'Agent interactions', color: palette.purple, gradient: ['rgba(124,92,255,.35)', 'rgba(124,92,255,0)'] },
      revenue: { label: 'Revenue impact ($k)', color: palette.cyan, gradient: ['rgba(34,211,238,.28)', 'rgba(34,211,238,0)'] },
      hours: { label: 'Hours saved', color: palette.pink, gradient: ['rgba(255,78,205,.25)', 'rgba(255,78,205,0)'] }
    };
    const selected = metricMap[metric] || metricMap.activity;
    let lineCtx;
    const lineCanvas = document.getElementById('activityLineChart');
    if (lineCanvas) lineCtx = lineCanvas.getContext('2d');
    makeChart('activityLineChart', {
      type: 'line',
      data: {
        labels: data.labels,
        datasets: [{
          label: selected.label,
          data: data[metric] || data.activity,
          borderColor: selected.color,
          backgroundColor: lineCtx ? gradient(lineCtx, { top: 0, bottom: 240 }, selected.gradient[0], selected.gradient[1]) : selected.gradient[0],
          fill: true,
          tension: 0.42,
          borderWidth: 2.4,
          pointRadius: 0,
          pointHoverRadius: 4,
          pointBackgroundColor: selected.color,
          pointBorderColor: theme.border,
          pointBorderWidth: 2
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label(context) {
                const prefix = metric === 'revenue' ? '$' : '';
                const suffix = metric === 'revenue' ? 'k' : '';
                return ` ${selected.label}: ${prefix}${context.parsed.y}${suffix}`;
              }
            }
          }
        },
        scales: {
          x: {
            grid: { display: false, drawBorder: false },
            ticks: { color: theme.text, maxRotation: 0, autoSkip: true, maxTicksLimit: 7 },
            border: { display: false }
          },
          y: {
            beginAtZero: true,
            grid: { color: theme.grid, drawBorder: false },
            ticks: { color: theme.text, maxTicksLimit: 5 },
            border: { display: false }
          }
        }
      }
    });

    const factor = range === '7' ? 0.72 : range === '90' ? 1.18 : 1;
    makeChart('performanceBarChart', {
      type: 'bar',
      data: {
        labels: ['Support', 'Analytics', 'Onboarding', 'Content', 'Risk'],
        datasets: [
          {
            label: 'Target',
            data: [80, 75, 70, 65, 72].map((v) => Math.round(v * factor)),
            backgroundColor: 'rgba(124,92,255,.24)',
            borderColor: 'rgba(124,92,255,.5)',
            borderWidth: 1,
            borderRadius: 5,
            barPercentage: 0.62,
            categoryPercentage: 0.72
          },
          {
            label: 'Actual',
            data: [91, 68, 84, 58, 76].map((v) => Math.round(v * factor)),
            backgroundColor: 'rgba(34,211,238,.7)',
            borderColor: 'rgba(34,211,238,.9)',
            borderWidth: 1,
            borderRadius: 5,
            barPercentage: 0.62,
            categoryPercentage: 0.72
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: { position: 'bottom', labels: { color: theme.text, boxWidth: 6 } },
          tooltip: {}
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: { color: theme.text },
            border: { display: false }
          },
          y: {
            beginAtZero: true,
            grid: { color: theme.grid },
            ticks: { color: theme.text, maxTicksLimit: 5 },
            border: { display: false }
          }
        }
      }
    });
  }

  /* ---------- Analytics ---------- */
  function buildAnalytics() {
    const theme = chartBase();
    if (!theme) return;
    const { range, metric } = filters.analytics;
    const data = analyticsData(range, metric);
    const metricLabels = { revenue: 'Revenue', hours: 'Automation hours saved', interactions: 'AI interactions' };
    const metricColors = { revenue: palette.cyan, hours: palette.pink, interactions: palette.purple };
    const color = metricColors[metric] || palette.cyan;
    const lineCanvas = document.getElementById('analyticsRevenueChart');
    const lineCtx = lineCanvas ? lineCanvas.getContext('2d') : null;

    makeChart('analyticsRevenueChart', {
      type: 'line',
      data: {
        labels: data.labels,
        datasets: [{
          label: metricLabels[metric] || 'Revenue',
          data: data.values,
          borderColor: color,
          backgroundColor: lineCtx ? gradient(lineCtx, { top: 0, bottom: 250 }, `${color}45`, `${color}00`) : `${color}33`,
          fill: true,
          tension: 0.4,
          borderWidth: 2.4,
          pointRadius: 2,
          pointHoverRadius: 4,
          pointBackgroundColor: color,
          pointBorderColor: theme.border,
          pointBorderWidth: 2
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: { display: true, position: 'top', align: 'end', labels: { color: theme.text, font: { size: 10 } } },
          tooltip: { callbacks: { label: (ctx) => ` ${metricLabels[metric]}: ${ctx.parsed.y}${metric === 'revenue' ? 'k' : ''}` } }
        },
        scales: {
          x: { grid: { display: false }, ticks: { color: theme.text, maxTicksLimit: 7 }, border: { display: false } },
          y: { beginAtZero: true, grid: { color: theme.grid }, ticks: { color: theme.text, maxTicksLimit: 5 }, border: { display: false } }
        }
      }
    });

    const pieValuesByRange = {
      7: [32, 24, 18, 14, 12],
      30: [29, 26, 19, 15, 11],
      90: [27, 28, 21, 14, 10],
      365: [25, 30, 22, 13, 10]
    };
    const values = pieValuesByRange[range] || pieValuesByRange[30];
    makeChart('analyticsPieChart', {
      type: 'doughnut',
      data: {
        labels: ['Support AI', 'Workflow Automation', 'Analytics', 'Content Studio', 'Other'],
        datasets: [{
          data: values,
          backgroundColor: [palette.purple, palette.cyan, palette.blue, palette.pink, palette.orange],
          borderColor: theme.border,
          borderWidth: 3,
          hoverOffset: 5
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '67%',
        plugins: {
          legend: { position: 'bottom', labels: { color: theme.text, padding: 9, boxWidth: 6 } },
          tooltip: { callbacks: { label: (ctx) => ` ${ctx.label}: ${ctx.parsed}% of usage` } }
        }
      }
    });

    const summaryMap = {
      revenue: ['$284k', '+18.4%'],
      hours: ['1,284h', '+22.1%'],
      interactions: ['38.2k', '+11.7%']
    };
    const revenueEl = document.getElementById('analyticsPrimaryValue');
    const revenueTrend = document.getElementById('analyticsPrimaryTrend');
    if (revenueEl) revenueEl.textContent = summaryMap[metric][0];
    if (revenueTrend) revenueTrend.textContent = summaryMap[metric][1];
  }

  /* ---------- Reports ---------- */
  function buildReports() {
    const theme = chartBase();
    if (!theme) return;
    const range = filters.reports.range;
    const labels = range === '30'
      ? ['Week 1', 'Week 2', 'Week 3', 'Week 4']
      : range === '365'
        ? ['Q1', 'Q2', 'Q3', 'Q4']
        : ['Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const multiplier = range === '30' ? 0.55 : range === '365' ? 3.8 : 1;

    makeChart('reportTrendChart', {
      type: 'line',
      data: {
        labels,
        datasets: [{
          label: 'Automation impact',
          data: [64, 72, 69, 81, 88, 96].map((v) => Math.round(v * multiplier)).slice(0, labels.length),
          borderColor: palette.purple,
          backgroundColor: 'rgba(124,92,255,.1)',
          fill: true,
          tension: 0.4,
          borderWidth: 2.3,
          pointRadius: 2,
          pointHoverRadius: 4,
          pointBackgroundColor: palette.purple
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: { callbacks: { label: (ctx) => ` Impact index: ${ctx.parsed.y}` } }
        },
        scales: {
          x: { grid: { display: false }, ticks: { color: theme.text }, border: { display: false } },
          y: { beginAtZero: true, grid: { color: theme.grid }, ticks: { color: theme.text, maxTicksLimit: 5 }, border: { display: false } }
        }
      }
    });

    makeChart('reportEfficiencyChart', {
      type: 'bar',
      data: {
        labels: ['Support', 'Finance', 'Operations', 'Marketing', 'Delivery'],
        datasets: [{
          label: 'Hours saved',
          data: [420, 286, 338, 198, 264].map((v) => Math.round(v * multiplier)).slice(0, 5),
          backgroundColor: [palette.purple, palette.cyan, palette.pink, palette.orange, palette.blue],
          borderColor: 'transparent',
          borderRadius: 6,
          barPercentage: 0.58,
          categoryPercentage: 0.7
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: { callbacks: { label: (ctx) => ` ${ctx.parsed.y} hours saved` } }
        },
        scales: {
          x: { grid: { display: false }, ticks: { color: theme.text }, border: { display: false } },
          y: { beginAtZero: true, grid: { color: theme.grid }, ticks: { color: theme.text, maxTicksLimit: 5 }, border: { display: false } }
        }
      }
    });
  }

  /* ---------- Orchestration ---------- */
  function render() {
    if (!window.Chart) {
      fallbackForMissingLibrary();
      return;
    }
    if (page === 'overview') buildOverview();
    if (page === 'analytics') buildAnalytics();
    if (page === 'reports') buildReports();
    lastTheme = document.body.dataset.dashTheme || '';
  }

  document.addEventListener('dashboard:ready', () => {
    const overviewRange = document.getElementById('overviewRange');
    const overviewMetric = document.getElementById('overviewMetric');
    const analyticsRange = document.getElementById('analyticsRange');
    const analyticsMetric = document.getElementById('analyticsMetric');
    const reportsRange = document.getElementById('reportRange');
    if (overviewRange) filters.overview.range = overviewRange.value;
    if (overviewMetric) filters.overview.metric = overviewMetric.value;
    if (analyticsRange) filters.analytics.range = analyticsRange.value;
    if (analyticsMetric) filters.analytics.metric = analyticsMetric.value;
    if (reportsRange) filters.reports.range = reportsRange.value;
    render();
  });

  document.addEventListener('dashboard:filter', (event) => {
    const detail = event.detail || {};
    if (detail.source === 'overview') {
      filters.overview.range = detail.range || filters.overview.range;
      filters.overview.metric = detail.metric || filters.overview.metric;
    }
    if (detail.source === 'analytics') {
      filters.analytics.range = detail.range || filters.analytics.range;
      filters.analytics.metric = detail.metric || filters.analytics.metric;
    }
    if (detail.source === 'reports') {
      filters.reports.range = detail.range || filters.reports.range;
    }
    render();
  });

  if ('MutationObserver' in window) {
    new MutationObserver(() => {
      const current = document.body.dataset.dashTheme || '';
      if (lastTheme && current !== lastTheme) {
        setTimeout(render, 60);
      }
    }).observe(document.body, { attributes: true, attributeFilter: ['data-dash-theme'] });
  }

  window.addEventListener('resize', () => {
    Object.values(charts).forEach((chart) => {
      try { chart.resize(); } catch (_) { /* noop */ }
    });
  });
})();
