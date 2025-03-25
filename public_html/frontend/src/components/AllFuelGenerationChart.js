import * as d3 from "d3";
import React, { useEffect, useRef } from "react";

const AllFuelGenerationChart = ({ data, width = 800, height = 400 }) => {
  const svgRef = useRef();
  const tooltipRef = useRef();

  useEffect(() => {
    if (!data || data.length === 0) return;

    const margin = { top: 20, right: 150, bottom: 50, left: 80 };
    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();
    svg.attr("width", width).attr("height", height);

    // 1?? Extract unique fuel types
    const fuelTypes = [...new Set(data.flatMap(d => d.fuels.map(f => f.fuelType)))];

    // 2?? Convert data to stacked format
    const stackedData = data.map(d => {
      const obj = { time: d.time };
      fuelTypes.forEach(fuel => {
        obj[fuel] = d.fuels.find(f => f.fuelType === fuel)?.valueGeneration || 0;
      });
      return obj;
    });

    // 3?? Define scales
    const xScale = d3.scaleBand()
      .domain(data.map(d => d.time))
      .range([margin.left, width - margin.right])
      .padding(0.1);

    const yScale = d3.scaleLinear()
      .domain([0, d3.max(stackedData, d => d3.sum(fuelTypes, f => d[f])) || 1])
      .range([height - margin.bottom, margin.top]);

    // 4?? Stack the data
    const stack = d3.stack().keys(fuelTypes);
    const series = stack(stackedData);

    // 5?? Define color scale
    const colorScale = d3.scaleOrdinal(d3.schemeCategory10).domain(fuelTypes);

    // 6?? Draw stacked areas
    const areaGenerator = d3.area()
      .x(d => xScale(d.data.time) + xScale.bandwidth() / 2)
      .y0(d => yScale(d[0]))
      .y1(d => yScale(d[1]))
      .curve(d3.curveMonotoneX);

    series.forEach(fuelData => {
      svg.append("path")
        .datum(fuelData)
        .attr("fill", colorScale(fuelData.key))
        .attr("opacity", 0.7)
        .attr("d", areaGenerator);
    });

    // 7?? Add Data Labels
    series.forEach(fuelData => {
      svg.selectAll(`.label-${fuelData.key}`)
        .data(fuelData)
        .enter()
        .append("text")
        .attr("x", d => xScale(d.data.time) + xScale.bandwidth() / 2)
        .attr("y", d => yScale(d[1]) - 5)
        .attr("fill", "white")
        .attr("font-size", "10px")
        .attr("text-anchor", "middle")
        .text(d => d3.format(".1f")(d[1] - d[0])); // Shows only fuel contribution
    });

    // 8?? Create X & Y Axis
    svg.append("g")
    .attr("transform", `translate(0, ${height - margin.bottom})`)
    .call(
      d3.axisBottom(xScale)
        .tickValues(data.map((d, i) => (i % 3 === 0 ? d.time : null)).filter(d => d)) // Show every 3rd label
        .tickSizeOuter(0)
    )
    .selectAll("text")
    .attr("fill", "white")
    .attr("transform", "rotate(-25)")  // Rotate slightly for better spacing
    .style("text-anchor", "middle")
    .style("font-size", "12px"); // Adjust for readability
  

    svg.append("g")
      .attr("transform", `translate(${margin.left}, 0)`)
      .call(d3.axisLeft(yScale))
      .selectAll("text")
      .attr("fill", "white");

    // X-Axis Label
    svg.append("text")
      .attr("x", width / 2)
      .attr("y", height - 10)
      .attr("fill", "white")
      .style("text-anchor", "middle")
      .text("Time");

    // Y-Axis Label
    svg.append("text")
      .attr("transform", "rotate(-90)")
      .attr("x", -height / 2)
      .attr("y", 20)
      .attr("fill", "white")
      .style("text-anchor", "middle")
      .text("Electricity Generation (MW)");

    // 9?? Create Legend
    const legend = svg.append("g")
      .attr("transform", `translate(${width - 140}, 50)`);

    fuelTypes.forEach((fuel, i) => {
      const legendRow = legend.append("g")
        .attr("transform", `translate(0, ${i * 20})`);

      legendRow.append("rect")
        .attr("width", 12)
        .attr("height", 12)
        .attr("fill", colorScale(fuel));

      legendRow.append("text")
        .attr("x", 18)
        .attr("y", 10)
        .attr("fill", "white")
        .style("font-size", "12px")
        .text(fuel);
    });

    // ?? Add Tooltip
    const tooltip = d3.select(tooltipRef.current)
      .style("position", "absolute")
      .style("background", "rgba(0, 0, 0, 0.7)")
      .style("color", "white")
      .style("padding", "8px")
      .style("border-radius", "5px")
      .style("pointer-events", "none")
      .style("display", "none");

    svg.selectAll("circle")
      .data(stackedData)
      .enter()
      .append("circle")
      .attr("cx", d => xScale(d.time) + xScale.bandwidth() / 2)
      .attr("cy", d => yScale(d3.sum(fuelTypes, f => d[f])))
      .attr("r", 5)
      .attr("fill", "white")
      .style("cursor", "pointer")
      .on("mouseover", (event, d) => {
        const fuelData = fuelTypes.map(f => `${f}: ${d[f] || 0} MW`).join("<br>");
        tooltip.html(`Time: ${d.time}<br>${fuelData}`)
          .style("left", `${event.pageX + 10}px`)
          .style("top", `${event.pageY - 30}px`)
          .style("display", "block");
      })
      .on("mouseout", () => {
        tooltip.style("display", "none");
      });

  }, [data, width, height]);

  return (
    <div>
      <svg ref={svgRef}></svg>
      <div ref={tooltipRef}></div>
    </div>
  );
};

export default AllFuelGenerationChart;
