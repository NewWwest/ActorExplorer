import { Component, OnInit } from '@angular/core';
import * as d3 from 'd3';
import { thresholdFreedmanDiaconis } from 'd3';
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


  ngOnInit(): void {
    const gridCount = 5;
    const fullWidth = this.width + this.margin.left + this.margin.right;
    const fullHeight = this.height + this.margin.top + this.margin.bottom;
    const armLength = Math.min(this.width, this.height) / 2;

    this.axes.push({label: "Top Star", scale: d3.scaleLinear().domain([0, 1]).range([0, armLength])});
    this.axes.push({ label: "Recurring Collaborators", scale: d3.scaleLinear().domain([1, 3]).range([0, armLength])});
    this.axes.push({ label: "Avg. Movie Cast Size", scale: d3.scaleLinear().domain([0, 5]).range([0, armLength])});    // domain is "Guesstimate"
    this.axes.push({ label: "Avg. Collaborator Revenue", scale: d3.scaleLinear().domain([0, 100000000]).range([0, armLength]) });   // domain is "Guesstimate"
    this.axes.push({ label: "Avg. Collaborator Movies", scale: d3.scaleLinear().domain([0, 30]).range([0, armLength]) });    // domain is "Guesstimate"

    const axisCount = this.axes.length;



    const svg = d3.select('p#radar').append('svg')
      .attr('viewBox', `0 0 ${fullWidth} ${fullHeight}`);


    this.radarChart = svg.append('g');

    const createAxis = (i) => (s) => d3.axisLeft(this.axes[i].scale)
      // .ticks(gridCount)
      .tickValues(d3.range(
        this.axes[i].scale.domain()[0],
        this.axes[i].scale.domain()[1] + (this.axes[i].scale.domain()[1] - this.axes[i].scale.domain()[0]) / gridCount,
        (this.axes[i].scale.domain()[1] - this.axes[i].scale.domain()[0]) / gridCount
        ))
    .tickFormat(d3.format(',.2'))
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
      .data(d3.range(1, gridCount + 1))
      .join('line')
      .attr("class", "grid")
      .attr('transform', `rotate(${360 / axisCount / 2})`)
      .attr('stroke', 'black')
      .attr('stroke-width', 1)
      .attr('opacity', 0.5)
      .attr('y1', d => correctionFactor * (armLength * d / gridCount))
      .attr('y2', d => correctionFactor * (armLength * d / gridCount))
      .attr('x1', d => correctionFactor * Math.tan(Math.PI / axisCount) * (armLength * d / gridCount))
      .attr('x2', d => - correctionFactor * Math.tan(Math.PI / axisCount) * (armLength * d / gridCount));
      
    this._actorService.addActorSelectionChangedHandler(this.syncActors.bind(this));
    }

    // Because both d3 and typescript suck, we really have to re-invent the wheel here...
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

            // This query is quite slow, ideas to optimize it:
            // - Precalculate total revenue and average rating per actor in db, and don't fetch movies of collaborators
            // - Write mongo query that retrieves this data in one call via joins
            // - Cache retrieved results permanently in actor repository (can do this one regardless)
    syncActors(): void {
      forkJoin(this._actorSelection.getSelectedActors().filter(actor => !this.cache.has(actor)).map(actor => {
        const actorMovies = this._actorSelection.getSelectedActorMovies(actor);
        return forkJoin(actorMovies.flatMap(movie => movie.actors.flatMap(collaboratorId => this._actorRepository.getMoviesOfAnActor(collaboratorId)
          .pipe(map(movies => ({collaboratorId, movies} as Collaborator)))
        ))).pipe(map(collaborators => {
          const metrics = this.calculateMetrics2(actor, actorMovies, collaborators);
          return {actor, metrics} as ActorMetrics;
        }));
      })).subscribe(data => {
        // Re-add the cached actors in selection
        this._actorSelection.getSelectedActors().forEach(actor => {
          if (this.cache.has(actor)) {
            data.push(this.cache.get(actor));
          }
        });

        const fullWidth = this.width + this.margin.left + this.margin.right;
        const fullHeight = this.height + this.margin.top + this.margin.bottom;
        const axisCount = 5;

        const areaPlot = d3.area<number>()
          .x0(0)
          .x1((d, i) => d3.pointRadial(i * 2 * Math.PI / axisCount, this.axes[i].scale(d))[0])
          .y1((d, i) => d3.pointRadial(i * 2 * Math.PI / axisCount, this.axes[i].scale(d))[1])
          .y0(0)
          .curve(d3.curveLinearClosed);

        this.radarChart.selectAll('path.data')
        .data(data, (d: ActorMetrics) => d.actor._id)
        .join(
          enter => enter.append('path').attr('opacity', 0).call( s => s.transition().attr('opacity', 1).duration(500)),
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

      });


      // const m = forkJoin(this._actorSelection.getSelectedActors().map(actor => {
      //   const actorMovies = this._actorSelection.getSelectedActorMovies(actor);
      //   // const collaboratorMovies: Map<string, Movie[]> = new Map<string, Movie[]>();
      //   // const collaboratorCounts: Map<string, number> = new Map<string, number>();
      //   return forkJoin(actorMovies.map(movie => forkJoin(movie.actors.map(collaboratorId => this._actorRepository.getMoviesOfAnActor(collaboratorId)))));

      // }));

      




      // this._actorSelection.getSelectedActors().forEach(actor => {
      //     const actorMovies = this._actorSelection.getSelectedActorMovies(actor);
      //     if (this.cache.has(actor)) {
      //       this.calculateMetrics(actor, actorMovies, this.cache.get(actor), this.collabCountCache.get(actor));
      //     } else {
      //       const collaboratorMovies: Map<string, Movie[]> = new Map<string, Movie[]>();
      //       const collaboratorCounts: Map<string, number> = new Map<string, number>();



      //       forkJoin(
      //         actorMovies.map(movie => forkJoin(movie.actors.map(collaboratorId =>
      //           this._actorRepository.getMoviesOfAnActor(collaboratorId).pipe(
      //             tap(movies => {
      //               collaboratorMovies.set(collaboratorId, movies)
      //               if (!collaboratorCounts.has(collaboratorId)) {
      //                 collaboratorCounts.set(collaboratorId, 1);
      //               }
      //               collaboratorCounts.set(collaboratorId, collaboratorCounts.get(collaboratorId) + 1);
      //             })
      //           )
      //         )))
      //       ).subscribe(_ => {
      //         // We filled the map using side effects (via tap), so we use that instead
      //         this.cache.set(actor, collaboratorMovies);
      //         this.collabCountCache.set(actor, collaboratorCounts);
      //         this.calculateMetrics(actor, actorMovies, collaboratorMovies, collaboratorCounts);
      //       });
      //     }
      //   });
      }

  // addActor(actor: Actor, data: number[]): void {

  // }

  calculateMetrics2(actor: Actor, actorMovies: Movie[], collaborators: Collaborator[]): number[] {
    const collaboratorMovies: Map<string, Movie[]> = new Map<string, Movie[]>();
    const collaboratorCounts: Map<string, number> = new Map<string, number>();

    collaborators.forEach(collaborator => {
      collaboratorMovies.set(collaborator.collaboratorId, collaborator.movies);
      if (!collaboratorCounts.has(collaborator.collaboratorId)) {
        collaboratorCounts.set(collaborator.collaboratorId, 0);
      }
      collaboratorCounts.set(collaborator.collaboratorId, collaboratorCounts.get(collaborator.collaboratorId) + 1);
    });

    // M1:
    const mainStar = actorMovies.map(movie =>
      this.maxObject<string>(movie.actors, actorId => collaboratorMovies.get(actorId).map(m => m.revenue).reduce((a, b) => a + b))
    );
    const mainStarPortion = mainStar.map(str => +(str == actor._id))
      .reduce((a, b) => a + b) / actorMovies.length;

    // M2: (this one's not good enough as it is, try one of the other options)
    const collabSame = Array.from(collaboratorCounts.values())
      .reduce((a, b) => a + b) / collaboratorCounts.size;

    // M3: (never seems to change..?)
    const avgMovieCastSize = actorMovies.map(movie => movie.actors.length)
      .reduce((a, b) => a + b) / actorMovies.length;

    // M4: (revenue instead of vote average seems to work better)
    const collabAvgRevenue = Array.from(collaboratorMovies.values())
      .map(movies => movies.map(m => m.revenue).reduce((a, b) => a + b) / movies.length)
      .reduce((a, b) => a + b) / collaboratorMovies.size;

    // M5: (barely ever changes)
    const collabAvgMovieCount = Array.from(collaboratorMovies.values())
      .map(arr => arr.length)
      .reduce((a, b) => a + b) / collaboratorMovies.size;

    const values = [mainStarPortion, collabSame, avgMovieCastSize, collabAvgRevenue, collabAvgMovieCount]
    return values;
  }



  // calculateMetrics(actor: Actor, actorMovies: Movie[], collaboratorMovies: Map<string, Movie[]>, collaboratorCounts: Map<string, number>): number[] {
  //   // M1:
  //   const mainStar = actorMovies.map(movie =>
  //     this.maxObject<string>(movie.actors, actorId => collaboratorMovies.get(actorId).map(m => m.revenue).reduce((a, b) => a + b))
  //   );
  //   const mainStarPortion = mainStar.map(str => +(str == actor._id))
  //     .reduce((a, b) => a + b) / actorMovies.length;

  //   // M2:
  //   const collabSame = Array.from(collaboratorCounts.values())
  //     .reduce((a, b) => a + b) / collaboratorCounts.size;

  //   // M3:
  //   const avgMovieCastSize = actorMovies.map(movie => movie.actors.length)
  //     .reduce((a, b) => a + b) / actorMovies.length;

  //   // M4:
  //   const collabAvgRatings = Array.from(collaboratorMovies.values())
  //     .map(movies => movies.map(m => m.vote_average).reduce((a, b) => a + b) / movies.length)
  //     .reduce((a, b) => a + b) / collaboratorMovies.size;

  //   // M5:
  //   const collabAvgMovieCount = Array.from(collaboratorMovies.values())
  //     .map(arr => arr.length)
  //     .reduce((a, b) => a + b) / collaboratorMovies.size;
  //   // actorMovies.map(movie =>
  //   //   this.maxObject<string>(movie.actors, actorId => collaboratorMovies.get(actorId).map(m => m.revenue).reduce((a, b) => a + b))
  //   // );


  //   console.log(actor.name, mainStarPortion, collabSame, avgMovieCastSize, collabAvgRatings, collabAvgMovieCount);
  //   return [mainStarPortion, collabSame, avgMovieCastSize, collabAvgRatings, collabAvgMovieCount];
  // }
// .subscribe(
//   movies => collaboratorMovies.set(collaboratorId, movies)
// );

      // const points = this.skeleton.
      //   data(randomVals)
      //   .append('circle')
      //   .attr('cx', 0)
      //   .attr('cy', d => 100 * d)
      //   .attr('r', 5)
      //   .attr('opacity', 0.6)
      //   .attr('fill', 'purple');
    


    // The  metrics
    // - Q: Is the actor a solo star?
    //   A: Portion of movies where actor has highest total revenue of cast

    // - Q: Does the actor often work with the same people?
    //   A: Most collaborated with same actor across all actors
    //      Collaboration count on average across actors
    //      Portion of unique actors collaborated with (proportional)

    // - Q: How many actors does the actor collaborate with on average per movie?
    //   A: Average collaborators per movie

    // - Q: Does the actor mostly work with well-known actors?
    //   A: Average revenue of all collaborators excluding self

    // - Q: Does the actor mostly work with experienced people?
    //   A: Average movie count of all collaborators excluding self
  }
interface ActorMetrics {
  actor: Actor,
  metrics: number[]
}

interface Collaborator {
  collaboratorId: string,
  movies: Movie[]
}

interface Axis<Range, Output> {
  label: string,
  scale: d3.ScaleLinear<Range, Output>;
}