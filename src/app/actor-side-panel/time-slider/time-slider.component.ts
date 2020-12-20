import { Component, OnInit } from '@angular/core';
import * as d3 from 'd3';
import { ActorRepository } from 'src/app/actor.repository';
import { Movie } from 'src/app/models/movie';
import { ActorService } from 'src/app/actor.service';
import { ActorSelection } from 'src/app/actor.selection';
import { Actor } from 'src/app/models/actor';

@Component({
  selector: 'app-time-slider',
  templateUrl: './time-slider.component.html',
  styleUrls: ['./time-slider.component.scss']
})
export class TimeSliderComponent implements OnInit {
  private handleWidth = 6;  // Width of the range selector handles
  private width = 700;
  private height = 100;
  private xScale;
  private timeSection;
  private leftHandle;
  private rightHandle;
  private actorRegions: d3.Selection<any, any, any, any>; // The rectangles representing actor timelines
  private margin = { top: 40, right: 20, bottom: 10, left: 20 };
  private rightBound: number = this.width - this.margin.right;  // Corresponds to the year of the left handle
  private leftBound: number = this.rightBound - 100;  // Corresponds to the year of the right handle


  constructor(private _actorRepository: ActorRepository, private _actorService: ActorService, private _actorSelection: ActorSelection) { }

  ngOnInit(): void {
    const svg = d3.select('p#slider').append('svg')
      // We use viewbox to automatically let the elements adjust to all the space available
      // The width/height can be used to fix the aspect ratio
      .attr('viewBox', `0 0 ${this.width + this.margin.left + this.margin.right} ${this.height + this.margin.top + this.margin.bottom}`);

    const endHandler = () => {
      this._actorService.triggerTimeRangeHandlers(
        Math.round(this.xScale.invert(this.leftBound)),
        Math.round(this.xScale.invert(this.rightBound))
      );
    };

    // Getting all the movies takes some time, so it takes a while before this appears
    // One potential improvement could be to store the min/max year in a separate collection in the data
    // and pre-initialize the axis and other elements, or pre-calculating the bins on the db side and
    // retrieving that instead.
    this._actorRepository.getAllMovies().subscribe(movies => {
      const min = d3.min(movies, m => m.year);
      const max = d3.max(movies, m => m.year);
      const bins = d3.bin<Movie, number>();
      bins.thresholds(d3.range(min, max + 1));
      bins.value(d => d.year);

      const buckets = bins(movies);
      const maxBin = d3.max(buckets, b => b.length);

      this.xScale = d3.scaleLinear()
        .domain([min, max])
        .range([this.margin.left, this.width - this.margin.right]);
      const y = d3.scaleLinear()
        .domain([0, maxBin * 1.2])
        .range([this.height, 0]);

      const xElement = svg.append('g')
        .attr('transform', `translate(0,${this.height})`)
        .attr('shape-rendering', 'geometricPrecision ')
        .call(d3.axisBottom(this.xScale).tickFormat(d3.format('d')));

      // X label
      xElement.append('text')
        .text("Movies Over the Years")
        .attr('fill', 'black')
        .attr('transform', `translate(${this.width/2}, ${30})scale(1.2,1.2)`)
        .attr('text-anchor', 'middle')
        .attr('dominant-baseline', 'central');
      // The bins
      svg
        .append('g')
        .selectAll('rect')
        .data(buckets)
        .join('rect')
        .attr('fill', 'red')
        .attr('opacity', 0.5)
        .attr('x', d => this.xScale(d.x0))
        .attr('width', d => Math.max(0, this.xScale(d.x1) - this.xScale(d.x0) - 1))
        .attr('y', d => y(d.length))
        .attr('height', d => y(0) - y(d.length));



      const drag = d3.drag<SVGRectElement, number>()
        .subject(pointer => this.leftBound  - pointer.x)
        .on('drag', event => {
          const d = this.rightBound - this.leftBound;
          const xLeft = event.x + event.subject;
          const xRight = event.x + event.subject + d;
          if (this.canMoveLeftBound(xLeft) && this.canMoveRightBound(xRight)) {
            this.moveLeftBound(xLeft);
            this.moveRightBound(xRight);
          }
          this.updateBody();
        });

      const dragLeft = d3.drag<SVGRectElement, number>()
        .subject(pointer => this.leftBound - pointer.x)
        .on('drag', event => {
          if (this.canMoveLeftBound(event.x + event.subject)) {
            this.moveLeftBound(event.x + event.subject);
          }
          this.updateBody();
        });

      const dragRight = d3.drag<SVGRectElement, number>()
        .subject(pointer => this.rightBound - pointer.x)
        .on('drag', event => {
          if (this.canMoveRightBound(event.x + event.subject)) {
            this.moveRightBound(event.x + event.subject);
          }
          this.updateBody();
        })

      this.actorRegions = svg.append('g');

      this.timeSection = svg.append('rect')
        .attr('height', this.height)
        .attr('fill-opacity', .25)
        .attr('cursor', 'move')
        .call(drag);

      this.leftHandle = svg.append('rect')
        .attr('height', this.height)
        .attr('width', this.handleWidth)
        .attr('fill-opacity', .25)
        .attr('cursor', 'ew-resize')
        .call(dragLeft);

      this.rightHandle = svg.append('rect')
        .attr('height', this.height)
        .attr('width', this.handleWidth)
        .attr('fill-opacity', .25)
        .attr('cursor', 'ew-resize')
        .call(dragRight);


      this.leftHandle.attr('x', this.leftBound);
      this.rightHandle.attr('x', this.rightBound);
      this.updateBody();
      this._actorService.addActorSelectionChangedHandler(this.syncActors.bind(this));

      // We actually trigger the handler every 100 ms, which allows the other listening components to update dynamically
      // regardless of what happens. This also means that it updates when nothing is happening at all, so there is that downside.
      d3.interval(endHandler, 100);
    });
  }

  // This is just to synchronize the actor timelines
  // Upon enter, a new timeline flies in from the bottom for each newly selected actor
  // If some actor is no longer in the selection, his timeline will fly out from the top and fade
  // Timelines of the other actors need to move up as well then, so that gets handled in the update
  syncActors(): void {
    this.actorRegions.selectAll('rect')
    .data(this._actorSelection.getSelectedActors(), (actor: Actor) => actor._id)
    .join(
    enter => enter.append('rect')
      .attr('y', this.height)
      .attr('x', a => this.xScale(d3.min(this._actorSelection.getSelectedActorMovies(a).map(m => m.year))))
      .attr('width', a => 
        this.xScale(d3.max(this._actorSelection.getSelectedActorMovies(a).map(m => m.year))) - 
        this.xScale(d3.min(this._actorSelection.getSelectedActorMovies(a).map(m => m.year)))
      )
      .attr('height', 0.25 * this.height / ActorSelection.MAX_ACTORS)
      .attr('fill-opacity', .35)
      .attr('fill', a => this._actorSelection.getSelectedActorColor(a).formatRgb())
      .call(element => element
        .transition()
        .attr('y', (_, i) => i * ( 0.27 * this.height) / ActorSelection.MAX_ACTORS)
        .duration(1000)),
    update => update
      .call(element => element
        .transition()
        .attr('y', (_, i) => i * ( 0.27 * this.height) / ActorSelection.MAX_ACTORS)
        .duration(1000)),
    exit => exit.call(element => element
        .transition()
        .attr('y', -10)
        .attr('fill-opacity', 0)
        .duration(1000)
        .call(thing => thing.remove())
        )
    );
  }

  // Updates the range selector's body based on the bounds
  updateBody(): void {
    this.timeSection.attr('width', this.rightBound - this.leftBound);
    this.timeSection.attr('x', this.leftBound + this.handleWidth / 2);
  }

  // Whether the left bound is allowed to move further
  canMoveLeftBound(value: number): boolean {
    return value >= this.margin.left && value <= this.rightBound - this.handleWidth;
  }

  // Whether the right bound is allowed to move further
  canMoveRightBound(value: number): boolean {
    return value >= this.leftBound + this.handleWidth && value <= this.width - this.margin.right;
  }

  // Change the left bound and update its corresponding handle element
  moveLeftBound(value: number): void {
    this.leftBound = value;
    this.leftHandle.attr('x', this.leftBound);
  }

  // Change the right bound and update its corresponding handle element
  moveRightBound(value: number): void {
    this.rightBound = value;
    this.rightHandle.attr('x', this.rightBound);
  }

}
