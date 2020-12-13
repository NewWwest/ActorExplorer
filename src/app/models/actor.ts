import { Movie } from './movie';

export interface Actor {
    _id: string;
    name: string;
    movies: string[];
    birth: number;
}

export interface ActorData {
    _id: string;
    name: string;
    movies: string[];
    birth: number;
    movieData: Movie[]
}