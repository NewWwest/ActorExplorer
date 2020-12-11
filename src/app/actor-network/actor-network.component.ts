import { Component, OnInit } from '@angular/core';
import * as d3 from 'd3';
import { forkJoin, Observable } from 'rxjs';
import { ActorRepository } from '../actor.repository';
import { ActorService } from '../actor.service';
import { Actor } from '../models/actor';
import { Movie } from '../models/movie';

@Component({
  selector: 'app-actor-network',
  templateUrl: './actor-network.component.html',
  styleUrls: ['./actor-network.component.css']
})
export class ActorNetworkComponent implements OnInit {
  expandConstant = 5;
  nodeCollisionRadius = 20;
  minNodeRadius = 10;
  sideEgdeOpacity = 0.2;
  edgeForce = 0.05;
  sideEdgeForce = 0.001;

  startingActor = "Zac Efron"
  actors: Actor[] = [];
  movies: Movie[] = [];
  nodes: ActorNode[] = [];
  edges: MovieLink[] = [];

  skeletonNodes: ActorNode[] = [];
  skeletonEdges: MovieLink[] = [];

  edgeTooltip: any = null;
  svg: any = null;
  g: any = null;

  private nodeColor = 'lime';
  private nodeHoverColor = 'green'

  private width = 2000
  private height = 2000
  simulation: d3.Simulation<ActorNode, MovieLink>;

  constructor(private _actorRepository: ActorRepository,
    private _actorService: ActorService
  ) { }

  ngOnInit(): void {
    this.edgeTooltip = d3.select("#edge-tooltip")
    this.sizeSvg();

    this._actorRepository.getActorByName(this.startingActor).subscribe(actor => {
      this.addActor(actor, this.width / 2, this.height / 2, null);
      this.createForceNetwork();
    }, (err) => {
      console.error(err);
    });
    this._actorService.addSearchForActorHandler(this.addOrSelectNewActor.bind(this));
    this._actorService.addResetHandlers(this.reset.bind(this));
    this._actorService.addShowOrHideSkeletonHandlers(this.showOrHideSkeleton.bind(this));
  }

  addActor(actor: Actor, x: number, y: number, parentActorId: string) {
    if (this.simulation)
      this.simulation.stop();

    if (this.actors.find(a => actor._id == a._id) == null) {
      this.actors.push(actor);
      this.nodes.push({
        actor: actor,
        isSelected: false,
        x: x ? x + Math.random() * 10 - 5 : null,
        y: x ? y + Math.random() * 10 - 5 : null,
        movieIds: actor.movies,
        movieCount: actor.movies.length,
        skeletonNode: false,
        parentActorId: parentActorId
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
  }

  private sizeSvg(): void {
    this.svg = d3.select("svg");
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
      if (l.actor == null && r.actor != null) {
        return -1;
      }
      if (l.actor != null && r.actor == null) {
        return 1;
      }
      return 0;
    })
    this.simulation.alpha(0.2).restart();
  }

  expandNode(e) {
    if (this.simulation)
      this.simulation.stop()
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
    this._actorRepository.getMoviesOfAnActor(actor._id).subscribe(movies => {
      for (let i = 0; i < movies.length; i++) {
        if (this.movies.find(temp => temp._id == movies[i]._id) == null) {
          this.movies.push(movies[i])
        }
      }
      let actorsWithColabs = this.selectActorIdsToAdd(movies);
      if (actorsWithColabs.length < 0) {
        this.createForceNetwork();
      }
      let ids: string[] = actorsWithColabs.map(a => a.actorId);
      this._actorRepository.getActors(ids).subscribe(newActors => {
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
      });
    }, (err) => {
      console.error(err);
    });
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
    evt.target.style['fill'] = this.nodeHoverColor;
    evt.target.style['stroke'] = this.nodeHoverColor;
    evt.target.style['stroke-width'] = '3px';
  }

  nodeOut(evt) {
    let actorId = evt.target.__data__.actor._id;
    let node = this.nodes.find(a => a.actor._id == actorId)
    evt.target.style['fill'] = this.nodeColor;
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
      this.addActor(actor, this.width / 2, this.height / 2, null);
      this._actorRepository.getMoviesOfAnActor(actor._id).subscribe(movies => {
        for (let i = 0; i < movies.length; i++) {
          if (this.movies.find(temp => temp._id == movies[i]._id) == null) {
            this.movies.push(movies[i])
          }
        }
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

  selectActorIdsToAdd(movies: Movie[]): { actorId: string, count: number, actor: Actor }[] {
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
      .data(this.edges)
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

    //skeleton
    edgeEnter
      .append("line")
      .attr("class", "skeleton")
      .style("stroke-width", (e) => `${e.width + 5}px`)
      .style("stroke", "#FF5533")
      .style("opacity", 0);

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
      .text((d) => d.actor.name)
      .style("pointer-events", "none")

    nodeEnter.append("text")
      .style("text-anchor", "middle")
      .attr("y", 2)
      .style("font-size", "8px")
      .text((d) => d.actor.name)
      .style("pointer-events", "none")


    d3.select("svg").selectAll("g.node > circle")
      .style("stroke-width", (n: ActorNode) => n.isSelected ? '3px' : '1px');
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
    d3.select("svg").selectAll("line")
      .attr("x1", function (d: any) { return d.source.x })
      .attr("y1", function (d: any) { return d.source.y })
      .attr("x2", function (d: any) { return d.target.x })
      .attr("y2", function (d: any) { return d.target.y });

    d3.select("svg").selectAll("g.node")
      .attr("transform", (n: ActorNode) => {
        return "translate(" + n.x + "," + n.y + ")"
      });
  }

  reset() {
    if (this.simulation)
      this.simulation.stop();
    d3.select("svg").selectAll("g.edge").data([]).enter()
    d3.select("svg").selectAll("g.node").data([]).enter()
    d3.selectAll("g.node").data([]).exit()
      .transition().duration(500).style("opacity", 0)
      .remove();
    d3.selectAll("g.edge").data([]).exit()
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
    console.error(skeletonShown);
  }
}

interface ActorNode extends d3.SimulationNodeDatum {
  actor: Actor;
  isSelected: boolean;
  movieIds: string[];
  movieCount: number;
  skeletonNode: boolean;
  parentActorId?: string;
}

interface MovieLink extends d3.SimulationLinkDatum<ActorNode> {
  width: number;
  movieIds: string[];
  movieTitles: string[];
}