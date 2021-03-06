import { Actor } from './actor';

export interface Movie {
    _id: string;
    title: string;
    revenue: number;
    vote_average: number;
    year: number;
    month: number;
    day: number;
    actors: string[];
}