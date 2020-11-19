import { Injectable, OnInit } from '@angular/core';
import { Actor } from './models/actor';
import { Movie } from './models/movie';

@Injectable({
    providedIn: 'root',
})
export class ActorRepository implements OnInit {
    constructor() { }

    ngOnInit(): void {
        //todo: load data?
    }

    public getAllActorsAndovies(): [Actor[], Movie[]] {
        return <any>this.generateTestData(100, 10, 0.1);
    }





    generateTestData(actorCount: number, movieCount: number, linkProbability: number) {
        let actors = [];
        let movies = [];
        for (let i = 0; i < actorCount; i++) {
            actors[i] = {
                id: i,
                name: `Actor Person ${i}`,
                movies: []
            }
        }
        for (let i = 0; i < movieCount; i++) {
            movies[i] = {
                id: i,
                name: `Movie about ${i}`,
                revenue: i * 1000,
                rating: Math.round(Math.random() * 10 * 100) / 100,
                year: i,
                actors: []
            }
        }
        for (let i = 0; i < actorCount; i++) {
            for (let j = 0; j < movieCount; j++) {
                if (Math.random() < linkProbability) {
                    actors[i].movies.push(movies[j]);
                    movies[j].actors.push(actors[i]);
                }
            }
        }
        return [actors, movies]
    }
}