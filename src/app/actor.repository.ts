import { HttpClient } from '@angular/common/http';
import { Injectable, OnInit } from '@angular/core';
import { Observable } from 'rxjs/internal/Observable';
import { Actor } from './models/actor';
import { Movie } from './models/movie';

@Injectable({
    providedIn: 'root',
})
export class ActorRepository {
    private getActorByIdcache: Map<string, Actor> = new Map<string, Actor>();

    constructor(private _http: HttpClient) { }

    getRandomMovieInRange(startYear: number, endYear: number): Observable<Movie[]> {
        return this._http.get<Movie[]>(`http://localhost:4201/api/search/random/movie/${startYear}-${endYear}`);
    }

    getRandomActor(): Observable<Actor[]> {
        return this._http.get<Actor[]>(`http://localhost:4201/api/search/random/`);
    }

    searchActorsByName(name: string): Observable<Actor[]> {
        return this._http.get<Actor[]>(`http://localhost:4201/api/search/actorname/${name}`);
    }

    getActorByName(name: string): Observable<Actor> {
        return this._http.get<Actor>(`http://localhost:4201/api/actor/name/${name}`);
    }

    getActorMovieCounts(ids: string[]): Observable<{_id: string, count: number}[]> {
        return this._http.post<{_id: string, count: number}[]>(`http://localhost:4201/api/actor/moviecount/`, ids);
    }

    getActorById(id: string): Observable<Actor> {
        if (this.getActorByIdcache.has(id)) {
            console.log(`Returning cached actor by id ${id}`)
            return new Observable<Actor>(subscriber => {
                subscriber.next(this.getActorByIdcache.get(id));
                subscriber.complete();
            });
        }
        const observable = this._http.get<Actor>(`http://localhost:4201/api/actor/id/${id}`);
        observable.pipe().subscribe(actor => this.getActorByIdcache.set(id, actor));
        return this._http.get<Actor>(`http://localhost:4201/api/actor/id/${id}`);
    }

    getMovies(movieIds: string[]): Observable<Movie>[] {
        const movies: Observable<Movie>[] = [];
        movieIds.forEach(id => {
            movies.push(this._http.get<Movie>(`http://localhost:4201/api/movie/id/${id}`));
        });
        return movies;
    }

    getAllMovies(): Observable<Movie[]> {
        return this._http.get<Movie[]>(`http://localhost:4201/api/movie/allMovies`);
    }
 
    getMoviesOfAnActor(actorId: string): Observable<Movie[]> {
        return this._http.get<Movie[]>(`http://localhost:4201/api/actor/id/${actorId}/movies`);
    }

    getMovieListbetweenActors(actorId1: string, actorId2: string, movies: Movie[]): Movie[] {
        return movies.filter(movie =>
            movie.actors.filter(a => a == actorId1 || a == actorId2).length == 2
        );
    }
}
