import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
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

    // Gets a random movie in the given year range
    getRandomMovieInRange(startYear: number, endYear: number): Observable<Movie[]> {
        return this._http.get<Movie[]>(`${this.proxyUrl}/api/search/random/movie/${startYear}-${endYear}`);
    }

    // Gets a random actor
    getRandomActor(): Observable<Actor[]> {
        return this._http.get<Actor[]>(`${this.proxyUrl}/api/search/random/`);
    }

    // Retrives actors matching the string using regex
    searchActorsByName(name: string): Observable<Actor[]> {
        return this._http.get<Actor[]>(`${this.proxyUrl}/api/search/actorname/${name}`);
    }

    // Gets one actor by name (should be deprecated, id is more reliable)
    getActorByName(name: string): Observable<Actor> {
        return this._http.get<Actor>(`${this.proxyUrl}/api/actor/name/${name}`);
    }

    // Gets the movie counts for the given actors by id (should probably be deprecated, since we can get this from the array length)
    getActorMovieCounts(ids: string[]): Observable<{_id: string, count: number}[]> {
        return this._http.post<{ _id: string, count: number }[]>(`${this.proxyUrl}/api/actor/moviecount/`, ids);
    }

    // Gets the collaborators of some actor given the id
    getCollaboratorsById(id: string): Observable<Actor[]> {
        return this._http.get<Actor[]>(`${this.proxyUrl}/api/actor/id/${id}/collaborators`);
    }

    // Gets an actor given the id
    // We cache the results of this method, since this query is frequently performed
    getActorById(id: string): Observable<Actor> {
        if (this.getActorByIdcache.has(id)) {
            console.log(`Returning cached actor by id ${id}`)
            return new Observable<Actor>(subscriber => {
                subscriber.next(this.getActorByIdcache.get(id));
                subscriber.complete();
            });
        }
        const observable = this._http.get<Actor>(`${this.proxyUrl}/api/actor/id/${id}`);
        observable.pipe().subscribe(actor => this.getActorByIdcache.set(id, actor));
        return this._http.get<Actor>(`${this.proxyUrl}/api/actor/id/${id}`);
    }

    // Gets all the movies in the database
    getAllMovies(): Observable<Movie[]> {
        return this._http.get<Movie[]>(`${this.proxyUrl}/api/movie/allMovies`);
    }

    // Get the movie objects of some actor, given the id of the actor
    getMoviesOfAnActor(actorId: string): Observable<Movie[]> {
        return this._http.get<Movie[]>(`${this.proxyUrl}/api/actor/id/${actorId}/movies`);
    }

    // Get the common movies of two actors (does not perform a query)
    getMovieListbetweenActors(actorId1: string, actorId2: string, movies: Movie[]): Movie[] {
        return movies.filter(movie =>
            movie.actors.filter(a => a == actorId1 || a == actorId2).length == 2
        );
    }
}
