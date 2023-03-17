
const width = window.innerWidth
const height = window.innerHeight

  let edgeLengthExtent = [0,0]

// let nodeScale = d3.scaleLinear()
//   .domain([1, 300])
//   .range([5, 100])

const nodeScale = d3.scaleSqrt()
  .domain([0,400])
  .range([2,15])

let edgeScale = d3.scaleLinear()
  .domain([1,90])
  .range([1, 10])

let zoom = d3.zoom()
  .scaleExtent([1, 8])
  .on("zoom", zoomed)

  let zoomScale = d3.scaleLinear()
    .domain(edgeLengthExtent)
    .range([9,1])

  let thisZoom = 1
  let selectionActive = false



function zoomed(event, d) {
  d3.select(".networkG").attr("transform", event.transform);


// d3.selectAll(".link").attr("stroke-width", function(d) {
//   return edgeScale(d.children.length)/event.transform.k
// })

d3.selectAll(".nodes")
.attr("stroke-width", 0.5/event.transform.k)

if(selectionActive == false){
  d3.selectAll(".nodes")
    .attr("r", function(d){return nodeScale(d.count)/event.transform.k})

  d3.selectAll(".label,.labelbg").attr("stroke-width", 3/event.transform.k).attr("font-size", 11/event.transform.k)
  .attr("dx", function(d){return (nodeScale(d.count)+2)/event.transform.k})
//   .style("display", function(d,i){if(event.transform.k < 2 && d.count > 50){
//     return "block"}
// else{return "none"}})


if(event.transform.k <= 1) {
    d3.selectAll(".label,.labelbg").style("display", function(d){if(d.count >50){return "block"}else{return "none"}})
}else if(event.transform.k < 1.5) {
  d3.selectAll(".label,.labelbg").style("display", function(d){if(d.count >30){return "block"}else{return "none"}})
}else if(event.transform.k < 2) {
  d3.selectAll(".label,.labelbg").style("display", function(d){if(d.count >15){return "block"}else{return "none"}})
}else if(event.transform.k < 2.5) {
  d3.selectAll(".label,.labelbg").style("display", function(d){if(d.count >10){return "block"}else{return "none"}})
}else if(event.transform.k < 3) {
  d3.selectAll(".label,.labelbg").style("display", function(d){if(d.count >5){return "block"}else{return "none"}})
}else if(event.transform.k < 3.5) {
  d3.selectAll(".label,.labelbg").style("display", function(d){if(d.count >2){return "block"}else{return "none"}})
}else if(event.transform.k >= 4) {
  d3.selectAll(".label,.labelbg").style("display", function(d){if(d.count >0){return "block"}else{return "none"}})
}}


  //.attr("r", function(){return d3.select(this).attr("r")/event.transform.k})
}

let color = d3.scaleOrdinal(d3.schemeCategory10)

let tooltip = d3.select("body")
  .append('div')
  .attr('class', 'tooltip')
  .style('display', 'none');

// let simulation = d3.forceSimulation()
//   .force("link", d3.forceLink().id(function(d, i) {
//     return d.index;
//   }))
//   .force("charge", d3.forceManyBody().strength()) //how much should elements attract or repell each other?
//   .force("center", d3.forceCenter(width / 2, height / 2))
//   .force("collision", d3.forceCollide(function(d) {
//     return 100//nodeScale(d.count) + 300
//   }).strength(-100));


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



//ugly hack with white background rectangle to make pan/zoom on empty space + rotation/zoom on click work
d3.select(".zoomG2").append("rect").attr("x",-10000).attr("y",-10000).attr("width",500000).attr("height",500000).attr("fill", "white")


let networkG = svg.append("g").classed("networkG", true)
//svg.call(zoom)

let linkG = networkG.append("g").attr("class", "linkG")
let nodeG = networkG.append("g").attr("class", "nodeG")
let labelG = networkG.append("g").attr("class", "labelG")
let linkChildren = networkG.append("g").attr("class", "linkChildrenG")

///load data and preprocessing- metadataschema
Promise.all([
    d3.json("https://uclab.fh-potsdam.de/unfoldingedges/data/conflict-network.json"),
  //  d3.json("conflicts-node-coordinates.json"),
  ])
  .then(([dataset]) => {

    const nodesRaw = dataset.nodes
    const links = dataset.edges

   //console.log(nodesRaw)
   //console.log(coordinates)
    let nodes = []

   //console.log(Object.entries(nodesRaw))

    Object.entries(nodesRaw).forEach(function(d,i){
      //console.log(coordinates.nodes.filter(function(D){return D.id ==  d[0]})[0] ? coordinates.nodes.filter(function(D){return D.id ==  d[0]})[0].x : 0 )
      nodes.push({
        id: d[0],
        gender: d[1].gender,
        human: d[1].human,
        count:0
  //      g_x: coordinates.nodes.filter(function(D){return D.id ==  d[0]})[0] ? coordinates.nodes.filter(function(D){return D.id ==  d[0]})[0].x : 0,
    //    g_y: coordinates.nodes.filter(function(D){return D.id ==  d[0]})[0] ? coordinates.nodes.filter(function(D){return D.id ==  d[0]})[0].y : 0 ,
      })
    })

    let linksTransformed = []

    links.forEach((item, i) => {

      //node counting
      nodes.filter(function(D){return D.id == item.source})[0].count++
      nodes.filter(function(D){return D.id == item.target})[0].count++

      //link transformation
      if(linksTransformed.filter(function(D) {
          return (D.source == item.source && D.target == item.target) || D.source == item.target && D.target == item.source
        }).length == 0){
          linksTransformed.push({
            source: item.source,
            target: item.target,
            children:[{
              source:item.source,
              target: item.target,
              topics: item.topics[0],
              predicate: item.predicate,
              reference: item.provenience
            }]
          })
        }else if(linksTransformed.filter(function(D) {
            return (D.source == item.source && D.target == item.target)
          }).length == 1){
            linksTransformed.filter(function(D) {
                return (D.source == item.source && D.target == item.target)
              })[0].children.push({
                source:item.source,
                target: item.target,
                topics: item.topics[0],
                predicate: item.predicate,
                reference: item.provenience
              })
          }else if(linksTransformed.filter(function(D) {
              return (D.source == item.target && D.target == item.source)
            }).length == 1){
              linksTransformed.filter(function(D) {
                  return (D.source == item.target && D.target == item.source)
                })[0].children.push({
                  source:item.source,
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

      //item.childrenNested3 = Array.from(d3.group(item.children, d => d.source, d => d.predicate, d => d.topics))
    });


   //console.log(nodes)
   //console.log(links)
   //console.log(linksTransformed)

    const simulation = d3.forceSimulation()
      .force("link", d3.forceLink().id(function(d, i) {
        return d.id;
      }))//.distance(200).strength(0.1))
      .force("charge", d3.forceManyBody().strength(-20)) //how much should elements attract or repell each other?
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("collision", d3.forceCollide(function(d) {
        return nodeScale(d.count) + 2
      }));

    simulation
      .nodes(nodes.filter(function(d){return d.count > 0})) //we use nodes from our json (look into the file to understand that)
      .on("tick", ticked)

    simulation
      .force("link")
      .links(linksTransformed)



    linkG.selectAll(".link") //we create lines based on the links data
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
      .on("mousemove", function(event,d,i){
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
      .on("mouseout", function(event,d,i){
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





    nodeG.selectAll(".nodes") //we create nodes based on the links data
      .data(nodes.filter(function(d){return d.count > 0}))
      .join("circle")
      .classed("nodes", true)
      .attr("r", function(d){return nodeScale(d.count)})
      .attr("fill",  "rgb(53, 75, 84)")
      .style("stroke", "var(--node-stroke)")
      .attr("stroke-width", 0.5)
      // .attr("transform", function(d) {
      //   return 'translate(' + d.x + ',' + d.y + ')';
      // })
      .on("mousemove", function(event, d) {
        tooltip
          .style('position', 'absolute')
          .style('left', `${event.pageX + 5}px`)
          .style('top', `${event.pageY + 10}px`)
          .style('display', 'inline-block')
          .style('opacity', '0.9')
          .html(function() {
            return `<p style="font-weight:bold" class="tooltip-text">${d.id}</p>`
})})
      .on("mouseout", function(event, d) {
        tooltip
          .style('position', 'absolute')
          .style('left', `${event.pageX + 5}px`)
          .style('top', `${event.pageY + 10}px`)
          .style('display', 'none')
      })

    labelG.selectAll(".labelbg") //we create nodes based on thel links data
      .data(nodes.filter(function(d){return d.count > 0}))
      .join("text")
      .classed("labelbg", true)
      .attr("dx", function(d){return nodeScale(d.count)+2})
      .attr("stroke-linecap", "round")
      .attr("fill", "var(--label-bg-color)")
      .style("stroke", "var(--label-bg-color)")
      .attr("stroke-width", 3/thisZoom)
      .text(function(d) {
        return d.id
      })
      .style("display", function(d,i){//console.log(d.connectivity)
        if(d.count > 50){return "block"}else{return "none"}})
      .attr("font-size", 11/thisZoom)

      labelG.selectAll(".label") //we create nodes based on the links data
        .data(nodes.filter(function(d){return d.count > 0}))
        .join("text")
        .classed("label", true)
        .attr("dx", function(d){return nodeScale(d.count)+2})
        .attr("fill", "var(--label-color)")
        .text(function(d) {
          return d.id
        })
        .style("display", function(d,i){//console.log(d.connectivity)
          if(d.count > 50){return "block"}else{return "none"}})
        .attr("font-size", 11/thisZoom)










    function unfoldingEdgesTimeline(d, currentTarget) {
      ///////edge unfolding start
      ////////////////////////////////////////////////

      selectionActive = true
      d3.selectAll(".nodes").classed("notSelected",true).on("mouseover", null)
      d3.selectAll(".link").classed("notSelected",true).transition().style("stroke", "rgba(218, 231, 230, 0.72)").style("opacity", 1)
      d3.select(".linkChildrenG").style("opacity", 1).raise().attr("filter", null).on("mouseover", function(D){
        //timerSeconds2 = 0
        timerInterval2 = setInterval(timerIncrement2, 500);
    }).on("mouseout", function(D){
      timerSeconds2 = 0
      clearTimeout(timerInterval2);
    })
    // d3.selectAll(".notSelected").style("display", "block").transition().style("opacity",1)

      //  d3.select(this).style("display", "none")
     d3.select(currentTarget).style("display", "none")


      let x1 = d.source.x //x Punkt A
      let y1 = d.source.y //y Punkt A
      let x2 = d.target.x //x Punkt B
      let y2 = d.target.y //y Punkt B
      let mx = (x1 + x2) / 2 // Mittelpunkt x zwischen x1 und x2
      let my = (y1 + y2) / 2 // Mittelpunkt y zwischen y1 und y2
      // let M = [mx, my] // Mittelpunkt zwischen A und B (hier verläuft das Lot hoehe)

      let sourceCount = d.childrenNested2.length
      let sourceAPredicateCount = d.childrenNested2[0][1].length
      let sourceATopicCount = 0
      let sourceATotalLineCount = 0
      let sourceBTopicCount = 0
      let sourceBPredicateCount = (d.childrenNested2.length == 1) ? 0 : d.childrenNested2[1][1].length




      d.childrenNested2[0][1].forEach((d, i) => {
        sourceATopicCount = sourceATopicCount + d[1].length
      });

      if (sourceCount == 2){
        d.childrenNested2[1][1].forEach((d, i) => {
          sourceBTopicCount = sourceBTopicCount + d[1].length
        });
      }

      sourceATotalLineCount = 1 + sourceAPredicateCount+ sourceATopicCount + 1



      let edgeLength = Math.sqrt((Math.pow((x2-x1),2))+(Math.pow((y2-y1),2))) //Distance: Wurzel((x2-x1)^2 + (y2-y1)^2)
      let edgeNumber = sourceCount+1 + sourceAPredicateCount + sourceATopicCount + sourceBPredicateCount + sourceBTopicCount //d.children.length

      zoomScale = d3.scaleLinear()
        .domain(edgeLengthExtent)
        .range([9,1])

      thisZoom = zoomScale(edgeLength)

      let paddingEdgeBox = 20/thisZoom
      // let edgeHeightScalealt = d3.scaleLinear()
      //   .domain([0,90])
      //   .range([paddingEdgeBox,(500-paddingEdgeBox)])

        let edgeHeightScale = d3.scaleLinear()
          .domain([0,60])
          .range([0,1000/thisZoom])


        zoom.translateTo(svg.transition().duration(500), mx, my)
        setTimeout(function() {
          zoom.scaleTo(svg.transition().duration(500), zoomScale(edgeLength))
          //d3.selectAll("node")
        }, 500);

///calculate angle of line AB: https://stackoverflow.com/questions/9614109/how-to-calculate-an-angle-from-points
      function angle(cx, cy, ex, ey) {
        var dy = ey - cy;
        var dx = ex - cx;
        var theta = Math.atan2(dy, dx); // range (-PI, PI]
        theta *= 180 / Math.PI; // rads to degs, range (-180, 180]
        //if (theta < 0) theta = 360 + theta; // range [0, 360)
        return theta;
      }

      //console.log(angle(x1, y1, x2, y2))
    //  let rotationAngle = (angle(x1, y1, x2, y2) <= 90) || (angle(x1, y1, x2, y2) >= -90)

    let node1Radius = (2*nodeScale(d.source.count)+40)/thisZoom
    let node2Radius = (2*nodeScale(d.target.count)+40)/thisZoom


      d3.select(".zoomG").transition().duration(1000).attr("transform-origin", "center center").attr("transform", "rotate("+(-angle(x1, y1, x2, y2))+")")
      d3.selectAll(".timelineBgRect").transition().duration(1000).attr("y",0).attr("height", 0).on("end", function(){d3.select(this).remove()})
      d3.selectAll(".linkChild").transition().duration(1000).attr("y", 0).attr("height",0).on("end", function(){d3.select(this).remove()})
      d3.selectAll(".linkbgline").transition().duration(1000).attr("y1", 0).attr("y2", 0).attr("height",0).on("end", function(){d3.select(this).remove()})
      d3.selectAll(".linktopics").transition().duration(1000).attr("y", 0).on("end", function(){d3.select(this).remove()})
      d3.selectAll(".linkcountryG").transition().duration(1000).style("opacity",0).attr("y", 0).on("end", function(){d3.select(this).remove()})




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
      .attr("transform", "translate("+x1 +" "+y1+")rotate("+angle(x1, y1, x2, y2)+")")
      .transition().duration(1000)
      .attr("y", -(edgeHeightScale(edgeNumber)/2)-paddingEdgeBox)
      .attr("height", edgeHeightScale(edgeNumber)+2*paddingEdgeBox)
      //.attr("mask", "url(#circle-cutout)")


      d3.select("#circle-cutout").select("rect")
        .attr("y", -(edgeHeightScale(edgeNumber)/2)-paddingEdgeBox)
        .attr("height", edgeHeightScale(edgeNumber)+2*paddingEdgeBox)

      d3.select("#cutoutCircle1")
        .attr("cx", 0)
        .attr("r", node1Radius)

      d3.select("#cutoutCircle2")
        .attr("cx", edgeLength)
        .attr("r", node2Radius)

      let linkChildrenEntities = d3.select(".linkChildrenG").append("g")
      .classed("linkChildrenEntities", true)
      .attr("transform", "translate("+x1 +" "+y1+")rotate("+angle(x1, y1, x2, y2)+")")


      let edgeColorScale = d3.scaleOrdinal()
      .domain(["accuse", "accused", "warn", "condemn", "slam", "blame"])
      .range(["cyan", "cyan", "yellow", "#f5964c", "magenta", "#985ff6", "rgb(96, 235, 172)", "red", "blue"])



///text version test
let countryGroup = linkChildrenEntities.selectAll(".linkcountryG")
    .data(d.childrenNested2)
    .join("g")
    .classed("linkcountryG",true)
    .style("opacity",0)
    .attr("transform", function(D,I){if(I==0){return `translate(0,${paddingEdgeBox + edgeHeightScale(0) - (edgeHeightScale(edgeNumber)/2)})`}else{return `translate(0,${paddingEdgeBox + edgeHeightScale(sourceATotalLineCount) - (edgeHeightScale(edgeNumber)/2)})`}})
    .transition()
    .duration(1000)
    .style("opacity",1)
    .attr("transform", function(D,I){if(I==0){return `translate(0,${paddingEdgeBox + edgeHeightScale(0) - (edgeHeightScale(edgeNumber)/2)})`}else{return `translate(0,${paddingEdgeBox + edgeHeightScale(sourceATotalLineCount) - (edgeHeightScale(edgeNumber)/2)})`}})
          //.attr("mask", "url(#circle-cutout)")

    d3.selectAll(".linkcountryG")
    .append("text")
    .text(function(D){
      //console.log(D[1][0][1][0][1][0].target)
      return D[0] + " → "+ D[1][0][1][0][1][0].target})
    .attr("x", function(D,I){
      return paddingEdgeBox})
      .attr("y", 0)
      .style("dy", 18.5/thisZoom)
      .attr("font-size", 18.5/thisZoom)
      .style("font-weight", "bold")
      .attr("fill", "white")
            //.attr("mask", "url(#circle-cutout)")

  d3.selectAll(".linkcountryG")
  .selectAll(".linkPredicateG")
  .data(d => d[1])
  .join("g")
  .classed("linkPredicateG", true)
  .attr("transform", function(D,I){
    //console.log(d3.select(this.parentNode).datum()[1][0].length)
    if(I == 0){return `translate(${paddingEdgeBox},${edgeHeightScale(1)})`
  }else{
      let paragraphLineStart = 0
      //console.log(d3.select(this.parentNode).datum()[1][I-1][1].length)
    // //console.log("I: "+I)

    for (var i = 0; i < I; i++) {
    // //console.log("i: "+i)
    // //console.log(d3.select(this.parentNode).datum()[1][i][1].length)
      paragraphLineStart = paragraphLineStart + d3.select(this.parentNode).datum()[1][i][1].length
    }

    return `translate(${paddingEdgeBox},${edgeHeightScale(paragraphLineStart+1+I)})`
  }})
  .append("text")
  .text(function(D){return D[0]})
  .attr("fill", "white")
  .style("dy", 18.5/thisZoom)
  //.attr("dx",paddingEdgeBox)
  .attr("font-size", 18.5/thisZoom)
  .style("font-weight", "bold")
  .attr("fill", function(D){return "var(--insert-text-highlight-color)"})//edgeColorScale(D[0])})
        //.attr("mask", "url(#circle-cutout)")


        const topicCircleScale = d3.scaleSqrt()
          .domain([1,20])
          .range([2,20])

        d3.selectAll(".linkPredicateG")
        .selectAll(".topicCircle")
        .data(d => d[1])
        .join("circle")
        .classed("topicCircle", true)
        .attr("transform", function(D,I){return `translate(0,${edgeHeightScale(I+1)})`})
        .attr("fill", "rgb(228, 97, 84)")
        .attr("cx", 8/thisZoom)
        .attr("cy", function(D){return -((topicCircleScale(D[1].length)/2)+2)/thisZoom})
        .attr("r", function(D){return topicCircleScale(D[1].length)/thisZoom})
        .style("opacity", 0.3)



  d3.selectAll(".linkPredicateG")
  .selectAll(".linkTopicsG")
  .data(d => d[1])
  .join("g")
  .classed("linkTopicsG", true)
  .attr("transform", function(D,I){return `translate(0,${edgeHeightScale(I+1)})`})
  .append("text")
  .text(function(D){//console.log(D)
    return " "+D[0] +" ("+D[1].length+")"})
  .attr("fill", "white")
  .style("dy", 18.5/thisZoom)
  .attr("dx",paddingEdgeBox)
  .attr("font-size", 18.5/thisZoom)
        //.attr("mask", "url(#circle-cutout)")
  .on("mousemove", function(event,D){

    tooltip
      .style('position', 'absolute')
      .style('left', `${event.pageX + 5}px`)
      .style('top', `${event.pageY + 10}px`)
      .style('display', 'inline-block')
      .style('opacity', '0.9')

      tooltip.selectAll("p")
      .data(D[1])
      .join("p")
      .text(function(d){return d.reference})
      .style("font-weight", "normal")
      //
      // .html(function() {
      //   return `<p style="font-weight:bold" class="tooltip-text">${"test"})</p>`
//})
  // //console.log(D[1])
  })
  .on("mouseout", function(){
    tooltip
      .style('display', 'none')
  })
  .each(function(D){
    let originalCharLength = d3.select(this).text().length
    let textLength = d3.select(this).node().getComputedTextLength()
    let charLength = d3.select(this).text().length
    let string = " "+D[0]

    cutText(d3.select(this),string,textLength,(edgeLength-3*paddingEdgeBox),charLength)

    function cutText(selection,string,textLength,edgeLength,charLength){
    if(textLength > edgeLength){
      charLength = charLength-1
      textLength = selection.node().getComputedTextLength()
      selection.text(string.slice(0,charLength))
      cutText(selection.text(string.slice(0,charLength)),string,textLength,edgeLength,charLength)
    }}
  })
//  .style("opacity", "0")


        d3.selectAll(".closeedges").remove()
        d3.selectAll(".closeedgesCircle").transition().duration(1000).attr("cy", 0).attr("r",0).style("opactiy",0).on("end", function(){d3.select(this).remove()})


        let closeEdgeSymbol = linkChildrenEntities.append("g")

        closeEdgeSymbol.append("circle").classed("closeedgesCircle", true)
        .style("fill", "white")
        .attr("cy", 0)//function(D,I){return paddingEdgeBox + edgeHeightScale(I) - (edgeHeightScale(edgeNumber)/2)})
        .attr("cx", function(D,I){return edgeLength})
        .attr("r", 0)
        .style("stroke", "black")
        .attr("stroke-width", 0)
        .transition()
        .duration(1000)
        .attr("stroke-width", 2/thisZoom)
        .attr("r", 15/thisZoom)
        .attr("cy", function(D,I){return -7/thisZoom-paddingEdgeBox/thisZoom+edgeHeightScale(0) - (edgeHeightScale(edgeNumber)/2)})


        closeEdgeSymbol.append("text").text("✕").classed("closeedges", true)
        .attr("y", 0)
        .style("cursor", "pointer")
        .style("opacity",0)
        .style("text-anchor", "middle")
        .attr("x", function(D,I){
            return edgeLength })
        .attr("font-size", 20/thisZoom)
        .on("click", function(){

              thisZoom = 1

              d3.select(".zoomG").transition().duration(1000).attr("transform-origin", "center center").attr("transform", "rotate("+0+")")

              d3.selectAll(".timelineBgRect").transition().duration(1000).attr("y",0).attr("height", 0).on("end", function(){
                selectionActive = false
                d3.select(this).remove()})
              d3.selectAll(".linkChild").transition().duration(1000).attr("y", 0).attr("height",0).on("end", function(){d3.select(this).remove()})
              d3.selectAll(".linkbgline").transition().duration(1000).attr("y1", 0).attr("y2", 0).attr("height",0).on("end", function(){d3.select(this).remove()})
              d3.selectAll(".linktopics").transition().duration(1000).attr("y", 0).on("end", function(){d3.select(this).remove()})
              d3.selectAll(".closeedges").transition().duration(1000).attr("y", 0).style("opactiy",0).on("end", function(){d3.select(this).remove()})
              d3.selectAll(".closeedgesCircle").transition().duration(1000).attr("cy", 0).attr("r",0).style("opactiy",0).on("end", function(){d3.select(this).remove()})
              d3.selectAll(".linkcountryG").transition().duration(1000).style("opacity",0).attr("y", 0).on("end", function(){d3.select(this).remove()})


              d3.selectAll(".link").style("display", "block").classed("notSelected",true).transition().duration(1000) //we create lines based on the links data
                .style("stroke", "rgba(132, 147, 146, 1)")
                .style("opacity", .75)
                .attr("stroke-width",function(d){return edgeScale(d.children.length)})
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
              }).style("opacity",1).attr("r", function(d){return nodeScale(d.count)})


              d3.selectAll(".label,.labelbg")
              .style("display", function(d,i){
                if(d.count > 50){return "block"}else{return "none"}})
                .transition()
                .duration(1000)
                .attr("transform", function(d) {
                  return 'translate(' + d.x + ',' + d.y + ')';
                })
                .attr("font-size", 11/thisZoom)
                .attr("stroke-width",2/thisZoom)
                .attr("text-anchor", "start")
                .attr("dx", function(d){return nodeScale(d.count)+2})

              svg.transition()
                .duration(1000)
                .call(zoom.transform, d3.zoomIdentity.scale(1));//.translate(width/2,height/2));
            })
        .transition()
        .duration(1000)
        .attr("y", function(D,I){return -paddingEdgeBox/thisZoom+edgeHeightScale(0) - (edgeHeightScale(edgeNumber)/2)})
        //.attr("dy", /thisZoom)
        // .attr("dx", -5)
        .style("opacity", 1)



      // //zoom.scaleBy(svg, 20)
      // zoom.translateTo(svg.transition().duration(500), mx, my)
      // setTimeout(function() {
      //   zoom.scaleTo(svg.transition().duration(500), 3)
      // }, 750);

      d3.selectAll(".label,.labelbg").style("display", "none")

      d3.selectAll(".label,.labelbg")
      .filter(function(D){return D.index == d.source.index})
      .style("display", "block")
      .transition()
      .duration(1000)
      .attr("transform-origin", "top left")
      .attr("font-size", 30/thisZoom)
      .attr("text-anchor", "end")
      .attr("dx", -5/thisZoom)
      .attr("stroke-width", 4/thisZoom)
      .attr("transform", function(){return "translate("+x1 +" "+y1+")rotate("+angle(x1, y1, x2, y2)+")"})


    //  d3.selectAll(".label,.labelbg").style("display", "none")

      d3.selectAll(".label,.labelbg")
      .filter(function(D){return D.index == d.target.index})
      .style("display", "block")
      .transition()
      .duration(1000)
      .attr("font-size", 30/thisZoom)
      .attr("transform-origin", "top left")
      .attr("text-anchor", "start")
      .attr("dx", 5/thisZoom)
      .attr("stroke-width", 4/thisZoom)
      .attr("transform", function(){return "translate("+x2 +" "+y2+")rotate("+angle(x1, y1, x2, y2)+")"})


      // d3.selectAll(".label,.labelbg")
      // .filter(function(D){return D.index != d.source.index && D.index != d.target.index})
      // .style("display", "block")
      // .attr("font-size", 30/thisZoom)
      // .transition()
      // .duration(1000)
      // .attr("transform-origin", "top left")
      // .attr("text-anchor", "end")
      // .attr("dx", -5)
      // .attr("transform", function(D){return "translate("+D.x +" "+D.y+")rotate("+angle(x1, y1, x2, y2)+")"})

      d3.selectAll(".link")
      .attr("stroke-width",function(D){return edgeScale(0.5)/thisZoom})
      .style("opacity", 0.3)
      .filter(function(D){//console.log(D)
        return D.source.id == d.source.id || D.source.id == d.target.id || D.target.id == d.target.id || D.target.id == d.source.id})
        .raise()
        .classed("notSelected",false)
        .transition()
        .duration(1000)
        .style("opacity", 0.7)
        .attr("stroke-width",function(D){return edgeScale(D.children.length)})
        .style("stroke", "rgba(132, 147, 146, 1)")

      d3.selectAll(".nodes")
        .classed("notedgerelevant", false)
        .filter(function(D) {
          return D.index != d.source.index && D.index != d.target.index
        })
        .classed("notedgerelevant", true)
        .classed("notSelected", true)
        .transition().duration(1000).attr("fill", "rgba(218, 231, 230, 0.72)")
        .attr("r", function(d){return nodeScale(d.count)/thisZoom})



    ///connected nodes
    let allConnections = linksTransformed.filter(function(E, G) {
      //console.log(E)
      return E.source.id == d.source.id || E.target.id == d.source.id  || E.source.id == d.target.id || E.target.id == d.target.id
    })

    //console.log(allConnections)

    allConnections.forEach(function(E, G) {
      d3.selectAll(".nodes")//.style("opacity",0.3)
      .filter(function(X, Y) {
          return X.id == E.source.id || X.id == E.target.id
        })
        .classed("notSelected", false)
        .transition()
        .duration(1000)
        .style("opacity",1)
        .attr("fill", "rgb(53, 75, 84)")
        .attr("r", function(d,i){
          return 2*nodeScale(d.count)/thisZoom})


//part to turn relevant labels
        d3.selectAll(".label,.labelbg")
        .filter(function(X, Y) {
            return X.id == E.source.id || X.id == E.target.id
          })
        .filter(function(D){return D.index != d.source.index && D.index != d.target.index})
        .style("display", "block")
        .attr("font-size", 0)
        .transition()
        .duration(1000)
        .style("opactiy",1)
        .attr("font-size", 12/thisZoom)
        .attr("transform-origin", "top left")
        .attr("text-anchor", "end")
        .attr("dx", -5/thisZoom)
        .attr("transform", function(D){return "translate("+D.x +" "+D.y+")rotate("+angle(x1, y1, x2, y2)+")"})


        d3.selectAll(".labelbg")
        .filter(function(X, Y) {
            return X.id == E.source.id || X.id == E.target.id
          })
        .filter(function(D){return D.index != d.source.index && D.index != d.target.index})
        .attr("stroke-width", 3/thisZoom)

      })


var timerSeconds = 0;
var timerInterval;

var timerSeconds2 = 0;
var timerInterval2;

function timerIncrement() {
    timerSeconds += 1;
    if (timerSeconds >= 3) {
      d3.select(".linkChildrenG").style("opacity", 0.4).lower().attr("filter", "url(#blur)")
      d3.selectAll(".linkTopicsG").style("pointer-events","none")
  }
}

function timerIncrement2() {
    timerSeconds += 1;
    if (timerSeconds >= 3) {
      d3.select(".linkChildrenG").style("opacity", 1).raise().attr("filter", null)
      d3.selectAll(".linkTopicsG").style("pointer-events","auto")
  }
}

      d3.selectAll(".nodes").filter(function(D) {
        return D.index == d.source.index || D.index == d.target.index
      }).raise()
      .on("mouseover", function(D){
        //  timerSeconds = 0
          timerInterval = setInterval(timerIncrement, 500);
      })
      .on("mouseout", function(D){
          timerSeconds = 0
          clearTimeout(timerInterval);
})
      .transition().duration(1000)
      .attr("fill", "rgb(17, 24, 27)")
      .style("opacity", 1).attr("r", function(d,i){
               //console.log(d.count)
                return 2*nodeScale(d.count)/thisZoom})





      ///////edge unfolding end
      ////////////////////////////////////////////////


    }





    /////check if point is in circle: https://www.w3resource.com/javascript-exercises/javascript-basic-exercise-120.php
    //Center of the circle (x, y)   //Radius of circle: r,   //Point inside a circle (a, b)

//     function pointabIsInCircle(a, b, cx, cy, cr) {
//     var dist_points = (a - cx) * (a - cx) + (b - cy) * (b - cy);
//     cr *= cr;
//     if (dist_points < cr) {
//         return true;
//     }
//     return false;
// }

//point (x,y), line StartPointA (x1,y1), line EndPointB (x2,y2): https://stackoverflow.com/questions/849211/shortest-distance-between-a-point-and-a-line-segment
function pointDistanceToLine(x, y, x1, y1, x2, y2) {

  var A = x - x1;
  var B = y - y1;
  var C = x2 - x1;
  var D = y2 - y1;

  var dot = A * C + B * D;
  var len_sq = C * C + D * D;
  var param = -1;
  if (len_sq != 0) //in case of 0 length line
      param = dot / len_sq;

  var xx, yy;

  if (param < 0) {
    xx = x1;
    yy = y1;
  }
  else if (param > 1) {
    xx = x2;
    yy = y2;
  }
  else {
    xx = x1 + param * C;
    yy = y1 + param * D;
  }

  var dx = x - xx;
  var dy = y - yy;
  return {distance:Math.sqrt(dx * dx + dy * dy),param:param};
}




    function ticked(d) {
      if (simulation.alpha() < 0.01) {
         simulation.stop()
      //  position the nodes based on the simulated x y
      // d3.selectAll(".node")
      //   .attr("cx", function(d) {
      //     return d.x = Math.max(0, Math.min(50, d.x))
      //   })
      //   .attr("cy", function(d) {
      //     return d.y = Math.max(0, Math.min(50, d.y))
      //   })
        // .attr("x", function(d) {
        //   return d.x = Math.max((15 / 100) * width + 50, Math.min(width - 2 * ((15 / 100) * width) - 50, d.x));
        // })
        // .attr("y", function(d) {
        //   return d.y = Math.max(70, Math.min(height - 100, d.y))
        // })

      let maxY = d3.extent(nodes, function(d) { return d.y});
      //console.log(maxY)
      let scaleNodeFrame = d3.scaleLinear()
      .domain(maxY)
      .range([0+10,height-10])

      d3.selectAll(".nodes")
        .attr("transform", function(d) {
          d.y = scaleNodeFrame(d.y)//Math.max(10, Math.min(height - 10, d.y))
          d.x = Math.max(200, Math.min(width - 200, scaleNodeFrame(d.x)))
          return 'translate(' + d.x + ',' + d.y + ')';
        })

        d3.selectAll(".label,.labelbg")
        .attr("transform", function(d) {
          return 'translate(' + d.x + ',' + d.y + ')';
        })



      //also use the x, y of the links for the lines. x1 and y1 are for the source node, x2 and y2 for the target node
      d3.selectAll(".link")
        .attr("x1", function(d) {
          d.length = Math.sqrt((Math.pow((d.target.x-d.source.x),2))+(Math.pow((d.target.y-d.source.y),2))) // add length of edge to edge data
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


        edgeLengthExtent = d3.extent(linksTransformed, function(d) { return d.length});
       //console.log(edgeLengthExtent)
      }
    }

  });
