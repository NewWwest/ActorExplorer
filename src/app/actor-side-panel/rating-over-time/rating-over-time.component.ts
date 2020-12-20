import { Component, OnInit } from '@angular/core';
import * as d3 from 'd3';
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
  private margin = { top: 5, right: 120, bottom: 5, left: 70 };
  private graphWidth = this.width - this.margin.left - this.margin.right;
  private upperGraphHeight = this.height / 2 - this.margin.top - this.margin.bottom;
  private bottomGraphHeight = this.height / 2 - this.margin.top - this.margin.bottom;

  // These are quick references to elements so we can update them easily
  // Note that this particular component was made before any of the advanced d3 knowledge
  // was digested, so this graph does not get updated via enter/update/exit methods and contains
  // some questionable design decisions
  private xScale: ScaleLinear<number, number, never>;
  private xScaleElement: d3.Selection<any, any, any, any>;
  private yScaleRating: ScaleLinear<number, number, never>;
  private yScaleRatingElement: d3.Selection<any, any, any, any>;
  private yScaleRevenue: ScaleLinear<number, number, never>;
  private yScaleRevenueElement: d3.Selection<any, any, any, any>;
  private innerElement: d3.Selection<any, any, any, any>;


  // Assign and add all the basic elements in the init
  ngOnInit(): void {
    // Basic setup
    this.xScale = d3.scaleLinear()
      .domain([40, 40])
      .range([0, this.graphWidth])

    this.yScaleRating = d3.scaleLinear()
      .domain([0, 10])
      .range([this.upperGraphHeight, 0]);

    this.yScaleRevenue = d3.scaleLinear()
      .domain([0, 100000000])
      .range([0, this.bottomGraphHeight]);

    const svg = d3.select('p#rating').append('svg')
      .attr('viewBox', `0 0 ${this.width} ${this.height}`)
      .attr('font-family', 'sans-serif')
      .attr('font-size', '10')
      .attr('text-anchor', 'end');

    this.innerElement = svg.append('g')
      .attr('transform', `translate(${this.margin.left}, ${this.margin.top})`)

    const axes = svg.append('g')
      .attr('transform', `translate(${this.margin.left}, ${this.margin.top})`)


    this.xScaleElement = axes.append('g')
      .attr('transform', `translate(0,${this.upperGraphHeight})`)
      .attr('shape-rendering', 'geometricPrecision ')
      .call(d3.axisBottom(this.xScale)
        .tickFormat((val, index) => (index > 0) ? val.toLocaleString() : '')
      );

    this.xScaleElement.append('text')
      .text("Age (years)")
      .attr('fill', 'black')
      .attr('transform', `translate(${1.1 * this.graphWidth}, ${0})scale(1.3,1.3)`)
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'central');

    this.yScaleRatingElement = axes.append('g')
      .attr('transform', `translate(0,0)`)
      .attr('shape-rendering', 'geometricPrecision ')
      .call(d3.axisLeft(this.yScaleRating).ticks(5));

    this.yScaleRatingElement.append('text')
      .text("Rating")
      .attr('fill', 'black')
      .attr('transform', `translate(${-50}, ${1.5 * this.upperGraphHeight - this.upperGraphHeight})rotate(-90)scale(1.3,1.3)`)
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'central');

    this.yScaleRevenueElement = axes.append('g')
      .attr('transform', `translate(0,${this.upperGraphHeight})`)
      .attr('shape-rendering', 'geometricPrecision ')
      .call(d3.axisLeft(this.yScaleRevenue)
        .ticks(5)
        .tickFormat((val, index) => index > 0 ? (val.valueOf() / 1000000).toLocaleString() + 'M' : ''));

    this.yScaleRevenueElement.append('text')
      .text("Revenue ($)")
      .attr('fill', 'black')
      .attr('transform', `translate(${-50}, ${1.5 * this.bottomGraphHeight - this.bottomGraphHeight})rotate(-90)scale(1.3,1.3)`)
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'central');


    this._actorService.addTimeRangeHandler(this.timeRangeChanged.bind(this));
    this._actorService.addActorSelectionChangedHandler(this.syncActors.bind(this));
  }


  // Method to calculate the moving average of some array given some points "in the past"
  // The 'amount' determines how many points are taken into consideration
  movingAverageLeft(data: number[], amount: number): number[] {
    return data.map((_, i, arr) => {
      const start = Math.max(0, i - amount);
      const end = Math.min(i + 1, arr.length);
      const subset = arr.slice(start, end);
      const sum = subset.reduce((a, b) => a + b);
      return sum / subset.length;
    });
  }


  // Updates the stem plots and the area graphs with new data
  // If some data point is not in range of the movie time line selector, it gets zeroed out on the y-axis
  // The transitionTimeMultiplier makes the transition take longer.
  updateActorGraphs(transitionTimeMultiplier = 1): void {
    this._actorSelection.getSelectedActors().forEach(actor =>{
      if (this.actorGraphs.has(actor)) {
        // Actor age calculation using dates
        const birth = new Date(actor.birth, 0, 0);
        // This "ageDiff" is used so we can show "years" on the x-axis, while still being able to get intermediate positions from the more
        // accurate movie release dates (which also have month and day). This helps a bit with clutter.
        const ageDiff = +new Date(actor.birth + 100, 0, 0) - +birth;
        const actorGraph = this.actorGraphs.get(actor);
        actorGraph.element.selectAll('g')
          .data(actorGraph.dataPoints)
          .transition()
          .attr('transform', (m: MovieAveragePlot) => `translate(${this.xScale(100 * (+new Date(m.movie.year, m.movie.month, m.movie.day) - +birth) / ageDiff)}, ${this.upperGraphHeight})`)
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

        actorGraph.areaRating.y1(m => this.yScaleRating(+m.in_range * m.avg_rating));
        actorGraph.areaRevenue.y1(m => this.yScaleRevenue(+m.in_range * m.avg_revenue) + this.upperGraphHeight);


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

  // Adds an actor graph for the given actor. 
  // Creates all the stems and area graphs and assigns the proper colors.
  // Also hooks up the tooltip
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
      .y1(m => this.yScaleRating(m.avg_rating))
      .y0(this.upperGraphHeight)
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
      .y1(m => this.yScaleRevenue(m.avg_revenue) + this.upperGraphHeight)
      .y0(this.upperGraphHeight)
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
      .attr('transform', m => `translate(${this.xScale(100 * (+new Date(m.movie.year, m.movie.month, m.movie.day) - +birth) / ageDiff)}, ${this.upperGraphHeight})`)
      .on('mouseover', stemOver)
      .on('mousemove', stemMove)
      .on('mouseout', stemOut);

    data.append('line')
      .transition()
      .attr('y1', m => this.yScaleRating(m.movie.vote_average) - this.upperGraphHeight)
      .duration(1000)
      .attr('y2', this.yScaleRating(0) - this.upperGraphHeight)
      .attr('stroke', stemColor.formatRgb());

    data.append('circle')
      .transition()
      .attr('cy', m => this.yScaleRating(m.movie.vote_average) - this.upperGraphHeight)
      .duration(1000)
      .attr('r', '4')
      .attr('fill', areaColor.formatRgb())
      .attr('stroke', stemTopColor.formatRgb());

    // Only store the revenue-related selections since these need to rescale
    // This needs to be refactored and be made modular.
    const l2 = data.append('line')
      .attr('y2', m => this.yScaleRevenue(m.movie.revenue))
      .attr('y1', this.yScaleRevenue(0))
      .attr('stroke', stemColor.formatRgb());

    const c2 = data.append('circle')
      .attr('cy', m => this.yScaleRevenue(m.movie.revenue))
      .attr('r', '4')
      .attr('fill', areaColor.formatRgb())
      .attr('stroke', stemTopColor.formatRgb());

    this.actorGraphs.set(actor, new ActorGraph(
      actorGraphElement,
      areaRating,
      areaRevenue,
      topAreaGraphElement,
      bottomAreaGraphElement,
      l2,
      c2,
      plotPoints,
      c));
  }


  // Removes an actor graph for the given actor
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

  // Updates the scales of the graph, based on the new data bounds
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

    this.xScale.domain([minYear - 1, maxYear + 1]);

    if (maxRevenue) {
      this.yScaleRevenue.domain([0, maxRevenue]);
    }
    this.yScaleRevenueElement
      .transition().duration(transitionTimeMultiplier * 1000)
      .call(d3.axisLeft(this.yScaleRevenue)
        .ticks(5)
        .tickFormat((val, index) => index > 0 ?  (val.valueOf() / 1000000).toLocaleString() + 'M' : '')
      );

    this.xScaleElement
      .transition().duration(transitionTimeMultiplier * 1000)
      .call(d3.axisBottom(this.xScale)
        .tickFormat((val, index) => (index > 0) ? val.toLocaleString() : '')
      );
  }


  // Checks for new actors and updates the graphs accordingly
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

  // Callback for when the time range changes
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

// Wrapper interface for storing the moving average points and data needed for plotting
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
  movie: Movie; // The movie
  avg_rating: number; // Corresponding moving average at that point for rating
  avg_revenue: number; // Corresponding moving average at that point for revenue
  in_range: boolean;  // Whether the movie is in the range of the movie time line range selector
}

// Interface used for storing an actor graph, it mostly contains selections to the relevant elements for easy access
// It also contains the data array and the graph's color, though the latter is redundant since color gets stored in the selection anyway
class ActorGraph {
  constructor(
    element: d3.Selection<any, MovieAveragePlot, any, any>,
    areaRating: d3.Area<MovieAveragePlot>,
    areaRevenue: d3.Area<MovieAveragePlot>,
    topAreaGraphElement: d3.Selection<any, any, any, any>,
    bottomAreaGraphElement: d3.Selection<any, any, any, any>,
    l2: d3.Selection<any, any, any, MovieAveragePlot>,
    c2: d3.Selection<any, any, any, MovieAveragePlot>,
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
}
