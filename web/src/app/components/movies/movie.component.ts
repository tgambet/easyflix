import {ChangeDetectionStrategy, Component, Input, OnInit} from '@angular/core';
import {Movie, MovieExt} from '@app/models';
import {DomSanitizer, SafeStyle} from '@angular/platform-browser';
import {CoreService} from '@app/services/core.service';
import {EMPTY, Observable} from 'rxjs';
import {filter, map, share, take} from 'rxjs/operators';
import {HttpSocketClientService} from '@app/services/http-socket-client.service';
import {Cast, Crew} from '@app/models/movie-ext';

@Component({
  selector: 'app-movie',
  template: `
    <div class="container" [style]="getBackdropStyle() | async" tabindex="0">
      <div class="filter">
        <div class="movie">
          <div class="poster" [style]="getPosterStyle() | async"></div>
          <div class="meta">
            <h1 class="title">{{ movie.title }} <span class="year">({{ movie.release_date.substr(0, 4) }})</span></h1>
            <h2 class="tagline" *ngIf="movieExt$ | async as details;">{{ details.tagline }}</h2>
            <div class="actions">
              <div class="score">
                <mat-progress-spinner mode="determinate"
                                      [value]="movie.vote_average * 10"
                                      diameter="55" color="accent">
                </mat-progress-spinner>
                <span>{{ getScore() }}%</span>
              </div>
              <button class="play" mat-button mat-raised-button color="primary">
                <mat-icon>play_arrow</mat-icon>
                PLAY
              </button>
            </div>
            <div class="overview">
              <h2>Overview</h2>
              <p>{{ movie.overview }}</p>
            </div>
            <div class="information">
              <h2>Information
                <button mat-icon-button (click)="showMore = !showMore" class="show-more">
                  <mat-icon>{{ showMore ? 'arrow_drop_up' : 'arrow_drop_down' }}</mat-icon>
                </button>
              </h2>
              <dl class="left">
                <dt>Original title</dt>
                <dd>{{ movie.original_title }}</dd>
                <dt>Release date</dt>
                <dd>{{ movie.release_date | date:'mediumDate'}}</dd>
                <dt>Directed by</dt>
                <dd *ngIf="movieExt$ | async as details; else loading">
                  {{ getDirectors(details.credits.crew) }}
                </dd>
                <dt>Runtime</dt>
                <dd *ngIf="movieExt$ | async as details; else loading">
                  {{ details.runtime | sgTime }}
                </dd>
              </dl>
              <dl class="right">
                <dt>Language</dt>
                <dd>{{ getLanguage(movie.original_language) | async }}</dd>
                <dt>Genres</dt>
                <dd *ngIf="movieExt$ | async as details; else loading">
                  {{ getGenre(details) }}
                </dd>
                <dt>Budget</dt>
                <dd *ngIf="movieExt$ | async as details; else loading">
                  {{ details.budget | currency:'USD':'symbol':'1.0' }}
                </dd>
                <dt>Revenue</dt>
                <dd *ngIf="movieExt$ | async as details; else loading">
                  {{ details.revenue | currency:'USD':'symbol':'1.0' }}
                </dd>
                <ng-template #loading>
                  <dd class="loading">Loading...</dd>
                </ng-template>
              </dl>
              <mat-divider *ngIf="showMore"></mat-divider>
              <dl *ngIf="showMore">
                <dt>Library</dt>
                <dd>{{ movie.file.libraryName }}</dd>
                <dt>File name</dt>
                <dd>{{ movie.file.name }}</dd>
                <dt>File size</dt>
                <dd>{{ movie.file.size | sgFileSize }}</dd>
                <dt>Tags</dt>
                <dd class="tags">
                  <mat-chip-list [selectable]="false" [disabled]="true">
                    <mat-chip>1080p</mat-chip>
                    <mat-chip>mp4</mat-chip>
                    <mat-chip>H264</mat-chip>
                  </mat-chip-list>
                </dd>
              </dl>
            </div>
          </div>
          <div class="cast" *ngIf="movieExt$ | async as details; else castLoading">
            <div class="people" *ngFor="let actor of details.credits.cast">
              <div class="profile" [style]="getActorStyle(actor) | async">
                <mat-icon *ngIf="!actor.profile_path">person</mat-icon>
              </div>
              <div class="name">
                {{ actor.name }}
              </div>
            </div>
          </div>
          <ng-template #castLoading>
            <div class="cast loading">
              <h2>Casting</h2>
            </div>
          </ng-template>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .container {
      background-size: cover;
      background-position: 50% 50%;
      height: 1080px;
    }
    .container:focus {
      outline: none;
    }
    .filter {
      display: flex;
      width: 100%;
      height: 100%;
      justify-content: center;
    }
    .movie {
      display: grid;
      grid-template-columns: 300px 900px; /* TODO media query */
      grid-template-rows: auto 258px;
      grid-template-areas:
        "poster meta"
        "cast cast";
      justify-items: stretch;
      padding: 8rem 2rem 10rem;
      box-sizing: border-box;
    }
    .poster {
      grid-area: poster;
      height: 450px;
    }
    .meta {
      grid-area: meta;
      margin-left: 2rem;
      max-width: 1000px;
    }
    .title {
      font-size: 3rem;
      margin: 0 0 .5rem 0;
      font-weight: 500;
    }
    .tagline {
      margin: 0;
      font-weight: 300;
      font-size: 1.25rem;
    }
    .year {
      font-size: 2rem;
      vertical-align: middle;
      font-weight: 400;
    }
    .score {
      position: relative;
      margin: 2rem 0;
    }
    .actions {
      display: flex;
      flex-direction: row;
      align-items: center;
    }
    .score span {
      position: absolute;
      top: 18px;
      left: 14px;
    }
    .play {
      padding-left: 0.6rem;
      margin-left: 2rem;
    }
    h2 {
      margin-top: 0;
      margin-bottom: 1rem;
    }
    .overview p {
      font-weight: 300;
      line-height: 1.5;
      margin-top: 0
    }
    .information h2 {
      display: flex;
      align-items: center;
    }
    .show-more {
      height: 30px;
      width: 30px;
      line-height: 30px;
      margin-left: .5rem;
    }
    dl {
      display: flex;
      flex-direction: row;
      flex-wrap: wrap;
      font-weight: 300;
      margin: 1rem 0;
    }
    dl.left, dl.right {
      display: inline-flex;
      margin-top: 0;
    }
    dl.left {
      width: 50%;
    }
    dl.right {
      width: 50%;
    }
    dt {
      width: 9rem;
      padding-right: 1rem;
      box-sizing: border-box;
      margin: .3rem 0;
      text-align: right;
      font-weight: 400;
    }
    dd {
      width: calc(100% - 9rem);
      margin: .3rem 0;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .right dt {
      width: 7rem;
    }
    .right dd {
      width: calc(100% - 7rem);
    }
    .tags mat-chip {
      margin-top: 0;
      margin-bottom: 0;
      opacity: 1 !important;
      font-weight: 300;
    }
    .cast {
      grid-area: cast;
      display: flex;
      flex-direction: row;
      justify-content: space-between;
      flex-wrap: wrap;
      margin-top: 1rem;
    }
    .people {
      display: flex;
      flex-direction: column;
      width: 140px; /* 185 */
    }
    .profile {
      display: flex;
      align-items: center;
      justify-content: center;
      height: 210px; /* 278 */
      background-size: cover;
      background-position: 50% 50%;
    }
    .profile mat-icon {
      font-size: 6rem;
      height: 6rem;
      width: 6rem;
    }
    .name {
      font-weight: 400;
      font-size: 14px;
      height: 3rem;
      display: flex;
      align-items: center;
      justify-content: center;
      text-align: center;
      padding: 0 .5rem;
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MovieComponent implements OnInit {

  @Input() movie: Movie;

  showMore = false;

  movieExt$: Observable<MovieExt>;

  constructor(
    private core: CoreService,
    private sanitizer: DomSanitizer,
    private socketClient: HttpSocketClientService
  ) { }

  ngOnInit() {
    this.movieExt$ = this.socketClient.get('/api/movies/' + this.movie.id).pipe(
      map((response: MovieExt) => response),
      share()
    );
  }

  getPosterStyle(): Observable<SafeStyle> {
    return this.core.getConfig().pipe(
      filter(s => !!s),
      take(1),
      map(config => this.sanitizer.bypassSecurityTrustStyle(
        `background-image: url(${config.images.secure_base_url}w300${this.movie.poster})`
      ))
    );
  }

  getBackdropStyle(): Observable<SafeStyle> {
    return this.core.getConfig().pipe(
      filter(s => !!s),
      take(1),
      map(config => this.sanitizer.bypassSecurityTrustStyle(
        `background-image: url(${config.images.secure_base_url}original${this.movie.backdrop})`
      ))
    );
  }

  getActorStyle(actor: Cast): Observable<SafeStyle> {
    if (actor.profile_path) {
      return this.core.getConfig().pipe(
        filter(s => !!s),
        take(1),
        map(config => this.sanitizer.bypassSecurityTrustStyle(
          `background-image: url(${config.images.secure_base_url}w185${actor.profile_path})`
        ))
      );
    }
    return EMPTY;
  }

  getLanguage(languageCode: string): Observable<string> {
    return this.core.getConfig().pipe(
      filter(s => !!s),
      take(1),
      map(config =>
        config.languages
          .find(language => language.iso_639_1 === languageCode)
          .english_name
      )
    );
  }

  getScore() {
    return Math.floor(this.movie.vote_average * 10);
  }

  getGenre(details: MovieExt) {
    return details.genres.map(genre => genre.name).join(', ');
  }

  getDirectors(crew: Crew[]) {
    return crew.map(director => director.name).join(', ');
  }

}
