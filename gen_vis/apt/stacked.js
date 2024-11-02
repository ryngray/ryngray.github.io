// Load the CSV data
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
    // Prepare the time series data array with cumulative counts
    const timeSeriesData = [];
    const lastCounts = {}; // Object to track the last count for each key
    const sortedUniqueDates = Array.from(dateCountMap.values())
        .flatMap(dateMap => Array.from(dateMap.keys()))
        .filter(date => !isNaN(date))
        .sort((a, b) => a - b); // Get sorted unique dates across all keys

    // Iterate through each unique date and each key
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

        // Define the starting date
    const startDate = new Date("1984-01-01");

    // Filter the data to only include dates from 1984 onward
    const filteredTimeSeriesData = timeSeriesData.filter(d => d.time >= startDate);

    chart(filteredTimeSeriesData)
});

function chart(timeSeriesData){
  // Specify the chart’s dimensions.
  const width = 928;
  const height = 500;
  const marginTop = 10;
  const marginRight = 10;
  const marginBottom = 20;
  const marginLeft = 40;

  // Determine the series that need to be stacked.
  // const series = d3.stack()
  //     .offset(d3.stackOffsetWiggle)
  //     .order(d3.stackOrderInsideOut)
  //     .keys(d3.union(timeSeriesData.map(d => d.key))) // distinct series keys, in input order
  //     .value(([, D], key) => D.get(key).count) // get value for each series key and stack
  //   (d3.index(timeSeriesData, d => d.time, d => d.key)); // group by stack then series key

  // Prepare nested data for stacking
  const nestedData = d3.groups(timeSeriesData, d => d.time);
  
  keys_ordered = [...new Set(timeSeriesData.map(d => d.key))]

  const series = d3.stack()
      .keys(d3.shuffle(keys_ordered))
      .value(([, D], key) => {
          const entry = D.find(d => d.key === key);
          return entry ? entry.count : 0; // Handle cases where entry is undefined
      })(nestedData);

  // Prepare the scales for positional and color encodings.
  const x = d3.scaleUtc()
      .domain(d3.extent(timeSeriesData, d => d.time))
      .range([marginLeft, width - marginRight]);

  const y = d3.scaleLinear()
      .domain([0, d3.max(series, s => d3.max(s, d => d[1]))]) // Set Y domain to max value
      .rangeRound([height - marginBottom, marginTop]);

  const color = d3.scaleOrdinal()
      .domain(series.map(d => d.key))
      .range(d3.schemeTableau10);

  // Construct an area shape.
  const area = d3.area()
      .x(d => x(d.data[0]))
      .y0(d => y(d[0]))
      .y1(d => y(d[1]));

  // Create the SVG container.
  const svg = d3.select("#stackedChart")
        .append("svg")
      .attr("viewBox", [0, 0, width, height])
      .attr("width", width)
      .attr("height", height)
      .attr("style", "max-width: 100%; height: auto;");

  // Add the y-axis, remove the domain line, add grid lines and a label.
  svg.append("g")
      .attr("transform", `translate(${marginLeft},0)`)
      .call(d3.axisLeft(y).ticks(height / 80).tickFormat((d) => Math.abs(d).toLocaleString("en-US")))
      .call(g => g.select(".domain").remove())
      .call(g => g.selectAll(".tick line").clone()
          .attr("x2", width - marginLeft - marginRight)
          .attr("stroke-opacity", 0.1))
      .call(g => g.append("text")
          .attr("x", -marginLeft)
          .attr("y", 10)
          .attr("fill", "currentColor")
          .attr("text-anchor", "start")
          .text("↑ Countries"));

  // Append the x-axis and remove the domain line.
  svg.append("g")
      .attr("transform", `translate(0,${height - marginBottom})`)
      .call(d3.axisBottom(x).tickSizeOuter(0))
      .call(g => g.select(".domain").remove());

    console.log("series", series)

  // Append a path for each series.
  svg.append("g")
    .selectAll()
    .data(series)
    .join("path")
      .attr("fill", d => color(d.key))
      .attr("d", area)
    .append("title")
      .text(d => d.key);

  // Return the chart with the color scale as a property (for the legend).
  return Object.assign(svg.node(), {scales: {color}});
}
