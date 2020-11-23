import { Component, OnInit } from '@angular/core';
import * as d3 from 'd3';
import { ActorRepository } from 'src/app/actor.repository';
import { Movie } from '../../models/movie';
import { forkJoin } from 'rxjs';
@Component({
  selector: 'app-rating-over-time',
  templateUrl: './rating-over-time.component.html',
  styleUrls: ['./rating-over-time.component.scss']
})
export class RatingOverTimeComponent implements OnInit {

  constructor(private _actorRepository: ActorRepository) { }

  ngOnInit(): void {

    const actorName = "Will Smith";
    this._actorRepository.getActorByName(actorName).subscribe(actor => {
      forkJoin(this._actorRepository.getMovies(actor.movies)).subscribe(movies => {
        let min = d3.min(movies, m => m.year);
        let max = d3.max(movies, m => m.year)
        let height = 100;
        let width = 400;
        let bar_width = 10;

        const x = d3.scaleTime()
         .domain([min, max])
         .range([0, width]);
        

        console.log(movies)
        const y = d3.scaleLinear()
          .domain([0, d3.max(movies, m => m.vote_average)])
          .range([height, 0]);


        const svg = d3.select('p#test').append('svg')
          .attr('width', x.range()[1])
          .attr('height', height)
          .attr('font-family', 'sans-serif')
          .attr('font-size', '10')
          .attr('text-anchor', 'end');

        const bar = svg.selectAll('g')
          .data(movies)
          .join('g')
          .attr('transform', m => `translate(${x(m.year)}, 0)`);


        svg.append("g")
          .attr("transform", "translate(0," + height + ")")
          .call(d3.axisBottom(x))


        bar.append('rect')
          .attr('fill', 'rgba(255,0,0,0.25)')
          .attr('height', m => height - y(m.vote_average))
          .attr('y', m =>  y(m.vote_average))
          .attr('width', bar_width)
          .attr('vertical-align', 'top')

      })
      }, (err) => {
        console.error(err)
      });
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
