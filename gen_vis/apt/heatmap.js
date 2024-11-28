// Load the CSV file using D3's csv function
d3.csv('APT_data.csv').then(data => {
    // Map the data to a usable format
    const formattedData = data.map(row => ({
        rowLabel: row.Country,
        colLabel: row.Indicator,
        value: row.Input === "Yes" ? 2 : row.Input === "No" ? 0 : row.Input === "Partially" ? 1 : 0,
        time: isNaN(new Date(row.Date)) ? null : new Date(row.Date),
        region: row.Region,
    }));

    // Debug: Check the formatted data
    console.log("Formatted Data", formattedData);

    // Calculate total "Yes" counts per country
    const countryYesCounts = d3.rollups(
        formattedData.filter(d => d.value === 2),
        g => g.length,
        d => d.rowLabel
    );

    // Debug: Check the grouped counts
    console.log("Country Yes Counts", countryYesCounts);

    // Convert the counts array into an object for easier lookup
    const countryCountsMap = Object.fromEntries(countryYesCounts);

    // Debug: Check the lookup map
    console.log("Country Counts Map", countryCountsMap);

    // Assign ranks to formatted data
    formattedData.forEach(d => {
        d.rank = countryCountsMap[d.rowLabel] || 0; 
    });

    // Debug: Check ranks in formatted data
    console.log("Data with Ranks", formattedData);

    // Call the visualization function
    visualizeSmallMultiples(formattedData);
});


function visualizeSmallMultiples(data) {
    // Set up the dimensions for small multiples
    const margin = { top: 40, right: 20, bottom: 20, left: 20 }; // Increased top margin for space above heatmaps
    const multipleWidth = 300;
    const multipleHeight = 300;

    const tooltip = d3.select("#heatmap-tooltip");

    const dropdown = d3.select("#sortOptions");
    let currentGroup = "region"; // Default grouping by region
    let ddvalue = ""

    dropdown.on("change", function() {
        currentGroup = this.value;
        if(this.value == "mostValues"){
            currentGroup = "rank"
            ddvalue="mostValues"
        }
        if(this.value =="byRegion"){
            currentGroup = "region"
            ddvalue="byRegion"
        }
        if(this.value=="leastValues"){
            currentGroup="rank"
            ddvalue="leastValues"
        }
        if(this.value =="alphabetical"){
            currentGroup="alphabetical"
            ddvalue="alphabetical"
            drawMultiplesAlphabetical(data,currentGroup,ddvalue)
        }
        console.log(currentGroup)
        if(ddvalue=="alphabetical"){
            drawMultiplesAlphabetical(data,currentGroup,ddvalue)
        }
        else{
            drawMultiples(data, currentGroup, ddvalue);
        }
    });


    drawMultiples(data, currentGroup, ddvalue);

   function drawMultiples(data, groupKey, ddValue) {

    d3.select("#chart").selectAll("*").remove();
       

    // Create the color legend
const legendWidth = 200; // Set the width of the legend
const legendHeight = 20; // Set the height of each legend item
const colorBoxWidth = 30; // Width of each color box
const spacing = 20; // Space between color boxes

const legendSVG = d3.select("#chart").append("svg")
    .attr("width", legendWidth + spacing * 2) // Increase width to account for spacing
    .attr("height", legendHeight+spacing * 3); // Increase height for three legend items

const colorScale = d3.scaleLinear()
    .domain([2, 0])
    .range(["#285391", "#e36360"]);

// Define the colors and labels
const legendData = [
    { value: 2, label: "Yes", color: colorScale(2) },
    { value: 1, label: "Partially", color: colorScale(1) },
    { value: 0, label: "No", color: colorScale(0) }
];

const legend = legendSVG.append("g")
    .attr("class", "legend");

// Create the legend items
const legendItems = legend.selectAll(".legend-item")
    .data(legendData)
    .enter()
    .append("g")
    .attr("class", "legend-item")
    .attr("transform", (d, i) => `translate(${spacing}, ${i * (legendHeight + 5)})`); // Add spacing between items

// Create the color boxes in the legend
legendItems.append("rect")
    .attr("x", 0)
    .attr("y", 0)
    .attr("width", colorBoxWidth)
    .attr("height", legendHeight)
    .style("fill", d => d.color);

// Add the text labels in the legend
legendItems.append("text")
    .attr("x", colorBoxWidth + 5) // Position text after color box
    .attr("y", legendHeight / 2)
    .attr("dy", ".35em")
    .style("font-size", "12px")
    .text(d => d.label);

    const groupedData = d3.group(data, d => d[groupKey]);

    // Sort the data by rank or alphabetically by first letter of country name
    const sortedData = Array.from(groupedData.entries()).sort((a, b) => {
        console.log("Sort value", ddValue)
        if(ddValue == "mostValues"){
        // Use the rank from the data of the first item in each group
            const rankA = a[1][0].rank; // rank for the first entry in group A
            const rankB = b[1][0].rank; // rank for the first entry in group B
            return rankB - rankA; // Sorting in descending order
        }
        if(ddValue == "leastValues"){
            const rankA = a[1][0].rank; // rank for the first entry in group A
            const rankB = b[1][0].rank; // rank for the first entry in group B
            return rankA - rankB; // Sorting in descending order   
        }
        else{
            const groupNameA = a[0]; // Group name for group A
            const groupNameB = b[0]; // Group name for group B
            // Sort by the first letter of the country name alphabetically
            return groupNameA.charAt(0).localeCompare(groupNameB.charAt(0)); // Sorting alphabetically by first letter
        }
    });

    // Define grid layout
    const columns = 4; // Number of columns
    const multipleWidthWithMargin = multipleWidth + margin.left + margin.right;
    const multipleHeightWithMargin = multipleHeight + margin.top + margin.bottom;

    const svg = d3.select("#chart")
        .append("svg")
        .attr("width", columns * multipleWidthWithMargin)
        .attr("height", Math.ceil(sortedData.length / columns) * multipleHeightWithMargin + margin.top); // Reserve space at the top

    // Create a container for each group
    const multiples = svg.selectAll(".multiple")
        .data(sortedData)
        .enter()
        .append("g")
        .attr("class", "multiple")
        .attr("transform", (d, i) => {
            const col = i % columns;
            const row = Math.floor(i / columns);
            return `translate(${col * multipleWidthWithMargin},${row * multipleHeightWithMargin + margin.top})`;
        });

    // Create heatmaps within each multiple
    multiples.each(function([groupName, groupData]) {
        const group = d3.select(this);

        // Get unique row and column labels
        const rowLabels = Array.from(new Set(groupData.map(d => d.rowLabel)));
        const colLabels = Array.from(new Set(groupData.map(d => d.colLabel)));

        const x = d3.scaleBand().domain(colLabels).range([0, multipleWidth]).padding(0.01);
        const y = d3.scaleBand().domain(rowLabels).range([0, multipleHeight]).padding(0.01);

        const colorScale = d3.scaleLinear()
            .domain([2, 0])
            .range(["#285391", "#e36360"]);

        // Add group title
        group.append("text")
            .attr("x", multipleWidth / 2)
            .attr("y", -margin.top / 2) // Position title above the heatmap
            .attr("text-anchor", "middle")
            .style("font-size", "16px")
            .text(groupName);

        // Draw squares for the heatmap
        group.selectAll("rect")
            .data(groupData)
            .enter()
            .append("rect")
            .attr("x", d => x(d.colLabel))
            .attr("y", d => y(d.rowLabel))
            .attr("width", x.bandwidth())
            .attr("height", y.bandwidth())
            .style("fill", d => colorScale(d.value))
            .style("stroke", "black")
            .on("mouseover", (event, d) => {
                let tooltipContent;

                // Check if indicators are not null or undefined and have values
                if (d.value == 2) {
                    tooltipContent = `Indicator: ${d.colLabel}<br>Country: ${d.rowLabel}<br>Year: ${parseInt(d3.timeFormat("%Y")(d.time)) + 1}`;
                } else {
                    tooltipContent = `Indicator: ${d.colLabel}<br>Country: ${d.rowLabel}`;
                }

                tooltip
                    .style("visibility", "visible")
                    .html(tooltipContent)
                    .style("top", `${event.pageY}px`)
                    .style("left", `${event.pageX}px`);
            })
            .on("mousemove", (event) => {
                tooltip
                    .style("top", `${event.pageY + 10}px`)
                    .style("left", `${event.pageX + 10}px`);
            })
            .on("mouseout", () => {
                tooltip.style("visibility", "hidden");
            });
    });
}
function drawMultiplesAlphabetical(data, groupKey, ddValue) {
    // Group data by the first letter of the country name (rowLabel)
    const groupedData = d3.group(data, d => d.rowLabel.charAt(0).toUpperCase());

    // Remove any existing visuals
    d3.select("#chart").selectAll("*").remove();

    // Sort the groups alphabetically by the first letter of the country name
    const sortedData = Array.from(groupedData.entries()).sort((a, b) => a[0].localeCompare(b[0]));

    // Define grid layout
    const columns = 4; // Number of columns
    const multipleWidthWithMargin = multipleWidth + margin.left + margin.right;
    const multipleHeightWithMargin = multipleHeight + margin.top + margin.bottom;

    const svg = d3.select("#chart")
        .append("svg")
        .attr("width", columns * multipleWidthWithMargin)
        .attr("height", Math.ceil(sortedData.length / columns) * multipleHeightWithMargin + margin.top); // Reserve space at the top

    // Create a container for each group (each letter group)
    const multiples = svg.selectAll(".multiple")
        .data(sortedData)
        .enter()
        .append("g")
        .attr("class", "multiple")
        .attr("transform", (d, i) => {
            const col = i % columns;
            const row = Math.floor(i / columns);
            return `translate(${col * multipleWidthWithMargin},${row * multipleHeightWithMargin + margin.top})`;
        });

    // Create heatmaps within each multiple
    multiples.each(function([groupLetter, groupData]) {
        const group = d3.select(this);

        // Get unique row and column labels
        const rowLabels = Array.from(new Set(groupData.map(d => d.rowLabel)));
        const colLabels = Array.from(new Set(groupData.map(d => d.colLabel)));

        const x = d3.scaleBand().domain(colLabels).range([0, multipleWidth]).padding(0.01);
        const y = d3.scaleBand().domain(rowLabels).range([0, multipleHeight]).padding(0.01);

        const colorScale = d3.scaleLinear()
            .domain([2, 0])
            .range(["#285391", "#e36360"]);

        // Add group title (group by the first letter of the country)
        group.append("text")
            .attr("x", multipleWidth / 2)
            .attr("y", -margin.top / 2) // Position title above the heatmap
            .attr("text-anchor", "middle")
            .style("font-size", "16px")
            .text(groupLetter); // Title will be the first letter of the country

        // Draw squares for the heatmap
        group.selectAll("rect")
            .data(groupData)
            .enter()
            .append("rect")
            .attr("x", d => x(d.colLabel))
            .attr("y", d => y(d.rowLabel))
            .attr("width", x.bandwidth())
            .attr("height", y.bandwidth())
            .style("fill", d => colorScale(d.value))
            .style("stroke", "black")
            .on("mouseover", (event, d) => {
                let tooltipContent;

                // Check if indicators are not null or undefined and have values
                if (d.value == 2) {
                    tooltipContent = `Indicator: ${d.colLabel}<br>Country: ${d.rowLabel}<br>Year: ${parseInt(d3.timeFormat("%Y")(d.time)) + 1}`;
                } else {
                    tooltipContent = `Indicator: ${d.colLabel}<br>Country: ${d.rowLabel}`;
                }

                tooltip
                    .style("visibility", "visible")
                    .html(tooltipContent)
                    .style("top", `${event.pageY}px`)
                    .style("left", `${event.pageX}px`);
            })
            .on("mousemove", (event) => {
                tooltip
                    .style("top", `${event.pageY + 10}px`)
                    .style("left", `${event.pageX + 10}px`);
            })
            .on("mouseout", () => {
                tooltip.style("visibility", "hidden");
            });
    });
}

}
