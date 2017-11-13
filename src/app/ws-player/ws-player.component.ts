import { WsPlayerService } from './ws-player.service';
import { WsMamError } from './../shared/services/ws-base-mam/ws-mam-error';
import { WsAppStateService } from './../ws-app-state.service';
import { WsVideoTools } from './ws-video-tools';
import { Component, OnInit, OnDestroy, ViewChild } from '@angular/core';
import { SimpleTimer } from 'ng2-simple-timer';
import * as screenfull from 'screenfull';

const DescriptorTypeIn = 1;
const FieldNumberIn = 5;
const DescriptorTypeOut = 1;
const FieldNumberOut = 6;
const LastFramSkew = 0.4;

@Component({
  selector: 'app-ws-player',
  templateUrl: './ws-player.component.html',
  styleUrls: ['./ws-player.component.css']
})
export class WsPlayerComponent implements OnInit, OnDestroy {
  @ViewChild('mediaPlayer') mediaPlayer;
  public loading = false;
  private subscribers: any[];
  public selectedClip: any;
  public masterClip: any;
  public container: any;
  public player;
  public tvFormat: any;
  public videoHelper = new WsVideoTools();
  public timmecodeHead = '--:--:--:--';
  public timmecodeStart = '--:--:--:--';
  public timmecodeEnd = '--:--:--:--';
  public timmecodeDuration = '--:--:--:--';
  private tapeStart: number;
  public clipStart: number;
  public clipEnd: number;
  public clipDuration: number;
  public clipIn: number;
  public clipOut: number;
  public sliderHead: number;
  public sliderStart: number;
  public sliderEnd: number;
  public sliderMarkers: any;
  public sliderStep: number;
  public markerIn: number;
  public markerOut: number;
  private timerId: string;
  private timerName = 'videoTimer';
  public isMasterclip: boolean;
  public thumbnailUrl = '';
  public fullscreen = screenfull;
  public showMarkerIn = false;
  public showMarkerOut = false;
  public markers: number[] = [0, 0];
  private markerClipDescriptors = [];

  constructor(
    private timer: SimpleTimer,
    private appState: WsAppStateService,
    private playerService: WsPlayerService
  ) {
    this.subscribers = [];

    let subscriber = this.appState.playClipSubject
      .subscribe(response => this.selectedClipResponse(response));
    this.subscribers.push(subscriber);

    subscriber = this.playerService.getMasterClipSubject
      .subscribe(response => this.getMasterclipResponse(response));
    this.subscribers.push(subscriber);

    subscriber = this.playerService.getClipDescriptorSubject
      .subscribe(response => this.getClipDescriptorResponse(response));
    this.subscribers.push(subscriber);

    subscriber = this.playerService.setMarkerSubject
      .subscribe(response => this.setMarkerResponse(response));
    this.subscribers.push(subscriber);

    this.playerService.getClipDescriptors();
  }

  ngOnInit() {
    this.showMarkerIn = false;
    this.showMarkerOut = false;
    this.markers = [0, 0];

    this.isMasterclip = false;

    this.sliderHead = 0;
    this.sliderStart = 0;
    this.sliderEnd = 10;
    this.sliderMarkers = [{ start: 0, end: 0 }];
    this.sliderStep = 0.05;

    this.player = this.mediaPlayer.nativeElement;
    // this.player.poster = './assets/img/noMedia.png';

    this.player.ontimeupdate = () => {
      if (this.player.currentTime >= this.clipEnd) {
        this.pause();
        console.log(`Video ended: ${event}`);
      }
    };
  }

  ngOnDestroy() {
    this.subscribers.forEach(element => {
      element.unsubscribe();
    });
  }

  /* *** Service Responses *** */

  private selectedClipResponse(response: any) {
    this.loading = false;
    if (response instanceof WsMamError) {
      return;
    }

    this.selectedClip = response;
    // tslint:disable-next-line:max-line-length
    this.thumbnailUrl = this.videoHelper.getThumbnailUrl(this.selectedClip, this.appState.selectedMam, this.selectedClip.videoFormat);

    if (this.selectedClip.type !== 'masterClip') {
      this.playerService.getMasterclip(this.selectedClip.masterClipId);
    } else {
      this.loadClip();
    }
  }

  private getMasterclipResponse(response: any) {
    this.loading = false;
    if (response instanceof WsMamError) {
      return;
    }

    this.masterClip = response;
    this.loadClip();
  }

  private getClipDescriptorResponse(response) {
    if (response instanceof WsMamError) {
      return;
    }

    response.forEach(item => {
      if (item.nameInternal === 'pd_in') {
        this.markerClipDescriptors[0] = item.id;
      }
      if (item.nameInternal === 'pd_out') {
        this.markerClipDescriptors[1] = item.id;
      }
    });
  }

  private setMarkerResponse(response) {
    if (response instanceof WsMamError) {
      return;
    }
  }
  /* *** Private Methods *** */
  private getThumbnail() {
    // tslint:disable-next-line:max-line-length
    return this.videoHelper.getThumbnailUrl(this.selectedClip, this.appState.selectedMam, this.selectedClip.videoFormat);
  }

  private loadClip() {
    try {

      this.loading = true;

      if (this.timerId != null && this.timerId.length > 0) {
        this.timer.unsubscribe(this.timerId);
        this.timer.delTimer(this.timerName);
      }

      let mediaUrl: string;

      switch (this.selectedClip.type) {
        case 'clip':
          this.isMasterclip = false;
          this.selectedClip.mog = this.masterClip;
          this.tvFormat = this.selectedClip.mog.videoFormat;
          this.clipStart = this.videoHelper.getClipStart(this.selectedClip);
          this.clipEnd = this.videoHelper.getClipEnd(this.selectedClip);
          this.clipDuration = this.videoHelper.getDuration(this.selectedClip);
          this.clipIn = this.selectedClip.in / 10000000;
          this.clipOut = this.selectedClip.out / 10000000;
          this.tapeStart = this.videoHelper.getTimecodeStart(this.selectedClip);
          this.timmecodeHead = this.videoHelper.getTimecodeString(this.tvFormat, this.clipStart);
          this.timmecodeHead = this.videoHelper.getTimecodeString(this.tvFormat, this.videoHelper.getTimecodeStart(this.selectedClip));
          this.timmecodeStart = this.videoHelper.getTimecodeString(this.tvFormat, this.videoHelper.getTimecodeStart(this.selectedClip));
          this.timmecodeEnd = this.videoHelper.getTimecodeString(this.tvFormat, this.videoHelper.getTimecodeEnd(this.selectedClip));
          this.timmecodeDuration = this.videoHelper.getTimecodeString(this.tvFormat, this.clipOut - this.clipIn);
          mediaUrl = this.videoHelper.getMediaUrl(this.masterClip, this.appState.selectedMam);
          break;
        case 'masterClip':
          this.isMasterclip = true;
          this.tvFormat = this.selectedClip.videoFormat;
          this.clipStart = this.videoHelper.getClipStart(this.selectedClip);
          this.clipEnd = this.videoHelper.getClipEnd(this.selectedClip);
          this.clipDuration = this.videoHelper.getDuration(this.selectedClip);
          this.clipIn = 0;
          this.clipOut = this.clipDuration;
          this.tapeStart = this.videoHelper.getTimecodeStart(this.selectedClip);
          this.timmecodeHead = this.videoHelper.getTimecodeString(this.tvFormat, this.videoHelper.getTimecodeStart(this.selectedClip));
          this.timmecodeStart = this.videoHelper.getTimecodeString(this.tvFormat, this.videoHelper.getTimecodeStart(this.selectedClip));
          this.timmecodeEnd = this.videoHelper.getTimecodeString(this.tvFormat, this.videoHelper.getTimecodeEnd(this.selectedClip));
          this.timmecodeDuration = this.videoHelper.getTimecodeString(this.tvFormat, this.clipDuration);
          mediaUrl = this.videoHelper.getMediaUrl(this.selectedClip, this.appState.selectedMam);
          break;
      }

      if (mediaUrl === null) {
        this.player.poster = './assets/img/noMedia.png';
        this.player.src = null;
      } else {
        // this.player.poster = this.videoHelper.getThumbnailUrl(this.selectedClip, this.appState.selectedMam, this.tvFormat);
        this.player.src = mediaUrl + this.setMediaFragment();
        this.player.load();
      }

      this.sliderHead = 0;
      this.sliderStart = 0;
      this.sliderEnd = this.clipDuration;

      this.markerIn = this.clipIn;
      this.markerOut = this.clipOut;

      if (this.markerIn > this.sliderStart) {
        this.showMarkerIn = true;
      } else {
        this.showMarkerIn = false;
      }

      if (this.markerOut < this.sliderEnd) {
        this.showMarkerOut = true;
      } else {
        this.showMarkerOut = false;
      }

      this.markers = [this.markerIn * 10, this.markerOut * 10];

      this.loading = false;
      this.player.focus();

    } catch (e) {
      this.loading = false;
    }
  }

  private setMediaFragment(): string {
    return `#t=${this.clipStart},${this.clipEnd}`;
  }

  // Timer
  private timerCallback() {
    this.tick();
  }

  private tick() {
    this.sliderHead = this.player.currentTime - this.clipStart;
    // tslint:disable-next-line:max-line-length
    this.timmecodeHead = this.videoHelper.getTimecodeString(this.tvFormat, this.videoHelper.getTimecodeHead(this.tapeStart, this.clipStart, this.player.currentTime));
  }

  // Marker Slider
  public markerSliderChanged(event) {
    // const markerInTmp = this.markerIn;
    // this.markerIn = event.values[0] / 10;
    // this.markerOut = event.values[1] / 10;
    // this.timmecodeDuration = this.videoHelper.getTimecodeString(this.tvFormat, this.markerOut - this.markerIn);

    // if (markerInTmp !== this.markerIn) {
    //   this.sliderHead = this.markerIn;
    //   this.timmecodeHead = this.videoHelper.getTimecodeString(this.tvFormat, this.clipStart + this.markerIn);
    //   this.player.currentTime = this.clipStart + this.markerIn;
    // } else {
    //   this.sliderHead = this.markerOut;
    //   this.timmecodeHead = this.videoHelper.getTimecodeString(this.tvFormat, this.clipStart + this.markerOut);
    //   this.player.currentTime = this.clipStart + this.markerOut;
    // }
  }

  // Video Slider
  public videoSliderMoved(pos) {
    if (!this.player.src) {
      return;
    }

    this.pause();

    const newPos = this.clipStart + pos;

    if (newPos >= this.clipEnd) {
      return;
    }

    this.sliderHead = pos;
    // tslint:disable-next-line:max-line-length
    this.timmecodeHead = this.videoHelper.getTimecodeString(this.tvFormat, this.videoHelper.getTimecodeHead(this.tapeStart, this.clipStart, newPos));
    this.player.currentTime = newPos;
  }

  public videoSliderChanged() {
  }

  // Player

  // Player: Clicked and keys
  public playerClicked(event: any) {
    if (!this.player.src) {
      return;
    }

    this.player.focus();

    if (this.player.paused) {
      this.play();
    } else {
      this.pause();
    }
  }

  public playerKeyPressed(event: any) {
    if (!this.player.src) {
      return;
    }
    // console.log(`Key pressed: ${event.key}: ${event.keyCode}`);
    switch (event.keyCode) {
      case 32: // space
        if (this.player.paused === true) {
          this.play();
        } else {
          this.pause();
        }
        break;
      case 37: // left arrow
        this.pause();
        if (this.player.currentTime <= this.clipStart) {
          return;
        }

        this.player.currentTime -= 0.04;
        this.tick();
        break;
      case 39: // right arrow
        this.pause();
        if (this.player.currentTime >= this.clipEnd) {
          return;
        }
        this.player.currentTime += 0.04;
        this.tick();
        break;
      case 73: // i
        this.setMarkIn();
        break;
      case 79: // o
        this.setMarkOut();
        break;
      case 68: // d
        this.clearMarkIn();
        break;
      case 70: // f
        this.clearMarkOut();
        break;
      case 67: // c
        this.createSubClip();
        break;
      case 90: // z
        this.toggleFullscreen();
        break;
      case 65: // a
        this.previousEvent();
        break;
      case 83: // s
        this.nextEvent();
        break;
    }
  }

  public playerError(event: any) {
    let msg: string;

    if (event && event.path && event.path[0]) {
      msg = `Player Error: ${event.path[0].error.message}, Code ${event.path[0].error.code}`;
    } else if (event && event.currentTarget) {
      msg = `Player Error: ${event.currentTarget.error.message}, Code ${event.currentTarget.error.code}`;
    } else {
      msg = `Player Error`;
    }

    throw new Error(msg);
  }

  // Player: Play and pause
  public play() {
    try {

      if (!this.player.src) {
        return;
      }

      if (this.player.currentTime >= this.clipEnd) {
        this.pause();
        console.log(`Video ended`);
        return;
      }
      this.timer.newTimer(this.timerName, 0.1);
      this.timerId = this.timer.subscribe(this.timerName, () => this.timerCallback());
      this.player.play();
      this.player.focus();
    } catch (e) {
      throw new Error(e.message);
    }
  }

  public pause() {
    if (!this.player.src) {
      return;
    }

    this.player.pause();
    this.timer.unsubscribe(this.timerId);
    this.timer.delTimer(this.timerName);
    this.player.focus();
  }

  // Player: Toggle Mute and fullscreen
  public toggleMute() {
    this.player.muted = !this.player.muted;
    this.player.focus();
  }

  public toggleFullscreen() {
    const videoContainer: any = document.getElementById('playerComponent');

    if (screenfull.enabled) {
      screenfull.toggle(videoContainer);
    }

    this.player.focus();
  }

  // Marker handling
  public setMarkIn() {
    if (!this.player.src) {
      return;
    }

    this.markerIn = this.sliderHead;
    if (this.markerIn >= this.markerOut) {
      this.markerOut = this.sliderEnd;
      this.showMarkerOut = false;
    } else {
      this.showMarkerIn = true;
    }

    this.markers = [this.markerIn * 10, this.markerOut * 10];
    // tslint:disable-next-line:max-line-length
    // this.timmecodeDuration = this.videoHelper.getTimecodeString(this.tvFormat, this.videoHelper.getTimecodeHead(this.selectedClip, this.markerOut - this.markerIn));
    this.timmecodeDuration = this.videoHelper.getTimecodeString(this.tvFormat, this.markerOut - this.markerIn);
    this.player.focus();
    this.saveMarkers();
  }

  public setMarkOut() {
    if (!this.player.src) {
      return;
    }

    this.markerOut = this.sliderHead;
    if (this.markerIn >= this.markerOut) {
      this.markerIn = 0;
      this.showMarkerIn = false;
    } else {
      this.showMarkerOut = true;
    }

    this.markers = [this.markerIn * 10, this.markerOut * 10];
    // tslint:disable-next-line:max-line-length
    // this.timmecodeDuration = this.videoHelper.getTimecodeString(this.tvFormat, this.videoHelper.getTimecodeHead(this.selectedClip, this.videoHelper.getTimecodeHead(this.selectedClip, this.markerOut - this.markerIn)));
    this.timmecodeDuration = this.videoHelper.getTimecodeString(this.tvFormat, this.markerOut - this.markerIn);
    this.player.focus();
    this.saveMarkers();
  }

  public clearMarkIn() {
    if (!this.player.src) {
      return;
    }

    this.markerIn = 0;
    this.showMarkerIn = false;
    this.markers = [this.markerIn * 10, this.markerOut * 10];
    // tslint:disable-next-line:max-line-length
    // this.timmecodeDuration = this.videoHelper.getTimecodeString(this.tvFormat, this.videoHelper.getTimecodeHead(this.selectedClip, this.markerOut - this.markerIn));
    this.timmecodeDuration = this.videoHelper.getTimecodeString(this.tvFormat, this.markerOut - this.markerIn);
    this.player.focus();
    this.saveMarkers();
  }

  public clearMarkOut() {
    if (!this.player.src) {
      return;
    }

    this.markerOut = this.sliderEnd;
    this.showMarkerOut = false;
    this.markers = [this.markerIn * 10, this.markerOut * 10];
    // tslint:disable-next-line:max-line-length
    // this.timmecodeDuration = this.videoHelper.getTimecodeString(this.tvFormat, this.videoHelper.getTimecodeHead(this.selectedClip, this.markerOut - this.markerIn));
    this.timmecodeDuration = this.videoHelper.getTimecodeString(this.tvFormat, this.markerOut - this.markerIn);
    this.player.focus();
    this.saveMarkers();
  }

  public saveMarkers() {
    const markerIn: number = this.markerIn * 10000000;
    const markerOut: number = this.markerOut * 10000000;
    this.playerService.setMarker(this.selectedClip.id, markerIn, markerOut, this.markerClipDescriptors[0], this.markerClipDescriptors[1]);
  }

  // Subclip creation
  public createSubClip() {
    // switch (this.container._subtype) {
    //   case 15: // Clip Bin
    //     this.videoService.createSubClip(this.selectedClip, this.container);
    //     break;
    // }
  }

  // Jump to markers and start/end
  public previousEvent() {
    if (!this.player.src) {
      return;
    }
    this.pause();
    let pos = this.sliderHead;

    if (pos > this.markerOut) {
      pos = this.markerOut;
    } else if (pos > this.markerIn) {
      pos = this.markerIn;
    } else {
      pos = this.sliderStart;
    }

    this.player.currentTime = pos + this.clipStart;
    this.tick();
    this.player.focus();
  }

  public nextEvent() {
    if (!this.player.src) {
      return;
    }
    this.pause();
    let pos = this.sliderHead;

    if (pos < this.markerIn) {
      pos = this.markerIn;
    } else if (pos < this.markerOut) {
      pos = this.markerOut;
    } else {
      pos = this.sliderEnd;
    }

    this.player.currentTime = pos + this.clipStart;
    this.tick();
    this.player.focus();
  }
}
