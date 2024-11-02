const jitterMapX = new Map();
const jitterMapY = new Map();

// Load CSV and format data with initial date filtering
d3.csv('APT_data.csv').then(data => {

    data.forEach(d => {
        if (!jitterMapX.has(d.Country)) {
            // Generate a consistent jitter value for each country
            jitterMapX.set(d.Country, (Math.random() - 1) * 50); // Fixed jitter value between -25 and +25
            jitterMapY.set(d.Country, (Math.random()*10))
        }
    });

    data.forEach(d => d.Date = new Date(d.Date)); // Parse dates

    // Get the minimum and maximum dates in the dataset
    const minDate = d3.min(data, d => d.Date);
    const maxDate = d3.max(data, d => d.Date);

    // Configure the input slider
    const slider = d3.select("#raincloudSlider")
        .attr("min", +"1984") // Set to numeric min date
        .attr("max", +maxDate) // Set to numeric max date
        .attr("value", +"1984") // Start at max date

    // Initial visualization
    let currentData = filterDataByDate(data, 1984);
    visualizeRaincloud(currentData);

    // Update chart on slider input
    slider.on("input", function() {
        const selectedDate = new Date(+this.value); // Convert value to date
        currentData = filterDataByDate(data, selectedDate);
        d3.select("#raincloudChart").selectAll("svg").remove();
        visualizeRaincloud(currentData);
    });
});

function filterDataByDate(data, selectedDate) {
    // Step 1: Filter data based on date and "Yes" Input
    const filteredData = data.filter(d => d.Input === "Yes" && d.Date <= selectedDate);

    // Step 2: Create a Map to aggregate counts per country-region pair
    const countryCounts = new Map();

    filteredData.forEach(d => {
        const key = `${d.Country}_${d.Region}`;
        
        // If country-region pair exists, increment count
        if (countryCounts.has(key)) {
            countryCounts.get(key).count += 1;
        } else {
            // Initialize count for new country-region pair
            countryCounts.set(key, { country: d.Country, region: d.Region, count: 1 });
        }
    });

    // Step 3: Include all countries and set count to 0 if no entries met the criteria
    const completeData = Array.from(new Set(data.map(d => d.Country))).map(country => {
        const regionEntry = data.find(d => d.Country === country);
        const region = regionEntry ? regionEntry.Region : null;
        const key = `${country}_${region}`;
        
        // Check if the country-region has any counts
        return countryCounts.has(key) ? countryCounts.get(key) : { country, region, count: 0 };
    });

    return completeData;
}



function customQuantile(data, quantile) {
    const sortedData = data.slice().sort(d3.ascending);
    const index = quantile * (sortedData.length - 1);
    const nearestIndex = Math.round(index); // round to nearest integer for nearest-rank
    return sortedData[nearestIndex];
}


function visualizeRaincloud(data) {
    const width = 1000, height = 500, margin = { top: 50, right: 30, bottom: 50, left: 50 };
    const svg = d3.select("#raincloudChart").append("svg")
        .attr("width", width)
        .attr("height", height);

    // Set up x and y scales
    const regions = Array.from(new Set(data.map(d => d.region))); // Unique regions
    const xScale = d3.scalePoint()
        .domain(regions)
        .range([margin.left, width - margin.right])
        .padding(0.5);

    const yScale = d3.scaleLinear()
        .domain([0, 8])
        .nice()
        .range([height - margin.bottom, margin.top]);

    // Color scale for points
    const colorScale = d3.scaleOrdinal(d3.schemeTableau10);

    // Draw violin plots for each region
    regions.forEach(region => {
        const regionData = data.filter(d => d.region === region).map(d => d.count);
        
        // Kernel density estimation for the violin plot shape
        const kde = kernelDensityEstimator(kernelEpanechnikov(3), yScale.ticks(50));
        const density = kde(regionData);
        console.log("Density?", density)


        const area = d3.area()
            .curve(d3.curveBasis)
            .x0(d => xScale(region))  // Left side of the violin
            .x1(d => xScale(region) + d[1] * 500)  // Right side of the violin
            .y(d => yScale(d[0]));  // Y value based on count

        svg.append("path")
            .datum(density)
            .attr("fill", colorScale(region))
            .attr("opacity", 0.4)
            .attr("d", area);
    });

      const circles = svg.append("g")
        .selectAll("circle")
        .data(data)
        .enter().append("circle")
        .attr("cx", d => xScale(d.region) + jitterMapX.get(d.country)) // Use the fixed jitter from jitterMap
        .attr("cy", d => yScale(d.count) + jitterMapY.get(d.country)) // Optional y-axis jitter
        .attr("r", 5)
        .attr("fill", d => colorScale(d.region))
        .attr("stroke", "black")
        .attr("stroke-width", 0.5)
        .on("mouseover", function(event, d) {
            console.log("MOUSEOVER HERE!")
            // Step 3: On mouseover, filter the relevant indicators
            const indicators = data.filter(row => 
                row.Country === d.country && 
                row.Input === "Yes" && 
                row.Date > d.Date // Assuming you have a 'Date' property in d
            ).map(row => row.Indicator);
            console.log("INDICATORS", indicators)

            // Show tooltip with country name and fulfilled indicators
            const tooltipContent = `Country: ${d.country}<br>Indicators: ${indicators.join(", ") || "None"}`;
            d3.select("#raincloud-tooltip")
                .html(tooltipContent)
                .style("left", (event.pageX + 5) + "px") // Position tooltip
                .style("top", (event.pageY - 28) + "px")
                .style("visibility", "visible");
        })
        .on("mousemove", function(event) {
            // Move tooltip with mouse
            d3.select("#raincloud-tooltip")
                .style("left", (event.pageX + 5) + "px")
                .style("top", (event.pageY - 28) + "px");
        })
        .on("mouseout", function() {
            // Hide tooltip on mouse out
            d3.select("#raincloud-tooltip").style("visibility", "hidden");
        });

    // Add x-axis and y-axis
    svg.append("g")
        .attr("transform", `translate(0,${height - margin.bottom})`)
        .call(d3.axisBottom(xScale));

    svg.append("g")
        .attr("transform", `translate(${margin.left},0)`)
        .call(d3.axisLeft(yScale));

        // Group data by region and calculate boxplot stats
    const boxplotData = regions.map(region => {
        const regionCounts = data.filter(d => d.region === region).map(d => d.count);
        // const q1 = d3.quantile(regionCounts, 0.75);
        // const median = d3.quantile(regionCounts, 0.5);
        // const q3 = d3.quantile(regionCounts, 0.25);
        const q1 = customQuantile(regionCounts, 0.25);
        const median = customQuantile(regionCounts, 0.5);
        const q3 = customQuantile(regionCounts, 0.75);
        const iqr = q3 - q1;
        const min = d3.min(regionCounts);
        const max = d3.max(regionCounts);

        console.log("REGION COUNTS:", regionCounts)
         console.log(JSON.stringify(regionCounts)) 
        console.log("STATS:", q1, median, q3, iqr, min, max)

        return {
            region,
            q1,
            median,
            q3,
            min: Math.max(min, q1 - 1.5 * iqr),  // Whiskers within 1.5 * IQR
            max: Math.min(max, q3 + 1.5 * iqr),
            outliers: regionCounts.filter(d => d < q1 - 1.5 * iqr || d > q3 + 1.5 * iqr)
        };
    });

    // Draw boxplots for each region
    svg.selectAll(".boxplot")
        .data(boxplotData)
        .enter().append("g")
        .attr("transform", d => `translate(${xScale(d.region)},0)`)
        .each(function(d) {
            const g = d3.select(this);
            const x_offset = 0

            // Draw box
            g.append("rect")
                .attr("x", -10+x_offset)
                .attr("y", yScale(d.q3))
                .attr("width", 20)
                .attr("height", yScale(d.q1) - yScale(d.q3))
                .attr("fill", colorScale(d.region))
                .attr("opacity", 0.6);

            // Median line
            g.append("line")
                .attr("x1", -10+x_offset)
                .attr("x2", 10+x_offset)
                .attr("y1", yScale(d.median))
                .attr("y2", yScale(d.median))
                .attr("stroke", "black")
                .attr("stroke-width", 2);

            // Whiskers
            g.append("line")
                .attr("x1", 0+x_offset)
                .attr("x2", 0+x_offset)
                .attr("y1", yScale(d.min))
                .attr("y2", yScale(d.q1))
                .attr("stroke", "black");

            g.append("line")
                .attr("x1", 0+x_offset)
                .attr("x2", 0+x_offset)
                .attr("y1", yScale(d.max))
                .attr("y2", yScale(d.q3))
                .attr("stroke", "black");

            // Min/Max whisker caps
            g.append("line")
                .attr("x1", -5+x_offset)
                .attr("x2", 5+x_offset)
                .attr("y1", yScale(d.min))
                .attr("y2", yScale(d.min))
                .attr("stroke", "black");

            g.append("line")
                .attr("x1", -5+x_offset)
                .attr("x2", 5+x_offset)
                .attr("y1", yScale(d.max))
                .attr("y2", yScale(d.max))
                .attr("stroke", "black");

            // Outliers
            g.selectAll(".outlier")
                .data(d.outliers)
                .enter().append("circle")
                .attr("class", "outlier")
                .attr("cx", 0)
                .attr("cy", yScale)
                .attr("r", 3)
                .attr("fill", "red")
                .attr("opacity", 0.6);
        });
}

// Kernel density estimator function
function kernelDensityEstimator(kernel, X) {
    return function(V) {
        return X.map(x => [x, d3.mean(V, v => kernel(x - v))]);
    };
}

function kernelEpanechnikov(k) {
    return function(v) {
        return Math.abs(v /= k) <= 1 ? 0.75 * (1 - v * v) / k : 0;
    };
}
