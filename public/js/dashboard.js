(function () {
  function initDashboardUi() {
    const popoverTriggers = document.querySelectorAll('[data-bs-toggle="popover"]');
    const tooltipTriggers = document.querySelectorAll('[data-bs-toggle="tooltip"]');

    if (window.bootstrap && popoverTriggers.length) {
      Array.from(popoverTriggers).forEach(function (trigger) {
        new bootstrap.Popover(trigger, {
          container: 'body',
          html: trigger.getAttribute('data-bs-html') === 'true'
        });
      });
    }

    if (window.bootstrap && tooltipTriggers.length) {
      Array.from(tooltipTriggers).forEach(function (trigger) {
        new bootstrap.Tooltip(trigger, {
          container: 'body'
        });
      });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initDashboardUi);
  } else {
    window.setTimeout(initDashboardUi, 0);
  }

  const dataNode = document.getElementById('dashboardChartData');

  if (!dataNode || typeof Chart === 'undefined') {
    return;
  }

  const i18nNode = document.getElementById('dashboardI18nData');
  let charts = {};
  let dashboardI18n = {};

  try {
    charts = JSON.parse(dataNode.textContent || '{}');
  } catch (error) {
    charts = {};
  }

  if (i18nNode) {
    try {
      dashboardI18n = JSON.parse(i18nNode.textContent || '{}');
    } catch (error) {
      dashboardI18n = {};
    }
  }

  const moneyFormatter = new Intl.NumberFormat(dashboardI18n.locale || 'en-US', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0
  });

  function getCssVar(name, fallback) {
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;
  }

  function createGradient(ctx, area, color) {
    const gradient = ctx.createLinearGradient(0, area.top, 0, area.bottom);
    gradient.addColorStop(0, color);
    gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
    return gradient;
  }

  const currentPeriodMarker = {
    id: 'currentPeriodMarker',
    afterDatasetsDraw(chart, args, options) {
      if (!options || options.index === null || typeof options.index === 'undefined') return;

      const xScale = chart.scales.x;
      const yScale = chart.scales.y;
      const index = Number(options.index);

      if (!xScale || !yScale || Number.isNaN(index) || index < 0) return;

      const x = xScale.getPixelForValue(index);
      const { ctx } = chart;
      const top = yScale.top;
      const bottom = yScale.bottom;
      const label = options.label || dashboardI18n.today || 'Today';

      ctx.save();
      ctx.beginPath();
      ctx.setLineDash([5, 5]);
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = 'rgba(17, 24, 39, 0.34)';
      ctx.moveTo(x, top + 4);
      ctx.lineTo(x, bottom);
      ctx.stroke();
      ctx.setLineDash([]);

      const textWidth = ctx.measureText(label).width;
      const labelWidth = textWidth + 18;
      const labelHeight = 24;
      const labelX = Math.min(Math.max(x - labelWidth / 2, chart.chartArea.left), chart.chartArea.right - labelWidth);
      const labelY = top + 8;

      ctx.fillStyle = '#111827';
      ctx.beginPath();
      ctx.roundRect(labelX, labelY, labelWidth, labelHeight, 12);
      ctx.fill();

      ctx.fillStyle = '#ffffff';
      ctx.font = '700 11px Inter, Arial, sans-serif';
      ctx.textBaseline = 'middle';
      ctx.fillText(label, labelX + 9, labelY + labelHeight / 2);
      ctx.restore();
    }
  };

  const cashCanvas = document.getElementById('cashFlowChart');
  const cashFlow = charts.cashFlow || {};

  if (cashCanvas && Array.isArray(cashFlow.labels)) {
    new Chart(cashCanvas.getContext('2d'), {
      type: 'line',
      plugins: [currentPeriodMarker],
      data: {
        labels: cashFlow.labels,
        datasets: [
          {
            label: dashboardI18n.income || 'Income',
            data: cashFlow.income || [],
            borderColor: '#22c55e',
            backgroundColor(context) {
              const chart = context.chart;
              const { ctx: chartCtx, chartArea } = chart;
              if (!chartArea) return 'rgba(34, 197, 94, 0.14)';
              return createGradient(chartCtx, chartArea, 'rgba(34, 197, 94, 0.18)');
            },
            borderWidth: 3,
            tension: 0.35,
            fill: true,
            pointRadius: 3.5,
            pointHoverRadius: 5,
            pointBackgroundColor: '#22c55e',
            pointBorderColor: '#ffffff',
            pointBorderWidth: 2
          },
          {
            label: dashboardI18n.expenses || 'Expenses',
            data: cashFlow.expenses || [],
            borderColor: '#ef4444',
            backgroundColor(context) {
              const chart = context.chart;
              const { ctx: chartCtx, chartArea } = chart;
              if (!chartArea) return 'rgba(239, 68, 68, 0.12)';
              return createGradient(chartCtx, chartArea, 'rgba(239, 68, 68, 0.15)');
            },
            borderWidth: 3,
            tension: 0.35,
            fill: true,
            pointRadius: 3.5,
            pointHoverRadius: 5,
            pointBackgroundColor: '#ef4444',
            pointBorderColor: '#ffffff',
            pointBorderWidth: 2
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          intersect: false,
          mode: 'index'
        },
        plugins: {
          currentPeriodMarker: {
            index: cashFlow.currentIndex,
            label: cashFlow.currentLabel
          },
          legend: {
            position: 'top',
            align: 'center',
            labels: {
              usePointStyle: true,
              boxWidth: 8,
              boxHeight: 8,
              color: '#374151',
              font: {
                family: 'Inter',
                size: 12,
                weight: '600'
              }
            }
          },
          tooltip: {
            padding: 12,
            backgroundColor: '#111827',
            titleFont: { family: 'Inter', weight: '700' },
            bodyFont: { family: 'Inter' },
            callbacks: {
              label(context) {
                return `${context.dataset.label}: ${moneyFormatter.format(context.parsed.y || 0)}`;
              }
            }
          }
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: {
              autoSkip: true,
              maxTicksLimit: 8,
              color: '#4b5563',
              font: { family: 'Inter', size: 12, weight: '600' }
            },
            border: { display: false }
          },
          y: {
            beginAtZero: true,
            grid: {
              color: 'rgba(148, 163, 184, 0.22)',
              drawBorder: false
            },
            ticks: {
              color: '#4b5563',
              font: { family: 'Inter', size: 12, weight: '600' },
              callback(value) {
                if (value >= 1000) return `€ ${value / 1000}k`;
                return `€ ${value}`;
              }
            },
            border: { display: false }
          }
        }
      }
    });
  }

  const categoryCanvas = document.getElementById('categoryChart');
  const categoryData = charts.categories || {};

  if (categoryCanvas && Array.isArray(categoryData.labels) && categoryData.labels.length) {
    new Chart(categoryCanvas.getContext('2d'), {
      type: 'doughnut',
      data: {
        labels: categoryData.labels,
        datasets: [
          {
            data: categoryData.totals || [],
            backgroundColor: categoryData.colors || [],
            borderColor: '#ffffff',
            borderWidth: 5,
            hoverOffset: 8
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '68%',
        plugins: {
          legend: { display: false },
          tooltip: {
            padding: 12,
            backgroundColor: getCssVar('--app-heading', '#111827'),
            titleFont: { family: 'Inter', weight: '700' },
            bodyFont: { family: 'Inter' },
            callbacks: {
              label(context) {
                return `${context.label}: ${moneyFormatter.format(context.parsed || 0)}`;
              }
            }
          }
        }
      }
    });
  }
})();
