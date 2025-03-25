import React, { useEffect, useRef } from "react";
import * as d3 from "d3";

const SolarGenerationChart = ({ data, width = 800, height = 400 }) => {
  const svgRef = useRef();

  useEffect(() => {
    if (!data || data.length === 0) return;

    // Set margins
    const margin = { top: 20, right: 100, bottom: 50, left: 60 };

    // Select the SVG and clear previous content
    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();
    svg.attr("width", width).attr("height", height);

    // Define scales
    const xScale = d3
      .scaleBand()
      .domain(data.map((d) => d.time))
      .range([margin.left, width - margin.right])
      .padding(0.1);

    const yScale = d3
      .scaleLinear()
      .domain([0, d3.max(data, (d) => d.solarGeneration) || 1])
      .range([height - margin.bottom, margin.top]);

    // Discrete color scale based on Cloud Cover categories
    const colorScale = d3
      .scaleThreshold()
      .domain([5, 20, 50, 80]) // Define cloud cover thresholds
      .range(["lightgreen", "yellow", "orange", "red", "purple"]); // Corresponding colors

    // Split data into segments for color application
    const segmentedData = data.map((d, i) => ({
      ...d,
      color: colorScale(d.cloudCover),
      nextTime: i < data.length - 1 ? data[i + 1].time : d.time, // Ensuring continuity
    }));

    // Area Generator for each segment
    const areaGenerator = d3
      .area()
      .x((d) => xScale(d.time) + xScale.bandwidth() / 2)
      .y0(height - margin.bottom)
      .y1((d) => yScale(d.solarGeneration))
      .curve(d3.curveMonotoneX);

    // Append paths with different colors for each segment
    segmentedData.forEach((d, i) => {
      if (i < segmentedData.length - 1) {
        svg
          .append("path")
          .datum([segmentedData[i], segmentedData[i + 1]]) // Two-point segment
          .attr("fill", d.color)
          .attr("opacity", 0.7)
          .attr("d", areaGenerator);
      }
    });

    // Tooltip setup inside the component to prevent conflicts
    const tooltip = d3
      .select(svgRef.current.parentNode)
      .append("div")
      .style("position", "absolute")
      .style("background", "rgba(0, 0, 0, 0.7)")
      .style("color", "white")
      .style("padding", "5px")
      .style("border-radius", "5px")
      .style("visibility", "hidden");

    // Circles for hover effect
    svg
      .selectAll(".dot")
      .data(data)
      .enter()
      .append("circle")
      .attr("cx", (d) => xScale(d.time) + xScale.bandwidth() / 2)
      .attr("cy", (d) => yScale(d.solarGeneration))
      .attr("r", 5)
      .attr("fill", "white")
      .attr("opacity", 0.8)
      .on("mouseover", (event, d) => {
        tooltip
          .style("visibility", "visible")
          .html(
            `Time: ${d.time}<br>Solar Generation: ${d.solarGeneration} MW<br>Cloud Cover: ${d.cloudCover}%`
          );
      })
      .on("mousemove", (event) => {
        tooltip
          .style("top", `${event.pageY - 10}px`)
          .style("left", `${event.pageX + 10}px`);
      })
      .on("mouseout", () => {
        tooltip.style("visibility", "hidden");
      });

    // X-axis
    svg
      .append("g")
      .attr("transform", `translate(0,${height - margin.bottom})`)
      .call(d3.axisBottom(xScale).tickSize(5))
      .selectAll("text")
      .attr("transform", "rotate(-45)")
      .style("text-anchor", "end");

    // Y-axis
    svg
      .append("g")
      .attr("transform", `translate(${margin.left},0)`)
      .call(d3.axisLeft(yScale));

    // Add labels
    svg
      .append("text")
      .attr("x", width / 2)
      .attr("y", height - 10)
      .attr("text-anchor", "middle")
      .style("fill", "white")
      .text("Time (HH:00)");

    svg
      .append("text")
      .attr("x", -height / 2)
      .attr("y", 15)
      .attr("text-anchor", "middle")
      .attr("transform", "rotate(-90)")
      .style("fill", "white")
      .text("Solar Generation (MW)");

    // ?? **ADDING LEGEND FOR CLOUD COVER CATEGORIES**
    const legend = svg.append("g").attr("transform", `translate(${width - 100}, 50)`);

    const cloudCoverCategories = [
      { cover: "< 5%", color: "lightgreen" },
      { cover: "5 - 20%", color: "yellow" },
      { cover: "20 - 50%", color: "orange" },
      { cover: "50 - 80%", color: "red" },
      { cover: "> 80%", color: "purple" },
    ];

    cloudCoverCategories.forEach((cat, i) => {
      const legendRow = legend.append("g").attr("transform", `translate(0, ${i * 20})`);

      legendRow.append("rect").attr("width", 12).attr("height", 12).attr("fill", cat.color);

      legendRow
        .append("text")
        .attr("x", 18)
        .attr("y", 10)
        .attr("fill", "white")
        .style("font-size", "12px")
        .text(cat.cover);
    });

    console.log("Chart rendered with segmented colors:", segmentedData);
  }, [data, width, height]);

  return (
    <div>
      <svg ref={svgRef}></svg>
    </div>
  );
};

export default SolarGenerationChart;
