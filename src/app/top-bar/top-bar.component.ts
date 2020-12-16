import { Component, OnInit } from '@angular/core';
import { ActorRepository } from '../actor.repository';
import { ActorService } from '../actor.service';

@Component({
  selector: 'app-top-bar',
  templateUrl: './top-bar.component.html',
  styleUrls: ['./top-bar.component.scss']
})
export class TopBarComponent {
  actorNames: string[] = [];
  searchBoxText: string | null;
  skeletonShown: boolean = false;

  constructor(
    private _actorRepository: ActorRepository,
    private _actorService: ActorService) { }

  reset(e) {
    this._actorService.triggerResetHandlers();
  }

  report(e) {
    if (this.searchBoxText && this.searchBoxText.length > 3) {
      this._actorRepository.searchActorsByName(this.searchBoxText).subscribe((data) => {
        this.actorNames = data.map(a => a.name);
        this.actorNames.sort();
      })
    }
  }

  actorSelected(e) {
    let pickedActor: string = e.option.value;
    this._actorRepository.getActorByName(pickedActor).subscribe(actor => {
      this._actorService.triggerSearchForActorHandlers(actor);
      this._actorService.triggerActorSelectedHandlers(actor);
    }, (err) => {
      console.error(err);
    });
  }

  swapSkeleton(e) {
    this.skeletonShown = !this.skeletonShown;
    this._actorService.triggerShowOrHideSkeletonHandlers(this.skeletonShown);
  }
}
