d3.csv('APT_data.csv').then(data => {
    // Step 1: Filter for "Yes" in Input
    const filteredData = data.filter(d => d.Input === "Yes");

    // Normalize indicator names
    filteredData.forEach(d => {
        d.Indicator = d.Indicator.toLowerCase().trim();
    });

       // Step 2: Calculate initial order by indicator size for consistent ordering
    const initialOrder = Array.from(
        d3.rollups(filteredData, v => d3.sum(v, d => +d.value), d => d.Indicator)
            .sort((a, b) => b[1] - a[1])
            .map(d => d[0])
    );

    console.log("Iniial Order", initialOrder)

    // Step 2: Track and assign unique indicator names per country
    const transitions = [];
    const countryGroups = d3.group(filteredData, d => d.Country);

    countryGroups.forEach((indicators, country) => {
        // Sort indicators by Date for each country
        indicators.sort((a, b) => new Date(a.Date) - new Date(b.Date));

        // Build transition pairs with unique identifiers for each country sequence
        for (let i = 0; i < indicators.length - 1; i++) {
            // Generate unique identifiers for each position in the sequence
            const sourceIndicator = `${indicators[i].Indicator}_${i + 1}`;
            const targetIndicator = `${indicators[i + 1].Indicator}_${i + 2}`;

            transitions.push({ source: sourceIndicator, target: targetIndicator });
        }
    });

    // Step 3: Count transitions
    const transitionCounts = d3.rollups(transitions, v => v.length, d => d.source, d => d.target)
        .map(([source, targets]) => targets.map(([target, value]) => ({ source, target, value })))
        .flat();

    // Step 4: Prepare the Sankey format
    const nodes = Array.from(new Set(transitions.flatMap(d => [d.source, d.target]))).map(name => ({ name }));
    const links = transitionCounts;

    visualizeSankey({ nodes, links });
});

function visualizeSankey({ nodes, links }) {
    const width = 1000, height = 800;

    // Set up the SVG canvas
    const svg = d3.select("#alluvialChart").append("svg")
        .attr("width", width)
        .attr("height", height);

    // Define the Sankey layout
    const sankey = d3.sankey()
        .nodeWidth(20)
        .nodePadding(10)
        .size([width, height])
        .nodeAlign(d3.sankeyLeft); 

    // Create a map to store node names and their indices
    const nodeNameToIndex = new Map(nodes.map((node, i) => [node.name, i]));

    // Update links to use indices
    links.forEach(link => {
        link.source = nodeNameToIndex.get(link.source); // Replace source name with index
        link.target = nodeNameToIndex.get(link.target); // Replace target name with index

        if (link.source === undefined || link.target === undefined) {
            console.error("Missing node for link:", link); // Error check
        }
    });

    // Now call sankey with updated links
    const { nodes: sankeyNodes, links: sankeyLinks } = sankey({
        nodes: nodes.map(d => Object.assign({}, d)),
        links: links.map(d => Object.assign({}, d))
    });
    
    // Draw nodes and links (continuing with sankey visualization code here)
    // Define color scale for nodes
   // Color scale
// Color scale
const color = d3.scaleOrdinal(d3.schemeTableau10);

// Draw links
const link = svg.append("g")
    .selectAll("path")
    .data(sankeyLinks)
    .enter().append("path")
    .attr("d", d3.sankeyLinkHorizontal())
    .attr("fill", "none")
    .attr("stroke", d => color(d.source.name.substring(0, d.source.name.length - 2)))
    .attr("stroke-width", d => Math.max(1, d.width))
    .attr("stroke-opacity", 0.4)
    .on("mouseover", function () { d3.select(this).attr("stroke-opacity", 0.7); })
    .on("mouseout", function () { d3.select(this).attr("stroke-opacity", 0.4); });

// Draw nodes
const node = svg.append("g")
    .selectAll("rect")
    .data(sankeyNodes)
    .enter().append("rect")
    .attr("x", d => d.x0)
    .attr("y", d => d.y0)
    .attr("height", d => d.y1 - d.y0)
    .attr("width", d => d.x1 - d.x0)
    .attr("fill", d => color(d.name.substring(0, d.name.length - 2)))
    .attr("stroke", "#000");

// Add node labels
const labels = svg.append("g")
    .selectAll("text")
    .data(sankeyNodes)
    .enter().append("text")
    .attr("x", d => d.x0 - 6)
    .attr("y", d => (d.y1 + d.y0) / 2)
    .attr("dy", "0.35em")
    .attr("text-anchor", "end")
    .attr("opacity", 0)  // Start with opacity 0 (hidden)
    .text(d => d.name)
    .filter(d => d.x0 < width / 2)
    .attr("x", d => d.x1 + 6)
    .attr("text-anchor", "start");

// Mouse events for highlighting connected links
node.on("mouseover", function (event, d) {
        console.log(d.name, "Mouseover", labels)
        // Highlight all links connected to the hovered node
        link.attr("stroke-opacity", l => (l.source === d || l.target === d) ? 0.7 : 0.1);
        
        // Show label for the hovered node
        labels.filter(label => label.name === d.name)
            .attr("opacity", 1);
    })
    .on("mouseout", function (event, d) {
        // Reset link opacity
        link.attr("stroke-opacity", 0.4);
        
        // Hide label
        labels.filter(label => label.name === d.name)
            .attr("opacity", 0);
    });


}
