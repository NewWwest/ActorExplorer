import { Actor } from './actor';

export interface Movie {
    id: string;
    name: string;
    revenue: number;
    rating: number;
    year: number;
    actors: Actor[]
}