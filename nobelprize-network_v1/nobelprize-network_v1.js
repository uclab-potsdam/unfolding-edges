//creating general variables
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


const edgeColors = d3.scaleOrdinal()
  .domain(["KPE", "GND", "SBB", "DNB", "ZDB", "computed"])
  .range(["#1b9e77", "#f5964c", "#985ff6", "#e7298a", "cyan", "#e6ab02"])


let zoom = d3.zoom()
  .scaleExtent([1, 100])
  .on("zoom", zoomed)


let zoomScale = d3.scaleLinear()
  .domain(edgeLengthExtent)
  .range([13.5, 1.2])
  .clamp(true)

let thisZoom = 1
let selectionActive = false
let unfoldingIteration = 0


let x1Alt
let y1Alt
let AAlt
let x2Alt
let y2Alt
let BAlt
let mxAlt
let myAlt
let MAlt

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



//hite background rectangle to make pan/zoom on empty space + rotation/zoom on click work
d3.select(".zoomG2").append("rect").attr("x", -10000).attr("y", -10000).attr("width", 500000).attr("height", 500000).attr("fill", "white")


let networkG = svg.append("g").classed("networkG", true)

let linkG = networkG.append("g").attr("class", "linkG")
let nodeG = networkG.append("g").attr("class", "nodeG")

let linkChildren = networkG.append("g").attr("class", "linkChildrenG")
let labelG = networkG.append("g").attr("class", "labelG")
let nodesOnTop = networkG.append("g").attr("class", "nodesOnTopG")

///load data and preprocessing
Promise.all([
    d3.json("https://uclab.fh-potsdam.de/unfoldingedges/data/nobelprize_nodes.json"),
    d3.json("https://uclab.fh-potsdam.de/unfoldingedges/data/nobelprize_edges.json"),
  ])
  .then(([nodes, links]) => {


//prepocessing of data
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

//force simulation
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


//create links, nodes, and labels
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


//unfolding edges function
    function unfoldingEdgesTimeline(d, currentTarget) {

      selectionActive = true
      unfoldingIteration = unfoldingIteration + 1

      d3.selectAll(".link").style("stroke", "#E3E3E2").style("opacity", 1)
      d3.select(currentTarget).transition().duration(1000).attr("stroke-width", 0).style("opactiy", 0).on("end", function() {
        d3.select(this).style("display", "none")
      })


      let x1 = d.source.x //x point A
      let y1 = d.source.y //y point A
      let x2 = d.target.x //x point B
      let y2 = d.target.y //y point B
      let mx = (x1 + x2) / 2 // center point x between x1 and x2
      let my = (y1 + y2) / 2 // center point y between y1 and y2


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
        .range([6, 1])
        .clamp(true)

      thisZoom = zoomScale(edgeLength)


      let paddingEdgeBox = 10 / thisZoom

      let edgeHeightScale = d3.scaleLinear()
        .domain([0, 40])
        .range([0, 400 / thisZoom])

      let yearStart = 1850
      let yearEnd = 2020


      let edgeTimelineScale = d3.scaleLinear()
        .domain([yearStart, yearEnd])
        .range([paddingEdgeBox, edgeLength - paddingEdgeBox])


      zoom.translateTo(svg.transition().duration(500), mx, my)
      setTimeout(function() {
        zoom.scaleTo(svg.transition().duration(500), zoomScale(edgeLength))
      }, 500);


      d3.selectAll(".linkChild")
        .filter(function() {
          return +d3.select(this).attr("unfoldingIteration") != unfoldingIteration
        })
        .transition().duration(1000).attr("d", function(D, I) {
          return "M" + x1Alt + " " + y1Alt +
            " C " + mxAlt + " " + myAlt + " " +
            mxAlt + " " + myAlt + " " +
            x2Alt + " " + y2Alt
        }).on("end", function() {
          d3.select(this).remove()
        })



      d3.selectAll(".nodes")
        .classed("notedgerelevant", false)
        .filter(function(D) {
          return D.id != d.source.id || D.id != d.target.id
        })
        .classed("notedgerelevant", true)
        .transition().style("fill", "#D3D3D3")
        .attr("width", function(d, i) {
          return 3 / thisZoom
        })
        .attr("height", function(d, i) {
          return 3 / thisZoom
        })


      d3.selectAll(".nodesOnTop").remove()

      d3.selectAll(".nodes").filter(function(D) {
          return D.id == d.source.id || D.id == d.target.id
        }).classed("notedgerelevant", false)
        .each(function(T) {

          nodesOnTop.append("rect")
            .classed("nodesOnTop", true)
            .style("fill", function() {
              return color("Selection")
            })
            .attr("width", function() {
              return (thisZoom >= 1) ? (nodeScale(T.count) / thisZoom) : nodeScale(T.count)
            })
            .attr("height", function() {
              return (thisZoom >= 1) ? (nodeScale(T.count) / thisZoom) : nodeScale(T.count)
            })
            .attr("x", function() {
              return T.x - (thisZoom >= 1) ? (nodeScale(T.count) / thisZoom) : nodeScale(T.count) / 2;
            })
            .attr("y", function() {
              return T.y - (thisZoom >= 1) ? (nodeScale(T.count) / thisZoom) : nodeScale(T.count) / 2;
            })
            .attr("rx", function() {
              if (T.Label == "PerName") {
                return 1000
              } else {
                return 2
              }
            })
            .attr("connectivity", T.count)
        })

      d3.selectAll(".nodes").filter(function(D) {
        return D.id == d.source.id || D.id == d.target.id
      }).transition().style("fill", "black").style("opacity", 1)

      d3.select(".linkChildrenG").selectAll(".linkChild").filter(function() {
          return +d3.select(this).attr("unfoldingIteration") == false
        })
        .data(d.children)
        .join("path")
        .style("fill", "none")
        .attr("stroke-width", function(D, I) {
          if (D.SourceType == "associatedRelation") {
            return `${2.5/thisZoom}`
          } else {
            return `${2.5/thisZoom}`
          }
        })
        .attr("class", "linkChild")
        .style("stroke-dasharray", function(D, I) {
          if (D.SourceType == "associatedRelation") {
            return `${2.5/thisZoom} ${0.7/thisZoom}`
          } else {
            return "0 0"
          }

        })
        .style("pointer-events", "stroke")
        .style("stroke", function(D, I) {
          return edgeColors(D.DataSource)

        })
        .attr("d", function(D, I) {
          let x1 = d.source.x
          let y1 = d.source.y
          let A = [x1, y1]
          let x2 = d.target.x
          let y2 = d.target.y
          let B = [x2, y2]
          let mx = (x1 + x2) / 2
          let my = (y1 + y2) / 2
          let M = [mx, my]

          return "M" + d.source.x + " " + d.source.y +
            " C " + mx + " " + my + " " +
            mx + " " + my + " " +
            d.target.x + " " + d.target.y
        })
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
                  <p class="tooltip-text"><strong>Data Source:</strong> <span style="font-weight:bold;color:${edgeColors(D.DataSource)}">${D.DataSource}</span></p>
                  <p class="tooltip-text"><strong>Type:</strong> ${D.SourceType}</p>
                  <p class="tooltip-text"><strong>Location:</strong> ${D.SourceDetails.Place}</p>
                  <p class="tooltip-text"><strong>Date:</strong> ${D.SourceDetails.DateOriginal}</p><br>
                  <p class="tooltip-text"><i>Click to open source</i></p>`
              } else {
                return `<p class="tooltip-text">GND</p>
                  <p class="tooltip-text"><strong>Type:</strong> ${D.SourceType}</p>
                  <p class="tooltip-text"><strong>Data Source:</strong> <span style="font-weight:bold;color:${edgeColors(D.DataSource)}">${D.DataSource}</span></p>`
              }
            })
        })
        .on("mouseout", function(event, D) {
          tooltip
            .style('display', 'none')
        })
        .transition()
        .duration(1000)
        .attr("d", function(D, I) {

          let x1 = d.source.x
          let y1 = d.source.y
          let A = [x1, y1]
          let x2 = d.target.x
          let y2 = d.target.y
          let B = [x2, y2]
          let mx = (x1 + x2) / 2
          let my = (y1 + y2) / 2
          let M = [mx, my]

          let hoehe // höhe des Ausschlags basierend auf I
          let hoehenVariable = 5 / thisZoom
          if (I % 2) { //gerade Zahl oder ungerade Zahl damit abwechselnd oben und unten die Kante ausschlägt
            hoehe = (I) * hoehenVariable
          } else {
            hoehe = hoehenVariable + (I * hoehenVariable)
          }



          let AM = Math.hypot(mx - x1, my -
            y1) //Funktion gibt die Quadratwurzel von der Summe der quadrierten Argumente zurück. Hier Berechnung der Kante von PunktA(x1y1) zu Mittelpunkt zwischen A und B (x2y2), weil dort die Höhe rechtwinklig zur Kante läuft
          let AP = Math.hypot(AM, hoehe) //Funktion gibt die Quadratwurzel von der Summe der quadrierten Argumente zurück: Kante A zu gesuchten Punkt
          let P = Intersect2Circles(A, AP, M, hoehe) //gesuchter Punkt

          let x3 //P[1][0] //x von P
          let y3 //= P[1][1] //y von OP

          if (I % 2) {
            x3 = P[0][0]
            y3 = P[0][1]
          } else {
            x3 = P[1][0]
            y3 = P[1][1]
          }

          //Pfad unter Nutzung von allen drei Punkten
          return "M" + d.source.x + " " + d.source.y +
            " C " + x3 + " " + y3 + " " +
            x3 + " " + y3 + " " +
            d.target.x + " " + d.target.y
        })
        .on("end", function() {
          x1Alt = d.source.x //x Punkt A
          y1Alt = d.source.y //y Punkt A
          AAlt = [x1, y1]
          x2Alt = d.target.x //x Punkt B
          y2Alt = d.target.y //y Punkt B
          BAlt = [x2, y2]
          mxAlt = (x1 + x2) / 2 // Mittelpunkt x zwischen x1 und x2
          myAlt = (y1 + y2) / 2 // Mittelpunkt y zwischen y1 und y2
          MAlt = [mx, my] // Mittelpunkt zwischen A und B (hier verläuft das Lot hoehe)

          d3.select(this).attr("unfoldingIteration", unfoldingIteration)
        })



      d3.selectAll(".closeedges").transition().duration(1000).attr("font-size", 0).style("opactiy", 0).on("end", function() {
        d3.select(this).remove()
      })
      d3.selectAll(".closeedgesCircle").transition().duration(1000).attr("r", 0).style("opactiy", 0).on("end", function() {
        d3.select(this).remove()
      })


      let closeEdgeSymbol = linkChildren.append("g")

      closeEdgeSymbol.append("circle").classed("closeedgesCircle", true)
        .style("fill", "white")
        .attr("cy", function() {
          if (d3.max([d.source.x, d.target.x]) == d.source.x) {
            return d.source.y
          } else {
            return d.target.y
          }
        })
        .attr("cx", function(D, I) {
          return d3.max([d.source.x, d.target.x]) + 10 / thisZoom
        })
        .attr("r", 0)
        .style("stroke", "black")
        .attr("stroke-width", 0)
        .style("opacity", 0)
        .on("click", function() {

          thisZoom = 1

          d3.select(".zoomG").transition().duration(1000).attr("transform-origin", "center center").attr("transform", "rotate(" + 0 + ")")


          d3.selectAll(".closeedges").transition().duration(1000).style("opactiy", 0).on("end", function() {
            selectionActive = false
            d3.select(this).remove()
          })
          d3.selectAll(".closeedgesCircle").transition().duration(1000).attr("r", 0).style("opactiy", 0).on("end", function() {
            d3.select(this).remove()
          })
          d3.selectAll(".linkChild").transition().duration(1000)
            .attr("d", function(D, I) {

              let x1 = d.source.x //x Punkt A
              let y1 = d.source.y //y Punkt A
              let A = [x1, y1]
              let x2 = d.target.x //x Punkt B
              let y2 = d.target.y //y Punkt B
              let B = [x2, y2]
              let mx = (x1 + x2) / 2 // Mittelpunkt x zwischen x1 und x2
              let my = (y1 + y2) / 2 // Mittelpunkt y zwischen y1 und y2
              let M = [mx, my] // Mittelpunkt zwischen A und B (hier verläuft das Lot hoehe)

              return "M" + d.source.x + " " + d.source.y +
                " C " + mx + " " + my + " " +
                mx + " " + my + " " +
                d.target.x + " " + d.target.y
            }).on("end", function() {
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
            .style("fill", "rgb(53, 75, 84)").attr("transform", function(d) {
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
        .style("opacity", 1)
        .attr("stroke-width", 2 / thisZoom)
        .attr("r", 15 / thisZoom)
        .attr("cy", function() {
          if (d3.max([d.source.x, d.target.x]) == d.source.x) {
            return d.source.y + 20 / thisZoom
          } else {
            return d.target.y + 20 / thisZoom
          }
        })


      closeEdgeSymbol.append("text").text("✕").classed("closeedges", true).style("pointer-events", "none")
        .attr("x", function(D, I) {
          return d3.max([d.source.x, d.target.x]) + 10 / thisZoom
        })
        .attr("y", function() {
          if (d3.max([d.source.x, d.target.x]) == d.source.x) {
            return d.source.y + 7.5 / thisZoom
          } else {
            return d.target.y + 7.5 / thisZoom
          }
        })
        .style("cursor", "pointer")
        .style("opacity", 0)
        .style("text-anchor", "middle")
        .attr("font-size", 0)
        .style("fill", "black")
        .transition()
        .duration(1000)
        .style("opacity", 1)
        .attr("y", function() {
          if (d3.max([d.source.x, d.target.x]) == d.source.x) {
            return d.source.y + 27.5 / thisZoom
          } else {
            return d.target.y + 27.5 / thisZoom
          }
        })
        .attr("font-size", 20 / thisZoom)



      ///relatedhighlightstart

      d3.selectAll(".label,.labelbg").style("display", "none")

      d3.selectAll(".label,.labelbg")
        .filter(function(D) {
          return D.index == d.source.index
        })
        .style("display", "block")
        .transition()
        .duration(1000)
        .attr("font-size", 20 / thisZoom)
        .attr("stroke-width", 4 / thisZoom)



      d3.selectAll(".label,.labelbg")
        .filter(function(D) {
          return D.index == d.target.index
        })
        .style("display", "block")
        .transition()
        .duration(1000)
        .attr("font-size", 20 / thisZoom)
        .attr("stroke-width", 4 / thisZoom)


      d3.selectAll(".link")
        .filter(function(D) {
          return D.source.id == d.source.id || D.source.id == d.target.id || D.target.id == d.target.id || D.target.id == d.source.id
        })
        .raise()
        .classed("notSelected", false)





    }


    //Intersect2Circles function start: find point using 2 points and 2 edge lengths
    function Intersect2Circles(A, a, B, b) {
      // A, B = [ x, y ]
      // return = [ Q1, Q2 ] or [ Q ] or [] where Q = [ x, y ]
      var AB0 = B[0] - A[0];
      var AB1 = B[1] - A[1];
      var c = Math.sqrt(AB0 * AB0 + AB1 * AB1);
      if (c == 0) {
        // no distance between centers
        return [];
      }
      var x = (a * a + c * c - b * b) / (2 * c);
      var y = a * a - x * x;
      if (y < 0) {
        // no intersection
        return [];
      }
      if (y > 0) y = Math.sqrt(y);
      // compute unit vectors ex and ey
      var ex0 = AB0 / c;
      var ex1 = AB1 / c;
      var ey0 = -ex1;
      var ey1 = ex0;
      var Q1x = A[0] + x * ex0;
      var Q1y = A[1] + x * ex1;
      if (y == 0) {
        // one touch point
        return [
          [Q1x, Q1y]
        ];
      }
      // two intersections
      var Q2x = Q1x - y * ey0;
      var Q2y = Q1y - y * ey1;
      Q1x += y * ey0;
      Q1y += y * ey1;
      return [
        [Q1x, Q1y],
        [Q2x, Q2y]
      ];
    }
    //Intersect2Circles function end
    ////////////////////////////////


//tick function for force layout positioning
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


        edgeLengthExtent = d3.extent(links, function(d) {
          return d.length
        });
      }
    }

  });
