import { colormap as sharedColormap } from './colormap.js';

const jitterMapX = new Map();
const jitterMapY = new Map();
var selectedDate = new Date(0);
let lastQuery = "";
let selectedCountries = [];

// Load CSV and format data with initial date filtering
d3.csv('APT_data.csv').then(data => {

    data.forEach(d => {
        if (!jitterMapX.has(d.Country)) {
            // Generate a consistent jitter value for each country
            jitterMapX.set(d.Country, (Math.random()) * 10); // Fixed jitter value between -25 and +25
            jitterMapY.set(d.Country, (Math.random()-1)*-50)
        }
    });

    data.forEach(d => d.Date = new Date(d.Date)); // Parse dates

    const minDate = new Date(1984, 0, 1);//d3.min(data, d => d.Date);
    const maxDate = d3.max(data, d => d.Date);

    // Set the slider container width for a longer slider
    const sliderWidth = 600;  // Adjust as needed

    // Create the slider container
    d3.select("#sliderContainer")
        .style("width", sliderWidth + "px")
        .style("position", "relative");

    // Configure the input slider
    const slider = d3.select("#raincloudSlider")
        .attr("type", "range")
        .attr("min", +minDate) // Set to numeric min date
        .attr("max", +maxDate) // Set to numeric max date
        .attr("value", +minDate) // Start at min date
        .attr("width", sliderWidth)
        .style("width", sliderWidth + "px"); // Ensure the slider is visually long

    const containerMargin = 20;
    // Add Min/Max labels
    d3.select("#sliderContainer")
        .append("text")
        .attr("id", "minLabel")
        .style("position", "absolute")
        .style("left", containerMargin + "px") // Offset from the left edge
        .style("top", "25px") // Adjust height
        .text(new Date(minDate).getFullYear());

    d3.select("#sliderContainer")
        .append("text")
        .attr("id", "maxLabel")
        .style("position", "absolute")
        .style("right", containerMargin + "px") // Offset from the right edge
        .style("top", "25px") // Match height with minLabel
        .text(new Date(maxDate).getFullYear());


    // // Add current value label
    const valueLabel = d3.select("#sliderContainer")
        .append("text")
        .attr("id", "currentValueLabel")
        .style("position", "absolute")
        .style("left", sliderWidth / 2 + "px") // Center it horizontally
        .style("top", "75px") // Adjust height as needed
        .style("transform", "translateX(-50%)") // Ensure it is perfectly centered
        .style("text-anchor", "middle") // Center text alignment
        .text("CURRENT DATE: "+new Date(slider.property("value")).getFullYear());

    // Initial visualization
    let currentData = filterDataByDate(data, minDate);
    visualizeRaincloud(currentData);

    // Update chart on slider input
    slider.on("input", function() {
        const selectedDate = new Date(+this.value); // Convert value to date
        currentData = filterDataByDate(data, selectedDate);
        d3.select("#raincloudChart").selectAll("svg").remove();
        visualizeRaincloud(currentData);

        // Update current value label
        valueLabel.text("CURRENT DATE: "+selectedDate.getFullYear());
    });

    // Play button functionality
    let playButton = d3.select("#playButton").on("click", function() {
        // let currentValue = +slider.property("value");
        let currentValue = +minDate;
        let endValue = +maxDate;

        function playSlider() {
            if (currentValue <= endValue) {
                slider.property("value", currentValue);
                currentData = filterDataByDate(data, currentValue);
                d3.select("#raincloudChart").selectAll("svg").remove();
                visualizeRaincloud(currentData);
                valueLabel.text("CURRENT DATE: "+new Date(currentValue).getFullYear());

                currentValue += 365 * 24 * 60 * 60 * 1000/5; // Increment date (adjust based on your data granularity)
                requestAnimationFrame(playSlider);
            }
        }

        playSlider(); // Start playing
    });

});

function filterDataByDate(data, selectedDate) {
    // Step 1: Filter data based on date and "Yes" Input
    const filteredData = data.filter(d => d.Input === "Yes" && d.Date <= selectedDate);

    // Step 2: Create a Map to aggregate counts and indicators per country-region pair
    const countryCounts = new Map();

    filteredData.forEach(d => {
        const key = `${d.Country}_${d.Region}`;

        if (countryCounts.has(key)) {
            // Increment count and add indicator if country-region pair exists
            countryCounts.get(key).count += 1;
            countryCounts.get(key).indicators.push(d.Indicator);
        } else {
            // Initialize count and indicators array for new country-region pair
            countryCounts.set(key, { 
                country: d.Country, 
                region: d.Region, 
                count: 1,
                indicators: [d.Indicator] // Start with the current indicator
            });
        }
    });

    // Step 3: Include all countries and set count to 0 and empty indicators if no entries met the criteria
    const completeData = Array.from(new Set(data.map(d => d.Country))).map(country => {
        const regionEntry = data.find(d => d.Country === country);
        const region = regionEntry ? regionEntry.Region : null;
        const key = `${country}_${region}`;
        
        // Check if the country-region has any counts
        return countryCounts.has(key) 
            ? countryCounts.get(key) 
            : { country, region, count: 0, Indicators: [] };
    });

    return completeData;
}


function get_size(d){
    if(selectedCountries.includes(d.country)){
        return 10;
    }
    if(lastQuery!=""){
        if(d.country.toLowerCase().includes(lastQuery)){
            return 10;
        }
    }
    return 5;
}

function customQuantile(data, quantile) {
    const sortedData = data.slice().sort(d3.ascending);
    const index = quantile * (sortedData.length - 1);
    const nearestIndex = Math.round(index); // round to nearest integer for nearest-rank
    return sortedData[nearestIndex];
}


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
    })

    // Set up flipped scales

        // Aggregate data for "World"
    const worldData = data.map(d => d.count);

    // Add "World" as a region
    const worldRegion = { region: "World", data: worldData };

    let regions = Array.from(new Set(data.map(d => d.region))); // Unique regions
    regions = [...new Set(data.map(d => d.region)), "World"]; // Add "World"

    const yScale = d3.scalePoint()
        .domain(regions)
        .range([margin.top, height - margin.bottom])
        .padding(0.5);

    const xScale = d3.scaleLinear()
        .domain([0, 8])
        .nice()
        .range([margin.left, width - margin.right]);

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

    // Draw data points (with jitter)
    const points_region = svg.append("g")
        .selectAll("circle")
        .data(data)
        .enter().append("circle")
        .attr("cy", d => yScale(d.region) + jitterMapY.get(d.country)) // Adjusted for flipped axes
        .attr("cx", d => xScale(d.count) + jitterMapX.get(d.country)) // Adjusted for flipped axes
        .attr("r", d => get_size(d))
        .attr("fill", d => colorScale(d.region))
        .attr("stroke", "black")
        .attr("stroke-width", 0.5)
        .on("mouseover", function(event, d) {
            let tooltipContent;

            // Check if indicators is not null or undefined and has values
            if (d.indicators && d.indicators.length > 0) {
                tooltipContent = `Country: ${d.country}<br>Indicators: ${d.indicators.join(",<br> ")}`;
            } else {
                tooltipContent = `Country: ${d.country}`;
            }

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
        })
        .on("click", function(event,d){
            // Get the clicked element (this) and change its size
            const clickedPoint = d3.select(this);
            
            // Toggle size on click
            const currentRadius = clickedPoint.attr("r");
            const newRadius = currentRadius == 5 ? 10 : 5;  // Toggle between size 5 and 10
            
            // Set the new size (radius)
            clickedPoint.attr("r", newRadius);

            if(selectedCountries.includes(d.country)){
                selectedCountries = selectedCountries.filter(item => item !== d.country);
            }
            else{
                selectedCountries.push(d.country)
            }
        });

        // Draw data points (with jitter)
        const points_world = svg.append("g")
            .selectAll("circle")
            .data(data)
            .enter().append("circle")
            .attr("cy", d => yScale("World") + jitterMapY.get(d.country)) // Adjusted for flipped axes
            .attr("cx", d => xScale(d.count) + jitterMapX.get(d.country)) // Adjusted for flipped axes
            .attr("r", d => get_size(d))
            .attr("fill", function(d){
                const radius = get_size(d)
                if(radius == 10){
                    return colorScale(d.region)
                }
                return colorScale("World")})
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

    // Highlight matching points based on search query
   d3.select("#country-search").on("input", function() {
    const query = this.value.toLowerCase();
    lastQuery = query;  // Store the current query state
    
    // Check if the search bar is empty
    if (query === "") {
        // If the query is empty, reset attributes of all points
        resetPoints(points_region, points_world);
    } else {
        // If the query is not empty, highlight the points that match
        highlightMatchingPoints(query,points_region,points_world);
    }
    });

});

}

// Function to reset the points to their default appearance
    function resetPoints(points_region, points_world) {
        points_region.attr("stroke", "black")  // Reset stroke color to default
            .attr("r", 5);  // Reset radius to default size
        points_world.attr("stroke", "black")  // Reset stroke color to default
            .attr("r", 5);  // Reset radius to default size
    }

    // Function to apply highlighting based on the search query
    function highlightMatchingPoints(query,points_region,points_world) {
        points_region.attr("stroke", d => {
            return d.country.toLowerCase().includes(query) ? "red" : "black";
        })
        .attr("r", d => {
            return d.country.toLowerCase().includes(query) ? 10 : 5;  // Enlarged size for matches
        });

        points_world.attr("stroke", d => {
            return d.country.toLowerCase().includes(query) ? "red" : "black";
        })
        .attr("r", d => {
            return d.country.toLowerCase().includes(query) ? 10 : 5;  // Enlarged size for matches
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
