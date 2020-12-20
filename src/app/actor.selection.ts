import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import * as d3 from 'd3';
import { ActorRepository } from './actor.repository';
import { ActorService } from './actor.service';
import { Actor } from './models/actor';
import { Movie } from './models/movie';


// This injectable contains the selection logic, since we must ensure that all components are aware of the same
// selection. We also assign colors to actors in our selection here, and clear it when needed.
// Finally, we also store the current year bounds of the movie time line for easy access. Probably this should go
// somewhere else in the long term, but this was convenient for now.
@Injectable({
    providedIn: 'root',
})
export class ActorSelection {
    constructor(private _actorService: ActorService, private _actorRepository: ActorRepository) {
        this._actorService.addActorSelectedHandler(this.actorSelected.bind(this));
        this._actorService.addResetHandlers(this.clearSelection.bind(this));
        this._actorService.addTimeRangeHandler(this.storeTimeRange.bind(this));

    }

    public static readonly MAX_ACTORS = 3;  // Maximum amount of actors allowed in selection
    private static readonly SCHEME = d3.schemeSet2; // Color scheme to use 
    private actorData: Map<Actor, ActorData> = new Map<Actor, ActorData>(); // The actor selection
    private colorCounter = 0;   // Counter that keeps track of the next color to assign
    private leftTimeRangeBound = 2000;  // Initial value for left bound, immediately gets overwritten
    private rightTimeRangeBound = 2020; // Initial value for right bound, immediately gets overwritten

    // This fires whenever an actor is selected. We create a color for this actor and retrieve their movies.
    // Then, we store the total package in the selection cache and trigger the selection changed handlers.
    // Due to a small limitation we need to trigger these handlers anyway to make nodes expand properly.
    // If the maxmimum amount of selectable actors is exceeded, we remove the first actor to be added from it.
    private actorSelected(actor: Actor): void {
        if (!this.actorData.has(actor)) {
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
        } else {
            // Trigger it anyway, to make sure nodes expand when clicked again
            const actorData = this.actorData.get(actor);
            this._actorService.triggerActorSelectionChangedHandlers(actor, actorData.movies, actorData.color);
        }
    }

    // Get the current left year bound of the time range selector in the movie time line
    public getLeftTimeRangeBound(): number {
        return this.leftTimeRangeBound;
    }

    // Get the current right year bound of the time range selector in the movie time line
    public getRightTimeRangeBound(): number {
        return this.rightTimeRangeBound;
    }
 
    // Store the current year bounds of the time range selector in the movie time line
    private storeTimeRange(leftBound: number, rightBound: number): void {
        this.leftTimeRangeBound = leftBound;
        this.rightTimeRangeBound = rightBound;
    }

    // Whether some actor is selected
    public hasActor(actor: Actor): boolean {
        return this.actorData.has(actor);
    }

    // Gets the selected actors
    public getSelectedActors(): Actor[] {
        return Array.from(this.actorData.keys());
    }

    // Gets the movies of a given selected actor
    public getSelectedActorMovies(actor: Actor): Movie[] {
        return this.actorData.get(actor).movies;
    }

    // Gets the color of a given selected actor
    public getSelectedActorColor(actor: Actor): d3.RGBColor | d3.HSLColor {
        return this.actorData.get(actor).color;
    }

    // Clears the selection, this is signalled for now by using null for all the params
    public clearSelection(): void {
        this.actorData = new Map<Actor, ActorData>();
        this._actorService.triggerActorSelectionChangedHandlers(null, null, null);
    }

    // Removes a single actor, this is signalled for now by only filling in the actor parameter
    // This is needed to ensure that the node graph can also find and remove the actors it had selected, because
    // checking this after the fact would not yield the actor that was just removed.
    public removeActorFromSelection(actor: Actor): void {
        this.actorData.delete(actor);
        this._actorService.triggerActorSelectionChangedHandlers(actor, null, null);
    }
}

// Interface used for storing data related to a selected actor, such as their movies and legend color
interface ActorData {
    movies: Movie[];
    color: d3.RGBColor | d3.HSLColor;
}
