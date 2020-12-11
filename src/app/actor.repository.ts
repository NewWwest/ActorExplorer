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

    searchActorsByName(name: string): Observable<Actor[]> {
        return this._http.get<Actor[]>(`http://localhost:4201/api/search/actorname/${name}`);
    }

    getActorByName(name: string): Observable<Actor> {
        return this._http.get<Actor>(`http://localhost:4201/api/actor/name/${name}`);
    }

    getActors(ids: string[]): Observable<Actor[]> {
        return this._http.post<Actor[]>(`http://localhost:4201/api/actor/list/`, ids);
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

    getMovieListbetweenActors(actorId1: string, actorId2: string, movies: Movie[]): Movie[] {
        return movies.filter(movie =>
            movie.actors.filter(a => a == actorId1 || a == actorId2).length == 2
        );
    }
}
