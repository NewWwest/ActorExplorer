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
  nodeRadius = 20;

  startingActor = "Zac Efron"
  actors: Actor[] = [];
  movies: Movie[] = [];
  nodes: ActorNode[] = [];
  edges: MovieLink[] = [];

  edgeTooltip: any = null;
  svg: any = null;

  private nodeColor = 'lime';
  private nodeHoverColor = 'green'

  private width = 500
  private height = 500
  simulation: d3.Simulation<ActorNode, MovieLink>;

  constructor(private _actorRepository: ActorRepository,
    private _actorService: ActorService
  ) { }

  ngOnInit(): void {
    this.edgeTooltip = d3.select("#edge-tooltip")
    this.sizeSvg();

    this._actorRepository.getActorByName(this.startingActor).subscribe(actor => {
      this.actors.push(actor);
      this.createForceNetwork();
    }, (err) => {
      console.error(err);
    });
    this._actorService.addSearchForActorHandler(this.addOrSelectNewActor.bind(this));
  }

  importData(actors: Actor[], movies: Movie[]) {
    if (this.simulation)
      this.simulation.stop()
    actors.forEach(actor => {
      let node = this.nodes.find(n => n.actor._id == actor._id);
      if (node != null) {
        node.nodeAge++;
      } else {
        this.nodes.push({
          actor: actor,
          nodeAge: 0,
          isSelected: false
        });
      }
    });
    movies.forEach(movie => {
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
              target: a2
            })
          }
        }
      }
    });
  }

  private sizeSvg(): void {
    this.svg = d3.select("svg");
    this.svg.attr("width", this.width)
      .attr("height", this.height)
      .style("border", "1px solid black");
  }

  createForceNetwork() {
    this.importData(this.actors, this.movies);
    this.simulation = d3.forceSimulation<ActorNode, MovieLink>(this.nodes)
      .force('collide', d3.forceCollide().radius(2 * this.nodeRadius))
      .force("link", d3.forceLink(this.edges))
      .force("charge", d3.forceManyBody().strength(-10))
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
      .attr("class", "core")
      .style("stroke-width", (e) => `${e.width}px`)
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


    var nodeEnter = d3.select("svg").selectAll("g.node")
      .data(this.nodes, (d: ActorNode) => { return d.actor._id })
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
      .text((d) => d.actor.name)
      .style("pointer-events", "none")

    nodeEnter.append("text")
      .style("text-anchor", "middle")
      .attr("y", 2)
      .style("font-size", "8px")
      .text((d) => d.actor.name)
      .style("pointer-events", "none")

    d3.select("svg").selectAll("g").sort((l: any, r: any) => {
      if (l.actor == null && r.actor != null) {
        return -1;
      }
      if (l.actor != null && r.actor == null) {
        return 1;
      }
      return 0;
    })
    this.simulation.restart();
  }

  expandNode(e) {
    let actorId = e.target.__data__.actor._id;
    let actor = this.actors.find(a => a._id == actorId);
    this.selectNode(actorId);
    this._actorService.triggerActorSelectedHandlers(actor);
    this._actorRepository.getMoviesOfAnActor(actor._id).subscribe(movies => {
      for (let i = 0; i < movies.length; i++) {
        if (this.movies.find(temp => temp._id == movies[i]._id) == null) {
          this.movies.push(movies[i])
        }
      }
      let toBeAdded = this.selectActorIdsToAdd(movies);
      if (toBeAdded.length > 0) {
        let observables: Observable<Actor>[] = toBeAdded.map(id => this._actorRepository.getActorById(id));
        forkJoin(observables).subscribe(x => {
          this.actors = this.actors.concat(x);
          this.createForceNetwork();
        });
      }
      else {
        this.createForceNetwork();
      }
    }, (err) => {
      console.error(err);
    });
  }

  selectNode(actorId: string) {
    this.nodes.forEach(n => {
      if (n.actor._id == actorId) {
        n.isSelected = true;
        n.nodeAge = 0;
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
    evt.target.style['fill'] = this.nodeColor;
    evt.target.style['stroke'] = 'black';
    evt.target.style['stroke-width'] = '1px';
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
      this.selectNode(actor._id)
      this.createForceNetwork();
    }
    else {
      this.actors.push(actor);
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

  updateNetwork() {
    d3.select("svg").selectAll("line")
      .attr("x1", function (d: any) { return d.source.x })
      .attr("y1", function (d: any) { return d.source.y })
      .attr("x2", function (d: any) { return d.target.x })
      .attr("y2", function (d: any) { return d.target.y });

    d3.select("svg").selectAll(".core")
      .style("opacity", (e: any) => {
        return (Math.min(Math.max(1.4 - e.source.nodeAge * 0.2, 0.1), Math.max(1.4 - e.target.nodeAge * 0.2, 0.1)))
      });;

    d3.select("svg").selectAll("g.node")
      .attr("transform", (n: ActorNode) => {
        return "translate(" + n.x + "," + n.y + ")"
      })
      .style("opacity", (n: ActorNode) => {
        return Math.max(1.4 - n.nodeAge * 0.2, 0.1);
      });

    d3.select("svg").selectAll("g.node > circle")

      .style("stroke-width", (n: ActorNode) => n.isSelected ? '3px' : '1px');
  }


  isSameEdge(sourceId1, targetId1, sourceId2, targetId2) {
    return (sourceId1 == sourceId2 && targetId1 == targetId2) || (sourceId1 == targetId2 && sourceId2 == targetId1)
  }

  selectActorIdsToAdd(movies: Movie[]): string[] {
    let dict = {};
    for (let i = 0; i < movies.length; i++) {
      for (let j = 0; j < movies[i].actors.length; j++) {
        let id = movies[i].actors[j]
        if (dict[id] == null) {
          dict[id] += 1;
        }
        else {
          dict[id] = 1;
        }
      }
    }
    let toBeSorted = Object.keys(dict).map(k => { return { actorId: k, count: dict[k] } });
    toBeSorted.sort((a, b) => a.count < b.count ? -1 : (a.count > b.count ? 1 : 0))

    let toBeAdded = [];
    for (let i = 0; i < toBeSorted.length; i++) {
      if (this.actors.find(a => toBeSorted[i].actorId == a._id) == null) {
        toBeAdded.push(toBeSorted[i].actorId);
        if (toBeAdded.length >= this.expandConstant)
          break;
      }
    }
    return toBeAdded;
  }
}

interface ActorNode extends d3.SimulationNodeDatum {
  actor: Actor;
  nodeAge: number;
  isSelected: boolean;
}

interface MovieLink extends d3.SimulationLinkDatum<ActorNode> {
  width: number;
  movieIds: string[];
  movieTitles: string[];
}