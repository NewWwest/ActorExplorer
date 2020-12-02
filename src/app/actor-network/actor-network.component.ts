import { listLazyRoutes } from '@angular/compiler/src/aot/lazy_routes';
import { Component, OnInit } from '@angular/core';
import * as d3 from 'd3';
import { SimulationNodeDatum } from 'd3';
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
  startingActor = "Will Smith"
  actors: Actor[] = [];
  movies: Movie[] = [];
  nodes: ActorNode[] = [];
  edges: MovieLink[] = [];
  simulation: d3.Simulation<ActorNode, undefined>;

  edgeTooltip: any = null;
  svg: any = null;

  private nodeRadius = 10;
  private nodeColor = 'lime';
  private nodeHoverColor = 'green'

  private width = 500
  private height = 500

  constructor(private _actorRepository: ActorRepository,
    private _actorService: ActorService
  ) { }

  ngOnInit(): void {
    this.edgeTooltip = d3.select("#edge-tooltip")
    this.sizeSvg();

    this._actorRepository.getActorByName(this.startingActor).subscribe(actor => {
      this.actors.push(actor);
      this.importData(this.actors, this.movies);
      this.simulation = d3.forceSimulation(this.nodes);
      this.setupForceNetwork();
    }, (err) => {
      console.error(err);
    });
  }

  importData(actors: Actor[], movies: Movie[]) {
    actors.forEach(actor => {
      if (this.nodes.find(n => n.actor._id == actor._id) == null) {
        this.nodes.push(<ActorNode>{ actor: actor });
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
      .style("border", "1px solid black")
      .append("g")
  }

  setupForceNetwork() {
    

    this.simulation.nodes(this.nodes)
      // .force("link", d3.forceLink(this.edges))
      // .force("link", d3.forceLink(this.edges).strength( (link) => {
      //   return 0;
      // }))
      .force("collision", d3.forceCollide().radius(30))
      .force("charge", d3.forceManyBody().strength(-1))
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
      .style("stroke-width", (e) => `${e.movieIds.length}px`)
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
      .text((d) => (<any>d).actor.name)
      .style("pointer-events", "none")

    nodeEnter.append("text")
      .style("text-anchor", "middle")
      .attr("y", 2)
      .style("font-size", "8px")
      .text((d) => (<any>d).actor.name)
      .style("pointer-events", "none")
  }

  restartSimulation(): void {
    // this.importData(this.actors, this.movies);
    // this.simulation.nodes(this.nodes);
    // this.simulation
    //   .force('link', d3.forceLink(this.edges))
    this.simulation.alpha(0.1).restart();
  }

  addActorNode(a: Actor): ActorNode {
    var actorNode: ActorNode = this.nodes.find(node => node.actor._id == a._id);
    if (actorNode == null) {
      actorNode = { 
        actor: a,
      } as ActorNode;
      this.nodes.push(actorNode);
    }
    return actorNode;
  }

  addMovieLink(a1: Actor, a2: Actor, movie: Movie) : MovieLink {
    var movieLink: MovieLink = this.edges.find(link => {
      const s = link.source as ActorNode;
      const t = link.target as ActorNode;
      return (s.actor._id == a1._id || s.actor._id == a2._id) && (t.actor._id == a1._id || t.actor._id == a2._id) && (a1._id != a2._id) && (s.actor._id != t.actor._id)
    });
    
    
    if (movieLink == null) {
      console.log(`adding new movie link: ${movie.title} | ${a1.name} <=> ${a2.name}`)
      const node1 = this.addActorNode(a1);
      const node2 = this.addActorNode(a2);

      node2.x = node1.x;
      node2.y = node1.y;

      movieLink = {
        movieIds: [movie._id],
        movieTitles: [movie.title],
        width: 1,
        source: node1,
        target: node2
      } as MovieLink;
      this.setupForceNetwork();
      this.restartSimulation();

    } else {
      const movieId = movieLink.movieIds.find(id => movie._id == id);
      if (movieId == null) {
        console.log(`movie link exists: ${movie.title} | ${a1.name} <=> ${a2.name}`)
        movieLink.movieIds.push(movie._id);
        movieLink.movieTitles.push(movie.title);
        this.setupForceNetwork();
      }
    }
    this.edges.push(movieLink);

    return movieLink;
  }

  expandNode(e) {
    const actorId = e.target.__data__.actor._id;
    const node = this.nodes.find(a => a.actor._id == actorId)
    const actor = node.actor;

    this.nodes.forEach(n => {n.fx=null;n.fy=null})

    node.fx = node.x;
    node.fy = node.y;
    console.log('start')
    this._actorService.triggerActorSelectedHandlers(actor);
    this._actorRepository.getMoviesOfAnActor(actor._id).subscribe(movies => {
      movies.forEach(movie => {
        const actors: Observable<Actor>[] = [];
        movie.actors.forEach(id => {
          actors.push(this._actorRepository.getActorById(id));
        });
        forkJoin(actors).subscribe(actorList =>  {
          
          actorList.forEach(a => {
            this.addMovieLink(actor, a, movie);
          }) 
        })
      });
    }, (err) => {
      console.error(err);
    });

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


  isSameEdge(sourceId1, targetId1, sourceId2, targetId2) {
    return (sourceId1 == sourceId2 && targetId1 == targetId2) || (sourceId1 == targetId2 && sourceId2 == targetId1)
  }
}

interface ActorNode extends d3.SimulationNodeDatum {
  actor: Actor;
}
interface MovieLink extends d3.SimulationLinkDatum<SimulationNodeDatum> {
  width: number;
  movieIds: string[];
  movieTitles: string[];
}