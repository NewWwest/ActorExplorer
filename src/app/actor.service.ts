import { Injectable, OnInit } from '@angular/core';
import { Actor } from './models/actor';

@Injectable({
    providedIn: 'root',
})
export class ActorService implements OnInit {
    actorSelectedHandlers: any[]=[];
    searchForActorHandler: any[]=[];
    resetHandlers: any[]=[];
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
}