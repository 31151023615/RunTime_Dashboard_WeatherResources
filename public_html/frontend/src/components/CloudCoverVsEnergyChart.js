import React from 'react';
import { Line } from 'react-chartjs-2';

const CloudCoverVsEnergyChart = ({ data }) => {
  if (!data) {
    return <div>Loading...</div>;
  }
  const chartData = {
    labels: data.hours,
    datasets: [
      {
        label: 'Cloud Cover Intensity (%)',
        data: data.cloudCovers,
        borderColor: 'rgba(255, 206, 86, 1)',
        backgroundColor: 'rgba(255, 206, 86, 0.2)',
        fill: true,
        tension: 0.4,
      },
      {
        label: 'Energy Output (MW)',
        data: data.energyOutputs,
        borderColor: 'rgba(75, 192, 192, 1)',
        tension: 0.4,
      },
    ],
  };

  const options = {
    responsive: true,
    scales: {
      y: {
        beginAtZero: true,
        title: {
          display: true,
          text: 'Values',
        },
      },
    },
  };

  return <Line data={chartData} options={options} />;
};

export default CloudCoverVsEnergyChart;
