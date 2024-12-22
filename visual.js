var dataset = {
    nodes: [
      {
        id: 223,
        type: "Parent",
        properties: {},
      },
      {
        id: 136525,
        type: "Child",
        properties: {
          patient: "6090",
          batch: "70",
        },
      },
      {
        id: 136448,
        type: "Child",
        properties: {
          patient: "6094",
          batch: "70",
        },
      },
      {
        id: 136328,
        type: "Child",
        properties: {
          patient: "6082",
          batch: "70",
        },
      },
      {
        id: 136305,
        type: "Child",
        properties: {
          patient: "6096",
          batch: "70",
        },
      },
      {
        id: 136303,
        type: "Child",
        properties: {
          patient: "6093",
          batch: "70",
        },
      },
      {
        id: 136299,
        type: "Child",
        properties: {
          patient: "6091",
          batch: "70",
        },
      },
      {
        id: 136261,
        type: "Child",
        properties: {
          patient: "6089",
          batch: "70",
        },
      },
      {
        id: 136212,
        type: "Child",
        properties: {
          patient: "6087",
          batch: "70",
        },
      },
      {
        id: 136115,
        type: "Child",
        properties: {
          patient: "6078",
          batch: "70",
        },
      },
      {
        id: 136113,
        type: "Child",
        properties: {
          patient: "6088",
          batch: "70",
        },
      },
      {
        id: 135843,
        type: "Child",
        properties: {
          patient: "6072",
          batch: "70",
        },
      },
      {
        id: 555,
        type: "Grandchild",
        properties: {},
      },
    ],
    edges: [
      {
        id: 0,
        from: 136113,
        to: 555,
        properties: {},
      },
      {
        id: 0,
        from: 136525,
        to: 555,
        properties: {},
      },
      {
        id: 0,
        from: 223,
        to: 136525,
        properties: {},
      },
      {
        id: 0,
        from: 223,
        to: 136448,
        properties: {},
      },
      {
        id: 0,
        from: 223,
        to: 136328,
        properties: {},
      },
      {
        id: 0,
        from: 223,
        to: 136305,
        properties: {},
      },
      {
        id: 0,
        from: 223,
        to: 136303,
        properties: {},
      },
      {
        id: 0,
        from: 223,
        to: 136299,
        properties: {},
      },
      {
        id: 0,
        from: 223,
        to: 136261,
        properties: {},
      },
      {
        id: 0,
        from: 223,
        to: 136212,
        properties: {},
      },
      {
        id: 0,
        from: 223,
        to: 136115,
        properties: {},
      },
      {
        id: 0,
        from: 223,
        to: 136113,
        properties: {},
      },
      {
        id: 0,
        from: 223,
        to: 135843,
        properties: {},
      },
    ],
  }
  
var width = 960, height = 500
  
var svg = d3
  .select("body")
  .append("svg")
  .attr("width", width)
  .attr("height", height)
  
var force = d3.layout
  .force()
  .size([width, height])
  //gravity(0.2)
  .linkDistance(height / 6)
  .charge(function (node) {
    if (node.type !== "ORG") return -2000
    return -30
  })

// build the arrow.
svg
  .append("svg:defs")
  .selectAll("marker")
  .data(["end"]) // Different link/path types can be defined here
  .enter()
  .append("svg:marker") // This section adds in the arrows
  .attr("id", function (d) {
    return d
  })
  .attr("viewBox", "0 -5 10 10")
  .attr("refX", 12)
  .attr("refY", 0)
  .attr("markerWidth", 9)
  .attr("markerHeight", 5)
  .attr("orient", "auto")
  .attr("class", "arrow")
  .append("svg:path")
  .attr("d", "M0,-5L10,0L0,5")

var json = dataset

var edges = []

json.edges.forEach(function (e) {
  var sourceNode = json.nodes.filter(function (n) {
      return n.id === e.from
    })[0],
    targetNode = json.nodes.filter(function (n) {
      return n.id === e.to
    })[0]

  edges.push({
    source: sourceNode,
    target: targetNode,
    value: e.Value,
  })
})

for (var i = 0; i < json.nodes.length; i++) {
  json.nodes[i].collapsing = 0
  json.nodes[i].collapsed = false
}

var link = svg.selectAll(".link")
var node = svg.selectAll(".node")

force.on("tick", function () {
  // make sure the nodes do not overlap the arrows
  link.attr("d", function (d) {
    // Total difference in x and y from source to target
    diffX = d.target.x - d.source.x
    diffY = d.target.y - d.source.y

    // Length of path from center of source node to center of target node
    pathLength = Math.sqrt(diffX * diffX + diffY * diffY)

    // x and y distances from outside edge to outside edge of target node
    // x and y distances from center to outside edge of target node
    offsetX0 = (diffX * d.source.radius) / pathLength
    offsetY0 = (diffY * d.source.radius) / pathLength
    offsetX1 = (diffX * d.target.radius) / pathLength
    offsetY1 = (diffY * d.target.radius) / pathLength

    return (
      "M" +
      (d.source.x + offsetX0) +
      "," +
      (d.source.y + offsetY0) +
      "L" +
      (d.target.x - offsetX1) +
      "," +
      (d.target.y - offsetY1)
    )
  })

  node.attr("transform", function (d) {
    return "translate(" + d.x + "," + d.y + ")"
  })
})

update()

function update() {
  var nodes = json.nodes.filter(function (d) {
    return d.collapsing == 0
  })

  var links = edges.filter(function (d) {
    return d.source.collapsing == 0 && d.target.collapsing == 0
  })

  force.nodes(nodes).links(links).start()

  link = link.data(links)

  link.exit().remove()

  link
    .enter()
    .append("path")
    .attr("class", "link")
    .attr("marker-end", "url(#end)")

  node = node.data(nodes)

  node.exit().remove()

  node
    .enter()
    .append("g")
    .attr("class", function (d) {
      return "node " + d.type
    })

  node
    .append("circle")
    .attr("class", "circle")
    .attr("r", function (d) {
      d.radius = 30
      return d.radius
    }) // return a radius for path to use

  node
    .append("text")
    .attr("x", 0)
    .attr("dy", ".35em")
    .attr("text-anchor", "middle")
    .attr("class", "text")
    .text(function (d) {
      return d.type
    })

  // On node hover, examine the links to see if their
  // source or target properties match the hovered node.
  node.on("mouseover", function (d) {
    link.attr("class", function (l) {
      if (d === l.source || d === l.target) return "link active"
      else return "link inactive"
    })
  })

  // Set the stroke width back to normal when mouse leaves the node.
  node
    .on("mouseout", function () {
      link.attr("class", "link")
    })
    .on("click", click)

  function click(d) {
    if (!d3.event.defaultPrevented) {
      var inc = d.collapsed ? -1 : 1
      recurse(d)

      function recurse(sourceNode) {
        //check if link is from this node, and if so, collapse
        edges.forEach(function (l) {
          if (l.source.id === sourceNode.id) {
            l.target.collapsing += inc
            recurse(l.target)
          }
        })
      }
      d.collapsed = !d.collapsed
    }
    update()
  }
}
