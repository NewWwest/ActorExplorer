import { Component, OnInit } from '@angular/core';
import * as d3 from 'd3';
import { ActorRepository } from 'src/app/actor.repository';
import { forkJoin } from 'rxjs';
import { Movie } from 'src/app/models/movie';
import { Actor } from 'src/app/models/actor';
import { ScaleLinear, tickStep } from 'd3';
import { ActorService } from 'src/app/actor.service';
import { ActorSelection } from 'src/app/actor.selection';

@Component({
  selector: 'app-rating-over-time',
  templateUrl: './rating-over-time.component.html',
  styleUrls: ['./rating-over-time.component.css']
})
export class RatingOverTimeComponent implements OnInit {

  constructor(private _actorService: ActorService, private _actorSelection:  ActorSelection) { }

  private actorGraphs: Map<Actor, ActorGraph> = new Map<Actor, ActorGraph>();
  private width = 800;
  private height = 400;
  private margin = { top: 10, right: 200, bottom: 10, left: 80 };
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

  private svg: d3.Selection<SVGSVGElement, unknown, HTMLElement, any>;

  movingAverageLeft(data: number[], amount: number): number[] {
    return data.map((_, i, arr) => {
      const start = Math.max(0, i - amount);
      const end = Math.min(i + 1, arr.length);
      const subset = arr.slice(start, end);
      const sum = subset.reduce((a, b) => a + b);
      return sum / subset.length;
    });
  }

  updateActorGraphs(transitionTimeMultiplier = 1): void {
    this._actorSelection.getSelectedActors().forEach(actor =>{
      if (this.actorGraphs.has(actor)) {
        const birth = new Date(actor.birth, 0, 0);
        const ageDiff = +new Date(actor.birth + 100, 0, 0) - +new Date(actor.birth, 0, 0);
        const actorGraph = this.actorGraphs.get(actor);
        actorGraph.element.selectAll('g')
          .data(actorGraph.dataPoints)
          .transition()
          .attr('transform', (m: MovieAveragePlot) => `translate(${this.xScale(100 * (+new Date(m.movie.year, m.movie.month, m.movie.day) - +birth) / ageDiff)}, ${this.upper_graph_height})`)
          .attr('opacity', (m: MovieAveragePlot) => +m.in_range)
          .duration(transitionTimeMultiplier * 1000);

        actorGraph.c2
          .transition()
          .attr('cy', (m: MovieAveragePlot) => this.yScaleRevenue(+m.in_range * m.movie.revenue))
          .duration(transitionTimeMultiplier * 1000);

        actorGraph.l2
          .transition()
          .attr('y2', (m: MovieAveragePlot) => this.yScaleRevenue(+m.in_range * m.movie.revenue))
          .duration(transitionTimeMultiplier * 1000);


        actorGraph.areaRating.x(m => this.xScale(100 * (+new Date(m.movie.year, m.movie.month, m.movie.day) - +birth) / ageDiff));
        actorGraph.areaRevenue.x(m => this.xScale(100 * (+new Date(m.movie.year, m.movie.month, m.movie.day) - +birth) / ageDiff));

        actorGraph.areaRating.y1(m => this.yScaleRating(+m.in_range * m.avg_rating / 2));
        actorGraph.areaRevenue.y1(m => this.yScaleRevenue(+m.in_range * m.avg_revenue) + this.upper_graph_height);


        actorGraph.topAreaGraphElement
          .transition()
          .attr('d', actorGraph.areaRating)
          .duration(transitionTimeMultiplier * 1000);

        actorGraph.bottomAreaGraphElement
          .transition()
          .attr('d', actorGraph.areaRevenue)
          .duration(transitionTimeMultiplier * 1000);
      }
    });
  }

  appendActorGraph(actor: Actor): void {
    const actorMovies = this._actorSelection.getSelectedActorMovies(actor);
    const birth = new Date(actor.birth, 0, 0);
    const ageDiff = +new Date(actor.birth + 100, 0, 0) - +new Date(actor.birth, 0, 0);
    const actorGraphElement = this.innerElement.append('g');

    const amount = 5;
    const moviesSorted = actorMovies.sort((a, b) => +new Date(a.year, a.month, a.day) - +new Date(b.year, b.month, b.day));
    const averageRatings = this.movingAverageLeft(moviesSorted.map(m => m.vote_average), amount);
    const averageRevenues = this.movingAverageLeft(moviesSorted.map(m => m.revenue), amount);

    const plotPoints = moviesSorted.map((m, i) => new MovieAveragePlot(m, averageRatings[i], averageRevenues[i]));

    const c = this._actorSelection.getSelectedActorColor(actor);
    const mainColor = c.copy();
    const areaColor = c.copy();
    areaColor.opacity = 0.1;
    const stemColor = c.copy();
    stemColor.opacity = 0.75;
    const stemTopColor = c.copy().darker();

    // Upper area
    const areaRating = d3.area<MovieAveragePlot>()
      .x(m => this.xScale(100 * (+new Date(m.movie.year, m.movie.month, m.movie.day) - +birth) / ageDiff))
      .y1(m => this.yScaleRating(m.avg_rating / 2))
      .y0(this.upper_graph_height)
      .curve(d3.curveBasis);
    const topAreaGraphElement = actorGraphElement.append('path')
      .datum(plotPoints)
      .attr('fill', areaColor.formatRgb())
      .attr('stroke', mainColor.formatRgb())
      .attr('stroke-width', 1.5)
      .attr('stroke-dasharray', 2)
      .attr('d', areaRating);

    // Bottom area
    const areaRevenue = d3.area<MovieAveragePlot>()
      .x(m => this.xScale(100 * (+new Date(m.movie.year, m.movie.month, m.movie.day) - +birth) / ageDiff))
      .y1(m => this.yScaleRevenue(m.avg_revenue) + this.upper_graph_height)
      .y0(this.upper_graph_height)
      .curve(d3.curveBasis)
    const bottomAreaGraphElement = actorGraphElement.append('path')
      .datum(plotPoints)
      .attr('fill', areaColor.formatRgb())
      .attr('stroke', mainColor.formatRgb())
      .attr('stroke-width', 1.5)
      .attr('stroke-dasharray', 2)
      .attr('d', areaRevenue);


    const Tooltip = d3.select('#movie-tooltip')

    const stemOver = (_, d: MovieAveragePlot) => {
      Tooltip
        .html(`${d.movie.title} (${d.movie.year})`)
        .style('opacity', 1);
    }

    const stemMove = (event) => {
      Tooltip
        .style('left', (event.layerX + 20) + 'px')
        .style('top', (event.layerY) + 'px')
    }

    const stemOut = (_) => {
      Tooltip
        .style('left',  '0px')
        .style('top', '0px')
        .style('opacity', 0)
        .html('');
    }

    const data = actorGraphElement.selectAll('g')
      .data(plotPoints)
      .join('g')
      .attr('transform', m => `translate(${this.xScale(100 * (+new Date(m.movie.year, m.movie.month, m.movie.day) - +birth) / ageDiff)}, ${this.upper_graph_height})`)
      .on('mouseover', stemOver)
      .on('mousemove', stemMove)
      .on('mouseout', stemOut);






    data.append('line')
      // .attr('id', "topline")
      .transition()
      .attr('y1', m => this.yScaleRating(m.movie.vote_average / 2) - this.upper_graph_height)
      .duration(1000)
      .attr('y2', this.yScaleRating(0) - this.upper_graph_height)
      .attr('stroke', stemColor.formatRgb());

    data.append('circle')
      // .attr('id', "topcircle")
      .transition()
      .attr('cy', m => this.yScaleRating(m.movie.vote_average / 2) - this.upper_graph_height)
      .duration(1000)
      .attr('r', '4')
      .attr('fill', areaColor.formatRgb())
      .attr('stroke', stemTopColor.formatRgb());


    let l2 = data.append('line')
      // .attr('id', "botline")
      .attr('y2', m => this.yScaleRevenue(m.movie.revenue))
      .attr('y1', this.yScaleRevenue(0))
      .attr('stroke', stemColor.formatRgb());

    let c2 = data.append('circle')
      // .attr('id', "botcircle")
      .attr('cy', m => this.yScaleRevenue(m.movie.revenue))
      .attr('r', '4')
      .attr('fill', areaColor.formatRgb())
      .attr('stroke', stemTopColor.formatRgb());


      //  Update legend
    const legendGroup = this.legendElement.append('g')
      .attr('transform', `translate(${20 + this.graph_width}, ${30 * this.legendElement.selectChildren('g').size()})`)


    legendGroup.append('rect')
    .attr('width', 20)
    .attr('height', 20)
    .attr('fill', mainColor.formatRgb())
    .attr('stroke', stemTopColor.formatRgb())
    legendGroup.append('text')
      .attr('x',  30)
      .attr('y',  10)
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
      l2,
      c2,
      legendGroup,
      plotPoints,
      c));
  }

  deleteActorGraph(actor: Actor) {
    const graph = this.actorGraphs.get(actor).element;
    graph
      .attr('fill-opacity', 1)
      .attr('stroke-opacity', 1)
      .transition()
      .attr('fill-opacity', 0)
      .attr('stroke-opacity', 0)
      .duration(300)
      .remove();
  }

  updateScales(transitionTimeMultiplier = 1): void {
    const selectedActors = this._actorSelection.getSelectedActors();
    const allMovies = selectedActors.filter(a => this.actorGraphs.has(a)).map(a => this.actorGraphs.get(a).dataPoints).flat();

    const minYear = d3.min(
      selectedActors.filter(a => this.actorGraphs.has(a)),
      a => d3.min(
        this.actorGraphs.get(a).dataPoints.filter(m => m.in_range),
        m => (m.movie.year - a.birth)));

    const maxYear = d3.max(
      selectedActors.filter(a => this.actorGraphs.has(a)),
      a => d3.max(
        this.actorGraphs.get(a).dataPoints.filter(m => m.in_range),
        m => (m.movie.year - a.birth)));

    const maxRevenue = d3.max(allMovies.filter(m => m.in_range), m => m.movie.revenue);

    this.xScale.domain([minYear, maxYear]);

    if (maxRevenue) {
      this.yScaleRevenue.domain([0, maxRevenue]);
    }
    this.yScaleRevenueElement
      .transition().duration(transitionTimeMultiplier * 1000)
      .call(d3.axisLeft(this.yScaleRevenue).ticks(5, '$,.0s'));

    this.xScaleElement
      .transition().duration(transitionTimeMultiplier * 1000)
      .call(d3.axisBottom(this.xScale));

  }

  updateLegend(): void {
    this.legendElement
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

    const svg = d3.select('p#rating').append('svg')
      .attr('width', this.width)
      .attr('height', this.height)
      .attr('font-family', 'sans-serif')
      .attr('font-size', '10')
      .attr('text-anchor', 'end');
    this.svg = svg;

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




    // this._actorService.addActorSelectedHandler(this.actorSelected.bind(this));
    this._actorService.addTimeRangeHandler(this.timeRangeChanged.bind(this));
    this._actorService.addActorSelectionChangedHandler(this.syncActors.bind(this));
  }

  syncActors(): void {
      // Add new actors
      this._actorSelection.getSelectedActors().forEach(actor => {
        if (!this.actorGraphs.has(actor)) {
          this.appendActorGraph(actor);
        }
      });

      // Remove actors no longer in selection
      this.actorGraphs.forEach((_, actor) => {
        if (!this._actorSelection.hasActor(actor)) {
          this.deleteActorGraph(actor);
          this.actorGraphs.delete(actor);
        }
      });
  }

  // actorSelected(evtdata) {
  //   this.AddActor(evtdata);
  // }

  timeRangeChanged(leftBound, rightBound) {
    this._actorSelection.getSelectedActors().forEach(actor => {
      this.actorGraphs.get(actor).dataPoints.forEach(moviePoint => {
        const year = moviePoint.movie.year;
        if (year > rightBound || year < leftBound) {
          moviePoint.in_range = false;
        } else {
          moviePoint.in_range = true;
        }
      });
    });
    this.updateScales(0.15);
    this.updateActorGraphs(0.15);
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
    this.in_range = true;
  }
  movie: Movie;
  avg_rating: number;
  avg_revenue: number;
  in_range: boolean;
}


class ActorGraph {
  constructor(
    element: d3.Selection<any, MovieAveragePlot, any, any>,
    areaRating: d3.Area<MovieAveragePlot>,
    areaRevenue: d3.Area<MovieAveragePlot>,
    topAreaGraphElement: d3.Selection<any, any, any, any>,
    bottomAreaGraphElement: d3.Selection<any, any, any, any>,
    l2: d3.Selection<any, any, any, MovieAveragePlot>,
    c2: d3.Selection<any, any, any, MovieAveragePlot>,
    legendElement: d3.Selection<any, any, any, any>,
    dataPoints: MovieAveragePlot[],
    baseColor: d3.RGBColor | d3.HSLColor
  ) {
    this.element = element;
    this.areaRating = areaRating;
    this.areaRevenue = areaRevenue;
    this.topAreaGraphElement = topAreaGraphElement;
    this.bottomAreaGraphElement = bottomAreaGraphElement;
    this.dataPoints = dataPoints;
    this.baseColor = baseColor;
    this.l2 = l2;
    this.c2 = c2;
    this.legendElement = legendElement;
  }
  element: d3.Selection<any, any, any, any>;
  areaRating: d3.Area<MovieAveragePlot>;
  areaRevenue: d3.Area<MovieAveragePlot>;
  topAreaGraphElement: d3.Selection<any, any, any, any>;
  bottomAreaGraphElement: d3.Selection<any, any, any, any>;
  dataPoints: MovieAveragePlot[];
  baseColor: d3.RGBColor | d3.HSLColor;
  l2: d3.Selection<any, any, any, MovieAveragePlot>;
  c2: d3.Selection<any, any, any, MovieAveragePlot>;
  legendElement: d3.Selection<any, any, any, any>;
}
