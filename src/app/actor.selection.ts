import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import * as d3 from 'd3';
import { ActorRepository } from './actor.repository';
import { ActorService } from './actor.service';
import { Actor } from './models/actor';
import { Movie } from './models/movie';

@Injectable({
    providedIn: 'root',
})
export class ActorSelection {
    constructor(private _actorService: ActorService, private _actorRepository: ActorRepository) {
        this._actorService.addActorSelectedHandler(this.actorSelected.bind(this));
    }

    public static readonly MAX_ACTORS = 3;
    private static readonly SCHEME = d3.schemeSet2;
    private actorData: Map<Actor, ActorData> = new Map<Actor, ActorData>();
    private colorCounter = 0;

    private actorSelected(actor: Actor): void {
        const colorIndex = this.colorCounter % ActorSelection.SCHEME.length;
        const color = d3.color(ActorSelection.SCHEME[colorIndex]);
        this.colorCounter += 1;
        this._actorRepository.getMoviesOfAnActor(actor._id).subscribe(movies => {
            this.actorData.set(actor, {movies, color} as ActorData);
            if (this.actorData.size > ActorSelection.MAX_ACTORS) {
                this.actorData.delete(this.actorData.keys().next().value);
            }
            this._actorService.triggerActorSelectionChangedHandlers(actor, movies, color);
        });
    }

    public hasActor(actor: Actor): boolean {
        return this.actorData.has(actor);
    }

    public getSelectedActors(): Actor[] {
        return Array.from(this.actorData.keys());
    }

    public getSelectedActorMovies(actor: Actor): Movie[] {
        return this.actorData.get(actor).movies;
    }

    public getSelectedActorColor(actor: Actor): d3.RGBColor | d3.HSLColor {
        return this.actorData.get(actor).color;
    }
}

interface ActorData {
    movies: Movie[];
    color: d3.RGBColor | d3.HSLColor;
}