//creating basic variables
const width = window.innerWidth
const height = window.innerHeight

let edgeLengthExtent = [0, 0]

const nodeScale = d3.scaleSqrt()
  .domain([1, 40])
  .range([2, 12])

const labelScale = d3.scaleLinear()
  .domain([1, 40])
  .range([7, 16])
  .clamp(true)

let edgeScale = d3.scaleLinear()
  .domain([1, 50])
  .range([1, 12])

let zoom = d3.zoom()
  .scaleExtent([1, 100])
  .on("zoom", zoomed)

let zoomScale = d3.scaleLinear()
  .domain(edgeLengthExtent)
  .range([13.5, 1.2])
  .clamp(true)

let thisZoom = 1
let selectionActive = false

let color = d3.scaleOrdinal(d3.schemeCategory10)

let tooltip = d3.select("body")
  .append('div')
  .attr('class', 'tooltip')
  .style('display', 'none')
  .style("width", "200px");


var svg = d3.select("#chart").select("svg")
  .attr("width", "100%")
  .attr("height", "100%")
  .attr("preserveAspectRatio", "xMidYMid")
  .attr("viewBox", "0 0 " + (width) + " " + (height))
  .append("g")
  .classed("zoomG", true)
  .append("g")
  .classed("zoomG2", true)
  .call(zoom)



///zoom function
function zoomed(event, d) {
  d3.select(".networkG").attr("transform", event.transform);

  d3.selectAll(".nodes")
    .attr("stroke-width", 0.5 / event.transform.k)


  if (selectionActive == false) {
    d3.selectAll(".nodes")
      .attr("r", function(d) {
        return nodeScale(d.count) / event.transform.k
      })


    d3.selectAll(".label,.labelbg").attr("stroke-width", 3 / event.transform.k)
      .attr("font-size", function(d, i) {
        return labelScale(d.count) / event.transform.k
      })
      .attr("dx", function(d) {
        return (nodeScale(d.count) + 2) / event.transform.k
      })

    if (event.transform.k < 1.2) {
      d3.selectAll(".label,.labelbg").style("display", function(d) {
        if (d.count > 16) {
          return "block"
        } else {
          return "none"
        }
      })
    } else if (event.transform.k > 1.2 && event.transform.k <= 1.5) {
      d3.selectAll(".label,.labelbg").style("display", function(d) {
        if (d.count > 10) {
          return "block"
        } else {
          return "none"
        }
      })
    } else if (event.transform.k > 1.5 && event.transform.k <= 2) {
      d3.selectAll(".label,.labelbg").style("display", function(d) {
        if (d.count > 7) {
          return "block"
        } else {
          return "none"
        }
      })
    } else if (event.transform.k > 2 && event.transform.k <= 3) {
      d3.selectAll(".label,.labelbg").style("display", function(d) {
        if (d.count > 5) {
          return "block"
        } else {
          return "none"
        }
      })
    } else if (event.transform.k > 3) {
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




//white background rectangle to make pan/zoom on empty space + rotation/zoom on click work
d3.select(".zoomG2").append("rect").attr("x", -10000).attr("y", -10000).attr("width", 500000).attr("height", 500000).attr("fill", "white")


let networkG = svg.append("g").classed("networkG", true)
let linkG = networkG.append("g").attr("class", "linkG")
let nodeG = networkG.append("g").attr("class", "nodeG")
let labelG = networkG.append("g").attr("class", "labelG")
let linkChildren = networkG.append("g").attr("class", "linkChildrenG")

///load data and preprocessing
Promise.all([
    d3.json("https://uclab.fh-potsdam.de/unfoldingedges/data/nobelprize_nodes.json"),
    d3.json("https://uclab.fh-potsdam.de/unfoldingedges/data/nobelprize_edges.json"),
  ])
  .then(([nodes, links]) => {



///data processing to prepare for unfolding
    links.forEach(function(d) {
      d.children2 = []

      d.children.forEach(function(D, I) {
        if (D.SourceDetails && D.SourceDetails.DateApproxBegin2 && D.SourceDetails.DateApproxBegin2.length == 4) {
          D.Date = D.SourceDetails.DateApproxBegin2
        } else {
          D.Date = 99999
        }
      })

      d.children.sort((a, b) => d3.descending(a.SourceType, b.SourceType) || d3.ascending(a.Date, b.Date)).forEach(function(D, I) {
        if (I < 50) {
          d.children2.push(D)
        }
      })

      d.childrenNested = d3.group(d.children2, d => d.SourceType)
      d.childrenNested2 = d3.groups(d.children2, d => d.SourceType)

    })

    ///force simulation
    const simulation = d3.forceSimulation()
      .force("link", d3.forceLink().id(function(d, i) {
        return d.id;
      }))
      .force("charge", d3.forceManyBody().strength(-50))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("collision", d3.forceCollide(function(d) {
        return nodeScale(d.count) + 20
      }));


    simulation
      .nodes(nodes)
      .on("tick", ticked)

    simulation
      .force("link")
      .links(links)


//create nodes, links and labels
    linkG.selectAll(".link")
      .data(links)
      .join("line")
      .attr("fill", "none")
      .attr("cursor", "pointer")
      .attr("stroke-width", function(d) {
        return edgeScale(d.children2.length)
      })
      .attr("class", "link")
      .style("stroke", "rgba(132, 147, 146, 1)")
      .style("opacity", .6)
      .on("mousemove", function(event, d, i) {
        d3.select(this).classed("highlighted", true).raise()

        tooltip
          .style('position', 'absolute')
          .style('left', `${event.pageX + 5}px`)
          .style('top', `${event.pageY + 10}px`)
          .style('display', 'inline-block')
          .style('opacity', '0.9')
          .html(function() {
            return `<p style="font-weight:bold" class="tooltip-text">${d.source.Name} – ${d.target.Name} (${d.children2.length})</p>`
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
            return `<p style="font-weight:bold" class="tooltip-text">${d.Name}</p>`
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
        return d.Name
      })
      .style("display", function(d, i) {
        if (d.count > 16) {
          return "block"
        } else {
          return "none"
        }
      })
      .attr("font-size", function(d, i) {
        return labelScale(d.count) / thisZoom
      })


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
        return d.Name
      })
      .style("display", function(d, i) {
        if (d.count > 16) {
          return "block"
        } else {
          return "none"
        }
      })
      .attr("font-size", function(d, i) {
        return labelScale(d.count) / thisZoom
      })



///function for unfolding edges
    function unfoldingEdgesTimeline(d, currentTarget) {
      selectionActive = true
      d3.selectAll(".nodes").classed("notSelected", true).on("mouseover", null)
      d3.selectAll(".link").classed("notSelected", true).transition().style("stroke", "rgba(218, 231, 230, 0.72)").style("opacity", 0.5)
      d3.select(".linkChildrenG").style("opacity", 1).raise().attr("filter", null).on("mouseover", function(D) {
        timerInterval2 = setInterval(timerIncrement2, 500);
      }).on("mouseout", function(D) {
        timerSeconds2 = 0
        clearTimeout(timerInterval2);
      })

      d3.select(currentTarget).style("display", "none")


      let x1 = d.source.x //x Point A
      let y1 = d.source.y //y Point A
      let x2 = d.target.x //x Point B
      let y2 = d.target.y //y Point B
      let mx = (x1 + x2) / 2 // Center point x between x1 and x2
      let my = (y1 + y2) / 2 // Center point y between y1 and y2

      let relationTypeCount = d.childrenNested2.length
      let relationsCount = 0

      d.childrenNested2.forEach((d, i) => {
        relationsCount = relationsCount + d[1].length
      });

      let totalLineCount = relationTypeCount * 2 + relationsCount


      let edgeLength = Math.sqrt((Math.pow((x2 - x1), 2)) + (Math.pow((y2 - y1), 2)))
      let edgeNumber = d.children2.length

      zoomScale = d3.scaleLinear()
        .domain(edgeLengthExtent)
        .range([13.5, 1.2])
        .clamp(true)

      thisZoom = zoomScale(edgeLength)


      let paddingEdgeBox = 10 / thisZoom

      let edgeHeightScale = d3.scaleLinear()
        .domain([0, 40])
        .range([0, 400 / thisZoom])

      let yearStart = +d3.extent(d.children.filter(function(x) {
        return x.Date != 99999 && x.Date != "o.D." && x.Date != " 201"
      }), function(children) {
        return children.Date
      })[0] - 25 //1875
      let yearEnd = +d3.extent(d.children.filter(function(x) {
        return x.Date != 99999 && x.Date != "o.D." && x.Date != " 201"
      }), function(children) {
        return children.Date
      })[1] + 5 //2020

      yearStart = Math.ceil(yearStart / 25) * 25

      console.log(d3.extent(d.children.filter(function(x) {
        return x.Date != 99999 && x.Date != "o.D."
      }), function(children) {
        return children.Date
      }))


      let edgeTimelineScale = d3.scaleLinear()
        .domain([yearStart, yearEnd])
        .range([paddingEdgeBox, edgeLength - paddingEdgeBox])


      zoom.translateTo(svg.transition().duration(500), mx, my)
      setTimeout(function() {
        zoom.scaleTo(svg.transition().duration(500), zoomScale(edgeLength))
      }, 500);

      ///calculate angle of line AB
      function angle(cx, cy, ex, ey) {
        let dy = ey - cy;
        let dx = ex - cx;
        let theta = Math.atan2(dy, dx);
        theta *= 180 / Math.PI;
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

      d3.selectAll(".edgeTypeG").transition().duration(1000).style("opacity", 0).attr("transform", function(D, I) {
        return `translate(${paddingEdgeBox},${0})`
      }).on("end", function() {
        d3.select(this).remove()
      })
      d3.selectAll(".timelineticks").transition().duration(1000).attr("y1", 0).attr("y2", 0).style("opacity", 0).on("end", function() {
        d3.select(this).remove()
      })
      d3.selectAll(".timelineticklabels").transition().duration(1000).attr("y", 0).style("opacity", 0).on("end", function() {
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
        .attr("y", -(edgeHeightScale(totalLineCount) / 2) - paddingEdgeBox)
        .attr("height", edgeHeightScale(totalLineCount) + 2 * paddingEdgeBox)


      let linkChildrenEntities = d3.select(".linkChildrenG").append("g")
        .classed("linkChildrenEntities", true)
        .attr("transform", "translate(" + x1 + " " + y1 + ")rotate(" + angle(x1, y1, x2, y2) + ")")


      //background TimelineTicks
      for (var i = yearStart; i <= yearEnd; i = i + 25) {
        linkChildrenEntities.append("line")
          .classed("timelineticks", true)
          .style("stroke", "white")
          .style("stroke-width", 0.5 / thisZoom)
          .style("opacity", 0.5)
          .attr("x1", edgeTimelineScale(i))
          .attr("x2", edgeTimelineScale(i))
          .attr("y1", 0)
          .attr("y2", 0)
          .transition()
          .duration(1000)
          .attr("y1", -(edgeHeightScale(totalLineCount - 3) / 2))
          .attr("y2", edgeHeightScale(totalLineCount) / 2 + paddingEdgeBox)


        linkChildrenEntities.append("text").text(i)
          .classed("timelineticklabels", true)
          .attr("font-size", 11 / thisZoom)
          .style("opacity", 0.5)
          .style("fill", "white")
          .attr("x", edgeTimelineScale(i))
          .style("text-anchor", "start")
          .attr("y", 0)
          .transition()
          .duration(1000)
          .attr("y", edgeHeightScale(totalLineCount) / 2 + paddingEdgeBox / 2)
      }


      let edgeTypeG = linkChildrenEntities.selectAll(".edgeTypeG")
        .data(d.childrenNested2)
        .join("g")
        .classed("edgeTypeG", true)
        .attr("transform", function(D, I) {
          return `translate(${paddingEdgeBox},${0})`
        })
        .transition()
        .duration(1000)
        .attr("transform", function(D, I) {
          if (I == 0) {
            return `translate(${paddingEdgeBox},${edgeHeightScale(0)-edgeHeightScale(totalLineCount)/2+paddingEdgeBox})`
          } else {
            let paragraphLineStart = 0

            for (var i = 0; i < I; i++) {
              paragraphLineStart = paragraphLineStart + d.childrenNested2[i][1].length
            }
            return `translate(${paddingEdgeBox},${edgeHeightScale(paragraphLineStart+2*I)-edgeHeightScale(totalLineCount)/2+paddingEdgeBox})`
          }
        })

      d3.selectAll(".edgeTypeG")
        .append("text")
        .text(function(D) {
          return D[0] + " (" + D[1].length + ")"
        })
        .attr("fill", "white")
        .style("dy", 13.5 / thisZoom)
        .attr("font-size", 13.5 / thisZoom)
        .style("font-weight", "bold")
        .attr("fill", function(D) {
          return "white"
        })





      //color scale for edges
      let edgeColorScale = d3.scaleOrdinal()
        .domain(["KPE", "GND", "SBB", "DNB", "ZDB", "computed"])
        .range(["#1fb98b", "#f5964c", "#e6ab02", "#e7298a", "#985ff6", "cyan"])

      d3.selectAll(".edgeTypeG").selectAll(".edgeLines")
        .data(function(d) {
          return d[1].sort(function(a, b) {
            return a.Date - b.Date
          })
        })
        .join("g")
        .classed("edgeLines", true)
        .attr("transform", function(D, I) {
          return `translate(0,0)`
        })
        .attr("opacity", 0)
        .transition()
        .duration(1000)
        .attr("opacity", 1)
        .attr("transform", function(D, I) {
          return `translate(0,${edgeHeightScale(I+1)})`
        })

      d3.selectAll(".edgeTypeG").selectAll(".edgeLines")
        .append("line")
        .style("stroke", function(D, I) {
          return edgeColorScale(D.DataSource)
        })
        .style("stroke-dasharray", function(D, I) {
          if (D.SourceType == "associatedRelation") {
            return `${2/thisZoom} ${2/thisZoom}` //"2 2"
          } else {
            return "0 0"
          }
        })
        .style("stroke-width", 2 / thisZoom)
        .style("opacity", 1)

        .attr("x1", function(D, I) {
          return 0
        })
        .attr("x2", function(D, I) {
          return edgeLength - 2 * paddingEdgeBox
        })
        .attr("y1", 0)
        .attr("y2", 0)

      d3.selectAll(".edgeTypeG").selectAll(".edgeRects")
        .data(function(d) {
          return d[1].sort(function(a, b) {
            return a.Date - b.Date
          })
        })
        .join("g")
        .classed("edgeRects", true)
        .attr("transform", function(D, I) {
          return `translate(0,0)`
        })
        .transition()
        .duration(1000)
        .attr("transform", function(D, I) {
          return `translate(0,${edgeHeightScale(I+1)-6/thisZoom})`
        })

      d3.selectAll(".edgeTypeG").selectAll(".edgeRects")
        .append("rect")
        .style("fill", function(D, I) {
          return edgeColorScale(D.DataSource)
        })
        .style("opacity", 1)
        .style("display", function(D) {
          if (D.Date == 99999) {
            return "none"
          }
        })
        .attr("x", function(D, I) {
          if (D.Date != 99999) {
            return edgeTimelineScale(D.Date) - 12 / thisZoom
          } else {
            return 0
          }
        })
        .attr("y", 0)
        .attr("width", function(D, I) {
          return 12 / thisZoom
        })
        .attr("height", function(D, I) {
          return 12 / thisZoom
        })

      d3.selectAll(".edgeRects,.edgeLines")
        .on("mousemove", function(event, D) {
          tooltip
            .style('position', 'absolute')
            .style('left', `${event.pageX + 5}px`)
            .style('top', `${event.pageY + 10}px`)
            .style('display', 'inline-block')
            .style('opacity', '0.9')
            .html(function() {
              if (D.SourceDetails) {
                return `<p class="tooltip-text"><strong>${D.SourceDetails.Name}</strong></p>
                        <p class="tooltip-text"><strong>Data Source:</strong> <span style="font-weight:bold;color:${edgeColorScale(D.DataSource)}">${D.DataSource}</span></p>
                        <p class="tooltip-text"><strong>Type:</strong> ${D.SourceType}</p>
                        <p class="tooltip-text"><strong>Location:</strong> ${D.SourceDetails.Place}</p>
                        <p class="tooltip-text"><strong>Date:</strong> ${D.SourceDetails.DateOriginal}</p><br>
                        <p class="tooltip-text"><i>Click to open source</i></p>`
              } else {
                return `<p class="tooltip-text">GND</p>
                        <p class="tooltip-text"><strong>Type:</strong> ${D.SourceType}</p>
                        <p class="tooltip-text"><strong>Data Source:</strong> <span style="font-weight:bold;color:${edgeColorScale(D.DataSource)}">${D.DataSource}</span></p>`
              }
            })
        })
        .on("mouseout", function(event, D) {
          tooltip
            .style('display', 'none')
        })
        .style("cursor", function(D) {
          if (D.SourceDetails && D.SourceDetails.Uri) {
            return "pointer"
          }
        })
        .on('click', function(event, D, I) {
          if (D.SourceDetails && D.SourceDetails.Uri) {
            window.open(
              D.SourceDetails.Uri,
              '_blank'
            )
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
          return -7 / thisZoom - paddingEdgeBox + edgeHeightScale(0) - (edgeHeightScale(edgeNumber) / 2)
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
          d3.selectAll(".edgeTypeG").transition().duration(1000).style("opacity", 0).attr("transform", function(D, I) {
            return `translate(${paddingEdgeBox},${0})`
          }).on("end", function() {
            d3.select(this).remove()
          })
          d3.selectAll(".timelineticks").transition().duration(1000).attr("y1", 0).attr("y2", 0).style("opacity", 0).on("end", function() {
            d3.select(this).remove()
          })
          d3.selectAll(".timelineticklabels").transition().duration(1000).attr("y", 0).style("opacity", 0).on("end", function() {
            d3.select(this).remove()
          })


          d3.selectAll(".link").style("display", "block").classed("notSelected", true).transition().duration(1000)
            .style("stroke", "rgba(132, 147, 146, 1)")
            .style("opacity", .6)
            .attr("stroke-width", function(d) {
              return edgeScale(d.children2.length)
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
          return -paddingEdgeBox + edgeHeightScale(0) - (edgeHeightScale(edgeNumber) / 2)
        })
        .style("opacity", 1)



      ///relatedhighlightstart
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
        .style("opacity", 0.95)
        .attr("stroke-width", function(D) {
          return edgeScale(D.children2.length)
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
      let allConnections = links.filter(function(E, G) {
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


        //code to rotate relevant labels
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

      //blur out detail inset
      let timerSeconds = 0;
      let timerInterval;

      let timerSeconds2 = 0;
      let timerInterval2;

      function timerIncrement() {
        timerSeconds += 1;
        if (timerSeconds >= 3) {
          d3.select(".linkChildrenG").style("opacity", 0.4).lower().attr("filter", "url(#blur)")
          d3.selectAll(".edgeRects,.edgeLines").style("pointer-events", "none")
        }
      }

      function timerIncrement2() {
        timerSeconds += 1;
        if (timerSeconds >= 3) {
          d3.select(".linkChildrenG").style("opacity", 1).raise().attr("filter", null)
          d3.selectAll(".edgeRects,.edgeLines").style("pointer-events", "auto")
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
          // //console.log(d.count)
          return 2 * nodeScale(d.count) / thisZoom
        })
      ///relatedhighlightend

    }

    ///////edge unfolding end
    ////////////////////////////////////////////////




//ticked function to position nodes based on the force simulation
    function ticked(d) {
      if (simulation.alpha() < 0.01) {
        simulation.stop()

        let maxY = d3.extent(nodes, function(d) {
          return d.y
        });
        let scaleNodeFrame = d3.scaleLinear()
          .domain(maxY)
          .range([0 - 400, height + 200])

        d3.selectAll(".nodes")
          .attr("transform", function(d) {
            d.y = scaleNodeFrame(d.y)
            d.x = scaleNodeFrame(d.x) + 200
            return 'translate(' + d.x + ',' + d.y + ')';
          })

        d3.selectAll(".label,.labelbg")
          .attr("transform", function(d) {
            return 'translate(' + d.x + ',' + d.y + ')';
          })


        d3.selectAll(".link")
          .attr("x1", function(d) {
            d.length = Math.sqrt((Math.pow((d.target.x - d.source.x), 2)) + (Math.pow((d.target.y - d.source.y), 2))) // add length of edge to edge data
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


        edgeLengthExtent = d3.extent(links, function(d) {
          return d.length
        });
      }
    }

  });
