import { Component, OnInit } from '@angular/core';
import { ActorService } from '../actor.service';
import { Actor } from '../models/actor';

@Component({
  selector: 'app-actor-side-panel',
  templateUrl: './actor-side-panel.component.html',
  styleUrls: ['./actor-side-panel.component.scss']
})
export class ActorSidePanelComponent implements OnInit {
  actor:Actor = null;


  constructor(private _actorService: ActorService) { }

  ngOnInit(): void {
    this._actorService.addActorSelectedHandler(this.actorSelected.bind(this))
  }

  actorSelected(evtdata) {
    this.actor = evtdata
  }

}
