import { HttpClient } from '@angular/common/http';
import { Injectable, OnInit } from '@angular/core';
import { Observable } from 'rxjs/internal/Observable';
import { Actor, ActorData } from './models/actor';
import { Movie } from './models/movie';

@Injectable({
    providedIn: 'root',
})
export class ActorRepository {
    constructor(private _http: HttpClient) { }

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
    
    getActorDataById(actorId: string): Observable<ActorData> {
        return this._http.get<ActorData>(`http://localhost:4201/api/actor/id/${actorId}/data`);
    }

    getMovieListbetweenActors(actorId1: string, actorId2: string, movies: Movie[]): Movie[] {
        return movies.filter(movie =>
            movie.actors.filter(a => a == actorId1 || a == actorId2).length == 2
        );
    }
}
