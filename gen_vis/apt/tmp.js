function visualizeRaincloud(data) {
    const margin = { top: 50, right: 30, bottom: 50, left: 100 };
    // Get the screen dimensions
    const width = window.innerWidth - margin.left - margin.right;
    const height = window.innerHeight - margin.top - margin.bottom;

    // Create the SVG element
    const svg = d3.select("#raincloudChart").append("svg")
        .attr("width", width)
        .attr("height", height);

    // You can add event listeners to resize the visualization when the window size changes
    window.addEventListener('resize', () => {
        const newWidth = window.innerWidth - margin.left - margin.right;
        const newHeight = window.innerHeight - margin.top - margin.bottom;
        
        svg.attr("width", newWidth)
            .attr("height", newHeight);

    // Set up flipped scales

        // Aggregate data for "World"
    const worldData = data.map(d => d.count);

    // Add "World" as a region
    const worldRegion = { region: "World", data: worldData };

    let regions = Array.from(new Set(data.map(d => d.region))); // Unique regions
    regions = [...new Set(data.map(d => d.region)), "World"]; // Add "World"

    // Set up scales based on updated width and height
    const xScale = d3.scaleLinear()
        .domain([0, 8])
        .nice()
        .range([margin.left, width - margin.right]);

    const yScale = d3.scalePoint()
        .domain(["World", ...new Set(data.map(d => d.region))])
        .range([margin.top, height - margin.bottom])
        .padding(0.5);

    // Color scale for points
    const colorScale = d3.scaleOrdinal()
        .range(sharedColormap.range());

    // Draw violin plots for each region
    regions.forEach(region => {
        // const regionData = data.filter(d => d.region === region).map(d => d.count);
        let regionData;

        if (region === "World") {
            regionData = worldData; // Use aggregated world data
        } else {
            regionData = data.filter(d => d.region === region).map(d => d.count);
        }

        // Kernel density estimation for the violin plot shape
        const kde = kernelDensityEstimator(kernelEpanechnikov(2), xScale.ticks(50));
        const density = kde(regionData);

        const area = d3.area()
            .curve(d3.curveBasis)
            .y0(d => yScale(region))  // Bottom side of the violin
            .y1(d => yScale(region) - d[1] * 200) // Top side of the violin
            .x(d => xScale(d[0]));  // X value based on count

        svg.append("path")
            .datum(density)
            .attr("fill", colorScale(region))
            .attr("opacity", 0.4)
            .attr("d", area);
    });

    // Add x-axis and y-axis
    svg.append("g")
        .attr("transform", `translate(0,${margin.top})`)
        .call(d3.axisTop(xScale));

    svg.append("g")
        .attr("transform", `translate(${margin.left},0)`)
        .call(d3.axisLeft(yScale));

    // Draw data points (with jitter)
    svg.append("g")
        .selectAll("circle")
        .data(data)
        .enter().append("circle")
        .attr("cy", d => yScale(d.region) + jitterMapY.get(d.country)) // Adjusted for flipped axes
        .attr("cx", d => xScale(d.count) + jitterMapX.get(d.country)) // Adjusted for flipped axes
        .attr("r", 5)
        .attr("fill", d => colorScale(d.region))
        .attr("stroke", "black")
        .attr("stroke-width", 0.5)
        .on("mouseover", function(event, d) {
            const tooltipContent = `Country: ${d.country}<br>Indicators: ${d.indicators.join(",<br> ") || "None"}`;
            d3.select("#raincloud-tooltip")
                .html(tooltipContent)
                .style("left", (event.pageX + 5) + "px")
                .style("top", (event.pageY - 28) + "px")
                .style("visibility", "visible");
        })
        .on("mousemove", function(event) {
            d3.select("#raincloud-tooltip")
                .style("left", (event.pageX + 5) + "px")
                .style("top", (event.pageY - 28) + "px");
        })
        .on("mouseout", function() {
            d3.select("#raincloud-tooltip").style("visibility", "hidden");
        });

        // Draw data points (with jitter)
        svg.append("g")
            .selectAll("circle")
            .data(data)
            .enter().append("circle")
            .attr("cy", d => yScale("World") + jitterMapY.get(d.country)) // Adjusted for flipped axes
            .attr("cx", d => xScale(d.count) + jitterMapX.get(d.country)) // Adjusted for flipped axes
            .attr("r", 5)
            .attr("fill", d => colorScale("World"))
            .attr("stroke", "black")
            .attr("stroke-width", 0.5)
            .on("mouseover", function(event, d) {
                const tooltipContent = `Country: ${d.country}<br>Indicators: ${d.indicators.join(",<br> ") || "None"}`;
                d3.select("#raincloud-tooltip")
                    .html(tooltipContent)
                    .style("left", (event.pageX + 5) + "px")
                    .style("top", (event.pageY - 28) + "px")
                    .style("visibility", "visible");
            })
            .on("mousemove", function(event) {
                d3.select("#raincloud-tooltip")
                    .style("left", (event.pageX + 5) + "px")
                    .style("top", (event.pageY - 28) + "px");
            })
            .on("mouseout", function() {
                d3.select("#raincloud-tooltip").style("visibility", "hidden");
            });


        console.log("REGIONS", regions)

    // Compute box plots for each region, including "World"
regions.forEach(region => {
    let regionData;

    if (region === "World") {
        // Use the precomputed worldData array for the "World" region
        regionData = worldData;
    } else {
        // Filter data for the specific region
        regionData = data.filter(d => d.region === region).map(d => d.count);
    }

    if (regionData.length === 0) {
        console.warn(`No data available for region: ${region}`);
        return;
    }
    // Compute box plot statistics
    const sortedData = regionData.sort(d3.ascending);
    const q1 = d3.quantile(sortedData, 0.25);
    const median = d3.median(sortedData);
    const q3 = d3.quantile(sortedData, 0.75);
    const iqr = q3 - q1;
    const lowerWhisker = Math.max(d3.min(regionData), q1 - 1.5 * iqr);
    const upperWhisker = Math.min(d3.max(regionData), q3 + 1.5 * iqr);
    const outliers = regionData.filter(d => d < lowerWhisker || d > upperWhisker);

    // Add the box
    svg.append("rect")
        .attr("x", xScale(q1))
        .attr("y", yScale(region) - 10) // Centered around the region
        .attr("width", xScale(q3) - xScale(q1))
        .attr("height", 20)
        .attr("fill", colorScale(region))
        .attr("stroke", "black")
        .attr("opacity", 0.5);

    // Add the median line
    svg.append("line")
        .attr("x1", xScale(median))
        .attr("x2", xScale(median))
        .attr("y1", yScale(region) - 10)
        .attr("y2", yScale(region) + 10)
        .attr("stroke", "black");

    // Add whiskers
    svg.append("line")
        .attr("x1", xScale(lowerWhisker))
        .attr("x2", xScale(q1))
        .attr("y1", yScale(region))
        .attr("y2", yScale(region))
        .attr("stroke", "black");

    svg.append("line")
        .attr("x1", xScale(upperWhisker))
        .attr("x2", xScale(q3))
        .attr("y1", yScale(region))
        .attr("y2", yScale(region))
        .attr("stroke", "black");

    // // Add outlier points
    // svg.selectAll(`circle.outlier-${region}`)
    //     .data(outliers)
    //     .enter()
    //     .append("circle")
    //     .attr("cx", d => xScale(d))
    //     .attr("cy", yScale(region))
    //     .attr("r", 3)
    //     .attr("fill", "red")
    //     .attr("stroke", "black");
});

}
