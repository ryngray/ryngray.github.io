import { colormap as colorScale } from './colormap.js';


d3.csv('APT_data.csv').then(data => {
    // Convert date strings to Date objects
    data.forEach(d => {
        d.date = new Date(d.Date);  // Ensure dates are Date objects
    });

    // Create a map to hold the count of dates for each key
    const dateCountMap = new Map();

    // Count occurrences of each key and associated date
    data.forEach(d => {
        const key = d.Indicator;  // Assuming 'Indicator' is the key you're using
        const date = d.date;

        // Only count if the date is valid
        if (!isNaN(date)) {
            // If the key does not exist, initialize it
            if (!dateCountMap.has(key)) {
                dateCountMap.set(key, new Map());
            }

            // Count the occurrence for each date per key
            const dateCount = dateCountMap.get(key);
            dateCount.set(date, (dateCount.get(date) || 0) + 1);
        }
    });

    // Prepare the time series data array with cumulative counts
    const timeSeriesData = [];
    const lastCounts = {}; // Object to track the last count for each key
    const sortedUniqueDates = Array.from(dateCountMap.values())
        .flatMap(dateMap => Array.from(dateMap.keys()))
        .filter(date => !isNaN(date))
        .sort((a, b) => a - b); // Get sorted unique dates across all keys


    //Iterate through each unique date and each key
    sortedUniqueDates.forEach(date => {
        dateCountMap.forEach((dateMap, key) => {
            const countForDate = dateMap.get(date) || 0; // Get count for that date

            // Update lastCounts with the current count or retain the previous count
            lastCounts[key] = (lastCounts[key] || 0) + countForDate;

            // Push to timeSeriesData with the key, cumulative count, and date
            timeSeriesData.push({ key: key, count: lastCounts[key], time: date });
        });
    });


    timeSeriesData.sort((a, b) => a.time - b.time);

        // Group by key and date, keeping the max count
    const result = Object.values(
      timeSeriesData.reduce((acc, item) => {
        const groupKey = `${item.key}|${item.time.toISOString().split("T")[0]}`; // Combine key and date
        if (!acc[groupKey] || acc[groupKey].count < item.count) {
          acc[groupKey] = item;
        }
        return acc;
      }, {})
    );

    console.log(result);

        

    const startDate = new Date("1984-01-01");

    // Filter the data to only include dates from 1984 onward
    const filteredTimeSeriesData = result.filter(d => d.time >= startDate);


    chart(filteredTimeSeriesData);


});


function chart(data) {

    const margin = { top: 50, right: 30, bottom: 50, left: 100 };
    // Get the screen dimensions
    const width = window.innerWidth - margin.left - margin.right;
    const height = window.innerHeight - margin.top - margin.bottom;

    // Create the SVG element
    const svg = d3.select("#indicatorChart").append("svg")
        .attr("width", width)
        .attr("height", height);

    // Set up margins and dimensions
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;
    const tooltip = d3.select("#indicator-tooltip");

    // You can add event listeners to resize the visualization when the window size changes
    window.addEventListener('resize', () => {
        const newWidth = window.innerWidth - margin.left - margin.right;
        const newHeight = window.innerHeight - margin.top - margin.bottom;
        
        svg.attr("width", newWidth)
            .attr("height", newHeight);
    })


    // Create scales
    const xScale = d3.scaleTime()
        .domain(d3.extent(data, d => d.time)) // Use the time field for the x-axis
        .range([0, innerWidth]);

    const yScale = d3.scaleLinear()
        .domain([0, d3.max(data, d => d.count)]) // Use the count field for the y-axis
        .nice()
        .range([innerHeight, 0]); // Flip y-axis for SVG coordinates

    // Filter out invalid or undefined keys
    const validData = data.filter(d => typeof d.key === "string" && d.key.trim() !== "");
    const groupedData = d3.group(validData, d => d.key);

    const uniqueDomain = Array.from(new Set(colorScale.domain())); // Remove duplicates
    const legendGroup = svg.append("g")
        // .attr("transform", `translate(${width + margin.right}, ${margin.top})`);
        // .attr("transform", `translate(${margin.left}, ${height + margin.bottom + 20})`); //
        .attr("transform", `translate(${margin.right+100}, ${margin.top+75})`); // Adjust position

   // Legend configuration
    const itemHeight = 10; // Reduce the height of each legend item
    const spaceBetweenItems = 5; // Reduce the spacing between items
    const textOffset = 15; // Adjust text offset to match smaller size

    // Create a legend item for each category in the ordered domain
    const legendItems = legendGroup.selectAll(".legend-item")
        .data(uniqueDomain) // Use the ordered domain
        .enter().append("g")
        .attr("class", "legend-item")
        .attr("transform", (d, i) => `translate(0, ${i * (itemHeight + spaceBetweenItems)})`);

    // Append a smaller colored rectangle for each item
    legendItems.append("rect")
        .attr("width", 10) // Smaller width for the color box
        .attr("height", itemHeight) // Smaller height for the color box
        .style("fill", d => colorScale(d)); // Use the colormap to get the color

    // Append smaller text labels next to each color box
    legendItems.append("text")
        .attr("x", textOffset) // Position the text closer to the color box
        .attr("y", itemHeight / 2) // Vertically center the text
        .attr("dy", ".35em") // Adjust vertical alignment
        .style("font-size", "10px") // Reduce font size for smaller text
        .text(d => d); // The category name from the domain

    // Add a group for the chart
    const g = svg.append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    // Add x-axis
    const xAxis = d3.axisBottom(xScale).ticks(10).tickFormat(d3.timeFormat("%Y"));
    g.append("g")
        .attr("transform", `translate(0,${innerHeight})`)
        .call(xAxis)
        .append("text")
        .attr("x", innerWidth / 2)
        .attr("y", 40)
        .attr("fill", "black")
        .style("text-anchor", "middle")
        .text("Year");

    // Add y-axis
    const yAxis = d3.axisLeft(yScale);
    g.append("g")
        .call(yAxis)
        .append("text")
        .attr("x", -150)
        .attr("y", -40)
        .attr("fill", "black")
        .style("text-anchor", "middle")
        .attr("transform", "rotate(-90)")
        .text("Number of Countries");

    // Draw line
    const line = d3.line()
        .x(d => xScale(d.time))
        .y(d => yScale(d.count));

    // g.append("path")
    //     .datum(data)
    //     .attr("fill", "none")
    //     .attr("stroke", d => colorScale(d.key))
    //     .attr("stroke-width", 2)
    //     .attr("d", line);

    groupedData.forEach((values, key) => {
        g.append("path")
            .datum(values) // Use the data for this key
            .attr("fill", "none")
            .attr("stroke", colorScale(key)) // Use a color scale to differentiate lines
            .attr("stroke-width", 2)
            .attr("d", line);
    });


    // Optional: Add points
    g.selectAll(".dot")
        .data(data)
        .enter()
        .append("circle")
        .attr("cx", d => xScale(d.time))
        .attr("cy", d => yScale(d.count))
        .attr("r", 3)
        .attr("stroke", d => colorScale(d.key))
        .attr("fill", d => colorScale(d.key))
        .on("mouseover", (event, d) => {
            tooltip.style("display", "block")
                   .html(` ${d.key}<br>Count: ${d.count}<br>Date: ${parseInt(d3.timeFormat("%Y")(d.time))+1}`);
        })
        .on("mousemove", event => {
            tooltip.style("top", `${event.pageY + 10}px`)
                   .style("left", `${event.pageX + 10}px`);
        })
        .on("mouseout", () => {
            tooltip.style("display", "none");
        });


    // Important points with their corresponding years
    const importantPoints = [
        { year: 1984, label: "UN adopts Convention against Torture" },
        { year: 2002, label: "UN adopts OPCAT" },
        { year: 1993, label: "UN adopts Paris Principles" }
    ].map(d => ({ year: new Date(d.year, 0, 1), label: d.label }));

    // Create a group for the vertical lines
    const verticalLinesGroup = svg.append("g")
        .attr("class", "vertical-lines")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    // Add lines for each important point
    verticalLinesGroup.selectAll("line")
        .data(importantPoints)
        .enter().append("line")
        .attr("x1", d => xScale(d.year)) // Position based on the year
        .attr("x2", d => xScale(d.year)) // Same position for a vertical line
        .attr("y1", margin.top) // Start at the top of the chart
        .attr("y2", height - margin.bottom) // End at the bottom of the chart
        .attr("stroke", "gray") // Line color
        .attr("stroke-dasharray", "4,4") // Dashed line style (optional)
        .attr("stroke-width", 1.5); // Line thickness

    // Add labels for each vertical line
    verticalLinesGroup.selectAll("text")
        .data(importantPoints)
        .enter().append("text")
        .attr("x", d => xScale(d.year) + 5) // Offset slightly to the right of the line
        .attr("y", margin.top - 5) // Place above the chart area
        .text(d => d.label) // Use the label from data
        .attr("font-size", "15px") // Small text size
        .attr("fill", "#285391")
        .attr("text-anchor", "start"); // Align text to the start
}

