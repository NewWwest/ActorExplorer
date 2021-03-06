import { Component, OnInit } from '@angular/core';
import * as d3 from 'd3';
import { ActorRepository } from '../actor.repository';
import { ActorSelection } from '../actor.selection';
import { ActorService } from '../actor.service';
import { Actor } from '../models/actor';
import { Movie } from '../models/movie';
import { ActorNode, MovieLink, colorSchemaEnum, ColorDataEnum } from './actor-network-models';

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
  votingMinScale = 5;
  zoomLevel = 1;

  startingActor = "Zac Efron"
  actors: Actor[] = [];
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
    private _actorService: ActorService,
    private _actorSelection: ActorSelection,
  ) { }

  ngOnInit(): void {
    this.edgeTooltip = d3.select("#edge-tooltip")
    this.initSvg();
    this.createColor();
    this._actorRepository.getActorByName(this.startingActor).subscribe(actor => {
      this.addActor(actor, this.width / 2, this.height / 2, null);
      this.createForceNetwork();
    }, (err) => {
      console.error(err);
    });
    this._actorService.addSearchForActorHandler(this.addOrSelectNewActor.bind(this));
    this._actorService.addResetHandlers(this.reset.bind(this));
    this._actorService.addShowOrHideSkeletonHandlers(this.showOrHideSkeleton.bind(this));
    this._actorService.addActorSelectionChangedHandler(this.expandNode.bind(this));
    this._actorService.addShowOrHideSkeletonHandlers(this.showOrHideSkeleton.bind(this));
  }

  ///configures the color scheme based on component state and repaints the color legend
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

    this.color = d3.scaleSequential().domain([min, max]).interpolator(interpolator);
    this.colorLegend = d3.select(".color-legend-svg")
      .attr("width", 700)
      .attr("height", 20);
    this.colorLegend.selectAll('rect').data([]).exit().remove()
    this.colorLegend.selectAll('text').data([]).exit().remove()
    let legendEnter = this.colorLegend.selectAll('rect')
      .data(d3.range(min, max, max / 100))
      .enter();
    legendEnter.append('rect')
      .attr('x', (d, i) => { return i * 7; })
      .attr('y', 0)
      .attr('width', 7)
      .attr('height', 20)
      .attr('fill', (d, i) => { return ColorDataEnum.none == this.colorType ? 'lime' : this.color(d); })

    switch (this.colorType) {
      case ColorDataEnum.revenueTotal:
      case ColorDataEnum.revenueAverage:
        legendEnter.append("text")
          .style("text-anchor", "middle")
          .attr('x', (d, i) => {
            if (i == 0)
              return 12;
            if (i == 50)
              return i * 7;
            if (i = 99)
              return i * 7 - 21;
            return 0;
          })
          .attr('y', 15)
          .style("stroke-width", "0.7px")
          .style("stroke-opacity", 1)
          .style("stroke", "white")
          .style("font-size", "25")
          .text((d, i) => i == 0 || i == 50 || i == 99 ? `${d / 1000_000}M` : '')
          .style("pointer-events", "none")
        break;
      case ColorDataEnum.voteAverage:
        legendEnter.append("text")
          .style("text-anchor", "middle")
          .attr('x', (d, i) => {
            if (i == 0)
              return 12;
            if (i % 10 == 0)
              return i * 7;
            if (i == 49)
              return i * 7 - 14;
            return 0;
          })
          .attr('y', 15)
          .style("stroke-width", "0.7px")
          .style("stroke-opacity", 1)
          .style("stroke", "white")
          .style("font-size", "25")
          .text((d, i) => i % 10 == 0 ? d : i == 49 ? 10 : '')
          .style("pointer-events", "none")
        break;
      case ColorDataEnum.none:
        //no legend
        break;
    }
  }

  ///adds actor to local component collections
  addActor(actor: Actor, x: number, y: number, parentActorId: string) {
    if (this.simulation)
      this.simulation.stop();

    if (this.actors.find(a => actor._id == a._id) == null) {
      this.actors.push(actor);
      this.nodes.push({
        actor: actor,
        x: x ? x + Math.random() * 10 - 5 : null,
        y: x ? y + Math.random() * 10 - 5 : null,
        movieIds: actor.movies,
        movieCount: actor.movies.length,
        skeletonNode: false,
        parentActorId: parentActorId,
        revenueTotal: actor.total_revenue,
        revenueAverage: actor.total_revenue / actor.movies.length,
        voteAverage: actor.total_rating / actor.movies.length,
      });
    }
  }

  ///ensures that all painted actors are connect by appropriate edges
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

  initSvg(): void {
    this.svg = d3.select(".graph-svg");
    this.g = this.svg.append("g");
    this.svg.attr("width", this.width)
      .attr("height", this.height)
      .style("border", "1px solid black");

    this.svg.call(d3.zoom()
      .on("zoom", e => {
        this.zoomLevel = Math.sqrt(e.transform.k);
        this.g.attr("transform", e.transform);
        this.svg.selectAll("text")
          .style("font-size", `${12 / this.zoomLevel}px`)
          .style("stroke-width", `${2 / this.zoomLevel}`)
      })
    );
  }

  ///recreates the network visualisation to match new data
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

  //event, on node clicked
  clickNode(e) {
    let actorId = e.target.__data__.actor._id;
    let actor = this.actors.find(a => a._id == actorId);
    this.selectNode(actorId);
    this._actorService.triggerActorSelectedHandlers(actor);
  }

  ///load top collaborator. execcutes on evt from actor.service
  expandNode(actor: Actor, movies, color) {
    //null checks
    if (movies == null) {
      if (actor != null) {
        this.svg.selectAll("g.node").filter((node: any) => node.actor._id == actor._id).call(s => {
          s.select('circle').style('stroke', 'black');
          s.select('circle').style('stroke-width', '2px');
        });
      }
      this.createForceNetwork();
      return;
    }

    //add the movies
    let node = this.nodes.find(a => a.actor._id == actor._id);
    for (let i = 0; i < movies.length; i++) {
      if (this.movies.find(temp => temp._id == movies[i]._id) == null) {
        this.movies.push(movies[i]);
      }
    }

    //fetch missing actor data from the API
    let actorsWithColabs = this.findMissingActorsWithColabCount(movies);
    if (actorsWithColabs == null) {
      console.log(`No more actors to be added for ${actor.name}`)
      this.createForceNetwork();
      return;
    }
    let ids = Object.keys(actorsWithColabs);
    this._actorRepository.getActorMovieCounts(ids).subscribe(movieCounts => {
      movieCounts.forEach(movieCount => {
        actorsWithColabs[movieCount._id].movieCount = movieCount.count;
      });
      let actorsWithColabsArray = Object.keys(actorsWithColabs).map(k => {
        return {
          actorId: k,
          count: actorsWithColabs[k].count,
          movieCount: actorsWithColabs[k].movieCount
        }
      });

      //sort the list so we can pick the top N
      actorsWithColabsArray.sort((l, r) => {
        if (l.count > r.count)
          return -1;
        if (l.count < r.count)
          return 1;
        if (l.movieCount > r.movieCount)
          return -1;
        if (l.movieCount < r.movieCount)
          return 1;

        return 0;
      });
      let actorsWithColabsFiltered = actorsWithColabsArray.splice(0, this.expandConstant);
      actorsWithColabsFiltered.map(x => this._actorRepository.getActorById(x.actorId).subscribe((newActor => {
        this.addActor(newActor, node.x, node.y, actor._id);
        this.createForceNetwork();
      })))
    });
  }

  ///logic behind selecting a node. NOTE: Call always AFTER adding the node you want to select
  selectNode(actorId: string) {
    this.nodes.forEach(n => {
      if (n.actor._id == actorId) {
        n.skeletonNode = true;
        n.fx = n.x;
        n.fy = n.y;
        if (this.skeletonNodes.find(temp => temp.actor._id == actorId) == null) {
          this.skeletonNodes.push(n);
        }
      }
      else {
        n.fx = null;
        n.fy = null;
      }
    })
  }

  ///event: on entering the node
  nodeOver(evt) {
    let node: ActorNode = evt.target.__data__;
    evt.target.style['stroke'] = this.getColor(node);
    evt.target.style['stroke-width'] = '10px';
  }

  ///event: on leaving the node
  nodeOut(evt) {
    let actorId = evt.target.__data__.actor._id;
    let node = this.nodes.find(a => a.actor._id == actorId)
    let selectedActors = this._actorSelection.getSelectedActors();
    let isSlected = this.isNodeSelected(selectedActors, node);
    evt.target.style['stroke'] = isSlected ? this._actorSelection.getSelectedActorColor(node.actor) : 'black';
    evt.target.style['stroke-width'] = isSlected ? '5px' : '2px';
  }

  ///event: adjust the tooltip position when the mouse moves
  edgeMove(d) {
    this.edgeTooltip
      .style("left", (d.layerX + 20) + "px")
      .style("top", (d.layerY) + "px")
  }

  ///event: on entering the edge
  edgeOver(evt) {
    let idStrings = evt.target.id.split('-');
    let movies = this._actorRepository.getMovieListbetweenActors(idStrings[0], idStrings[1], this.movies)
    let text = movies.map(m => m.title).join('<br/>');
    this.edgeTooltip.html(text);
    this.edgeTooltip.style("opacity", 1);

    evt.target.style.opacity = '0.75';
  }

  ///event: on leaving the edge
  edgeOut(evt) {
    this.edgeTooltip.html('');
    this.edgeTooltip.style("opacity", 0)
    evt.target.style.opacity = '0'
  }

  ///called from actor.service when user searches for an actor
  addOrSelectNewActor(actor: Actor) {
    let node = this.nodes.find(a => a.actor._id == actor._id);
    if (node == null) {
      this.addActor(actor, this.width / 2, this.height / 2, null);
    }
    this.selectNode(actor._id);
    this.createForceNetwork();
  }

  isSameEdge(sourceId1, targetId1, sourceId2, targetId2) {
    return (sourceId1 == sourceId2 && targetId1 == targetId2) || (sourceId1 == targetId2 && sourceId2 == targetId1)
  }

  findMissingActorsWithColabCount(movies: Movie[]) {
    let dict = {};
    for (let i = 0; i < movies.length; i++) {
      for (let j = 0; j < movies[i].actors.length; j++) {
        let id = movies[i].actors[j]
        if (dict[id] != null) {
          dict[id].count += 1
        }
        else {
          dict[id] = { count: 1 };
        }
      }
    }
    let actorsWithColabsFiltered = {};
    let isEmpty = true;
    for (var key in dict) {
      if (this.actors.find(a => key == a._id) == null) {
        actorsWithColabsFiltered[key] = dict[key];
        isEmpty = false;
      }
    }
    return isEmpty ? null : actorsWithColabsFiltered;
  }

  isSideEdge(e: any) {
    return e.source.parentActorId != e.target.actor._id && e.target.parentActorId != e.source.actor._id;
  }

  ///called from createForceNetwork, recreates edges
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

    //skeleton edges
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

  ///called from createForceNetwork, recreates nodes
  addAndStyleNodes() {
    var nodeEnter = this.g.selectAll("g.node")
      .data(this.nodes, (d: ActorNode) => { return d.actor._id })
      .enter()
      .append("g")
      .attr("class", "node")
      .on("click", this.clickNode.bind(this))
      .on("mouseover", this.nodeOver.bind(this))
      .on("mouseout", this.nodeOut.bind(this))
      .call(d3.drag().on("drag", this.dragged.bind(this)));

    nodeEnter.append("circle")
      .attr("r", (n: ActorNode) => Math.max(this.minNodeRadius, 5 * Math.sqrt(n.movieCount)))
      .style("fill", (n: ActorNode) => this.getColor(n));

    nodeEnter.append("text")
      .style("text-anchor", "middle")
      .attr("y", 2)
      .style("stroke-width", `${2 / this.zoomLevel}px`)
      .style("stroke-opacity", 0.9)
      .style("stroke-linecap", "round")
      .style("fill-opacity", 1.0)
      .style("stroke", "black")
      .style("font-size", `${12 / this.zoomLevel}px`)
      .text((d) => d.actor.name)
      .style("pointer-events", "none")

    nodeEnter.append("text")
      .style("text-anchor", "middle")
      .style("stroke-width", `${1 / this.zoomLevel}px`)
      .style("stroke-linecap", "round")
      .attr("y", 2)
      .style("fill", "white")
      .style("font-size", `${12 / this.zoomLevel}px`)
      .text((d) => d.actor.name)
      .style("pointer-events", "none")


    let selectedActors = this._actorSelection.getSelectedActors();
    this.svg.selectAll("g.node > circle")
      .style("stroke-width", (n: ActorNode) => {
        return this.isNodeSelected(selectedActors, n) ? "5px" : "2px";
      });

    this.svg.selectAll("g.node > circle")
      .style("stroke", (n: ActorNode) => {
        return this.isNodeSelected(selectedActors, n) ? this._actorSelection.getSelectedActorColor(n.actor) : "black";
      });
  }

  isNodeSelected(selectedActors, node) {
    return selectedActors.find(a => a._id == node.actor._id) != null
  }

  ///unified logic behind getting collor from color scheme
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

  ///event: when user changes the color scheme
  changeColors(e) {
    this.createColor();
    this.svg.selectAll("circle")
      .style("fill", (n: ActorNode) => this.getColor(n));
  }

  ///event: on being dragged
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

  ///called every itteration by d3. Keep this lightweight or app will lag
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

  ///reset button, called from actor.service
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

  ///skeleton button, called from actor.service
  showOrHideSkeleton(skeletonShown: boolean) {
    this.skeletonShown = skeletonShown;
    this.g.selectAll("g.skeleton line").style("opacity", (e) => skeletonShown ? 1 : 0)
  }
}
