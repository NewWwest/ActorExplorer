import { Component, OnInit } from '@angular/core';
import * as d3 from 'd3';
import { forkJoin, Observable } from 'rxjs';
import { ActorRepository } from '../actor.repository';
import { ActorService } from '../actor.service';
import { Actor, ActorData } from '../models/actor';
import { Movie } from '../models/movie';

@Component({
  selector: 'app-actor-network',
  templateUrl: './actor-network.component.html',
  styleUrls: ['./actor-network.component.css']
})
export class ActorNetworkComponent implements OnInit {
  ColorDataEnum = ColorDataEnum;
  colorSchemaEnum = colorSchemaEnum;
  expandConstant = 5;
  nodeCollisionRadius = 20;
  minNodeRadius = 10;
  sideEgdeOpacity = 0.2;
  edgeForce = 0.05;
  sideEdgeForce = 0.001;
  totalRevenueMaxScale = 7_000_000_000;
  totalRevenueMinScale = 0;
  averageRevenueMaxScale = 200_000_000;
  averageRevenueMinScale = 0;
  votingMaxScale = 10;
  votingMinScale = 0;

  startingActor = "Zac Efron"
  actors: ActorData[] = [];
  movies: Movie[] = [];
  nodes: ActorNode[] = [];
  edges: MovieLink[] = [];
  skeletonNodes: ActorNode[] = [];

  edgeTooltip: any = null;
  colorLegend: any = null;
  svg: any = null;
  g: any = null;

  skeletonShown: boolean = false;
  color: any;
  colorType: ColorDataEnum = ColorDataEnum.revenueTotal;
  colorSchema: colorSchemaEnum = colorSchemaEnum.viridis;

  private width = 2000
  private height = 2000
  simulation: d3.Simulation<ActorNode, MovieLink>;

  constructor(private _actorRepository: ActorRepository,
    private _actorService: ActorService
  ) { }

  ngOnInit(): void {
    this.edgeTooltip = d3.select("#edge-tooltip")
    this.sizeSvg();
    this.createColor();
    this._actorRepository.getActorByName(this.startingActor).subscribe(actor => {
      this._actorRepository.getActorDataById(actor._id).subscribe(actorData => {
        this.addActor(actorData, this.width / 2, this.height / 2, null);
        this.createForceNetwork();
      }, (err) => {
        console.error(err);
      });
    }, (err) => {
      console.error(err);
    });
    this._actorService.addSearchForActorHandler(this.addOrSelectNewActor.bind(this));
    this._actorService.addResetHandlers(this.reset.bind(this));
    this._actorService.addShowOrHideSkeletonHandlers(this.showOrHideSkeleton.bind(this));
  }

  createColor() {
    let interpolator = null;
    let min = 0;
    let max = 1000;
    switch (this.colorSchema) {
      case colorSchemaEnum.magma:
        interpolator = d3.interpolateMagma;
        break;
      case colorSchemaEnum.viridis:
        interpolator = d3.interpolateViridis;
        break;
      case colorSchemaEnum.plasma:
        interpolator = d3.interpolatePlasma;
        break;
      case colorSchemaEnum.heatmap:
        interpolator = d3.interpolateYlOrRd;
        break;
    }

    switch (this.colorType) {
      case ColorDataEnum.revenueTotal:
        min = this.totalRevenueMinScale;
        max = this.totalRevenueMaxScale;
        break;
      case ColorDataEnum.revenueAverage:
        min = this.averageRevenueMinScale;
        max = this.averageRevenueMaxScale;
        break;
      case ColorDataEnum.voteAverage:
        min = this.votingMinScale;
        max = this.votingMaxScale;
        break;
      case ColorDataEnum.none:
        this.color = 'lime';
        break;
    }

    console.log(d3.range(min, max, max / 100))
    this.color = d3.scaleSequential().domain([min, max]).interpolator(interpolator);
    this.colorLegend = d3.select(".color-legend-svg")
      .attr("width", 700)
      .attr("height", 20);
    this.colorLegend.selectAll('rect').data([]).exit().remove()
    this.colorLegend.selectAll('rect')
      .data(d3.range(min, max, max / 100))
      .enter()
      .append('rect')
      .attr('x', (d, i) => { return i * 7; })
      .attr('y', 0)
      .attr('width', 7)
      .attr('height', 20)
      .attr('fill', (d, i) => { return ColorDataEnum.none == this.colorType ? 'lime' : this.color(d); });
  }

  addActor(actor: ActorData, x: number, y: number, parentActorId: string) {
    if (this.simulation)
      this.simulation.stop();

    if (this.actors.find(a => actor._id == a._id) == null) {
      let revenueTotal = 0;
      let voteTotal = 0;
      actor.movieData.forEach(movie => {
        revenueTotal += movie.revenue;
        voteTotal += movie.vote_average;
      })

      this.actors.push(actor);
      this.nodes.push({
        actor: actor,
        isSelected: false,
        x: x ? x + Math.random() * 10 - 5 : null,
        y: x ? y + Math.random() * 10 - 5 : null,
        movieIds: actor.movies,
        movieCount: actor.movies.length,
        skeletonNode: false,
        parentActorId: parentActorId,
        revenueTotal: revenueTotal,
        revenueAverage: revenueTotal / actor.movieData.length,
        voteAverage: voteTotal / actor.movieData.length,
      });
    }
  }

  addMissingEdges() {
    if (this.simulation)
      this.simulation.stop();

    this.movies.forEach(movie => {
      for (let i = 0; i < movie.actors.length; i++) {
        for (let j = i + 1; j < movie.actors.length; j++) {
          if (movie.actors[i] == movie.actors[j]) {
            continue;
          }
          let edge = this.edges.find((e: any) => {
            let source = <Actor>e.source.actor;
            let target = <Actor>e.target.actor;
            return this.isSameEdge(source._id, target._id, movie.actors[i], movie.actors[j]);
          })
          if (edge) {
            if (edge.movieIds.find(id => movie._id == id) == null) {
              edge.movieIds.push(movie._id);
              edge.movieTitles.push(movie.title);
              edge.width += 1;
            }
          }
          else {
            let a1 = this.nodes.find((a) => a.actor._id == movie.actors[i]);
            let a2 = this.nodes.find((a) => a.actor._id == movie.actors[j]);
            if (a1 == null || a2 == null)
              continue;
            this.edges.push(<MovieLink>{
              movieIds: [movie._id],
              movieTitles: [movie.title],
              width: 1,
              source: a1,
              target: a2,
              isSkeleton: false,
            })
          }
        }
      }
    });
    for (let i = 0; i < this.skeletonNodes.length - 1; i++) {
      let source = this.skeletonNodes[i];
      let target = this.skeletonNodes[i + 1];
      if (this.edges.find((e: any) => e.source.actor._id == source.actor._id && e.target.actor._id == target.actor._id && e.isSkeleton) == null) {
        this.edges.push(<MovieLink>{
          movieIds: [],
          movieTitles: [],
          width: 10,
          source: source,
          target: target,
          isSkeleton: true,
        })
      }

    }
  }

  private sizeSvg(): void {
    this.svg = d3.select(".graph-svg");
    this.g = this.svg.append("g");
    this.svg.attr("width", this.width)
      .attr("height", this.height)
      .style("border", "1px solid black");

    this.svg.call(d3.zoom()
      .on("zoom", e => {
        this.g.attr("transform", e.transform);
      })
    );
  }

  createForceNetwork() {
    this.addMissingEdges();
    this.simulation = d3.forceSimulation<ActorNode, MovieLink>(this.nodes)
      .force('collide', d3.forceCollide().radius((n: ActorNode) => {
        let distance = n.skeletonNode ? this.nodeCollisionRadius * 3 : this.nodeCollisionRadius;
        return Math.max(this.minNodeRadius, 5 * Math.sqrt(n.movieCount)) + distance
      }))
      .force("link", d3.forceLink(this.edges).strength((e: MovieLink) => {
        if (e.isSkeleton)
          return 0;
        if (this.isSideEdge(e))
          return this.sideEdgeForce;
        else {
          return this.edgeForce;
        }
      }))
      .force("charge", d3.forceManyBody().strength(-10))
      .force("center", d3.forceCenter(this.width / 2, this.height / 2))
      .on("tick", this.updateNetwork.bind(this));

    this.addAndStyleEdges();
    this.addAndStyleNodes();

    this.g.selectAll("g").sort((l: any, r: any) => {
      if (l.actor == null && r.actor != null)
        return -1;
      if (l.actor != null && r.actor == null)
        return 1;
      return 0;
    })
    this.simulation.alpha(0.2).restart();
  }

  expandNode(e) {
    let actorId = e.target.__data__.actor._id;
    let actor = this.actors.find(a => a._id == actorId);
    let node = this.nodes.find(a => a.actor._id == actorId);
    if (this.skeletonNodes.find(n => n.actor._id == actorId) == null) {
      this.skeletonNodes.push(node);
    }
    this.selectNode(actorId);
    this.nodes.forEach(n => { n.fx = null; n.fy = null })
    node.fx = node.x;
    node.fy = node.y;
    this._actorService.triggerActorSelectedHandlers(actor);

    for (let i = 0; i < actor.movieData.length; i++) {
      if (this.movies.find(temp => temp._id == actor.movieData[i]._id) == null) {
        this.movies.push(actor.movieData[i])
      }
    }

    let actorsWithColabs = this.findMissingActorsWithColabCount(this.movies);
    if (actorsWithColabs.length <= 0) {
      this.createForceNetwork();
      return;
    }

    let observables = actorsWithColabs.map(a => this._actorRepository.getActorDataById(a.actorId));
    forkJoin(observables).subscribe(newActors => {
      newActors.forEach(newActor => {
        actorsWithColabs.find(aaa => aaa.actorId == newActor._id).actor = newActor;
      });
      actorsWithColabs.sort((l: any, r: any) => {
        if (l.count > r.count)
          return -1;
        if (l.count < r.count)
          return 1;
        if (l.actor.movies.length > r.actor.movies.length)
          return -1;
        if (l.actor.movies.length < r.actor.movies.length)
          return 1;

        return 0;
      });
      let limit = actorsWithColabs.splice(0, this.expandConstant);
      limit.forEach(a => {
        this.addActor(a.actor, node.x, node.y, actorId);
      })
      this.createForceNetwork();
    })
  }

  selectNode(actorId: string) {
    this.nodes.forEach(n => {
      if (n.actor._id == actorId) {
        n.isSelected = true;
        n.skeletonNode = true;
      }
      else {
        n.isSelected = false;
      }
    })
  }

  nodeOver(evt) {
    let node: ActorNode = evt.target.__data__;
    evt.target.style['stroke'] = this.getColor(node);
    evt.target.style['stroke-width'] = '10px';
  }

  nodeOut(evt) {
    let actorId = evt.target.__data__.actor._id;
    let node = this.nodes.find(a => a.actor._id == actorId)
    evt.target.style['stroke'] = 'black';
    evt.target.style['stroke-width'] = node.isSelected ? '3px' : '1px';
  }

  edgeMove(d) {
    this.edgeTooltip
      .style("left", (d.layerX + 20) + "px")
      .style("top", (d.layerY) + "px")
  }

  edgeOver(evt) {
    let idStrings = evt.target.id.split('-');
    let movies = this._actorRepository.getMovieListbetweenActors(idStrings[0], idStrings[1], this.movies)
    let text = movies.map(m => m.title).join('<br/>');
    this.edgeTooltip.html(text);
    this.edgeTooltip.style("opacity", 1);

    evt.target.style.opacity = '0.75';
  }

  edgeOut(evt) {
    this.edgeTooltip.html('');
    this.edgeTooltip.style("opacity", 0)
    evt.target.style.opacity = '0'
  }

  addOrSelectNewActor(actor: Actor) {
    let node = this.nodes.find(a => a.actor._id == actor._id);
    if (node != null) {
      this.selectNode(actor._id);
      this.createForceNetwork();
    }
    else {
      this._actorRepository.getActorDataById(actor._id).subscribe(actorData => {
        this.addActor(actorData, this.width / 2, this.height / 2, null);
        actorData.movieData.forEach(movie => {
          if (this.movies.find(temp => temp._id == movie._id) == null) {
            this.movies.push(movie)
          }
        });
        this.selectNode(actor._id);
        this.createForceNetwork();
      }, (err) => {
        console.error(err);
      });
    }
  }

  isSameEdge(sourceId1, targetId1, sourceId2, targetId2) {
    return (sourceId1 == sourceId2 && targetId1 == targetId2) || (sourceId1 == targetId2 && sourceId2 == targetId1)
  }

  findMissingActorsWithColabCount(movies: Movie[]): { actorId: string, count: number, actor: ActorData }[] {
    let dict = {};
    for (let i = 0; i < movies.length; i++) {
      for (let j = 0; j < movies[i].actors.length; j++) {
        let id = movies[i].actors[j]
        if (dict[id] != null) {
          dict[id] += 1;
        }
        else {
          dict[id] = 1;
        }
      }
    }
    let actorsWithColabs = Object.keys(dict).map(k => { return { actorId: k, count: dict[k], actor: null } });
    let actorsWithColabsFiltered = [];
    for (let i = 0; i < actorsWithColabs.length; i++) {
      if (this.actors.find(a => actorsWithColabs[i].actorId == a._id) == null) {
        actorsWithColabsFiltered.push(actorsWithColabs[i]);
      }
    }
    return actorsWithColabsFiltered;
  }

  isSideEdge(e: any) {
    return e.source.parentActorId != e.target.actor._id && e.target.parentActorId != e.source.actor._id;
  }

  addAndStyleEdges() {
    var edgeEnter = this.g.selectAll("g.edge")
      .data(this.edges.filter(e => !e.isSkeleton))
      .enter()
      .append("g")
      .attr("class", "edge");

    //normal edges
    edgeEnter
      .append("line")
      .attr("class", "core")
      .style("stroke-width", (e) => `${e.width}px`)
      .style("opacity", (e: MovieLink) => {
        if (this.isSideEdge(e))
          return this.sideEgdeOpacity;
        else
          return 1;
      })
      .style("stroke", "black")
      .style("pointer-events", "none");

    //edges shown when hovered
    edgeEnter
      .append("line")
      .attr("class", "highlight")
      .style("stroke-width", (e) => `${e.width + 5}px`)
      .style("stroke", "#66CCCC")
      .style("opacity", 0)
      .attr("id", (e: any) => `${e.source.actor._id}-${e.target.actor._id}`)
      .on("mouseover", this.edgeOver.bind(this))
      .on("mouseout", this.edgeOut.bind(this))
      .on("mousemove", this.edgeMove.bind(this));

    var skeletonEnter = this.g.selectAll("g.skeleton")
      .data(this.edges.filter(e => e.isSkeleton), (e) => `S${e.source.actor._id}-${e.target.actor._id}`)
      .enter()
      .append("g")
      .attr("class", "skeleton");
    skeletonEnter
      .append("line")
      .style("stroke-width", (e) => { return `${e.width}px` })
      .style("opacity", (e) => this.skeletonShown ? 1 : 0)
      .style("stroke", "#FF5533")
      .style("pointer-events", "none");
  }

  addAndStyleNodes() {
    var nodeEnter = this.g.selectAll("g.node")
      .data(this.nodes, (d: ActorNode) => { return d.actor._id })
      .enter()
      .append("g")
      .attr("class", "node")
      .on("click", this.expandNode.bind(this))
      .on("mouseover", this.nodeOver.bind(this))
      .on("mouseout", this.nodeOut.bind(this))
      .call(d3.drag().on("drag", this.dragged.bind(this)));

    nodeEnter.append("circle")
      .attr("r", (n: ActorNode) => Math.max(this.minNodeRadius, 5 * Math.sqrt(n.movieCount)))
      .style("fill", (n: ActorNode) => this.getColor(n))
      .style("stroke", "black")
      .style("stroke-width", "1px")

    nodeEnter.append("text")
      .style("text-anchor", "middle")
      .attr("y", 2)
      .style("stroke-width", "1px")
      .style("stroke-opacity", 0.75)
      .style("stroke", "white")
      .style("font-size", "8px")
      .text((d) => d.actor.name)
      .style("pointer-events", "none")

    nodeEnter.append("text")
      .style("text-anchor", "middle")
      .attr("y", 2)
      .style("font-size", "8px")
      .text((d) => d.actor.name)
      .style("pointer-events", "none")


    this.svg.selectAll("g.node > circle")
      .style("stroke-width", (n: ActorNode) => n.isSelected ? '3px' : '1px');
  }

  getColor(node: ActorNode) {
    switch (this.colorType) {
      case ColorDataEnum.revenueTotal:
        return this.color(node.revenueTotal)
      case ColorDataEnum.revenueAverage:
        return this.color(node.revenueAverage)
      case ColorDataEnum.voteAverage:
        return this.color(node.voteAverage)
      case ColorDataEnum.none:
        return 'lime';
    }
  }

  changeColors(e) {
    this.createColor();
    this.svg.selectAll("circle")
      .style("fill", (n: ActorNode) => this.getColor(n));
  }

  dragged(evt, node) {
    if (this.simulation)
      this.simulation.stop()
    node.x = evt.x;
    node.y = evt.y
    if (node.fx != null)
      node.fx = evt.x;
    if (node.fy != null)
      node.fy = evt.y;
    this.simulation.restart();
  }

  updateNetwork() {
    this.svg.selectAll("line")
      .attr("x1", function (d: any) { return d.source.x })
      .attr("y1", function (d: any) { return d.source.y })
      .attr("x2", function (d: any) { return d.target.x })
      .attr("y2", function (d: any) { return d.target.y });

    this.svg.selectAll("g.node")
      .attr("transform", (n: ActorNode) => {
        return "translate(" + n.x + "," + n.y + ")"
      });
  }

  reset() {
    if (this.simulation)
      this.simulation.stop();
    this.svg.selectAll("g.edge").data([]).enter()
    this.svg.selectAll("g.node").data([]).enter()
    d3.selectAll("g.node").data([]).exit()
      .transition().duration(500).style("opacity", 0)
      .remove();
    d3.selectAll("g.edge").data([]).exit()
      .transition().duration(500).style("opacity", 0)
      .remove();
    d3.selectAll("g.skeleton").data([]).exit()
      .transition().duration(500).style("opacity", 0)
      .remove();
    this.actors = [];
    this.movies = [];
    this.nodes = [];
    this.edges = [];
    this.skeletonNodes = [];
    if (this.simulation)
      this.simulation.restart();
  }

  showOrHideSkeleton(skeletonShown: boolean) {
    this.skeletonShown = skeletonShown;
    this.g.selectAll("g.skeleton line").style("opacity", (e) => skeletonShown ? 1 : 0)
  }
}

interface ActorNode extends d3.SimulationNodeDatum {
  actor: Actor;
  isSelected: boolean;
  movieIds: string[];
  movieCount: number;
  skeletonNode: boolean;
  parentActorId?: string;
  revenueTotal: number;
  revenueAverage: number;
  voteAverage: number;
}

interface MovieLink extends d3.SimulationLinkDatum<ActorNode> {
  width: number;
  movieIds: string[];
  movieTitles: string[];
  isSkeleton: boolean;
}

enum ColorDataEnum {
  revenueTotal = 'revenueTotal',
  revenueAverage = 'revenueAverage',
  voteAverage = 'voteAverage',
  none = 'none'
}
enum colorSchemaEnum {
  viridis = 'viridis',
  magma = 'magma',
  plasma = 'plasma',
  heatmap = 'heatmap'
}
