import './PointsTracker.css';
import { useState, useEffect } from 'react';
import { supabase } from '../../../../lib/supabase';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { Line } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

function PointsTracker({ sessionId, dateFilter, targetUserId = null }) {
  const [data, setData] = useState({
    progression: [],
    stats: {
      startingPoints: 0,
      currentPoints: 0,
      highestPoints: 0,
      lowestPoints: 0,
      netChange: 0
    }
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPointsData();
  }, [sessionId, dateFilter, targetUserId]);

  const fetchPointsData = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      let url = `http://localhost:3001/api/sessions/${sessionId}/points-tracker`;
      const params = new URLSearchParams();
      if (dateFilter !== 'all') params.append('days', dateFilter);
      if (targetUserId) params.append('userId', targetUserId);
      if (params.toString()) url += `?${params.toString()}`;
      
      const response = await fetch(url, {
        headers: { 'Authorization': `Bearer ${session.access_token}` }
      });
      
      const result = await response.json();
      if (result.data) {
        setData(result.data);
      }
    } catch (err) {
      console.error('Failed to load points data:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="points-loading">Loading...</div>;
  if (data.progression.length === 0) return <div className="no-data">No duel data yet</div>;

  const chartData = {
    labels: data.progression.map((_, index) => `Duel ${index + 1}`),
    datasets: [
      {
        label: 'Points',
        data: data.progression.map(p => p.points),
        borderColor: 'rgb(99, 102, 241)',
        backgroundColor: 'rgba(99, 102, 241, 0.1)',
        fill: true,
        tension: 0.3,
        pointRadius: 4,
        pointHoverRadius: 8,
        borderWidth: 2
      }
    ]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false
      },
      tooltip: {
        enabled: false,
        external: (context) => {
          const { chart, tooltip } = context;
          let tooltipEl = chart.canvas.parentNode.querySelector('.chartjs-tooltip');

          if (!tooltipEl) {
            tooltipEl = document.createElement('div');
            tooltipEl.className = 'chartjs-tooltip';
            tooltipEl.style.cssText = 'position: absolute; background: rgba(0, 0, 0, 0.9); color: white; border: 1px solid rgba(255, 255, 255, 0.2); border-radius: 6px; padding: 12px; pointer-events: none; transition: all 0.1s ease; font-size: 13px; line-height: 1.6; z-index: 1000;';
            chart.canvas.parentNode.appendChild(tooltipEl);
          }

          if (tooltip.opacity === 0) {
            tooltipEl.style.opacity = 0;
            return;
          }

          if (tooltip.body) {
            const index = tooltip.dataPoints[0].dataIndex;
            const duel = data.progression[index];
            const changeColor = duel.pointsChange >= 0 ? '#4ade80' : '#f87171';
            const resultColor = duel.result === 'win' ? '#4ade80' : '#f87171';

            tooltipEl.innerHTML = `
              <div style="font-weight: 600; margin-bottom: 8px; color: rgba(255, 255, 255, 0.9);">Duel ${index + 1}</div>
              <div style="margin-bottom: 4px;">
                Points: <strong>${duel.points}</strong> 
                <span style="color: ${changeColor}; font-weight: 600;">(${duel.pointsChange >= 0 ? '+' : ''}${duel.pointsChange})</span>
              </div>
              <div style="margin-bottom: 4px;">
                Result: <span style="color: ${resultColor}; font-weight: 600;">${duel.result.toUpperCase()}</span>
              </div>
              <div style="margin-bottom: 4px; color: rgba(255, 255, 255, 0.8);">Your Deck: ${duel.playerDeck}</div>
              <div style="margin-bottom: 4px; color: rgba(255, 255, 255, 0.8);">Opponent: ${duel.opponentDeck}</div>
              <div style="color: rgba(255, 255, 255, 0.7); font-size: 12px;">
                ${duel.wentFirst ? '1st' : '2nd'} Turn • ${duel.coinFlipWon ? 'Won' : 'Lost'} Coin
              </div>
            `;
          }

          const { offsetLeft: positionX, offsetTop: positionY } = chart.canvas;
          tooltipEl.style.opacity = 1;
          tooltipEl.style.left = positionX + tooltip.caretX + 'px';
          tooltipEl.style.top = positionY + tooltip.caretY + 'px';
        }
      }
    },
    scales: {
      x: {
        grid: {
          color: 'rgba(255, 255, 255, 0.05)'
        },
        ticks: {
          color: 'rgba(255, 255, 255, 0.6)',
          maxRotation: 45,
          minRotation: 45
        }
      },
      y: {
        grid: {
          color: 'rgba(255, 255, 255, 0.05)'
        },
        ticks: {
          color: 'rgba(255, 255, 255, 0.6)'
        }
      }
    },
    interaction: {
      mode: 'nearest',
      axis: 'x',
      intersect: false
    }
  };

  return (
    <div className="points-tracker-container">
      <div className="chart-section">
        <div className="section-title">Rating Progression</div>
        <div className="chart-wrapper">
          <Line data={chartData} options={chartOptions} />
        </div>
      </div>

      <div className="section-title">Key Statistics</div>
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-card-label">Current Points</div>
          <div className="stat-card-value">{data.stats.currentPoints}</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-label">Highest Reached</div>
          <div className="stat-card-value">{data.stats.highestPoints}</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-label">Net Change</div>
          <div className="stat-card-value" style={{ color: data.stats.netChange >= 0 ? '#4ade80' : '#f87171' }}>
            {data.stats.netChange >= 0 ? '+' : ''}{data.stats.netChange}
          </div>
        </div>
      </div>
    </div>
  );
}

export default PointsTracker;
