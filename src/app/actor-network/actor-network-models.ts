import { Actor } from "../models/actor";
import * as d3 from 'd3';

export interface ActorNode extends d3.SimulationNodeDatum {
    actor: Actor;
    movieIds: string[];
    movieCount: number;
    skeletonNode: boolean;
    parentActorId?: string;
    revenueTotal: number;
    revenueAverage: number;
    voteAverage: number;
}

export interface MovieLink extends d3.SimulationLinkDatum<ActorNode> {
    width: number;
    movieIds: string[];
    movieTitles: string[];
    isSkeleton: boolean;
}

export enum ColorDataEnum {
    revenueTotal = 'revenueTotal',
    revenueAverage = 'revenueAverage',
    voteAverage = 'voteAverage',
    none = 'none'
}
export enum colorSchemaEnum {
    viridis = 'viridis',
    magma = 'magma',
    plasma = 'plasma',
    heatmap = 'heatmap'
}