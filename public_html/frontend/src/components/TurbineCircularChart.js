import React, { useEffect, useRef } from "react";
import * as d3 from "d3";

const TurbineCircularChart = ({ energyGenerated, maxEnergy, isActive }) => {
  const chartRef = useRef(null);
  const percentage = maxEnergy > 0 ? (energyGenerated / maxEnergy) * 100 : 0;

  useEffect(() => {
    drawChart(chartRef.current, percentage, isActive);
  }, [percentage, isActive]);

  return <div ref={chartRef} style={{ display: "flex", justifyContent: "center" }} />;
};

// ?? **D3 Function to Draw Circular Chart**
const drawChart = (container, percentage, isActive) => {
  if (!container) return;

  const width = 80, height = 80, radius = width / 2;
  const arc = d3.arc().innerRadius(radius - 10).outerRadius(radius).startAngle(0);
  const fillColor = isActive ? "#00FF00" : "#FF0000"; // Green for Active, Red for Inactive

  // ?? Remove previous SVG before re-drawing
  d3.select(container).selectAll("*").remove();

  const svg = d3.select(container)
    .append("svg")
    .attr("width", width)
    .attr("height", height)
    .append("g")
    .attr("transform", `translate(${width / 2},${height / 2})`);

  // ?? Background arc (gray)
  svg.append("path")
    .datum({ endAngle: Math.PI * 2 })
    .attr("d", arc)
    .style("fill", "#ddd");

  // ?? Foreground arc (progress)
  svg.append("path")
    .datum({ endAngle: (Math.PI * 2 * percentage) / 100 })
    .attr("d", arc)
    .style("fill", fillColor);

  // ?? Energy percentage text inside the circle
  svg.append("text")
    .attr("text-anchor", "middle")
    .attr("dy", "0.3em")
    .attr("fill", "white")
    .style("font-size", "14px")
    .text(`${Math.round(percentage)}%`);
};

export default TurbineCircularChart;
