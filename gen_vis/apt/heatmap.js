// Load the CSV file using D3's csv function
d3.csv('APT_data.csv').then(data => {
    // Map the data to a usable format
    const formattedData = data.map(row => ({
        rowLabel: row.Indicator, // Access the rowLabel column
        colLabel: row.Country,   // Access the colLabel column
        value: (row.Input === "Yes") ? 2 : (row.Input === "No" ? 0 : (row.Input === "Partially" ? 1 : null)), 
        time: isNaN(new Date(row.Date)) ? null : new Date(row.Date),
        rank: parseFloat(row.rank),
        region : row.Region
    }));

    // Now visualize the data using D3.js
    visualizeHeatmap(formattedData);
});

function visualizeHeatmap(data) {
    // Set up the SVG and chart dimensions
    const margin = { top: 100, right: 30, bottom: 30, left: 100 };
    const width = 2000 - margin.left - margin.right;
    const height = 700 - margin.top - margin.bottom;

    // Get unique row and column labels and time
    const timePoints = Array.from(new Set(data.map(d => d.time))).sort((a, b) => a - b);
    const rowLabels = Array.from(new Set(data.map(d => d.rowLabel)));
    const colLabels = Array.from(new Set(data.map(d => d.colLabel)));

    let currentSliderValue = 0;  // Global variable to store slider value
    let sortOption = 'byRegion'

    // Set up scales
    let x = d3.scaleBand()
        .domain(colLabels)
        .range([0, width])
        .padding(0.01);

    const y = d3.scaleBand()
        .domain(rowLabels)
        .range([0, height])
        .padding(0.01);

    const colorScale = d3.scaleLinear()
        .domain([0, 2]) // Adjust this domain based on the range of your data
        .interpolate(d3.interpolateRgb)
        .range(["#f44336", "#2196f3"]);

    // Create the SVG container
    const svg = d3.select("#chart")
        .append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
            .attr("transform", `translate(${margin.left},${margin.top})`);

    const dropdown = d3.select("#sortOptions");
    dropdown.on("change", function() {
        const selectedOption = this.value;
        sortOption = this.value;
        sortColumns(sortOption);
        drawHeatmap(timePoints[currentSliderValue]);
    });

    // Function to sort columns based on dropdown selection
    function sortColumns(option) {

        let sortedColumns;

        switch(option) {
            case 'alphabetical':
                sortedColumns = [...new Set(data.map(d => d.colLabel))].sort();
                break;
            case 'mostValues':
                sortedColumns = [...new Set(data.map(d => d.colLabel))]
                    .sort((a, b) => {
                        const rankA = data.find(d => d.colLabel === a).rank;
                        const rankB = data.find(d => d.colLabel === b).rank;
                        return rankA - rankB;
                    });
                break;
            case 'leastValues':
                sortedColumns = [...new Set(data.map(d => d.colLabel))]
                    .sort((a, b) => {
                        const rankA = data.find(d => d.colLabel === a).rank;
                        const rankB = data.find(d => d.colLabel === b).rank;
                        return rankB - rankA;
                    });
                break;
            case 'random':
                sortedColumns = d3.shuffle([...new Set(data.map(d => d.colLabel))]);
                break;
            case 'byRegion':  // Assuming you have a "Region" field in your data
                const regionOrder = ['Americas', 'Africa', 'Europe', 'Middle East', 'Asia-Pacific'];
                sortedColumns = [...new Set(data.map(d => d.colLabel))].sort((a, b) =>
                    d3.ascending(regionOrder.indexOf(data.find(d => d.colLabel === a).region, regionOrder.indexOf(data.find(d => d.colLabel === b).region))));
                break;
        }

        x.domain(sortedColumns)
        return sortedColumns
    }

    // Function to determine color based on value and date comparison
    function getColor(value, date, selectedDate) {
        if(date === null){
            return '#f44336'
        }
        if (date > selectedDate) {
            // If the date is before the selected date, use a gradient based on the value
            return value === null ? "black" : "#f44336";
        } else {
            // If the date is on or after the selected date, use a neutral color
            return value === null ? "black" : colorScale(value); // Change this color as needed
        }
    }

    // Define legend data and corresponding colors
    const legendData = [
        { label: "Yes", color: colorScale(2) },
        { label: "No", color: colorScale(0) },
        { label: "Partially", color: colorScale(1) },
        { label: "Null", color: "black" }
    ];

    // Create a group for the legend
    const legend = svg.append("g")
        .attr("class", "legend")
        .attr("transform", "translate(-80, -75)"); // Position legend (adjust as needed)

        // Calculate legend dimensions for background box
    const legendBoxWidth = 80; // Adjust width to fit text
    const legendBoxHeight = legendData.length * 20 + 10; // Height based on items

    // Add background rectangle for legend box
    legend.append("rect")
        .attr("x", -10) // Offset for padding around items
        .attr("y", -10)
        .attr("width", legendBoxWidth)
        .attr("height", legendBoxHeight)
        .attr("rx", 5) // Optional: rounded corners
        .attr("ry", 5)
        .style("fill", "none") // Transparent fill
        .style("stroke", "black") // Border color
        .style("stroke-width", 1.5); // Border thickness


    // Add legend items
    legendData.forEach((d, i) => {
        // Legend color box
        legend.append("rect")
            .attr("x", 0)
            .attr("y", i * 20)   // Spacing between items
            .attr("width", 15)    // Width of legend box
            .attr("height", 15)   // Height of legend box
            .style("fill", d.color);

        // Legend text
        legend.append("text")
            .attr("x", 25)       // Position text beside the box
            .attr("y", i * 20 + 12) // Align text with box
            .text(d.label)
            .style("font-size", "12px")   // Adjust font size as needed
            .attr("alignment-baseline", "middle"); // Vertically center text with box
    });


    const cellsGroup = svg.append("g")
        .attr("class", "heatmap-cells");

    // Function to draw the heatmap for a specific time point
    function drawHeatmap( selectedTime) {
        // Filter data for the selected time
        // const filteredData = data.filter(d => d.time.getTime() === selectedTime.getTime());

        // Bind data and create rectangles for the heatmap
        const cells = cellsGroup.selectAll("rect")
            .data(data);

        const tooltip = d3.select("#heatmap-tooltip"); // Select the tooltip div

        cells.enter()
            .append("rect")
            .merge(cells) // Merge existing and new cells
            .attr("x", d => x(d.colLabel))
            .attr("y", d => y(d.rowLabel))
            .attr("width", x.bandwidth())
            .attr("height", y.bandwidth())
            .style("fill", d => getColor(d.value, d.time, selectedTime)) // Update color based on value and date
            .style("stroke", "black")
            .on("mouseover", function(event, d) {
                tooltip.style("visibility", "visible")
                    .html(`
                        <strong>Country:</strong> ${d.colLabel}<br>
                        <strong>Indicator:</strong> ${d.rowLabel}<br>
                        <strong>Date:</strong> ${d.time ? d.time.getFullYear() : "N/A"}
                    `);
            })
            .on("mousemove", function(event) {
                tooltip.style("top", (event.pageY + 10) + "px")
                       .style("left", (event.pageX + 10) + "px");
            })
            .on("mouseout", function() {
                tooltip.style("visibility", "hidden");
            });

        cells.exit().remove(); // Remove old cells

        // Remove the old x-axis if it exists
        svg.selectAll(".x-axis").remove();
        svg.selectAll(".y-axis").remove();

        svg.append("g")
            .attr("class", "x-axis")
            .attr("transform", `translate(${x.bandwidth()},0)`)
            .call(d3.axisTop(x))
            .selectAll("text")
            .attr("transform", "rotate(-90)")
            .attr("x", function(d, i) {
                return x.bandwidth();  // Offset each label by one position in x direction
            })
        .style("text-anchor", "start");

        // Hide the x-axis tick marks
        svg.selectAll(".x-axis .tick line")
            .style("display", "none");  // Hides tick lines

        svg.selectAll(".x-axis path")  // Hide the axis line
            .style("display", "none")

        svg.append("g")
            .attr("class", "y-axis")
            .attr("transform", "translate(-10, -10)")
            .call(d3.axisLeft(y))
            .selectAll("text")
            .each(function(d) {
                const self = d3.select(this);
                
                // Split the label into words
                const words = d.split(" ");
                const maxWordsPerLine = 2; // Adjust this number as needed
                const lines = [];

                // Create lines by grouping words
                for (let i = 0; i < words.length; i += maxWordsPerLine) {
                    lines.push(words.slice(i, i + maxWordsPerLine).join(" ")); // Join the words into a line
                }

                // Clear the original label
                self.text(null);

                // Append each line as a separate tspan element with a slight vertical offset
                lines.forEach(function(line, i) {
                    self.append("tspan")
                        .attr("x", 0)
                        .attr("dy", i === 0 ? "0em" : "1.2em") // Offset for each line
                        .text(line);
                });
            })
            .style("text-anchor", "end");  // Align text to the end

            svg.selectAll(".y-axis path")  // Hide the axis line
                .style("display", "none")


    }

    // Initial draw
    // console.log("Data before initial draw", data)
    drawHeatmap(timePoints[currentSliderValue]);

    const slider_svg = d3.select("#sliderContainer")
        .append("svg")
        .attr("width", width/2+margin.left)
        .attr("height", 100)
        .append("g")
            .attr("transform", `translate(${margin.left},${margin.top})`);

        // Set up the slider

    const slider_width = width/2
    const minYear = timePoints[0].getFullYear(); // Get the minimum year
    const maxYear = timePoints[timePoints.length -1].getFullYear(); // Get the minimum year
    // Create the slider group
    const sliderGroup = slider_svg.append("g")
        .attr("transform", "translate(-30,-30)"); // Adjust position

    // Create a scale for the slider
    const sliderScale = d3.scaleLinear()
        .domain([0, timePoints.length - 1])  // Input domain
        .range([0, slider_width]);  // Output range (subtracting padding)

        // Create a line for the slider track
    sliderGroup.append("line")
        .attr("x1", 0)
        .attr("x2", slider_width)
        .attr("y1", 0)
        .attr("y2", 0)
        // .attr("stroke", "black")
        .attr("stroke", "#9e9e9e") // Light grey color
        .attr("stroke-width", 4) // Thicker line
        .attr("stroke-linecap", "round"); // Rounded ends for a smoother look;

    // Create the slider handle
    const handle = sliderGroup.append("circle")
        .attr("class", "handle")
        .attr("r", 8)
        .attr("cx", sliderScale(0))
        .attr("cy", 0)
        .style("fill", "steelblue")  // Change handle color
        .style("stroke", "white")      // Outline for contrast
        .style("stroke-width", 2)      // Outline width
        .style("filter", "url(#shadow)"); // Optional shadow effect


    // Create labels for the slider
    const minLabel = sliderGroup.append("text")
        .attr("class", "slider-label")
        .attr("x", sliderScale(0)) // Set initial x position for minimum label
        .attr("y", -10) // Position above the slider
        .attr("text-anchor", "middle") // Center the label
        .text(`Min: ${minYear}`);

    const maxLabel = sliderGroup.append("text")
        .attr("class", "slider-label")
        .attr("x", sliderScale(timePoints.length - 1)-20) // Set initial x position for maximum label
        .attr("y", -10) // Position above the slider
        .attr("text-anchor", "middle") // Center the label
        .text(`Max: ${maxYear}`);

    const currentValueLabel = sliderGroup.append("text")
        .attr("class", "current-value-label")
        .attr("x", sliderScale(0)) // Initial position for current value label
        .attr("y", 25) // Position below the slider
        .attr("text-anchor", "axisLeft") // Center the label
        .text("Current Value");

    // Initialize slider
    updateSlider(currentSliderValue); // Set initial value


    // Function to update the handle and display current value
    function updateSlider(value) {
        handle.attr("cx", sliderScale(value));  // Move the handle
        currentValueLabel.text(`Current Time Point: ${timePoints[value].getFullYear()}`); // Update current value label
        drawHeatmap(timePoints[value]);
    }

    // Slider event for dragging and moving
    function onSliderMove(event) {
        const mouseX = d3.pointer(event)[0];  // Get mouse position
        const value = Math.round(sliderScale.invert(mouseX));  // Invert the scale to get value
        if (value >= 0 && value < timePoints.length) {  // Check bounds
            updateSlider(value);
        }
    }

    // Define the drag behavior
    const dragHandler = d3.drag()
        .on("start", function(event) {
            d3.select(this).raise().classed("active", true); // Bring the handle to the front
        })
        .on("drag", function(event) {
            const mouseX = event.x; // Get the current mouse position
            const value = Math.round(sliderScale.invert(mouseX)); // Get the value from the scale
            currentSliderValue = value;
            if (value >= 0 && value < timePoints.length) { // Ensure the value is within bounds
                updateSlider(value); // Update the slider
            }
        })
        .on("end", function() {
            d3.select(this).classed("active", false); // Remove active class on drag end
        });

    // Apply the drag behavior to the handle
    handle.call(dragHandler);

    // Initialize slider
    updateSlider(0);  // Set initial value


}
