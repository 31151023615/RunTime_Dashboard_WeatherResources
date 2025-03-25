import React, { useRef, useEffect } from "react";
import * as d3 from "d3";

const TemperatureVsDemandChart = ({ data, width = 800, height = 400 }) => {
  const svgRef = useRef();
  const isDataAvailable = data && data.length > 0;

  useEffect(() => {
    if (!isDataAvailable) return;

    // Extract time, temperature, and demand values
    const times = data.map((entry) => entry.time);
    const temperatures = data.map((entry) => entry.temperature);
    const demands = data.map((entry) => entry.demand);

    d3.select(svgRef.current).selectAll("*").remove();

    const svg = d3.select(svgRef.current).attr("width", width).attr("height", height);

    const margin = { top: 30, right: 60, bottom: 50, left: 60 };
    const chartWidth = width - margin.left - margin.right;
    const chartHeight = height - margin.top - margin.bottom;

    const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

    const xScale = d3.scaleBand().domain(times).range([0, chartWidth]).padding(0.2);
    const yScaleTemp = d3
      .scaleLinear()
      .domain([d3.min(temperatures) - 5, d3.max(temperatures) + 5])
      .range([chartHeight, 0]);
    const yScaleDemand = d3.scaleLinear().domain([0, d3.max(demands) + 5000]).range([chartHeight, 0]);

    const xAxis = d3.axisBottom(xScale);
    const yAxisLeft = d3.axisLeft(yScaleTemp).ticks(6).tickFormat((d) => `${d}°C`);
    const yAxisRight = d3.axisRight(yScaleDemand).ticks(6).tickFormat((d) => `${d} MW`);

    g.append("g").attr("transform", `translate(0,${chartHeight})`).call(xAxis);
    g.append("g").call(yAxisLeft);
    g.append("g").attr("transform", `translate(${chartWidth},0)`).call(yAxisRight);

    // Bars for Demand
    g.selectAll(".bar")
      .data(data)
      .enter()
      .append("rect")
      .attr("x", (d) => xScale(d.time))
      .attr("y", (d) => yScaleDemand(d.demand))
      .attr("width", xScale.bandwidth())
      .attr("height", (d) => chartHeight - yScaleDemand(d.demand))
      .attr("fill", "steelblue");

    // Temperature Line
    const line = d3
      .line()
      .x((d, i) => xScale(times[i]) + xScale.bandwidth() / 2)
      .y((d, i) => yScaleTemp(temperatures[i]))
      .curve(d3.curveMonotoneX);

    g.append("path")
      .datum(data)
      .attr("fill", "none")
      .attr("stroke", "red")
      .attr("stroke-width", 2)
      .attr("d", line);

    g.selectAll(".circle")
      .data(data)
      .enter()
      .append("circle")
      .attr("cx", (d, i) => xScale(times[i]) + xScale.bandwidth() / 2)
      .attr("cy", (d, i) => yScaleTemp(temperatures[i]))
      .attr("r", 4)
      .attr("fill", "red");
  }, [isDataAvailable, data, width, height]);

  return (
    <div style={{ position: "relative" }}>
      <svg ref={svgRef} width={width} height={height}></svg>
      {!isDataAvailable && (
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            color: "white",
            fontSize: "16px",
            fontWeight: "bold",
          }}
        >
          Waiting for data...
        </div>
      )}
    </div>
  );
};

export default TemperatureVsDemandChart;
