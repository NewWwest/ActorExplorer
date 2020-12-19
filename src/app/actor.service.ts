import { Injectable, OnInit } from '@angular/core';
import { Actor } from './models/actor';


// This injectable contains all our event handlers and triggers, used to make things trigger between the components
// such as selection changes, time range changes, etc.
@Injectable({
    providedIn: 'root',
})
export class ActorService implements OnInit {
    actorSelectedHandlers: any[] = [];
    actorSelectionChangedhandlers: any[] = [];
    searchForActorHandler: any[] = [];
    resetHandlers: any[] = [];
    timeRangeHandlers: any[] = [];
    showOrHideSkeletonHandlers: any[] = [];
    constructor() { }

    ngOnInit(): void {
    }


    public addActorSelectedHandler(f: any): void {
        this.actorSelectedHandlers.push(f);
    }
    public triggerActorSelectedHandlers(actor: Actor) {
        this.executeHandlers(this.actorSelectedHandlers, actor);
    }


    public addActorSelectionChangedHandler(f: any): void {
        this.actorSelectionChangedhandlers.push(f);
    }
    public triggerActorSelectionChangedHandlers(actor, movies, color) {
        this.executeHandlers(this.actorSelectionChangedhandlers, actor, movies, color);
    }


    public addSearchForActorHandler(f: any): void {
        this.searchForActorHandler.push(f);
    }
    public triggerSearchForActorHandlers(actor: Actor) {
        this.executeHandlers(this.searchForActorHandler, actor);
    }

    public addTimeRangeHandler(f: any): void {
        this.timeRangeHandlers.push(f);
    }
    public triggerTimeRangeHandlers(minYear: number, maxYear: number) {
        this.executeHandlers(this.timeRangeHandlers, minYear, maxYear);
    }


    public addResetHandlers(f: any): void {
        this.resetHandlers.push(f);
    }
    public triggerResetHandlers() {
        this.executeHandlers(this.resetHandlers);
    }


    public addShowOrHideSkeletonHandlers(f: any): void {
        this.showOrHideSkeletonHandlers.push(f);
    }
    public triggerShowOrHideSkeletonHandlers(showSkeleton: boolean) {
        this.executeHandlers(this.showOrHideSkeletonHandlers, showSkeleton);
    }


    private executeHandlers(handlers: any[], arg1?, arg2?, arg3?) {
        handlers.forEach(handler => {
            if (handler && {}.toString.call(handler) === '[object Function]') {
                handler(arg1, arg2, arg3);
            }
        })
    }
}
