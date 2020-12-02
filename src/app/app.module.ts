import { BrowserModule } from '@angular/platform-browser';
import { HttpClientModule } from '@angular/common/http';
import { NgModule } from '@angular/core';

import { AppComponent } from './app.component';
import { ActorNetworkComponent } from './actor-network/actor-network.component';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { MatGridListModule } from '@angular/material/grid-list';
import { ActorSidePanelComponent } from './actor-side-panel/actor-side-panel.component';
import { RatingOverTimeComponent } from './actor-side-panel/rating-over-time/rating-over-time.component'; 

@NgModule({
  declarations: [
    AppComponent,
    ActorNetworkComponent,
    ActorSidePanelComponent,
    RatingOverTimeComponent,
  ],
  imports: [
    BrowserModule,
    BrowserAnimationsModule,
    MatGridListModule,
    HttpClientModule
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
