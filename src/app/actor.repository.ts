import { HttpClient } from '@angular/common/http';
import { Injectable, OnInit } from '@angular/core';
import { Observable } from 'rxjs/internal/Observable';
import { Actor } from './models/actor';
import { Movie } from './models/movie';

@Injectable({
    providedIn: 'root',
})
export class ActorRepository {
    constructor(private _http: HttpClient) { }

    getWills(): Observable<Actor> {
        return this._http.get<Actor>("http://localhost:4201/api/actor/name/will")
    }

    getActorByName(name: string): Observable<Actor> {
        return this._http.get<Actor>(`http://localhost:4201/api/actor/name/${name}`);
    }

    getMovies(movieIds: string[]): Observable<Movie>[] {
        const movies: Observable<Movie>[] = [];
        movieIds.forEach(id => {
            movies.push(this._http.get<Movie>(`http://localhost:4201/api/movie/id/${id}`));
        });
        return movies;
    }

    public getAllActorsAndovies(): [Actor[], Movie[]] {
        return <any>this.generateTestData(100, 10, 0.1);
    }

    getMovieListbetweenActors(actorId1: string, actorId2: string, movies: Movie[]): Movie[] {
        return movies.filter(movie =>
            movie.actors.filter(a => a == actorId1 || a == actorId2).length == 2
        );
    }

    generateTestData(actorCount: number, movieCount: number, linkProbability: number) {
        let actors: Actor[] = [];
        let movies: Movie[] = [];
        for (let i = 0; i < actorCount; i++) {
            actors[i] = {
                _id: i.toString(),
                name: `Actor Person ${i}`,
                movies: [],
                birth: 0
            }
        }
        for (let i = 0; i < movieCount; i++) {
            movies[i] = {
                _id: i.toString(),
                title: `Movie about ${i}`,
                revenue: i * 1000,
                vote_average: Math.round(Math.random() * 10 * 100) / 100,
                year: i,
                month: i,
                day: i,
                actors: []
            }
        }
        for (let i = 0; i < actorCount; i++) {
            for (let j = 0; j < movieCount; j++) {
                if (Math.random() < linkProbability) {
                    actors[i].movies.push(movies[j]._id);
                    movies[j].actors.push(actors[i]._id);
                }
            }
        }
        return [actors, movies]
    }
}
