function simulate(data, svg, detailsPanel, controls) {
    const width = parseInt(svg.attr("viewBox").split(' ')[2]);
    const height = parseInt(svg.attr("viewBox").split(' ')[3]);
    const main_group = svg.append("g")
        .attr("transform", "translate(0, 50)");
    
    const countryClasses = {};
    data.nodes.forEach(node => {
        const country = node.Country;
        if (!(country in countryClasses)) {
            countryClasses[country] = Object.keys(countryClasses).length;
        }
        node.countryClass = countryClasses[country];
    });

    const color = d3.scaleOrdinal(d3.schemeCategory10);
    color.domain(Object.keys(countryClasses));

    const scale_radius = d3.scaleLinear()
        .domain(d3.extent(data.nodes, d => d.NumPublications))
        .range([5, 20]);

    const scale_link_stroke_width = d3.scaleLinear()
        .domain(d3.extent(data.links, d => d.value))
        .range([1, 5]);

    const link_elements = main_group.append("g")
        .attr('transform', `translate(${width / 2},${height / 2})`)
        .selectAll(".line")
        .data(data.links)
        .enter()
        .append("line")
        .style("stroke-width", d => scale_link_stroke_width(d.value));

    const node_elements = main_group.append("g")
        .attr('transform', `translate(${width / 2},${height / 2})`)
        .selectAll(".circle")
        .data(data.nodes)
        .enter()
        .append('g')
        .attr("class", d => `gr_${d.countryClass}`)
        .on("mouseenter", function (d, data) {
            node_elements.classed("inactive", true);
            d3.selectAll(`.gr_${data.countryClass}`).classed("inactive", false);
        })
        .on("mouseleave", (d, data) => {
            d3.selectAll(".inactive").classed("inactive", false);
        });

    const drag = d3.drag()
        .on("start", dragStarted)
        .on("drag", dragged)
        .on("end", dragEnded);

    function dragStarted(event, d) {
        if (!event.active) ForceSimulation.alphaTarget(0.3).restart();
        d.fx = d.x;
        d.fy = d.y;
    }

    function dragged(event, d) {
        d.fx = event.x;
        d.fy = event.y;
    }

    function dragEnded(event, d) {
        if (!event.active) ForceSimulation.alphaTarget(0);
        d.fx = null;
        d.fy = null;
    }

    node_elements.call(drag);

    node_elements.append("circle")
        .attr("r", d => scale_radius(d.NumPublications))
        .attr("fill", d => color(d.Country));

    node_elements.append("text")
        .attr("class", "label")
        .attr("text-anchor", "middle")
        .text(d => d.name);

    let ForceSimulation = d3.forceSimulation(data.nodes)
        .force("collide", d3.forceCollide().radius((d) => scale_radius(d.NumPublications) * 4))
        .force("x", d3.forceX())
        .force("y", d3.forceY())
        .force("charge", d3.forceManyBody())
        .force("link", d3.forceLink(data.links)
            .id(d => d.AuthorID)
        )
        .on("tick", ticked);
// Calculate node degrees
const degrees = new Map();
data.links.forEach(link => {
    degrees.set(link.source.AuthorID, (degrees.get(link.source.AuthorID) || 0) + 1);
    degrees.set(link.target.AuthorID, (degrees.get(link.target.AuthorID) || 0) + 1);
});

// Add degree information to each node
data.nodes.forEach(node => {
    node.Degree = degrees.get(node.AuthorID) || 0;
});

    function ticked() {
        node_elements.attr('transform', d => `translate(${d.x},${d.y})`);
        link_elements
            .attr("x1", d => d.source.x)
            .attr("x2", d => d.target.x)
            .attr("y1", d => d.source.y)
            .attr("y2", d => d.target.y);
    }

    svg.call(d3.zoom()
        .extent([[0, 0], [width, height]])
        .scaleExtent([0.1, 8])
        .on("zoom", zoomed));

    function zoomed({ transform }) {
        main_group.attr("transform", transform);
    }

    controls.select("#linkStrength").on("input", function () {
        ForceSimulation.force("link").strength(+this.value);
        ForceSimulation.alpha(1).restart();
    });

    controls.select("#collideForce").on("input", function () {
        ForceSimulation.force("collide").strength(+this.value);
        ForceSimulation.alpha(1).restart();
    });

    controls.select("#chargeForce").on("input", function () {
        ForceSimulation.force("charge").strength(-this.value);
        ForceSimulation.alpha(1).restart();
    });

    controls.selectAll("[name=nodeSize]").on("change", function () {
        updateNodeSize(this.value);
    });

    function updateNodeSize(sizeMetric) {
        const scale = d3.scaleLinear()
            .domain(d3.extent(data.nodes, d => d[sizeMetric]))
            .range([5, 20]);

        node_elements.select("circle")
            .transition()
            .duration(500)
            .attr("r", d => scale(d[sizeMetric]));
    }

    // Create a side panel element
    const sidePanel = d3.select("body")
        .append("div")
        .attr("class", "side-panel");

    node_elements.on("click", function (event, d) {
        // Handle click event, update side panel with author information
        sidePanel.html(`
            <p><strong>Author ID:</strong> ${d.AuthorID}</p>
            <p><strong>Country:</strong> ${d.Country}</p>
            <p><strong>Number of Publications:</strong> ${d.NumPublications}</p>
            <p><strong>Total Citations:</strong> ${d.TotalCitations}</p>
            <p><strong>Degree:</strong> ${d.Degree}</p>
        `);
    });
    
}


