import { Component, OnInit } from '@angular/core';
import * as d3 from 'd3';
import { NumberValue, thresholdFreedmanDiaconis } from 'd3';
import { forkJoin } from 'rxjs';
import { tap, map, mergeMap } from 'rxjs/operators';
import { ActorRepository } from 'src/app/actor.repository';
import { ActorSelection } from 'src/app/actor.selection';
import { ActorService } from 'src/app/actor.service';
import { Actor } from 'src/app/models/actor';
import { Movie } from 'src/app/models/movie';

@Component({
  selector: 'app-radar-chart',
  templateUrl: './radar-chart.component.html',
  styleUrls: ['./radar-chart.component.scss']
})
export class RadarChartComponent implements OnInit {

  constructor(private _actorRepository: ActorRepository, private _actorService: ActorService, private _actorSelection: ActorSelection) { }

  private width = 400;
  private height = 400;
  private margin = { top: 40, right: 120, bottom: 80, left: 120 };
  private skeleton: d3.Selection<any, any, any, any>;
  private radarChart: d3.Selection<any, any, any, any>;
  private axes: Axis<number, number>[] = [];
  private gridCount = 5;


  ngOnInit(): void {
    const fullWidth = this.width + this.margin.left + this.margin.right;
    const fullHeight = this.height + this.margin.top + this.margin.bottom;
    const armLength = Math.min(this.width, this.height) / 2;

    // - Q: Is the actor a solo star?
    //   A: Portion of movies where actor has highest total revenue of cast
    this.axes.push({label: "Top Star in Cast", scale: d3.scaleLinear().domain([0, 1]).range([0, armLength]), tickFormat: null});
    
    // - Q: Does the actor often work with the same people?
    //   A: Collaboration count averaged across actors
    this.axes.push({ label: "Recurring Collaborators", scale: d3.scaleLinear().domain([1, 3]).range([0, armLength]), tickFormat: null});
    
    // - Q: How many actors does the actor collaborate with on average per movie?
    //   A: Average collaborators per movie
    this.axes.push({ label: "Avg. Movie Cast Size", scale: d3.scaleLinear().domain([0, 8]).range([0, armLength]), tickFormat: null});    // domain is "Guesstimate"
    
    // - Q: Does the actor mostly work with well-known actors?
    //   A: Average revenue of all collaborators excluding self
    this.axes.push({ label: "Avg. Collaborator Revenue", scale: d3.scaleLinear().domain([0, 200000000]).range([0, armLength]), tickFormat: (val, index) => index > 0 ? (val.valueOf() / 1000000).toLocaleString() + 'M' : ''});   // domain is "Guesstimate"
    
    // - Q: Does the actor mostly work with experienced people?
    //   A: Average movie count of all collaborators excluding self
    this.axes.push({ label: "Avg. Collaborator Movies", scale: d3.scaleLinear().domain([0, 60]).range([0, armLength]), tickFormat: null});    // domain is "Guesstimate"

    const axisCount = this.axes.length;
    const svg = d3.select('p#radar').append('svg')
      .attr('viewBox', `0 0 ${fullWidth} ${fullHeight}`);


    this.radarChart = svg.append('g');

    const createAxis = (i) => (s) => d3.axisLeft(this.axes[i].scale)
      .tickValues(d3.range(
        this.axes[i].scale.domain()[0],
        this.axes[i].scale.domain()[1] + (this.axes[i].scale.domain()[1] - this.axes[i].scale.domain()[0]) / this.gridCount,
        (this.axes[i].scale.domain()[1] - this.axes[i].scale.domain()[0]) / this.gridCount
        ))
    .tickFormat(this.axes[i].tickFormat==null ? d3.format(',.2') : this.axes[i].tickFormat)
    .tickSizeInner(0)
    .tickSizeOuter(0)
    (s);


    // Initial skeleton
    this.skeleton = this.radarChart.selectAll("g")
    .data(d3.range(axisCount))
    .join("g")
    .attr('transform', d => `translate(${fullWidth / 2},${fullHeight / 2}) rotate(${d *  360 / axisCount}) scale(1, 1)`)

    // Add the axes and straighten the labels
    this.skeleton.append("g")
    .attr("class", "axis")
    .call(s => s.each((_, i, nodes) => createAxis(i)(d3.select(nodes[i]))))
    .each((_, i, nodes) => {
      d3.select(nodes[i])
      .selectAll('g.tick')
      .each((_, j, tickNodes) => {
        const tickNode = d3.select(tickNodes[j]);
        if (j==0) {
          tickNode.remove();
        } else {
          tickNode.attr('transform', `translate(-12,0)${tickNode.attr('transform')}rotate(-${i * 360 / axisCount})`)
            .attr('text-anchor', 'start')
            .attr('dominant-baseline', 'bottom')
        }
      })
      d3.select(nodes[i])
        .append("text")
        .text(this.axes[i].label)
        .attr('fill', 'black')
        .attr('transform', `translate(0,${1.2 * armLength})rotate(-${i * 360 / axisCount})scale(1.5,1.5)`)
        .attr('text-anchor', 'middle')
        .attr('dominant-baseline', 'hanging')
    })


    // Since we rotate the "web", the crossing points no longer line up correctly on the arms
    // This is because the distance to the corners of the polygon is larger than the arms, so we correct
    // for this via a geometric factor
    const correctionFactor = armLength / (armLength / Math.cos(Math.PI / axisCount));
    const gridLines = this.skeleton.selectAll('line.grid')
      .data(d3.range(1, this.gridCount + 1))
      .join('line')
      .attr("class", "grid")
      .attr('transform', `rotate(${360 / axisCount / 2})`)
      .attr('stroke', 'black')
      .attr('stroke-width', 1)
      .attr('opacity', 0.5)
      .attr('y1', d => correctionFactor * (armLength * d / this.gridCount))
      .attr('y2', d => correctionFactor * (armLength * d / this.gridCount))
      .attr('x1', d => correctionFactor * Math.tan(Math.PI / axisCount) * (armLength * d / this.gridCount))
      .attr('x2', d => - correctionFactor * Math.tan(Math.PI / axisCount) * (armLength * d / this.gridCount));

    this._actorService.addActorSelectionChangedHandler(this.syncActors.bind(this));
  }

    // Convenience method for metric calculation
    private maxObject<T>(arr: T[], accessor: (t: T) => number): T {
      let obj: T = null;
      let val = Number.NEGATIVE_INFINITY;
      for (const thing of arr) {
        const newVal = accessor(thing);
        if (newVal > val) {
          val = newVal;
          obj = thing;
        }
      }
      return obj;
    }

  private cache: Map<Actor, ActorMetrics> = new Map<Actor, ActorMetrics>();

    syncActors(): void {

      if (this._actorSelection.getSelectedActors().length == 0) {
        this.syncGraphs([]);
      }

      forkJoin(this._actorSelection.getSelectedActors().filter(actor => !this.cache.has(actor)).map(actor => {
        const actorMovies = this._actorSelection.getSelectedActorMovies(actor);
        return this._actorRepository.getCollaboratorsById(actor._id).pipe(map(collaborators => {
          const metrics = { actor, metrics: this.calculateMetrics2(actor, actorMovies, collaborators) } as ActorMetrics;
          return metrics;
        }));
      })).subscribe(data => {
        // Re-add the cached actors in selection
        this._actorSelection.getSelectedActors().forEach(actor => {
          if (this.cache.has(actor)) {
            data.push(this.cache.get(actor));
          }
          this.syncGraphs(data);
        });

      });
    }

  syncGraphs(data: ActorMetrics[]): void {
    const fullWidth = this.width + this.margin.left + this.margin.right;
    const fullHeight = this.height + this.margin.top + this.margin.bottom;
    const axisCount = this.axes.length;

    const areaPlot = d3.area<number>()
      .x0(0)
      .x1((d, i) => d3.pointRadial(i * 2 * Math.PI / axisCount, this.axes[i].scale(d))[0])
      .y1((d, i) => d3.pointRadial(i * 2 * Math.PI / axisCount, this.axes[i].scale(d))[1])
      .y0(0)
      .curve(d3.curveLinearClosed);

    // Use groups to fade the area to keep the code readable
    this.radarChart.selectAll('path.data')
      .data(data, (d: ActorMetrics) => d.actor._id)
      .join(
        enter => enter.append('path').attr('opacity', 0).call(s => s.transition().attr('opacity', 1).duration(500)),
        update => update,
        exit => exit.call(s => s.transition().attr('opacity', 0).duration(500).remove())
      )
      .attr('class', 'data')
      .attr('fill', d => this._actorSelection.getSelectedActorColor(d.actor).formatRgb())
      .attr('stroke', d => this._actorSelection.getSelectedActorColor(d.actor).formatRgb())
      .attr('fill-opacity', 0.1)
      .attr('stroke-opacity', 0.7)
      .attr('stroke-width', 3)
      .attr('d', d => areaPlot(d.metrics))
      .attr('transform', `translate(${fullWidth / 2},${fullHeight / 2}) rotate(180)`);
  }

  calculateMetrics2(actor: Actor, actorMovies: Movie[], collaborators: Actor[]): number[] {
    const collaboratorCounts: Map<string, number> = new Map<string, number>();
    const collaboratorsMap: Map<string, Actor> = new Map<string, Actor>();

    collaborators.forEach(collaborator => {
      collaboratorsMap.set(collaborator._id, collaborator);
      if (!collaboratorCounts.has(collaborator._id)) {
        collaboratorCounts.set(collaborator._id, 0);
      }
      collaboratorCounts.set(collaborator._id, collaboratorCounts.get(collaborator._id) + 1);
    });

    // M1
    const mainStar = actorMovies.map(movie =>
      this.maxObject<string>(movie.actors, actorId => collaboratorsMap.get(actorId).total_revenue)
    );
    const mainStarPortion = mainStar.map(str => +(str == actor._id))
      .reduce((a, b) => a + b) / actorMovies.length;

    // M2
    const collabSame = Array.from(collaboratorCounts.values())
      .reduce((a, b) => a + b) / collaboratorCounts.size;

    // M3 (never seems to change..?)
    const avgMovieCastSize = actorMovies.map(movie => movie.actors.length)
      .reduce((a, b) => a + b) / actorMovies.length;

    // M4 (revenue instead of vote average seems to work better)
    const collabAvgRevenue = collaborators
      .map(collaborator => collaborator.total_revenue / collaborator.movies.length)
      .reduce((a, b) => a + b) / collaborators.length;

    // M5 (differences are relatively small)
    const collabAvgMovieCount = collaborators
      .map(arr => arr.movies.length)
      .reduce((a, b) => a + b) / collaborators.length;

    const values = [mainStarPortion, collabSame, avgMovieCastSize, collabAvgRevenue, collabAvgMovieCount]
    return values;
  }
}
interface ActorMetrics {
  actor: Actor,
  metrics: number[];
}

interface Axis<Range, Output> {
  label: string,
  scale: d3.ScaleLinear<Range, Output>,
  tickFormat: (value: NumberValue, index: number) => string;
}