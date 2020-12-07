import { Component, OnInit } from '@angular/core';
import * as d3 from 'd3';

@Component({
  selector: 'app-radar-chart',
  templateUrl: './radar-chart.component.html',
  styleUrls: ['./radar-chart.component.scss']
})
export class RadarChartComponent implements OnInit {

  constructor() { }

  private width = 200;
  private height = 200;
  private margin = { top: 40, right: 40, bottom: 40, left: 40 };

  ngOnInit(): void {
    const axisCount = 5;
    const gridCount = 4;

    const fullWidth = this.width + this.margin.left + this.margin.right;
    const fullHeight = this.height + this.margin.top + this.margin.bottom;
    const armLength = Math.min(this.width, this.height) / 2;

    const svg = d3.select('p#radar').append('svg')
      .attr('width', fullWidth)
      .attr('height', fullHeight);

    const skeleton = svg.selectAll("g")
    .data(d3.range(axisCount))
    .join("g")
    .attr('transform', d => `translate(${fullWidth / 2},${fullHeight / 2}) rotate(${d *  360 / axisCount}) scale(1, -1)`)


    skeleton.append("line")
    .attr('stroke', 'black')
    .attr('stroke-width', 2)
    .attr('y1', 0)
    .attr('y2', armLength);

    const gridLines = skeleton.selectAll('g')
      .data(d3.range(1, gridCount + 1))
      .join('g')
      .attr('transform', `rotate(${360 / axisCount / 2})`);

    // Since we rotate the "web", the crossing points no longer line up correctly on the arms
    // This is because the distance to the corners of the polygon is larger than the arms, so we correct
    // for this via a geometric factor
    const correctionFactor = armLength / (armLength / Math.cos(Math.PI / axisCount));
    gridLines.append('line')
    .attr('stroke', 'black')
    .attr('stroke-width', 1)
    .attr('opacity', 0.5)
      .attr('y1', d => correctionFactor * (armLength * d / gridCount))
      .attr('y2', d => correctionFactor * (armLength * d / gridCount))
      .attr('x1', d => correctionFactor *  Math.tan(Math.PI / axisCount) * (armLength * d / gridCount))
      .attr('x2', d => - correctionFactor * Math.tan(Math.PI / axisCount) * (armLength * d / gridCount));

    const randomVals = d3.range(axisCount).map(_ => Math.random());

    const arrdata = d3.zip(randomVals, d3.range(axisCount))

    const points = skeleton.
      data(randomVals)
      .append('circle')
      .attr('cx', 0)
      .attr('cy', d => 100 * d)
      .attr('r', 5)
      .attr('opacity', 0.6)
      .attr('fill', 'purple');

    const areaPlot = d3.area<number[]>()
      .x0(0)
      .x1(d => d3.pointRadial(d[1] * 2 * Math.PI / axisCount, 100 * d[0])[0])
      .y1(d => d3.pointRadial(d[1] * 2 * Math.PI / axisCount, 100 * d[0])[1])
      .y0(0)
      .curve(d3.curveLinearClosed);
    const areaGraph = svg.append('path')
      .datum(arrdata)
      .attr('fill', 'blue')
      .attr('stroke', 'purple')
      .attr('fill-opacity', 0.1)
      .attr('stroke-opacity', 0.5)
      .attr('stroke-width', 3)
      .attr('d', areaPlot)
      .attr('transform', `translate(${fullWidth / 2},${fullHeight / 2}) rotate(0)`);
    }

    
}
