function handleZoom(e) {
  d3.select('svg g')
    .attr('transform', e.transform);
}


function chart(data) {
  // Specify the dimensions of the chart.
  const width = 650;
  const height = 500;

  // Specify the color scale.
  const color = d3.scaleOrdinal(d3.schemeCategory10);

  // The force simulation mutates links and nodes, so create a copy
  // so that re-evaluating this cell produces the same result.
  const links = data.links.map(d => ({...d}));
  const nodes = data.nodes.map(d => ({...d}));

  console.log("links", links);
  console.log("nodes", nodes);

  // Create a simulation with several forces.
  const simulation = d3.forceSimulation(nodes)
      .force("link", d3.forceLink(links).distance(50))
      .force("charge", d3.forceManyBody())
      .force("center", d3.forceCenter(width / 2, 100))
      .on("tick", ticked);

  // Create the SVG container.
  // d3.select("body").append("p");
  const svg = d3.select("body").append("svg")
      // .attr("viewBox", `0 0 900 600`)
      .attr("viewBox", `0, 0,`+width+`,`+ height)
      .attr("style", "max-width: 100%; height: auto;")
      // .attr('preserveAspectRatio','xMinYMin');

  // Add border to visualization
  var borderPath = svg.append("rect")
    .attr("x", 0)
    .attr("y", 0)
    .attr("height", height)
    .attr("width", width)
    // .style("stroke", 'black')
    .style("fill", "none")
    .style("stroke", "black")
    .style("stroke-width", 2);
    // Add a line for each link, and a circle for each node.
  const link = svg.append("g")
      .attr("stroke", "#999")
      .attr("stroke-opacity", 0.6)
    .selectAll("line")
    .data(links)
    .join("line")
      .attr("stroke", "black")
      .attr("stroke-width", 1.5);//d => Math.sqrt(d.value));

  //Create node containers
  const node = svg.select("g")
      .attr("stroke", "#fff")
      .attr("stroke-width", 1.5)
    .selectAll()
    .data(nodes)
    .join("a")
    .attr('xlink:href', function(d){
      return d.site_link;
    });

  //Create circles for each node
  node.append('circle')
    .attr("r", 10)
    .attr("fill", d => color('#15816f'));
  //Create text label for each node
  node.append("text")
    .attr("x", 0)
    .attr("y", 8)
    .attr("stroke", "black")
    .text(d => d.id);

  node.append("title")
      .text(d => d.id);

  // Add a drag behavior.
  node.call(d3.drag()
        .on("start", dragstarted)
        .on("drag", dragged)
        .on("end", dragended));

  // Set the position attributes of links and nodes each time the simulation ticks.
  function ticked() {
    link
        .attr("x1", d => d.source.x)
        .attr("y1", d => d.source.y)
        .attr("x2", d => d.target.x)
        .attr("y2", d => d.target.y);

    node.attr("transform", d=>`translate(${d.x}, ${d.y})`);
  }

  // Reheat the simulation when drag starts, and fix the subject position.
  function dragstarted(event) {
    if (!event.active) simulation.alphaTarget(0.3).restart();
    event.subject.fx = event.subject.x;
    event.subject.fy = event.subject.y;
  }

  // Update the subject (dragged node) position during drag.
  function dragged(event) {
    event.subject.fx = event.x;
    event.subject.fy = event.y;
  }

  // Restore the target alpha so the simulation cools after dragging ends.
  // Unfix the subject position now that it’s no longer being dragged.
  function dragended(event) {
    if (!event.active) simulation.alphaTarget(0);
    event.subject.fx = null;
    event.subject.fy = null;
  }

  // When this cell is re-run, stop the previous simulation. (This doesn’t
  // really matter since the target alpha is zero and the simulation will
  // stop naturally, but it’s a good practice.)
  // invalidation.then(() => simulation.stop());

  //Create the zoom/pan interaction
  let zoom = d3.zoom()
  .on('zoom', handleZoom);

  d3.selectAll('svg')
    .call(zoom)
    .call(zoom.transform, d3.zoomIdentity.scale(1));

  return svg.node();
}



fetch('https://ryngray.github.io/main.json')
    .then((response) => response.json())
    .then((json) => chart(json));
