import { BrowserModule } from '@angular/platform-browser';
import { HttpClientModule } from '@angular/common/http';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AppComponent } from './app.component';
import { ActorNetworkComponent } from './actor-network/actor-network.component';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { MatGridListModule } from '@angular/material/grid-list';
import { ActorSidePanelComponent } from './actor-side-panel/actor-side-panel.component';
import { RatingOverTimeComponent } from './actor-side-panel/rating-over-time/rating-over-time.component';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { TopBarComponent } from './top-bar/top-bar.component';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatButtonModule } from '@angular/material/button';

@NgModule({
  declarations: [
    AppComponent,
    ActorNetworkComponent,
    ActorSidePanelComponent,
    RatingOverTimeComponent,
    TopBarComponent,
  ],
  imports: [
    BrowserModule,
    BrowserAnimationsModule,
    MatGridListModule,
    HttpClientModule,
    MatAutocompleteModule,
    FormsModule,
    MatToolbarModule,
    MatFormFieldModule,
    MatButtonModule,
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
