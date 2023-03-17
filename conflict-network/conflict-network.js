//create basic variables
const width = window.innerWidth
const height = window.innerHeight

let edgeLengthExtent = [0, 0]

const nodeScale = d3.scaleSqrt()
  .domain([0, 400])
  .range([2, 15])

let edgeScale = d3.scaleLinear()
  .domain([1, 90])
  .range([1, 10])

let zoom = d3.zoom()
  .scaleExtent([1, 8])
  .on("zoom", zoomed)

let zoomScale = d3.scaleLinear()
  .domain(edgeLengthExtent)
  .range([9, 1])

let thisZoom = 1
let selectionActive = false


//zoom function
function zoomed(event, d) {
  d3.select(".networkG").attr("transform", event.transform);

  d3.selectAll(".nodes")
    .attr("stroke-width", 0.5 / event.transform.k)

  if (selectionActive == false) {
    d3.selectAll(".nodes")
      .attr("r", function(d) {
        return nodeScale(d.count) / event.transform.k
      })

    d3.selectAll(".label,.labelbg").attr("stroke-width", 3 / event.transform.k).attr("font-size", 11 / event.transform.k)
      .attr("dx", function(d) {
        return (nodeScale(d.count) + 2) / event.transform.k
      })

    if (event.transform.k <= 1) {
      d3.selectAll(".label,.labelbg").style("display", function(d) {
        if (d.count > 50) {
          return "block"
        } else {
          return "none"
        }
      })
    } else if (event.transform.k < 1.5) {
      d3.selectAll(".label,.labelbg").style("display", function(d) {
        if (d.count > 30) {
          return "block"
        } else {
          return "none"
        }
      })
    } else if (event.transform.k < 2) {
      d3.selectAll(".label,.labelbg").style("display", function(d) {
        if (d.count > 15) {
          return "block"
        } else {
          return "none"
        }
      })
    } else if (event.transform.k < 2.5) {
      d3.selectAll(".label,.labelbg").style("display", function(d) {
        if (d.count > 10) {
          return "block"
        } else {
          return "none"
        }
      })
    } else if (event.transform.k < 3) {
      d3.selectAll(".label,.labelbg").style("display", function(d) {
        if (d.count > 5) {
          return "block"
        } else {
          return "none"
        }
      })
    } else if (event.transform.k < 3.5) {
      d3.selectAll(".label,.labelbg").style("display", function(d) {
        if (d.count > 2) {
          return "block"
        } else {
          return "none"
        }
      })
    } else if (event.transform.k >= 4) {
      d3.selectAll(".label,.labelbg").style("display", function(d) {
        if (d.count > 0) {
          return "block"
        } else {
          return "none"
        }
      })
    }
  }
}

let color = d3.scaleOrdinal(d3.schemeCategory10)

let tooltip = d3.select("body")
  .append('div')
  .attr('class', 'tooltip')
  .style('display', 'none');


let svg = d3.select("#chart").select("svg")
  .attr("width", "100%")
  .attr("height", "100%")
  .attr("preserveAspectRatio", "xMidYMid")
  .attr("viewBox", "0 0 " + (width) + " " + (height))
  .append("g")
  .classed("zoomG", true)
  .append("g")
  .classed("zoomG2", true)
  .call(zoom)



//white background rectangle to make pan/zoom on empty space + rotation/zoom on click work
d3.select(".zoomG2").append("rect").attr("x", -10000).attr("y", -10000).attr("width", 500000).attr("height", 500000).attr("fill", "white")


let networkG = svg.append("g").classed("networkG", true)

let linkG = networkG.append("g").attr("class", "linkG")
let nodeG = networkG.append("g").attr("class", "nodeG")
let labelG = networkG.append("g").attr("class", "labelG")
let linkChildren = networkG.append("g").attr("class", "linkChildrenG")

///load data
Promise.all([
    d3.json("https://uclab.fh-potsdam.de/unfoldingedges/data/conflict-network.json"),
  ])
  .then(([dataset]) => {

    const nodesRaw = dataset.nodes
    const links = dataset.edges

    let nodes = []

//preprocessing of data
    Object.entries(nodesRaw).forEach(function(d, i) {
      nodes.push({
        id: d[0],
        gender: d[1].gender,
        human: d[1].human,
        count: 0
      })
    })

    let linksTransformed = []

    links.forEach((item, i) => {

      //node counting
      nodes.filter(function(D) {
        return D.id == item.source
      })[0].count++
      nodes.filter(function(D) {
        return D.id == item.target
      })[0].count++

      //link transformation
      if (linksTransformed.filter(function(D) {
          return (D.source == item.source && D.target == item.target) || D.source == item.target && D.target == item.source
        }).length == 0) {
        linksTransformed.push({
          source: item.source,
          target: item.target,
          children: [{
            source: item.source,
            target: item.target,
            topics: item.topics[0],
            predicate: item.predicate,
            reference: item.provenience
          }]
        })
      } else if (linksTransformed.filter(function(D) {
          return (D.source == item.source && D.target == item.target)
        }).length == 1) {
        linksTransformed.filter(function(D) {
          return (D.source == item.source && D.target == item.target)
        })[0].children.push({
          source: item.source,
          target: item.target,
          topics: item.topics[0],
          predicate: item.predicate,
          reference: item.provenience
        })
      } else if (linksTransformed.filter(function(D) {
          return (D.source == item.target && D.target == item.source)
        }).length == 1) {
        linksTransformed.filter(function(D) {
          return (D.source == item.target && D.target == item.source)
        })[0].children.push({
          source: item.source,
          target: item.target,
          topics: item.topics[0],
          predicate: item.predicate,
          reference: item.provenience
        })
      }

    });


    linksTransformed.forEach((item, i) => {
      item.childrenNested = d3.group(item.children, d => d.source, d => d.predicate, d => d.topics)
      item.childrenNested2 = d3.groups(item.children, d => d.source, d => d.predicate, d => d.topics)
    });


//force simulation
    const simulation = d3.forceSimulation()
      .force("link", d3.forceLink().id(function(d, i) {
        return d.id;
      }))
      .force("charge", d3.forceManyBody().strength(-20))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("collision", d3.forceCollide(function(d) {
        return nodeScale(d.count) + 2
      }));

    simulation
      .nodes(nodes.filter(function(d) {
        return d.count > 0
      }))
      .on("tick", ticked)

    simulation
      .force("link")
      .links(linksTransformed)


//creation of links, nodes and labels
    linkG.selectAll(".link")
      .data(linksTransformed)
      .join("line")
      .attr("fill", "none")
      .attr("cursor", "pointer")
      .attr("stroke-width", function(d) {
        return edgeScale(d.children.length)
      })
      .attr("class", "link")
      .style("stroke", "rgba(132, 147, 146, 1)")
      .style("opacity", .75)
      .on("mousemove", function(event, d, i) {
        d3.select(this).classed("highlighted", true).raise()

        tooltip
          .style('position', 'absolute')
          .style('left', `${event.pageX + 5}px`)
          .style('top', `${event.pageY + 10}px`)
          .style('display', 'inline-block')
          .style('opacity', '0.9')
          .html(function() {
            return `<p style="font-weight:bold" class="tooltip-text">${d.source.id} – ${d.target.id} (${d.children.length})</p>`
          })
      })
      .on("mouseout", function(event, d, i) {
        d3.select(this).classed("highlighted", false)

        tooltip
          .style('position', 'absolute')
          .style('left', `${event.pageX + 5}px`)
          .style('top', `${event.pageY + 10}px`)
          .style('display', 'none')
      })
      .on("click", function(event, d) {

        d3.selectAll(".link").style("display", "block")
        unfoldingEdgesTimeline(d, event.currentTarget)
      })

    nodeG.selectAll(".nodes")
      .data(nodes.filter(function(d) {
        return d.count > 0
      }))
      .join("circle")
      .classed("nodes", true)
      .attr("r", function(d) {
        return nodeScale(d.count)
      })
      .attr("fill", "rgb(53, 75, 84)")
      .style("stroke", "var(--node-stroke)")
      .attr("stroke-width", 0.5)
      .on("mousemove", function(event, d) {
        tooltip
          .style('position', 'absolute')
          .style('left', `${event.pageX + 5}px`)
          .style('top', `${event.pageY + 10}px`)
          .style('display', 'inline-block')
          .style('opacity', '0.9')
          .html(function() {
            return `<p style="font-weight:bold" class="tooltip-text">${d.id}</p>`
          })
      })
      .on("mouseout", function(event, d) {
        tooltip
          .style('position', 'absolute')
          .style('left', `${event.pageX + 5}px`)
          .style('top', `${event.pageY + 10}px`)
          .style('display', 'none')
      })

    labelG.selectAll(".labelbg")
      .data(nodes.filter(function(d) {
        return d.count > 0
      }))
      .join("text")
      .classed("labelbg", true)
      .attr("dx", function(d) {
        return nodeScale(d.count) + 2
      })
      .attr("stroke-linecap", "round")
      .attr("fill", "var(--label-bg-color)")
      .style("stroke", "var(--label-bg-color)")
      .attr("stroke-width", 3 / thisZoom)
      .text(function(d) {
        return d.id
      })
      .style("display", function(d, i) {
        if (d.count > 50) {
          return "block"
        } else {
          return "none"
        }
      })
      .attr("font-size", 11 / thisZoom)

    labelG.selectAll(".label")
      .data(nodes.filter(function(d) {
        return d.count > 0
      }))
      .join("text")
      .classed("label", true)
      .attr("dx", function(d) {
        return nodeScale(d.count) + 2
      })
      .attr("fill", "var(--label-color)")
      .text(function(d) {
        return d.id
      })
      .style("display", function(d, i) {
        if (d.count > 50) {
          return "block"
        } else {
          return "none"
        }
      })
      .attr("font-size", 11 / thisZoom)


//unfolding edges function
    function unfoldingEdgesTimeline(d, currentTarget) {


      selectionActive = true
      d3.selectAll(".nodes").classed("notSelected", true).on("mouseover", null)
      d3.selectAll(".link").classed("notSelected", true).transition().style("stroke", "rgba(218, 231, 230, 0.72)").style("opacity", 1)
      d3.select(".linkChildrenG").style("opacity", 1).raise().attr("filter", null).on("mouseover", function(D) {

        timerInterval2 = setInterval(timerIncrement2, 500);
      }).on("mouseout", function(D) {
        timerSeconds2 = 0
        clearTimeout(timerInterval2);
      })

      d3.select(currentTarget).style("display", "none")


      let x1 = d.source.x //x point A
      let y1 = d.source.y //y point A
      let x2 = d.target.x //x point B
      let y2 = d.target.y //y point B
      let mx = (x1 + x2) / 2 // center point x between x1 and x2
      let my = (y1 + y2) / 2 // center point y between y1 and y2

      let sourceCount = d.childrenNested2.length
      let sourceAPredicateCount = d.childrenNested2[0][1].length
      let sourceATopicCount = 0
      let sourceATotalLineCount = 0
      let sourceBTopicCount = 0
      let sourceBPredicateCount = (d.childrenNested2.length == 1) ? 0 : d.childrenNested2[1][1].length


      d.childrenNested2[0][1].forEach((d, i) => {
        sourceATopicCount = sourceATopicCount + d[1].length
      });

      if (sourceCount == 2) {
        d.childrenNested2[1][1].forEach((d, i) => {
          sourceBTopicCount = sourceBTopicCount + d[1].length
        });
      }

      sourceATotalLineCount = 1 + sourceAPredicateCount + sourceATopicCount + 1



      let edgeLength = Math.sqrt((Math.pow((x2 - x1), 2)) + (Math.pow((y2 - y1), 2)))
      let edgeNumber = sourceCount + 1 + sourceAPredicateCount + sourceATopicCount + sourceBPredicateCount + sourceBTopicCount

      zoomScale = d3.scaleLinear()
        .domain(edgeLengthExtent)
        .range([9, 1])

      thisZoom = zoomScale(edgeLength)

      let paddingEdgeBox = 20 / thisZoom


      let edgeHeightScale = d3.scaleLinear()
        .domain([0, 60])
        .range([0, 1000 / thisZoom])


      zoom.translateTo(svg.transition().duration(500), mx, my)
      setTimeout(function() {
        zoom.scaleTo(svg.transition().duration(500), zoomScale(edgeLength))
      }, 500);

      ///calculate angle of line AB:
      function angle(cx, cy, ex, ey) {
        let dy = ey - cy;
        let dx = ex - cx;
        let theta = Math.atan2(dy, dx); // range (-PI, PI]
        theta *= 180 / Math.PI; // rads to degs, range (-180, 180]
        //if (theta < 0) theta = 360 + theta; // range [0, 360)
        return theta;
      }

      let node1Radius = (2 * nodeScale(d.source.count) + 40) / thisZoom
      let node2Radius = (2 * nodeScale(d.target.count) + 40) / thisZoom


      d3.select(".zoomG").transition().duration(1000).attr("transform-origin", "center center").attr("transform", "rotate(" + (-angle(x1, y1, x2, y2)) + ")")
      d3.selectAll(".timelineBgRect").transition().duration(1000).attr("y", 0).attr("height", 0).on("end", function() {
        d3.select(this).remove()
      })
      d3.selectAll(".linkChild").transition().duration(1000).attr("y", 0).attr("height", 0).on("end", function() {
        d3.select(this).remove()
      })
      d3.selectAll(".linkbgline").transition().duration(1000).attr("y1", 0).attr("y2", 0).attr("height", 0).on("end", function() {
        d3.select(this).remove()
      })
      d3.selectAll(".linktopics").transition().duration(1000).attr("y", 0).on("end", function() {
        d3.select(this).remove()
      })
      d3.selectAll(".linkcountryG").transition().duration(1000).style("opacity", 0).attr("y", 0).on("end", function() {
        d3.select(this).remove()
      })


      //rectangle box
      d3.select(".linkchildrenG").append("rect")
        .classed("timelineBgRect", true)
        .attr("id", "timelineBgRect")
        .attr("x", 0)
        .attr("y", 0)
        .attr("height", 0)
        .attr("width", edgeLength)
        .attr("fill", "var(--edge-color-selected)")
        .style("opacity", 0.87)
        .attr("transform", "translate(" + x1 + " " + y1 + ")rotate(" + angle(x1, y1, x2, y2) + ")")
        .transition().duration(1000)
        .attr("y", -(edgeHeightScale(edgeNumber) / 2) - paddingEdgeBox)
        .attr("height", edgeHeightScale(edgeNumber) + 2 * paddingEdgeBox)



      let linkChildrenEntities = d3.select(".linkChildrenG").append("g")
        .classed("linkChildrenEntities", true)
        .attr("transform", "translate(" + x1 + " " + y1 + ")rotate(" + angle(x1, y1, x2, y2) + ")")


      let countryGroup = linkChildrenEntities.selectAll(".linkcountryG")
        .data(d.childrenNested2)
        .join("g")
        .classed("linkcountryG", true)
        .style("opacity", 0)
        .attr("transform", function(D, I) {
          if (I == 0) {
            return `translate(0,${paddingEdgeBox + edgeHeightScale(0) - (edgeHeightScale(edgeNumber)/2)})`
          } else {
            return `translate(0,${paddingEdgeBox + edgeHeightScale(sourceATotalLineCount) - (edgeHeightScale(edgeNumber)/2)})`
          }
        })
        .transition()
        .duration(1000)
        .style("opacity", 1)
        .attr("transform", function(D, I) {
          if (I == 0) {
            return `translate(0,${paddingEdgeBox + edgeHeightScale(0) - (edgeHeightScale(edgeNumber)/2)})`
          } else {
            return `translate(0,${paddingEdgeBox + edgeHeightScale(sourceATotalLineCount) - (edgeHeightScale(edgeNumber)/2)})`
          }
        })


      d3.selectAll(".linkcountryG")
        .append("text")
        .text(function(D) {
          return D[0] + " → " + D[1][0][1][0][1][0].target
        })
        .attr("x", function(D, I) {
          return paddingEdgeBox
        })
        .attr("y", 0)
        .style("dy", 18.5 / thisZoom)
        .attr("font-size", 18.5 / thisZoom)
        .style("font-weight", "bold")
        .attr("fill", "white")

      d3.selectAll(".linkcountryG")
        .selectAll(".linkPredicateG")
        .data(d => d[1])
        .join("g")
        .classed("linkPredicateG", true)
        .attr("transform", function(D, I) {
          if (I == 0) {
            return `translate(${paddingEdgeBox},${edgeHeightScale(1)})`
          } else {
            let paragraphLineStart = 0
            for (var i = 0; i < I; i++) {
              paragraphLineStart = paragraphLineStart + d3.select(this.parentNode).datum()[1][i][1].length
            }

            return `translate(${paddingEdgeBox},${edgeHeightScale(paragraphLineStart+1+I)})`
          }
        })
        .append("text")
        .text(function(D) {
          return D[0]
        })
        .attr("fill", "white")
        .style("dy", 18.5 / thisZoom)
        .attr("font-size", 18.5 / thisZoom)
        .style("font-weight", "bold")
        .attr("fill", function(D) {
          return "var(--insert-text-highlight-color)"
        })

      const topicCircleScale = d3.scaleSqrt()
        .domain([1, 20])
        .range([2, 20])

      d3.selectAll(".linkPredicateG")
        .selectAll(".topicCircle")
        .data(d => d[1])
        .join("circle")
        .classed("topicCircle", true)
        .attr("transform", function(D, I) {
          return `translate(0,${edgeHeightScale(I+1)})`
        })
        .attr("fill", "rgb(228, 97, 84)")
        .attr("cx", 8 / thisZoom)
        .attr("cy", function(D) {
          return -((topicCircleScale(D[1].length) / 2) + 2) / thisZoom
        })
        .attr("r", function(D) {
          return topicCircleScale(D[1].length) / thisZoom
        })
        .style("opacity", 0.3)



      d3.selectAll(".linkPredicateG")
        .selectAll(".linkTopicsG")
        .data(d => d[1])
        .join("g")
        .classed("linkTopicsG", true)
        .attr("transform", function(D, I) {
          return `translate(0,${edgeHeightScale(I+1)})`
        })
        .append("text")
        .text(function(D) {
          return " " + D[0] + " (" + D[1].length + ")"
        })
        .attr("fill", "white")
        .style("dy", 18.5 / thisZoom)
        .attr("dx", paddingEdgeBox)
        .attr("font-size", 18.5 / thisZoom)
        .on("mousemove", function(event, D) {

          tooltip
            .style('position', 'absolute')
            .style('left', `${event.pageX + 5}px`)
            .style('top', `${event.pageY + 10}px`)
            .style('display', 'inline-block')
            .style('opacity', '0.9')

          tooltip.selectAll("p")
            .data(D[1])
            .join("p")
            .text(function(d) {
              return d.reference
            })
            .style("font-weight", "normal")

        })
        .on("mouseout", function() {
          tooltip
            .style('display', 'none')
        })
        .each(function(D) {
          let originalCharLength = d3.select(this).text().length
          let textLength = d3.select(this).node().getComputedTextLength()
          let charLength = d3.select(this).text().length
          let string = " " + D[0]

          cutText(d3.select(this), string, textLength, (edgeLength - 3 * paddingEdgeBox), charLength)

          function cutText(selection, string, textLength, edgeLength, charLength) {
            if (textLength > edgeLength) {
              charLength = charLength - 1
              textLength = selection.node().getComputedTextLength()
              selection.text(string.slice(0, charLength))
              cutText(selection.text(string.slice(0, charLength)), string, textLength, edgeLength, charLength)
            }
          }
        })


      d3.selectAll(".closeedges").remove()
      d3.selectAll(".closeedgesCircle").transition().duration(1000).attr("cy", 0).attr("r", 0).style("opactiy", 0).on("end", function() {
        d3.select(this).remove()
      })


      let closeEdgeSymbol = linkChildrenEntities.append("g")

      closeEdgeSymbol.append("circle").classed("closeedgesCircle", true)
        .style("fill", "white")
        .attr("cy", 0)
        .attr("cx", function(D, I) {
          return edgeLength
        })
        .attr("r", 0)
        .style("stroke", "black")
        .attr("stroke-width", 0)
        .transition()
        .duration(1000)
        .attr("stroke-width", 2 / thisZoom)
        .attr("r", 15 / thisZoom)
        .attr("cy", function(D, I) {
          return -7 / thisZoom - paddingEdgeBox / thisZoom + edgeHeightScale(0) - (edgeHeightScale(edgeNumber) / 2)
        })


      closeEdgeSymbol.append("text").text("✕").classed("closeedges", true)
        .attr("y", 0)
        .style("cursor", "pointer")
        .style("opacity", 0)
        .style("text-anchor", "middle")
        .attr("x", function(D, I) {
          return edgeLength
        })
        .attr("font-size", 20 / thisZoom)
        .on("click", function() {

          thisZoom = 1

          d3.select(".zoomG").transition().duration(1000).attr("transform-origin", "center center").attr("transform", "rotate(" + 0 + ")")

          d3.selectAll(".timelineBgRect").transition().duration(1000).attr("y", 0).attr("height", 0).on("end", function() {
            selectionActive = false
            d3.select(this).remove()
          })
          d3.selectAll(".linkChild").transition().duration(1000).attr("y", 0).attr("height", 0).on("end", function() {
            d3.select(this).remove()
          })
          d3.selectAll(".linkbgline").transition().duration(1000).attr("y1", 0).attr("y2", 0).attr("height", 0).on("end", function() {
            d3.select(this).remove()
          })
          d3.selectAll(".linktopics").transition().duration(1000).attr("y", 0).on("end", function() {
            d3.select(this).remove()
          })
          d3.selectAll(".closeedges").transition().duration(1000).attr("y", 0).style("opactiy", 0).on("end", function() {
            d3.select(this).remove()
          })
          d3.selectAll(".closeedgesCircle").transition().duration(1000).attr("cy", 0).attr("r", 0).style("opactiy", 0).on("end", function() {
            d3.select(this).remove()
          })
          d3.selectAll(".linkcountryG").transition().duration(1000).style("opacity", 0).attr("y", 0).on("end", function() {
            d3.select(this).remove()
          })


          d3.selectAll(".link").style("display", "block").classed("notSelected", true).transition().duration(1000)
            .style("stroke", "rgba(132, 147, 146, 1)")
            .style("opacity", .75)
            .attr("stroke-width", function(d) {
              return edgeScale(d.children.length)
            })
            .attr("x1", function(d) {
              return d.source.x
            })
            .attr("y1", function(d) {
              return d.source.y
            })
            .attr("x2", function(d) {
              return d.target.x
            })
            .attr("y2", function(d) {
              return d.target.y
            })


          d3.selectAll(".nodes")
            .transition().duration(1000)
            .attr("fill", "rgb(53, 75, 84)").attr("transform", function(d) {
              return 'translate(' + d.x + ',' + d.y + ')';
            }).style("opacity", 1).attr("r", function(d) {
              return nodeScale(d.count)
            })


          d3.selectAll(".label,.labelbg")
            .style("display", function(d, i) {
              if (d.count > 50) {
                return "block"
              } else {
                return "none"
              }
            })
            .transition()
            .duration(1000)
            .attr("transform", function(d) {
              return 'translate(' + d.x + ',' + d.y + ')';
            })
            .attr("font-size", 11 / thisZoom)
            .attr("stroke-width", 2 / thisZoom)
            .attr("text-anchor", "start")
            .attr("dx", function(d) {
              return nodeScale(d.count) + 2
            })

          svg.transition()
            .duration(1000)
            .call(zoom.transform, d3.zoomIdentity.scale(1));
        })
        .transition()
        .duration(1000)
        .attr("y", function(D, I) {
          return -paddingEdgeBox / thisZoom + edgeHeightScale(0) - (edgeHeightScale(edgeNumber) / 2)
        })
        .style("opacity", 1)



      d3.selectAll(".label,.labelbg").style("display", "none")

      d3.selectAll(".label,.labelbg")
        .filter(function(D) {
          return D.index == d.source.index
        })
        .style("display", "block")
        .transition()
        .duration(1000)
        .attr("transform-origin", "top left")
        .attr("font-size", 30 / thisZoom)
        .attr("text-anchor", "end")
        .attr("dx", -5 / thisZoom)
        .attr("stroke-width", 4 / thisZoom)
        .attr("transform", function() {
          return "translate(" + x1 + " " + y1 + ")rotate(" + angle(x1, y1, x2, y2) + ")"
        })


      d3.selectAll(".label,.labelbg")
        .filter(function(D) {
          return D.index == d.target.index
        })
        .style("display", "block")
        .transition()
        .duration(1000)
        .attr("font-size", 30 / thisZoom)
        .attr("transform-origin", "top left")
        .attr("text-anchor", "start")
        .attr("dx", 5 / thisZoom)
        .attr("stroke-width", 4 / thisZoom)
        .attr("transform", function() {
          return "translate(" + x2 + " " + y2 + ")rotate(" + angle(x1, y1, x2, y2) + ")"
        })


      d3.selectAll(".link")
        .attr("stroke-width", function(D) {
          return edgeScale(0.5) / thisZoom
        })
        .style("opacity", 0.3)
        .filter(function(D) {
          return D.source.id == d.source.id || D.source.id == d.target.id || D.target.id == d.target.id || D.target.id == d.source.id
        })
        .raise()
        .classed("notSelected", false)
        .transition()
        .duration(1000)
        .style("opacity", 0.7)
        .attr("stroke-width", function(D) {
          return edgeScale(D.children.length)
        })
        .style("stroke", "rgba(132, 147, 146, 1)")

      d3.selectAll(".nodes")
        .classed("notedgerelevant", false)
        .filter(function(D) {
          return D.index != d.source.index && D.index != d.target.index
        })
        .classed("notedgerelevant", true)
        .classed("notSelected", true)
        .transition().duration(1000).attr("fill", "rgba(218, 231, 230, 0.72)")
        .attr("r", function(d) {
          return nodeScale(d.count) / thisZoom
        })



      ///connected nodes
      let allConnections = linksTransformed.filter(function(E, G) {
        return E.source.id == d.source.id || E.target.id == d.source.id || E.source.id == d.target.id || E.target.id == d.target.id
      })

      allConnections.forEach(function(E, G) {
        d3.selectAll(".nodes")
          .filter(function(X, Y) {
            return X.id == E.source.id || X.id == E.target.id
          })
          .classed("notSelected", false)
          .transition()
          .duration(1000)
          .style("opacity", 1)
          .attr("fill", "rgb(53, 75, 84)")
          .attr("r", function(d, i) {
            return 2 * nodeScale(d.count) / thisZoom
          })


        //rotate relevant labels
        d3.selectAll(".label,.labelbg")
          .filter(function(X, Y) {
            return X.id == E.source.id || X.id == E.target.id
          })
          .filter(function(D) {
            return D.index != d.source.index && D.index != d.target.index
          })
          .style("display", "block")
          .attr("font-size", 0)
          .transition()
          .duration(1000)
          .style("opactiy", 1)
          .attr("font-size", 12 / thisZoom)
          .attr("transform-origin", "top left")
          .attr("text-anchor", "end")
          .attr("dx", -5 / thisZoom)
          .attr("transform", function(D) {
            return "translate(" + D.x + " " + D.y + ")rotate(" + angle(x1, y1, x2, y2) + ")"
          })


        d3.selectAll(".labelbg")
          .filter(function(X, Y) {
            return X.id == E.source.id || X.id == E.target.id
          })
          .filter(function(D) {
            return D.index != d.source.index && D.index != d.target.index
          })
          .attr("stroke-width", 3 / thisZoom)

      })


      var timerSeconds = 0;
      var timerInterval;

      var timerSeconds2 = 0;
      var timerInterval2;

      function timerIncrement() {
        timerSeconds += 1;
        if (timerSeconds >= 3) {
          d3.select(".linkChildrenG").style("opacity", 0.4).lower().attr("filter", "url(#blur)")
          d3.selectAll(".linkTopicsG").style("pointer-events", "none")
        }
      }

      function timerIncrement2() {
        timerSeconds += 1;
        if (timerSeconds >= 3) {
          d3.select(".linkChildrenG").style("opacity", 1).raise().attr("filter", null)
          d3.selectAll(".linkTopicsG").style("pointer-events", "auto")
        }
      }

      d3.selectAll(".nodes").filter(function(D) {
          return D.index == d.source.index || D.index == d.target.index
        }).raise()
        .on("mouseover", function(D) {
          timerInterval = setInterval(timerIncrement, 500);
        })
        .on("mouseout", function(D) {
          timerSeconds = 0
          clearTimeout(timerInterval);
        })
        .transition().duration(1000)
        .attr("fill", "rgb(17, 24, 27)")
        .style("opacity", 1).attr("r", function(d, i) {
          return 2 * nodeScale(d.count) / thisZoom
        })


    }





//force tick function to position nodes
    function ticked(d) {
      if (simulation.alpha() < 0.01) {
        simulation.stop()

        let maxY = d3.extent(nodes, function(d) {
          return d.y
        });
        let scaleNodeFrame = d3.scaleLinear()
          .domain(maxY)
          .range([0 + 10, height - 10])

        d3.selectAll(".nodes")
          .attr("transform", function(d) {
            d.y = scaleNodeFrame(d.y)
            d.x = Math.max(200, Math.min(width - 200, scaleNodeFrame(d.x)))
            return 'translate(' + d.x + ',' + d.y + ')';
          })

        d3.selectAll(".label,.labelbg")
          .attr("transform", function(d) {
            return 'translate(' + d.x + ',' + d.y + ')';
          })


        d3.selectAll(".link")
          .attr("x1", function(d) {
            d.length = Math.sqrt((Math.pow((d.target.x - d.source.x), 2)) + (Math.pow((d.target.y - d.source.y), 2)))
            return d.source.x
          })
          .attr("y1", function(d) {
            return d.source.y
          })
          .attr("x2", function(d) {
            return d.target.x
          })
          .attr("y2", function(d) {
            return d.target.y
          });


        edgeLengthExtent = d3.extent(linksTransformed, function(d) {
          return d.length
        });
      }
    }

  });
