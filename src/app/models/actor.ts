import { Movie } from './movie';

export interface Actor {
    _id: string;
    name: string;
    movies: string[];
    birth: number;
    total_revenue: number;
    total_rating: number;
}

export interface ActorData {
    _id: string;
    name: string;
    movies: string[];
    birth: number;
    movieData: Movie[];
    total_revenue: number;
    total_rating: number;
}