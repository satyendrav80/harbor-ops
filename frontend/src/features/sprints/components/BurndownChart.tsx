import { useMemo } from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import type { BurndownDataPoint } from '../../../services/sprints';

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

type BurndownChartProps = {
  data: BurndownDataPoint[];
  sprintName: string;
};

export function BurndownChart({ data, sprintName }: BurndownChartProps) {
  const chartData = useMemo(() => {
    const labels = data.map((d) => new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));

    return {
      labels,
      datasets: [
        {
          label: 'Ideal',
          data: data.map((d) => d.ideal),
          borderColor: 'rgb(156, 163, 175)',
          backgroundColor: 'rgba(156, 163, 175, 0.1)',
          borderDash: [5, 5],
          tension: 0.1,
          fill: false,
        },
        {
          label: 'Actual',
          data: data.map((d) => d.actual),
          borderColor: 'rgb(59, 130, 246)',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          tension: 0.3,
          fill: true,
        },
      ],
    };
  }, [data]);

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          color: 'rgb(107, 114, 128)',
          font: {
            size: 12,
          },
        },
      },
      title: {
        display: true,
        text: `${sprintName} - Burndown Chart`,
        color: 'rgb(17, 24, 39)',
        font: {
          size: 16,
          weight: 'bold',
        },
      },
      tooltip: {
        mode: 'index' as const,
        intersect: false,
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        title: {
          display: true,
          text: 'Tasks Remaining',
          color: 'rgb(107, 114, 128)',
        },
        ticks: {
          color: 'rgb(107, 114, 128)',
        },
        grid: {
          color: 'rgba(107, 114, 128, 0.1)',
        },
      },
      x: {
        ticks: {
          color: 'rgb(107, 114, 128)',
        },
        grid: {
          color: 'rgba(107, 114, 128, 0.1)',
        },
      },
    },
  };

  return (
    <div className="bg-white dark:bg-[#1C252E] border border-gray-200 dark:border-gray-700/50 rounded-lg p-6">
      <div className="h-80">
        <Line data={chartData} options={options} />
      </div>
    </div>
  );
}
