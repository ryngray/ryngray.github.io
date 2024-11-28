import { colormap as color } from './colormap.js';


d3.csv('APT_data.csv').then(data => {
    // Step 1: Filter for "Yes" in Input
    const filteredData = data.filter(d => d.Input === "Yes");

    // // Normalize indicator names
    // filteredData.forEach(d => {
    //     d.Indicator = d.Indicator.toLowerCase().trim();
    // });

       // Step 2: Calculate initial order by indicator size for consistent ordering
    const initialOrder = Array.from(new Set(filteredData.map(d => d.Indicator)));
    const orderMap = new Map(initialOrder.map((indicator, i) => [indicator, i]));


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
    // Prepare the Sankey format
    let nodes = Array.from(new Set(transitions.flatMap(d => [d.source, d.target]))).map(name => ({
        name,
        order: orderMap.get(name.split('_')[0])+parseInt(name.split('_')[1]) // Assign order based on indicatorOrder
    }));


    let order = ['Ratification of the UN Convention against Torture ', 'Ratification of Optional Protocol (OPCAT)', 'Submission of initial report to CAT ', 'Prohibition of torture in the constitution ', 'Criminalisation of torture under domestic law', 'Designation of the National Preventive Mechanism (in law) ','Operationality of the National Preventive Mechanism ', 'Existence of National Human Rights Institution that fully complies with Paris Principles']

        // Sort by the 'name' property alphabetically
    nodes.sort((a, b) => a.name.localeCompare(b.name));

    // Sort the data array based on the "name" field
    nodes = nodes.sort((a, b) => {
        // Extract prefix and suffix from the "name" field
        const [prefixA, suffixA] = a.name.split("_");
        const [prefixB, suffixB] = b.name.split("_");

        // Get the order index for each prefix
        const indexA = order.indexOf(prefixA);
        const indexB = order.indexOf(prefixB);

        // Sort first by order index, then by the numeric suffix
        if (indexA !== indexB) {
            return indexA - indexB;
        } else {
            return parseInt(suffixA) - parseInt(suffixB);
        }
    });


    const links = transitionCounts;

    visualizeSankey({ nodes, links }, orderMap);
});


function customSankeyLink(d) {
    const x0 = d.source.x1,
          x1 = d.target.x0,
          xi = d3.interpolateNumber(x0, x1),
          x2 = xi(0.5),  // Control point for curvature

          // Use the middle of the source and target for vertical alignment
          y0 = d.source.y0 + (d.source.y1 - d.source.y0) / 2,
          y1 = d.target.y0 + (d.target.y1 - d.target.y0) / 2;

    // Adjust for width to prevent all links from overlapping at center
    const widthOffset = d.width / 2;
    const sourceOffsetY = y0 - widthOffset;
    const targetOffsetY = y1 - widthOffset;

    return `M${x0},${sourceOffsetY}C${x2},${sourceOffsetY} ${x2},${targetOffsetY} ${x1},${targetOffsetY}`;
}

const customLinkGenerator = (d) => {
    const points = [
        [d.source.x1, d.y0],
        [d.source.x1 + (d.target.x0 - d.source.x1) / 2, d.y0],
        [d.source.x1 + (d.target.x0 - d.source.x1) / 2, d.y1],
        [d.target.x0, d.y1]
    ];

    const lineGenerator = d3.line()
        .curve(d3.curveCatmullRom.alpha(0.5));

    return lineGenerator(points);
};


function visualizeSankey({ nodes, links }, orderMap) {
    const margin = { top: 50, right: 30, bottom: 50, left: 100, legend:200 };
    // Get the screen dimensions
    const width = window.innerWidth - margin.left - margin.right;
    const height = window.innerHeight - margin.top - margin.bottom-margin.legend;

    // Create the SVG element
    const svg = d3.select("#alluvialChart").append("svg")
        .attr("width", width)
        .attr("height", height);

    // You can add event listeners to resize the visualization when the window size changes
    window.addEventListener('resize', () => {
        const newWidth = window.innerWidth - margin.left - margin.right;
        const newHeight = window.innerHeight - margin.top - margin.bottom-margin.legend;
        
        svg.attr("width", newWidth)
            .attr("height", newHeight);
    })

    const legendSVG = d3.select("#alluvialChart").append("svg")
        .attr("width", width )
        .attr("height", margin.legend );

    const legendGroup = legendSVG.append("g")
        .attr("transform", "translate(10, 10)"); // Adjust position

    // Define legend structure with categories and items
    const categories = [
        {
            title: "International Treaties",
            items: color.domain().slice(0, 3) // First 3 indicators
        },
        {
            title: "National Legislation",
            items: color.domain().slice(3, 5) // Next 2 indicators
        },
        {
            title: "Oversight System",
            items: color.domain().slice(5, 8) // Last 3 indicators
        }
    ];

    // Define sizes
    const itemHeight = 20;
    const spaceBetweenItems = 5;
    const titleOffset = 10; // Space above each category title
    const columnWidth = 500; // Width of each category column

    categories.forEach((category, colIndex) => {
        // Create a group for each category
        const categoryGroup = legendGroup.append("g")
            .attr("transform", `translate(${colIndex * columnWidth}, 10)`); // Position by column

        // Add the category title
        categoryGroup.append("text")
            .attr("x", 0)
            .attr("y", 0)
            .style("font-weight", "bold")
            .style("font-size", "18px")
            .text(category.title);

        // Add legend items for this category
        const legendItems = categoryGroup.selectAll(".legend-item")
            .data(category.items)
            .enter().append("g")
            .attr("class", "legend-item")
            .attr("transform", (d, i) => `translate(0, ${titleOffset + i * (itemHeight + spaceBetweenItems)})`);

        // Append a colored rectangle for each item
        legendItems.append("rect")
            .attr("width", 20) // Width of the color box
            .attr("height", itemHeight) // Height of the color box
            .style("fill", d => color(d)); // Use the colormap to get the color

        // Append text labels next to each color box
        legendItems.append("text")
            .attr("x", 30) // Position the text to the right of the color box
            .attr("y", itemHeight / 2) // Vertically center the text
            .attr("dy", ".35em") // Adjust vertical alignment
            .text(d => d); // The category name
    });



    // Define the Sankey layout
    const sankey = d3.sankey()
        .nodeWidth(20)
        .nodePadding(30)
        .size([width, height])
        .nodeAlign(d3.sankeyLeft)
        .nodeSort(null)
        .iterations(32); 

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
// const color = d3.scaleOrdinal(d3.schemeTableau10);

// const customLink = d3.sankeyLinkHorizontal().curve(d3.curveBasis); // Adjust curvature as needed


// Sort the links so that links targeting the top nodes are rendered first
sankeyLinks.sort((a, b) => {
    // Sort by the target node’s y-position, so links to higher nodes come first
    return a.target.y0 - b.target.y0;
});


// Draw links
const link = svg.append("g")
    .selectAll("path")
    .data(sankeyLinks)
    .enter().append("path")
    .attr("d", d3.sankeyLinkHorizontal())
    // .attr("d", customLinkGenerator)
    .attr("fill", "none")
    .attr("stroke", d => color(d.source.name.substring(0, d.source.name.length - 2)))
    .attr("stroke-width", d => Math.max(2, d.width))
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
        .attr("x", d => (d.x0 < width / 2) ? d.x1 + 6 : d.x0 - 6) // Adjust based on position
        .attr("y", d => (d.y0 + d.y1) / 2) // Center vertically
        .attr("dy", "0.35em")
        .attr("text-anchor", d => (d.x0 < width / 2) ? "start" : "end") // Align text appropriately
        .text(d => d.name.split("_")[0])
        .style("visibility", "hidden"); // Initially hidden, shown on mouseover


node.on("mouseover", function (event, d) {
        // Highlight connected links
        link.attr("stroke-opacity", l => (l.source === d || l.target === d) ? 0.7 : 0.1);
        
        // Show label
        labels.filter(label => label.name === d.name)
            .style("visibility", "visible");
    })
    .on("mouseout", function (event, d) {
        // Reset link opacity
        link.attr("stroke-opacity", 0.4);
        
        // Hide label
        labels.filter(label => label.name === d.name)
            .style("visibility", "hidden");
    });



}
