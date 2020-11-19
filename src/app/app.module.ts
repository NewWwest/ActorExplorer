import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';

import { AppComponent } from './app.component';
import { ActorNetworkComponent } from './actor-network/actor-network.component';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { MatGridListModule } from '@angular/material/grid-list';
import { ActorSidePanelComponent } from './actor-side-panel/actor-side-panel.component'; 

@NgModule({
  declarations: [
    AppComponent,
    ActorNetworkComponent,
    ActorSidePanelComponent,
  ],
  imports: [
    BrowserModule,
    BrowserAnimationsModule,
    MatGridListModule
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
