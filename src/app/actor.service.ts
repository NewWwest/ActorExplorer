import { Injectable, OnInit } from '@angular/core';
import { Actor } from './models/actor';

@Injectable({
    providedIn: 'root',
})
export class ActorService implements OnInit {
    actorSelectedHandlers: any[]=[];
    actorSelectionChangedhandlers: any[]=[];
    searchForActorHandler: any[]=[];
    resetHandlers: any[]=[];
    timeRangeHandlers: any[]=[];
    showOrHideSkeletonHandlers: any[]=[];
    constructor() { }

    ngOnInit(): void {
    }


    public addActorSelectedHandler(f: any): void {
        this.actorSelectedHandlers.push(f);
    }
    public triggerActorSelectedHandlers(actor: Actor){
        this.actorSelectedHandlers.forEach(handler =>{
            if(handler && {}.toString.call(handler) === '[object Function]'){
                handler(actor);
            }
        })
    }

    public addActorSelectionChangedHandler(f: any): void {
        this.actorSelectionChangedhandlers.push(f);
    }
    public triggerActorSelectionChangedHandlers() {
        this.actorSelectionChangedhandlers.forEach(handler => {
            if (handler && {}.toString.call(handler) === '[object Function]') {
                handler();
            }
        })
    }

    public addSearchForActorHandler(f: any): void {
        this.searchForActorHandler.push(f);
    }
    public triggerSearchForActorHandlers(actor: Actor){
        this.searchForActorHandler.forEach(handler =>{
            if(handler && {}.toString.call(handler) === '[object Function]'){
                handler(actor);
            }
        })
    }

    public addTimeRangeHandler(f: any): void {
        this.timeRangeHandlers.push(f);
    }
    public triggerTimeRangeHandlers(minYear: number, maxYear: number){
        this.timeRangeHandlers.forEach(handler => {
            if (handler && {}.toString.call(handler) === '[object Function]') {
                handler(minYear, maxYear);
            }
        });
    }
    public addResetHandlers(f: any): void {
        this.resetHandlers.push(f);
    }
    public triggerResetHandlers(){
        this.resetHandlers.forEach(handler =>{
            if(handler && {}.toString.call(handler) === '[object Function]'){
                handler();
            }
        })
    }

    public addShowOrHideSkeletonHandlers(f: any): void {
        this.showOrHideSkeletonHandlers.push(f);
    }
    public triggerShowOrHideSkeletonHandlers(showSkeleton: boolean){
        this.showOrHideSkeletonHandlers.forEach(handler =>{
            if(handler && {}.toString.call(handler) === '[object Function]'){
                handler(showSkeleton);
            }
        })
    }
}
