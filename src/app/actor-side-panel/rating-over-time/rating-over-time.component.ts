import { Component, OnInit } from '@angular/core';
import * as d3 from 'd3';
import { ActorRepository } from 'src/app/actor.repository';
import { forkJoin } from 'rxjs';
import { Movie } from 'src/app/models/movie';
import { Actor } from 'src/app/models/actor';
import { ScaleLinear, tickStep } from 'd3';
import { ActorService } from 'src/app/actor.service';

@Component({
  selector: 'app-rating-over-time',
  templateUrl: './rating-over-time.component.html',
  styleUrls: ['./rating-over-time.component.scss']
})
export class RatingOverTimeComponent implements OnInit {
  private selectedActors: Actor[] = [];
  private actorMovies: Map<Actor, Movie[]> = new Map<Actor, Movie[]>();
  private actorGraphs: Map<Actor, ActorGraph> = new Map<Actor, ActorGraph>();
  private width = 800;
  private height = 400;
  private margin = { top: 20, right: 200, bottom: 30, left: 80 };
  private graph_width = this.width - this.margin.left - this.margin.right;
  private upper_graph_height = this.height / 2 - this.margin.top - this.margin.bottom;
  private bottom_graph_height = this.height / 2 - this.margin.top - this.margin.bottom;
  private xScale: ScaleLinear<number, number, never>;
  private xScaleElement: d3.Selection<any, any, any, any>;
  private yScaleRating: ScaleLinear<number, number, never>;
  private yScaleRatingElement: d3.Selection<any, any, any, any>;
  private legendElement: d3.Selection<any, any, any, any>;
  private yScaleRevenue: ScaleLinear<number, number, never>;
  private yScaleRevenueElement: d3.Selection<any, any, any, any>;
  private innerElement: d3.Selection<any, any, any, any>;
  private colorCounter: number = 0;
  private static readonly MAX_ACTORS = 2;

  constructor(private _actorRepository: ActorRepository, private _actorService: ActorService) { }

  movingAvg(data, amount) {
    return data.map((_, i, arr) => {
      let start = Math.max(0, i - amount)
      let subset = arr.slice(start, i + 1)
      let sum = subset.reduce((a, b) => a + b)
      return sum / subset.length
    })
  }

  updateActorGraphs(): void {
    this.selectedActors.forEach(actor =>{
      const birth = new Date(actor.birth, 0, 0);
      const age_div = +new Date(actor.birth + 100, 0, 0) - +new Date(actor.birth, 0, 0);
      const actorGraph = this.actorGraphs.get(actor);
      actorGraph.element.selectAll('g')
        .transition()
        .attr('transform', (m: MovieAveragePlot) => `translate(${this.xScale(100 * (+new Date(m.movie.year, m.movie.month, m.movie.day) - +birth) / age_div)}, ${this.upper_graph_height})`)
        .duration(1000)

      actorGraph.areaRating.x(m => this.xScale(100 * (+new Date(m.movie.year, m.movie.month, m.movie.day) - +birth) / age_div));
      actorGraph.areaRevenue.x(m => this.xScale(100 * (+new Date(m.movie.year, m.movie.month, m.movie.day) - +birth) / age_div));

      actorGraph.areaRating.y1(m => this.yScaleRating(m.avg_rating / 2));
      actorGraph.areaRevenue.y1(m => this.yScaleRevenue(m.avg_revenue) + this.upper_graph_height);


      actorGraph.topAreaGraphElement
        .transition()
        .attr('d', actorGraph.areaRating)
        .duration(1000);

      actorGraph.bottomAreaGraphElement
        .transition()
        .attr('d', actorGraph.areaRevenue)
        .duration(1000);

    });
  }

  appendActorGraph(actor: Actor): void {
    const actorMovies = this.actorMovies.get(actor);
    const birth = new Date(actor.birth, 0, 0);
    const age_div = +new Date(actor.birth + 100, 0, 0) - +new Date(actor.birth, 0, 0);
    const actorGraphElement = this.innerElement.append('g');

    const amount = 5;
    const moviesSorted = actorMovies.sort((a, b) => +new Date(a.year, a.month, a.day) - +new Date(b.year, b.month, b.day));
    const average_ratings = this.movingAvg(moviesSorted.map(m => m.vote_average), amount);
    const average_revenues = this.movingAvg(moviesSorted.map(m => m.revenue), amount);

    const plotPoints = moviesSorted.map((m, i) => new MovieAveragePlot(m, average_ratings[i], average_revenues[i]));

    const data = actorGraphElement.selectAll('g')
      .data(plotPoints)
      .join('g')
      .attr('transform', m => `translate(${this.xScale(100 * (+new Date(m.movie.year, m.movie.month, m.movie.day) - +birth) / age_div)}, ${this.upper_graph_height})`);

    this.colorCounter += 1;
    const index = this.colorCounter % d3.schemeSet2.length;
    const c = d3.color(d3.schemeSet2[index]);
    const mainColor = c.copy();
    const areaColor = c.copy();
    areaColor.opacity = 0.1;
    const stemColor = c.copy();
    stemColor.opacity = 0.75;
    const stemTopColor = c.copy().darker();

    data.append('line')
      .transition()
      .attr('y1', m => this.yScaleRating(m.movie.vote_average / 2) - this.upper_graph_height)
      .duration(1000)
      .attr('y2', this.yScaleRating(0) - this.upper_graph_height)
      .attr('stroke', stemColor.formatRgb())

    data.append('circle')
      .transition()
      .attr('cy', m => this.yScaleRating(m.movie.vote_average / 2) - this.upper_graph_height)
      .duration(1000)
      .attr('r', '3')
      .attr('fill', areaColor.formatRgb())
      .attr('stroke', stemTopColor.formatRgb())

    data.append('line')
      .transition()
      .attr('y2', m => this.yScaleRevenue(m.movie.revenue))
      .duration(1000)
      .attr('y1', this.yScaleRevenue(0))
      .attr('stroke', stemColor.formatRgb())

    data.append('circle')
      .transition()
      .attr('cy', m => this.yScaleRevenue(m.movie.revenue))
      .duration(1000)
      .attr('r', '3')
      .attr('fill', areaColor.formatRgb())
      .attr('stroke', stemTopColor.formatRgb());


    // Upper area
    const areaRating = d3.area<MovieAveragePlot>()
      .x(m => this.xScale(100 * (+new Date(m.movie.year, m.movie.month, m.movie.day) - +birth) / age_div))
      .y1(m => this.yScaleRating(m.avg_rating / 2))
      .y0(this.upper_graph_height)
      .curve(d3.curveBasis);
    const topAreaGraphElement = actorGraphElement.append("path")
      .datum(plotPoints)
      .attr("fill", areaColor.formatRgb())
      .attr("stroke", mainColor.formatRgb())
      .attr("stroke-width", 1.5)
      .attr('stroke-dasharray', 2)
      .attr("d", areaRating);

    // Bottom area
    const areaRevenue = d3.area<MovieAveragePlot>()
      .x(m => this.xScale(100 * (+new Date(m.movie.year, m.movie.month, m.movie.day) - +birth) / age_div))
      .y1(m => this.yScaleRevenue(m.avg_revenue) + this.upper_graph_height)
      .y0(this.upper_graph_height)
      .curve(d3.curveBasis)
    const bottomAreaGraphElement = actorGraphElement.append("path")
      .datum(plotPoints)
      .attr("fill", areaColor.formatRgb())
      .attr("stroke", mainColor.formatRgb())
      .attr("stroke-width", 1.5)
      .attr('stroke-dasharray', 2)
      .attr("d", areaRevenue);

      //  Update legend
    this.legendElement.append('rect')
      .attr('x', 20 + this.graph_width  )
    .attr('y',  30 * index)
    .attr('width', 20)
    .attr('height', 20)
    .attr('fill', mainColor.formatRgb())
    .attr('stroke', stemTopColor.formatRgb())
    this.legendElement.append('text')
      .attr('x', 20 + this.graph_width + 30)
      .attr('y',  30 * index + 10)
      .attr('width', 100)
      .attr('height', 20)
      .attr('text-anchor', 'start')
      .attr('fill', mainColor.formatRgb())
      .attr('align', 'center')
      .text(actor.name)

    this.actorGraphs.set(actor, new ActorGraph(
      actorGraphElement, 
      areaRating, 
      areaRevenue,
      topAreaGraphElement,
      bottomAreaGraphElement,
      plotPoints
      ));
  }

  deleteActorGraph(actor: Actor) {
    const graph = this.actorGraphs.get(actor).element;
    const instance = this;
    graph
      .attr("fill-opacity", 1)
      .attr("stroke-opacity", 1)
      .transition()
      .attr("fill-opacity", 0)
      .attr("stroke-opacity", 0)
      .duration(300)
      .remove();
  }

  deleteActorData(actor: Actor) {
    this.actorMovies.delete(actor);
    this.selectedActors.splice(0, 1);
    this.updateScales();
    this.updateActorGraphs();
  }

  AddActor(actor: Actor): void {
    if (this.selectedActors.find(a => a._id==actor._id) == null) {
      this.selectedActors.push(actor);
      forkJoin(this._actorRepository.getMovies(actor.movies)).subscribe(movies => {
        this.actorMovies.set(actor, movies);
        this.updateScales();
        this.appendActorGraph(actor);
        this.updateActorGraphs();
        if (this.selectedActors.length > RatingOverTimeComponent.MAX_ACTORS) {
          const actorToRemove = this.selectedActors[0];
          this.deleteActorGraph(actorToRemove);
          this.deleteActorData(actorToRemove);
        }
      });
    }
  }

  updateScales(): void { 

    const allMovies = this.selectedActors.map(a => this.actorMovies.get(a)).flat();
    const minYear = d3.min(this.selectedActors, a => d3.min(this.actorMovies.get(a), m => m.year - a.birth));
    const maxYear = d3.max(this.selectedActors, a => d3.max(this.actorMovies.get(a), m => m.year - a.birth));
    const maxRevenue = d3.max(allMovies, m => m.revenue);

    this.xScale.domain([minYear, maxYear]);
    // this.yScaleRevenue.domain([0, maxRevenue]);
    // // No need to update this one as it is clearly bounded
    // // this.yScaleRating.domain([
    // //   0,
    // //   Math.max(this.yScaleRating.domain()[1], maxRating)]
    // // );
    // console.log(Math.max(this.yScaleRevenue.domain()[1], maxRevenue))

    this.yScaleRevenue.domain([0, maxRevenue]);

    this.yScaleRevenueElement
      .transition().duration(1000)
      .call(d3.axisLeft(this.yScaleRevenue).ticks(5, '$,.0s'));

    this.xScaleElement
      .transition().duration(1000)
      .call(d3.axisBottom(this.xScale));

  }

  ngOnInit(): void {
    // Basic setup
    this.xScale = d3.scaleLinear()
      .domain([40, 40])
      .range([0, this.graph_width])

    this.yScaleRating = d3.scaleLinear()
      .domain([0, 5])
      .range([this.upper_graph_height, 0]);

    this.yScaleRevenue = d3.scaleLinear()
      .domain([0, 100000000])
      .range([0, this.bottom_graph_height]);

    const svg = d3.select('p#test').append('svg')
      .attr('width', this.width)
      .attr('height', this.height)
      .attr('font-family', 'sans-serif')
      .attr('font-size', '10')
      .attr('text-anchor', 'end');

    this.innerElement = svg.append('g')
      .attr('transform', `translate(${this.margin.left}, ${this.margin.top})`)

    const axes = svg.append('g')
      .attr('transform', `translate(${this.margin.left}, ${this.margin.top})`)

    this.legendElement = svg.append('g')
      .attr('transform', `translate(${this.margin.left}, ${this.margin.top})`)

    this.xScaleElement = axes.append('g')
      .attr('transform', `translate(0,${this.upper_graph_height})`)
      .attr('shape-rendering', 'geometricPrecision ')
      .call(d3.axisBottom(this.xScale));

    this.yScaleRatingElement = axes.append('g')
      .attr('transform', `translate(0,0)`)
      .attr('shape-rendering', 'geometricPrecision ')
      .call(d3.axisLeft(this.yScaleRating).ticks(5));

    this.yScaleRevenueElement = axes.append('g')
      .attr('transform', `translate(0,${this.upper_graph_height})`)
      .attr('shape-rendering', 'geometricPrecision ')
      .call(d3.axisLeft(this.yScaleRevenue).ticks(5, '$,.0s'));

    this._actorService.addActorSelectedHandler(this.actorSelected.bind(this))
  }

  actorSelected(evtdata) {
    this.AddActor(evtdata);
  }
}

class MovieAveragePlot {
  constructor(
    movie: Movie,
    avg_rating: number,
    avg_revenue: number
  ) { 
    this.movie = movie;
    this.avg_rating = avg_rating;
    this.avg_revenue = avg_revenue;
  }
  movie: Movie;
  avg_rating: number;
  avg_revenue: number;
}


class ActorGraph {
  constructor(
    element: d3.Selection<any, any, any, any>,
    areaRating: d3.Area<MovieAveragePlot>,
    areaRevenue: d3.Area<MovieAveragePlot>,
    topAreaGraphElement: d3.Selection<any, any, any, any>,
    bottomAreaGraphElement: d3.Selection<any, any, any, any>,
    dataPoints: MovieAveragePlot[]
  ) {
    this.element = element;
    this.areaRating = areaRating;
    this.areaRevenue = areaRevenue;
    this.topAreaGraphElement = topAreaGraphElement;
    this.bottomAreaGraphElement = bottomAreaGraphElement;
    this.dataPoints = dataPoints;
  }
  element: d3.Selection<any, any, any, any>;
  areaRating: d3.Area<MovieAveragePlot>;
  areaRevenue: d3.Area<MovieAveragePlot>;
  topAreaGraphElement: d3.Selection<any, any, any, any>;
  bottomAreaGraphElement: d3.Selection<any, any, any, any>;
  dataPoints: MovieAveragePlot[];
}
