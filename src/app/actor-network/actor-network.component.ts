import { Component, OnInit } from '@angular/core';
import * as d3 from 'd3';
import { SimulationNodeDatum } from 'd3';
import { ActorRepository } from '../actor.repository';
import { Actor } from '../models/actor';
import { Movie } from '../models/movie';

@Component({
  selector: 'app-actor-network',
  templateUrl: './actor-network.component.html',
  styleUrls: ['./actor-network.component.scss']
})
export class ActorNetworkComponent implements OnInit {
  actors: Actor[] = [];
  movies: Movie[] = [];
  nodes: ActorNode[] = [];
  edges: MovieLink[] = [];
  private nodeRadius = 10;
  private nodeColor = 'lime';
  private nodeHoverColor = 'green'
  private margin = { top: 10, right: 30, bottom: 30, left: 40 };
  private svg;
  private width = 750
  private height = 400
  constructor(private _actorRepository: ActorRepository) { }

  ngOnInit(): void {
    let result = this._actorRepository.getAllActorsAndovies();
    this.actors = result[0]
    this.movies = result[1]
    this.createSvg();
    this.importData(this.actors, this.movies);
    this.createForceNetwork();
  }

  importData(actors: Actor[], movies: Movie[]) {
    actors.forEach(actor => {
      this.nodes.push(<ActorNode>{actor: actor});
    });
    movies.forEach(movie => {
      for(let i = 0; i< movie.actors.length; i++){
        for(let j=i+1; j<movie.actors.length;j++){
          let a1 = this.nodes.find((a)=>a.actor.id==movie.actors[i].id);
          let a2 = this.nodes.find((a)=>a.actor.id==movie.actors[j].id);
          this.edges.push(<MovieLink>{
              source: a1,
              target:a2
          })
        }
      }
    });
  }

  private createSvg(): void {
    var svg = d3.select("#graph-container")
      .append("svg")
      .attr("width", this.width + this.margin.left + this.margin.right)
      .attr("height", this.height + this.margin.top + this.margin.bottom)
      .style("border", "1px solid black")
      .append("g")
      .attr("transform",
        "translate(" + this.margin.left + "," + this.margin.top + ")");
  }
  // private drawBars(data: any[]): void {
  //   // Create the X-axis band scale
  //   const x = d3.scaleBand()
  //     .range([0, this.width])
  //     .domain(data.map(d => d.Framework))
  //     .padding(0.2);

  //   // Draw the X-axis on the DOM
  //   this.svg.append("g")
  //     .attr("transform", "translate(0," + this.height + ")")
  //     .call(d3.axisBottom(x))
  //     .selectAll("text")
  //     .attr("transform", "translate(-10,0)rotate(-45)")
  //     .style("text-anchor", "end");

  //   // Create the Y-axis band scale
  //   const y = d3.scaleLinear()
  //     .domain([0, 200000])
  //     .range([this.height, 0]);

  //   // Draw the Y-axis on the DOM
  //   this.svg.append("g")
  //     .call(d3.axisLeft(y));

  //   // Create and fill the bars
  //   this.svg.selectAll("bars")
  //     .data(data)
  //     .enter()
  //     .append("rect")
  //     .attr("x", d => x(d.Framework))
  //     .attr("y", d => y(d.Stars))
  //     .attr("width", x.bandwidth())
  //     .attr("height", (d) => this.height - y(d.Stars))
  //     .attr("fill", "#d04a35");
  // }


  createForceNetwork() {
    let simulation = d3.forceSimulation(this.nodes)
      .force("link", d3.forceLink()
        .links(this.edges)
      )
      .force("charge", d3.forceManyBody().strength(-50))
      .force("center", d3.forceCenter(this.width / 2, this.height / 2))
      .on("tick", this.updateNetwork);

    var edgeEnter = d3.select("svg").selectAll("g.edge")
      .data(this.edges)
      .enter()
      .append("g")
      .attr("class", "edge");

    //normal edges
    edgeEnter
      .append("line")
      .style("stroke-width", "1px")
      .style("stroke", "black")
      .style("pointer-events", "none");

    //edges shown when hovered
    edgeEnter
      .append("line")
      .attr("class", "highlight")
      .style("stroke-width", "8px")
      .style("stroke", "#66CCCC")
      .style("opacity", 0)
      .on("dblclick", this.deleteEdge)
      .on("mouseover", this.edgeOver)
      .on("mouseout", this.edgeOut);

    var nodeEnter = d3.select("svg").selectAll("g.node")
      .data(this.nodes, (d: ActorNode) => {console.log(d.actor.id);  return d.actor.id})
      .enter()
      .append("g")
      .attr("class", "node")
      .on("click", this.expandNode)
      .on("dblclick", this.deleteNode)
      .on("mouseover", this.nodeOver)
      .on("mouseout", this.nodeOut);
    // .call(force.drag());

    nodeEnter.append("circle")
      .attr("r", this.nodeRadius)
      .style("fill", this.nodeColor)
      .style("stroke", "black")
      .style("stroke-width", "1px")

    nodeEnter.append("text")
      .style("text-anchor", "middle")
      .attr("y", 2)
      .style("stroke-width", "1px")
      .style("stroke-opacity", 0.75)
      .style("stroke", "white")
      .style("font-size", "8px")
      .text((d) => (<any>d).name)
      .style("pointer-events", "none")

    nodeEnter.append("text")
      .style("text-anchor", "middle")
      .attr("y", 2)
      .style("font-size", "8px")
      .text((d) => (<any>d).name)
      .style("pointer-events", "none")
  }

  expandNode(e) {
    console.log(e)
    // var currentNodes = d3.selectAll("g.node").data();
    // var currentEdges = d3.selectAll("g.edge").data();
    // var edgesToNode = AvailableEdges.filter((p) => p.source.id == e.id || p.target.id == e.id);
    // var newEdges = edgesToNode.filter(newEdge => {
    //   // console.log(newEdge)
    //   return currentEdges.find((oldEdge) => isSameEdge(newEdge, oldEdge)) == undefined
    // });

    // //add all links from new nodes
    // for (i = 0; i < newEdges.length; i++) {
    //   var newNode = newEdges[i].source.id != e.id ? newEdges[i].source : newEdges[i].target;
    //   for (j = 0; j < AvailableEdges.length; j++) {
    //     if (AvailableEdges[j].source.id == newNode.id && currentNodes.find((n) => n.id == AvailableEdges[j].target.id) != null) {
    //       currentEdges.push(AvailableEdges[j]);
    //       continue;
    //     }
    //     if (AvailableEdges[j].target.id == newNode.id && currentNodes.find((n) => n.id == AvailableEdges[j].source.id) != null) {
    //       currentEdges.push(AvailableEdges[j]);
    //       continue;
    //     }
    //   }
    // }

    //add all new nodes
    // for (i = 0; i < newEdges.length; i++) {
    //   if (newEdges[i].source.id != e.id) {
    //     currentNodes.push(newEdges[i].source)
    //   } else {
    //     currentNodes.push(newEdges[i].target)
    //   }
    // }
    // this.createForceNetwork(currentNodes, currentEdges)
  }

  nodeOver(d) {
    console.log(d)
    d3.selectAll("circle")
      .filter((n: any) => n.id == d.id)
      .style("fill", this.nodeHoverColor)
      .style("stroke", this.nodeHoverColor)
      .style("stroke-width", "3px");
  }

  nodeOut(d) {
    d3.selectAll("circle")
      .filter((n: any) => n.id == d.id)
      .style("fill", this.nodeColor)
      .style("stroke", "black")
      .style("stroke-width", "1px");
  }

  deleteNode(d) {
    var currentNodes = d3.selectAll("g.node").data();
    var currentEdges = d3.selectAll("g.edge").data();
    var filteredNodes = currentNodes.filter(function (p: any) { return p.id != d.id });
    var filteredEdges = currentEdges.filter(function (p: any) { return p.source.id != d.id && p.target.id != d.id });
    d3.select("svg").selectAll("g.edge").data(filteredEdges, (d: any) => d.id).enter()
    d3.select("svg").selectAll("g.node").data(filteredNodes, (d: any) => d.id).enter()
    d3.selectAll("g.node").data(filteredNodes, (x: any) => x.id)
      .exit()
      .transition()
      .duration(500)
      .style("opacity", 0)
      .remove();
    d3.selectAll("g.edge").data(filteredEdges, (x: any) => x.id)
      .exit()
      .transition()
      .duration(500)
      .style("opacity", 0)
      .remove();
  }

  deleteEdge(d) {
    var currentEdges = d3.selectAll("g.edge").data();
    var filteredEdges = currentEdges.filter((l) => !this.isSameEdge(l, d));
    d3.select("svg").selectAll("g.edge").data(filteredEdges, (d: any) => d.id).enter()

    d3.selectAll("g.edge").data(filteredEdges, (x: any) => x.id)
      .exit()
      .transition()
      .duration(500)
      .style("opacity", 0)
      .remove();
  }

  edgeOver(d) {
    console.log(d)
    // d3.select(this).style("opacity", 0.75);
  }

  edgeOut() {
    d3.selectAll("line.highlight").style("opacity", 0);
  }

  updateNetwork() {
    d3.select("svg").selectAll("line")
      .attr("x1", function (d: any) { return d.source.x })
      .attr("y1", function (d: any) { return d.source.y })
      .attr("x2", function (d: any) { return d.target.x })
      .attr("y2", function (d: any) { return d.target.y });

    d3.select("svg").selectAll("g.node")
      .attr("transform", function (d: any) {
        return "translate(" + d.x + "," + d.y + ")"
      });

    d3.select("svg").selectAll("g.node > circle")
        .attr("r", (d) => 10); //node radius

  }


  isSameEdge(l, d) {
    return (l.source.id == d.source.id && l.target.id == d.target.id) || (l.source.id == d.target.id && l.target.id == d.source.id)
  }
}

interface ActorNode extends d3.SimulationNodeDatum {
  actor: Actor;
}
interface MovieLink extends d3.SimulationLinkDatum<SimulationNodeDatum> {

}