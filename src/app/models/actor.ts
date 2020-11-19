import { Movie } from './movie';

export interface Actor {
    id: string;
    name: string;
    movies: Movie[]
}