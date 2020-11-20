import { Component, OnInit } from '@angular/core';
import * as d3 from 'd3';
import { SimulationNodeDatum } from 'd3';
import { ActorRepository } from '../actor.repository';
import { ActorService } from '../actor.service';
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
  private svg = null;
  private width = 750
  private height = 400


  constructor(private _actorRepository: ActorRepository,
    private _actorService: ActorService
    ) { }

  ngOnInit(): void {
    let result = this._actorRepository.getAllActorsAndovies();
    this.actors = result[0]
    this.movies = result[1]
    this.createSvg();
    this.importData(this.actors, this.movies);
    this.createForceNetwork();
    this.fetchWillData();
  }

  fetchWillData() {
    this._actorRepository.getWills().subscribe((data)=>{
      console.log(data);
    }, (err)=>{
      console.error(err)
    })
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
    this.svg = d3.select("#graph-container")
      .append("svg")
      .attr("width", this.width + this.margin.left + this.margin.right)
      .attr("height", this.height + this.margin.top + this.margin.bottom)
      .style("border", "1px solid black")
      .append("g")
      .attr("transform",
        "translate(" + this.margin.left + "," + this.margin.top + ")");
  }

  createForceNetwork() {
    let simulation = d3.forceSimulation(this.nodes)
      .force("link", d3.forceLink()
        .links(this.edges)
      )
      .force("charge", d3.forceManyBody().strength(-50))
      .force("center", d3.forceCenter(this.width / 2, this.height / 2))
      .on("tick", this.updateNetwork.bind(this));

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
      .on("mouseover", this.edgeOver)
      .on("mouseout", this.edgeOut);

    var nodeEnter = d3.select("svg").selectAll("g.node")
      .data(this.nodes, (d: ActorNode) => { return d.actor.id})
      .enter()
      .append("g")
      .attr("class", "node")
      .on("click", this.expandNode.bind(this))
      .on("mouseover", this.nodeOver.bind(this))
      .on("mouseout", this.nodeOut.bind(this));
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
      .text((d) => (<any>d).actor.name)
      .style("pointer-events", "none")

    nodeEnter.append("text")
      .style("text-anchor", "middle")
      .attr("y", 2)
      .style("font-size", "8px")
      .text((d) => (<any>d).actor.name)
      .style("pointer-events", "none")
  }

  expandNode(e) {
    let actorId = e.target.__data__.actor.id;
    let actor = this.actors.find(a=>a.id==actorId);
    this._actorService.triggerActorSelectedHandlers(actor);
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

  nodeOver(evt) {
    evt.target.style['fill']=this.nodeHoverColor;
    evt.target.style['stroke']=this.nodeHoverColor;
    evt.target.style['stroke-width']='3px';
  }

  nodeOut(evt) {
    evt.target.style['fill']=this.nodeColor;
    evt.target.style['stroke']='black';
    evt.target.style['stroke-width']='1px';
  }

  edgeOver(evt) {
    evt.target.style.opacity='0.75'
  }

  edgeOut(evt) {
    evt.target.style.opacity='0'
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
        .attr("r", (d) => this.nodeRadius);

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


  // deleteNode(d) {
  //   var currentNodes = d3.selectAll("g.node").data();
  //   var currentEdges = d3.selectAll("g.edge").data();
  //   var filteredNodes = currentNodes.filter(function (p: any) { return p.id != d.id });
  //   var filteredEdges = currentEdges.filter(function (p: any) { return p.source.id != d.id && p.target.id != d.id });
  //   d3.select("svg").selectAll("g.edge").data(filteredEdges, (d: any) => d.id).enter()
  //   d3.select("svg").selectAll("g.node").data(filteredNodes, (d: any) => d.id).enter()
  //   d3.selectAll("g.node").data(filteredNodes, (x: any) => x.id)
  //     .exit()
  //     .transition()
  //     .duration(500)
  //     .style("opacity", 0)
  //     .remove();
  //   d3.selectAll("g.edge").data(filteredEdges, (x: any) => x.id)
  //     .exit()
  //     .transition()
  //     .duration(500)
  //     .style("opacity", 0)
  //     .remove();
  // }

  // deleteEdge(d) {
  //   var currentEdges = d3.selectAll("g.edge").data();
  //   var filteredEdges = currentEdges.filter((l) => !this.isSameEdge(l, d));
  //   d3.select("svg").selectAll("g.edge").data(filteredEdges, (d: any) => d.id).enter()

  //   d3.selectAll("g.edge").data(filteredEdges, (x: any) => x.id)
  //     .exit()
  //     .transition()
  //     .duration(500)
  //     .style("opacity", 0)
  //     .remove();
  // }