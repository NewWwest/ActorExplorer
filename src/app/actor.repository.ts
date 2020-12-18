import { HttpClient } from '@angular/common/http';
import { Injectable, OnInit } from '@angular/core';
import { Observable } from 'rxjs/internal/Observable';
import { Actor } from './models/actor';
import { Movie } from './models/movie';

// This injectable contains the interface for retrieving data from the proxy. It also caches retrieved actors
// since these happen to overlap a lot between the different actions performed in the UI.
@Injectable({
    providedIn: 'root',
})
export class ActorRepository {
    private getActorByIdcache: Map<string, Actor> = new Map<string, Actor>();

    constructor(private _http: HttpClient) { }
    private proxy_url: string = 'http://localhost:4201'

    getRandomMovieInRange(startYear: number, endYear: number): Observable<Movie[]> {
        return this._http.get<Movie[]>(`${this.proxy_url}/api/search/random/movie/${startYear}-${endYear}`);
    }

    getRandomActor(): Observable<Actor[]> {
        return this._http.get<Actor[]>(`${this.proxy_url}/api/search/random/`);
    }

    searchActorsByName(name: string): Observable<Actor[]> {
        return this._http.get<Actor[]>(`${this.proxy_url}/api/search/actorname/${name}`);
    }

    getActorByName(name: string): Observable<Actor> {
        return this._http.get<Actor>(`${this.proxy_url}/api/actor/name/${name}`);
    }

    getActorMovieCounts(ids: string[]): Observable<{_id: string, count: number}[]> {
        return this._http.post<{ _id: string, count: number }[]>(`${this.proxy_url}/api/actor/moviecount/`, ids);
    }

    getActorById(id: string): Observable<Actor> {
        if (this.getActorByIdcache.has(id)) {
            console.log(`Returning cached actor by id ${id}`)
            return new Observable<Actor>(subscriber => {
                subscriber.next(this.getActorByIdcache.get(id));
                subscriber.complete();
            });
        }
        const observable = this._http.get<Actor>(`${this.proxy_url}/api/actor/id/${id}`);
        observable.pipe().subscribe(actor => this.getActorByIdcache.set(id, actor));
        return this._http.get<Actor>(`${this.proxy_url}/api/actor/id/${id}`);
    }

    getMovies(movieIds: string[]): Observable<Movie>[] {
        const movies: Observable<Movie>[] = [];
        movieIds.forEach(id => {
            movies.push(this._http.get<Movie>(`${this.proxy_url}/api/movie/id/${id}`));
        });
        return movies;
    }

    getAllMovies(): Observable<Movie[]> {
        return this._http.get<Movie[]>(`${this.proxy_url}/api/movie/allMovies`);
    }
 
    getMoviesOfAnActor(actorId: string): Observable<Movie[]> {
        return this._http.get<Movie[]>(`${this.proxy_url}/api/actor/id/${actorId}/movies`);
    }

    getMovieListbetweenActors(actorId1: string, actorId2: string, movies: Movie[]): Movie[] {
        return movies.filter(movie =>
            movie.actors.filter(a => a == actorId1 || a == actorId2).length == 2
        );
    }
}
