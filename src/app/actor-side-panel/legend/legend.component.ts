import { Component, OnInit } from '@angular/core';
import * as d3 from 'd3';
import { ActorSelection } from 'src/app/actor.selection';
import { ActorService } from 'src/app/actor.service';
import { Actor } from 'src/app/models/actor';

@Component({
  selector: 'app-legend',
  templateUrl: './legend.component.html',
  styleUrls: ['./legend.component.scss']
})
export class LegendComponent implements OnInit {

  constructor(private _actorService: ActorService, private _actorSelection: ActorSelection) { }
  private width = 700;
  private height = 20;
  private margin = { top: 10, right: 20, bottom: 5, left: 20 };
  private svg: d3.Selection<any, any, any, any>;

  ngOnInit(): void {
    this.svg = d3.select('p#legend').append('svg')
      .attr('viewBox', `0 0 ${this.width + this.margin.left + this.margin.right} ${this.height + this.margin.top + this.margin.bottom}`)
      .append('g')
      .attr('transform', `translate(${this.margin.left}, ${this.margin.top})`)

    this._actorService.addActorSelectionChangedHandler(this.syncActors.bind(this));
  }


  syncActors(): void {
    const groups = this.svg.selectAll('g')
      .data(this._actorSelection.getSelectedActors(), (d: Actor) => d._id)
      .join(
        enter => enter.append('g')
        .attr('transform', `translate(${this.width},0)`)
        .call(s => s
          .transition()
          .attr('transform', (_, i) => `translate(${i * this.width / ActorSelection.MAX_ACTORS},0)`)
          .duration(500)
          )
        ,
        update => update.call(s => s
          .transition()
          .attr('transform', (_, i) => `translate(${i * this.width / ActorSelection.MAX_ACTORS},0)`)
          .duration(500)
        ),
        exit => exit
        .call(s => s.transition()
        .attr('transform', `translate(${-this.width}, 0)`))
        .attr('opacity', 0)
        .remove()
    ).on("click", e => this._actorSelection.removeActorFromSelection(e.target.parentNode.__data__ as Actor))

    groups.append('rect')
      .attr('width', 20)
      .attr('height', 20)
      .attr('fill', d => this._actorSelection.getSelectedActorColor(d).formatRgb())
      .attr('stroke', d => this._actorSelection.getSelectedActorColor(d).darker().formatRgb())
      .on("mouseover", (e, d) => d3.select(e.target).attr('fill', this._actorSelection.getSelectedActorColor(d).brighter().formatRgb()))
      .on("mouseout", (e, d) => d3.select(e.target).attr('fill', this._actorSelection.getSelectedActorColor(d).formatRgb()));

    groups.append('text')
      .attr('x', 30)
      .attr('y', 10)
      .attr('width', 100)
      .attr('height', 20)
      .attr('text-anchor', 'start')
      .attr('fill', d => this._actorSelection.getSelectedActorColor(d).formatRgb())
      .attr('align', 'center')
      .attr('dominant-baseline', 'central')
      .text(actor => actor.name)
  }
}
