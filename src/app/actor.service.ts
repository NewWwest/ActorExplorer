import { Injectable, OnInit } from '@angular/core';
import { Actor } from './models/actor';

@Injectable({
    providedIn: 'root',
})
export class ActorService implements OnInit {
    actorSelectedHandlers: any[]=[];
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
}