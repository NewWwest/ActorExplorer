import { Component, OnInit } from '@angular/core';
import * as d3 from 'd3';
import { ActorRepository } from 'src/app/actor.repository';
import { forkJoin } from 'rxjs';
import { Movie } from 'src/app/models/movie';
import { Actor } from 'src/app/models/actor';
import { ScaleLinear } from 'd3';
@Component({
  selector: 'app-rating-over-time',
  templateUrl: './rating-over-time.component.html',
  styleUrls: ['./rating-over-time.component.scss']
})
export class RatingOverTimeComponent implements OnInit {
  private width = 800;
  private height = 400;
  private margin = { top: 20, right: 40, bottom: 30, left: 80 };
  private graph_width = this.width - this.margin.left - this.margin.right;
  private upper_graph_height = this.height / 2 - this.margin.top - this.margin.bottom;
  private bottom_graph_height = this.height / 2 - this.margin.top - this.margin.bottom;
  private xScale: ScaleLinear<number, number, never>;
  private xScaleElement: d3.Selection<any, any, any, any>;
  private yScaleRating: ScaleLinear<number, number, never>;
  private yScaleRatingElement: d3.Selection<any, any, any, any>;
  private yScaleRevenue: ScaleLinear<number, number, never>;
  private yScaleRevenueElement: d3.Selection<any, any, any, any>;
  private innerElement: d3.Selection<any, any, any, any>;
  private colors: string[] = ['rgba(255,0,0,1)', 'rgba(0,0,255,1)']
  constructor(private _actorRepository: ActorRepository) { }

  appendActorGraph(actor: Actor, actorMovies: Movie[]): void {
    let birth = new Date(actor.birth, 0, 0);
    let age_div = +new Date(actor.birth + 100, 0, 0) - +new Date(actor.birth, 0, 0);
    const data = this.innerElement.append('g').selectAll('g')
      .data(actorMovies)
      .join('g')
      .attr('transform', m => `translate(${this.xScale(100 * (+new Date(m.year, m.month, m.day) - +birth) / age_div)}, ${this.upper_graph_height})`);

    let c = this.colors.pop();
    data.append('line')
      .transition()
      .attr('y1', m => this.yScaleRating(m.vote_average / 2) - this.upper_graph_height)
      .duration(1000)
      .attr('y2', this.yScaleRating(0) - this.upper_graph_height)
      .attr('stroke', c)

    data.append('circle')
      .transition()
      .attr('cy', m => this.yScaleRating(m.vote_average / 2) - this.upper_graph_height)
      .duration(1000)
      .attr('r', '2')
      .attr('fill', c)
      .attr('stroke', c)

    data.append('line')
      .transition()
      .attr('y2', m => this.yScaleRevenue(m.revenue))
      .duration(1000)
      .attr('y1', this.yScaleRevenue(0))
      .attr('stroke', c)

    data.append('circle')
      .transition()
      .attr('cy', m => this.yScaleRevenue(m.revenue))
      .duration(1000)
      .attr('r', '2')
      .attr('fill', c)
      .attr('stroke', c)
  }

  lookupAndAddActor(name: string): void {
    this._actorRepository.getActorByName(name).subscribe(actor => {
      forkJoin(this._actorRepository.getMovies(actor.movies)).subscribe(movies => {
        this.updateScales(actor, movies);
        this.appendActorGraph(actor, movies);
      })
    }, (err) => {
      console.error(err);
    });
  }

  updateScales(actor: Actor, movies: Movie[]): void {
    let minYear = d3.min(movies, m => m.year - actor.birth);
    let maxYear = d3.max(movies, m => m.year - actor.birth);
    let maxRevenue = d3.max(movies, m => m.revenue);

    this.xScale.domain([
      Math.min(this.xScale.domain()[0], minYear),
      Math.max(this.xScale.domain()[1], maxYear)]
    );

    // No need to update this one as it is clearly bounded
    // this.yScaleRating.domain([
    //   0,
    //   Math.max(this.yScaleRating.domain()[1], maxRating)]
    // );
    console.log(Math.max(this.yScaleRevenue.domain()[1], maxRevenue))

    this.yScaleRevenue.domain([
      0, // Makes animation nicer
      Math.max(this.yScaleRevenue.domain()[1], maxRevenue)]
    );

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
      .attr('width', this.xScale.range()[1])
      .attr('height', this.height)
      .attr('font-family', 'sans-serif')
      .attr('font-size', '10')
      .attr('text-anchor', 'end');

    this.innerElement = svg.append('g')
      .attr('transform', `translate(${this.margin.left}, ${this.margin.top})`)

    this.xScaleElement = this.innerElement.append('g')
      .attr('transform', `translate(0,${this.upper_graph_height})`)
      .attr('shape-rendering', 'geometricPrecision ')
      .call(d3.axisBottom(this.xScale));

    this.yScaleRatingElement = this.innerElement.append('g')
      .attr('transform', `translate(0,0)`)
      .attr('shape-rendering', 'geometricPrecision ')
      .call(d3.axisLeft(this.yScaleRating).ticks(5));

    this.yScaleRevenueElement = this.innerElement.append('g')
      .attr('transform', `translate(0,${this.upper_graph_height})`)
      .attr('shape-rendering', 'geometricPrecision ')
      .call(d3.axisLeft(this.yScaleRevenue).ticks(5, '$,.0s'));

    const actors: string[] = ['Arnold Schwarzenegger', 'Will Smith'];
    actors.forEach(a => {
      this.lookupAndAddActor(a);
    });

    // this._actorRepository.getActorByName(a1).subscribe(actor => {
    //   // let age = actor - (new Date().getFullYear())
    //   forkJoin(this._actorRepository.getMovies(actor.movies)).subscribe(movies => {
        
    //     console.log(movies)
    //     // Get min/max for both actors
    //     // let min_age = 20;
    //     // let max_age = 60;
    //     // let min_rev = 0;
    //     // let max_rev = d3.max(movies, m => m.revenue) * 1.1;
        
    //     // let min_rating = 0;
    //     // let max_rating = 5;
        






    //   })
    //   }, (err) => {
    //     console.error(err)
    //   });
      // forkJoin(this._actorRepository.getMovies(actor.movies.map(m => m.id))).subscribe((res) => {
      //   console.log(res);
      // });



    // this.getActor(actorName).subscribe(data => {
      
    // // Should use dates!
    // const x = d3.scaleTime()
    //   .domain([1900, 2020])
    //   .range([0, 100]);


    // const height = 420;
    // const y = d3.scaleLinear()
    //   .domain([0, d3.max(movies, m => m.rating)])
    //   .range([0, height]);


    // const svg = d3.select('p#test').append('svg')
    //   .attr('width', x.range()[1])
    //   .attr('height', height)
    //   .attr('font-family', 'sans-serif')
    //   .attr('font-size', '10')
    //   .attr('text-anchor', 'end');

    // const bar = svg.selectAll('g')
    //   .data(movies)
    //   .join('g')
    //   .attr('transform', m => `translate(${new Date(x(m.year), 0, 0)}, )`);

    // bar.append('rect')
    //   .attr('fill', 'red')
    //   .attr('height', m => y(m.rating))
    //   .attr('width', 10);

    // bar.append('text')
    //   .attr('fill', 'white')
    //   .attr('x', d => x(d.value) - 3)
    //   .attr('y', y.bandwidth() / 2)
    //   .attr('dy', '0.35em')
    //   .text(d => d.name);
  }
}
