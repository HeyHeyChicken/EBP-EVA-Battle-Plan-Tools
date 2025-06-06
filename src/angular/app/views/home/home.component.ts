//#region Imports

import { CommonModule } from "@angular/common";
import { ChangeDetectorRef, Component, NgZone, OnInit } from "@angular/core";
import { TranslateModule } from "@ngx-translate/core";
import { MatTooltipModule } from "@angular/material/tooltip";
import { GridModule } from "../../shared/grid/grid.module";
import { LoaderComponent } from "../../shared/loader/loader.component";
import { MessageComponent } from "../../shared/message/message.component";
import Tesseract, { createWorker, PSM } from "tesseract.js";
import { ToastrService } from "ngx-toastr";
import { Map } from "./models/map";
import { Game } from "./models/game";
import { RGB } from "./models/rgb";
import { GlobalService } from "../../core/services/global.service";

//#endregion

@Component({
  selector: "view-home",
  templateUrl: "./home.component.html",
  styleUrls: ["./home.component.scss"],
  standalone: true,
  imports: [
    GridModule,
    MatTooltipModule,
    TranslateModule,
    CommonModule,
    TranslateModule,
    LoaderComponent,
    MessageComponent,
  ],
})
export class HomeComponent implements OnInit {
  //#region Attributes

  protected percent: number = -1;
  protected games: Game[] = [];
  protected inputFileDisabled: boolean = true;
  protected videoPath: string | undefined;

  private start: number = 0;

  private tesseractWorker_basic: Tesseract.Worker | undefined;
  private tesseractWorker_number: Tesseract.Worker | undefined;
  private tesseractWorker_letter: Tesseract.Worker | undefined;
  private tesseractWorker_time: Tesseract.Worker | undefined;

  //#endregion

  constructor(
    protected readonly globalService: GlobalService,
    private readonly toastrService: ToastrService,
    private readonly ngZone: NgZone
  ) {}

  //#region Functions

  ngOnInit(): void {
    this.initTesseract();

    // The server gives the path of the video file selected by the user.
    //@ts-ignore
    window.electronAPI.setVideoFile((path: string) => {
      this.ngZone.run(() => {
        this.inputFileDisabled = false;

        if (path) {
          this.videoPath = path;
          this.percent = 0;
        } else {
          this.toastrService.error("No files selected");
        }
      });
    });
  }

  private async initTesseract() {
    this.tesseractWorker_basic = await createWorker("eng");
    this.tesseractWorker_number = await createWorker("eng");
    this.tesseractWorker_letter = await createWorker("eng");
    this.tesseractWorker_time = await createWorker("eng");

    this.tesseractWorker_basic.setParameters({
      tessedit_char_whitelist:
        "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789",
    });
    this.tesseractWorker_number.setParameters({
      tessedit_char_whitelist: "0123456789",
    });
    this.tesseractWorker_letter.setParameters({
      tessedit_char_whitelist:
        "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz ",
    });
    this.tesseractWorker_time.setParameters({
      tessedit_char_whitelist: "0123456789:",
    });

    this.inputFileDisabled = false;
  }

  protected onInputFileClick(): void {
    if (!this.inputFileDisabled) {
      this.videoPath = undefined;
      this.inputFileDisabled = true;
      this.games = [];

      //@ts-ignore
      window.electronAPI.openVideoFile();
    }
  }

  /**
   * This function initializes the position of a video's playhead when it is loaded.
   * @param event
   */
  protected videoLoadedData(event: Event) {
    if (event.target) {
      const VIDEO = event.target as HTMLVideoElement;
      VIDEO.currentTime = VIDEO.duration;
    }
  }

  protected async videoTimeUpdate(event: Event) {
    if (this.videoPath) {
      if (this.start == 0) {
        this.start = Date.now();
      }
      if (event.target) {
        const VIDEO = event.target as HTMLVideoElement;
        let found /* boolean */ = false;
        const DEFAULT_STEP /* number */ = 2;
        if (VIDEO.currentTime > 0) {
          const NOW /* number */ = VIDEO.currentTime;

          this.percent = Math.ceil(100 - (NOW / VIDEO.duration) * 100);

          //#region Détéction de la fin d'une game

          if (!found) {
            const MODE = this.detectGameScoreFrame(VIDEO, this.games);
            if (MODE > 0) {
              found = true;
              const GAME /* Game */ = new Game(MODE);
              GAME.end = NOW;

              const PLAYER_NAME_X /* number */ = 475;
              const PLAYER_NAME_MAX_WIDTH /* number */ = 154;

              //#region Orange team

              const ORANGE_TEAM_NAME /* string */ = await this.getTextFromImage(
                VIDEO,
                this.tesseractWorker_basic!,
                GAME.mode == 1 ? 390 : 388,
                GAME.mode == 1 ? 187 : 159,
                GAME.mode == 1 ? 620 : 618,
                GAME.mode == 1 ? 217 : 189,
                7
              );
              if (ORANGE_TEAM_NAME && ORANGE_TEAM_NAME.length >= 2) {
                GAME.orangeTeam.name = ORANGE_TEAM_NAME.toUpperCase();
              }

              const ORANGE_TEAM_SCORE /* string */ =
                await this.getTextFromImage(
                  VIDEO,
                  this.tesseractWorker_number!,
                  530,
                  GAME.mode == 1 ? 89 : 54,
                  620,
                  GAME.mode == 1 ? 127 : 92,
                  7
                );
              if (ORANGE_TEAM_SCORE) {
                const INT_VALUE = parseInt(ORANGE_TEAM_SCORE);
                if (INT_VALUE <= 100) {
                  GAME.orangeTeam.score = INT_VALUE;
                }
              }

              // const ORANGE_PLAYER_1 /* string */ = await getTextFromImage(
              //   VIDEO,
              //   document.tesseractWorker,
              //   PLAYER_NAME_X,
              //   259,
              //   PLAYER_NAME_X + PLAYER_NAME_MAX_WIDTH,
              //   282,
              //   7
              // );
              // if (ORANGE_PLAYER_1) {
              //   GAME.orangeTeam.players.push(new Player(1, ORANGE_PLAYER_1));
              // }

              // const ORANGE_PLAYER_2 /* string */ = await getTextFromImage(
              //   VIDEO,
              //   document.tesseractWorker,
              //   PLAYER_NAME_X,
              //   312,
              //   PLAYER_NAME_X + PLAYER_NAME_MAX_WIDTH,
              //   335,
              //   7
              // );
              // if (ORANGE_PLAYER_2) {
              //   GAME.orangeTeam.players.push(new Player(2, ORANGE_PLAYER_2));
              // }

              // const ORANGE_PLAYER_3 /* string */ = await getTextFromImage(
              //   VIDEO,
              //   document.tesseractWorker,
              //   PLAYER_NAME_X,
              //   365,
              //   PLAYER_NAME_X + PLAYER_NAME_MAX_WIDTH,
              //   388,
              //   7
              // );
              // if (ORANGE_PLAYER_3) {
              //   GAME.orangeTeam.players.push(new Player(3, ORANGE_PLAYER_3));
              // }

              // const ORANGE_PLAYER_4 /* string */ = await getTextFromImage(
              //   VIDEO,
              //   document.tesseractWorker,
              //   PLAYER_NAME_X,
              //   418,
              //   PLAYER_NAME_X + PLAYER_NAME_MAX_WIDTH,
              //   441,
              //   7
              // );
              // if (ORANGE_PLAYER_4) {
              //   GAME.orangeTeam.players.push(new Player(4, ORANGE_PLAYER_4));
              // }

              //#endregion

              //#region Blue team

              const BLUE_TEAM_NAME /* string */ = await this.getTextFromImage(
                VIDEO,
                this.tesseractWorker_basic!,
                390,
                GAME.mode == 1 ? 637 : 629,
                620,
                GAME.mode == 1 ? 667 : 679,
                7
              );
              if (BLUE_TEAM_NAME && BLUE_TEAM_NAME.length >= 2) {
                GAME.blueTeam.name = BLUE_TEAM_NAME.toUpperCase();
              }

              const BLUE_TEAM_SCORE /* string */ = await this.getTextFromImage(
                VIDEO,
                this.tesseractWorker_number!,
                GAME.mode == 1 ? 1294 : 1286,
                GAME.mode == 1 ? 89 : 54,
                GAME.mode == 1 ? 1384 : 1376,
                GAME.mode == 1 ? 127 : 93,
                7
              );
              if (BLUE_TEAM_SCORE) {
                const INT_VALUE = parseInt(BLUE_TEAM_SCORE);
                if (INT_VALUE <= 100) {
                  GAME.blueTeam.score = INT_VALUE;
                }
              }

              // const BLUE_PLAYER_1 /* string */ = await getTextFromImage(
              //   VIDEO,
              //   document.tesseractWorker,
              //   PLAYER_NAME_X,
              //   712,
              //   PLAYER_NAME_X + PLAYER_NAME_MAX_WIDTH,
              //   735,
              //   7
              // );
              // if (BLUE_PLAYER_1) {
              //   GAME.blueTeam.players.push(new Player(6, BLUE_PLAYER_1));
              // }

              // const BLUE_PLAYER_2 /* string */ = await getTextFromImage(
              //   VIDEO,
              //   document.tesseractWorker,
              //   PLAYER_NAME_X,
              //   765,
              //   PLAYER_NAME_X + PLAYER_NAME_MAX_WIDTH,
              //   788,
              //   7
              // );
              // if (BLUE_PLAYER_2) {
              //   GAME.blueTeam.players.push(new Player(7, BLUE_PLAYER_2));
              // }

              // const BLUE_PLAYER_3 /* string */ = await getTextFromImage(
              //   VIDEO,
              //   document.tesseractWorker,
              //   PLAYER_NAME_X,
              //   818,
              //   PLAYER_NAME_X + PLAYER_NAME_MAX_WIDTH,
              //   841,
              //   7
              // );
              // if (BLUE_PLAYER_3) {
              //   GAME.blueTeam.players.push(new Player(8, BLUE_PLAYER_3));
              // }

              // const BLUE_PLAYER_4 /* string */ = await getTextFromImage(
              //   VIDEO,
              //   document.tesseractWorker,
              //   PLAYER_NAME_X,
              //   871,
              //   PLAYER_NAME_X + PLAYER_NAME_MAX_WIDTH,
              //   894,
              //   7
              // );
              // if (BLUE_PLAYER_4) {
              //   GAME.blueTeam.players.push(new Player(9, BLUE_PLAYER_4));
              // }

              //#endregion

              this.games.unshift(GAME);
            }
          }

          //#endregion

          //#region Détéction du début d'une game

          if (!found) {
            if (this.detectGameLoadingFrame(VIDEO, this.games)) {
              found = true;
              this.games[0].start =
                NOW + 2 /* On vire le bout de loader de map. */;
            }
          }

          if (!found) {
            if (this.detectGameIntro(VIDEO, this.games)) {
              found = true;
              this.games[0].start =
                NOW + 2 /* On vire le bout d'animation de map. */;
            }
          }

          //#endregion

          //#region Detecting card name during game.

          if (!found) {
            if (this.detectGamePlaying(VIDEO, this.games)) {
              // On cherche le nom de la carte.
              if (this.games[0].map == "") {
                const TEXT /* string */ = await this.getTextFromImage(
                  VIDEO,
                  this.tesseractWorker_letter!,
                  825,
                  this.games[0].mode == 1 ? 81 : 89,
                  1093,
                  this.games[0].mode == 1 ? 102 : 110,
                  7
                );
                if (TEXT) {
                  found = true;
                  if (this.games[0].map == "") {
                    const MAP_NAME /* string */ = this.getMapByName(TEXT);
                    this.games[0].map = MAP_NAME;
                    this.games[0].name = MAP_NAME;
                  }
                }
              }

              // We are looking for the name of the orange team.
              if (this.games[0].orangeTeam.name == "") {
                const TEXT /* string */ = await this.getTextFromImage(
                  VIDEO,
                  this.tesseractWorker_basic!,
                  686,
                  22,
                  833,
                  68,
                  6
                );
                if (TEXT && TEXT.length >= 2) {
                  found = true;
                  if (this.games[0].orangeTeam.name == "") {
                    this.games[0].orangeTeam.name = TEXT.toUpperCase();
                  }
                }
              }

              // We are looking for the name of the blue team.
              if (this.games[0].blueTeam.name == "") {
                const TEXT /* string */ = await this.getTextFromImage(
                  VIDEO,
                  this.tesseractWorker_basic!,
                  1087,
                  22,
                  1226,
                  68,
                  6
                );
                if (TEXT && TEXT.length >= 2) {
                  found = true;
                  if (this.games[0].blueTeam.name == "") {
                    this.games[0].blueTeam.name = TEXT.toUpperCase();
                  }
                }
              }

              if (
                this.games[0].orangeTeam.name &&
                this.games[0].blueTeam.name &&
                this.games[0].map
              ) {
                if (!this.games[0].__debug__jumped) {
                  const TEXT /* string */ = await this.getTextFromImage(
                    VIDEO,
                    this.tesseractWorker_time!,
                    935,
                    0,
                    985,
                    28,
                    7
                  );
                  if (TEXT) {
                    found = true;
                    const SPLITTED /* string[] */ = TEXT.split(":");
                    if (SPLITTED.length == 2) {
                      const MINUTES = parseInt(SPLITTED[0]);
                      const SECONDES = parseInt(SPLITTED[1]);
                      const DIFFERENCE = (10 - MINUTES) * 60 - SECONDES;
                      if (MINUTES <= 9) {
                        if (!this.games[0].__debug__jumped) {
                          this.games[0].__debug__jumped = true;
                          console.log("Jumping to the game's start !");
                          this.setVideoCurrentTime(
                            VIDEO,
                            NOW - DIFFERENCE,
                            this.games,
                            this.videoPath,
                            this.globalService.discordServerURL
                          );
                          return;
                        }
                      }
                    }
                  }
                }
              }
            }
          }

          //#endregion

          this.setVideoCurrentTime(
            VIDEO,
            NOW - DEFAULT_STEP,
            this.games,
            this.videoPath,
            this.globalService.discordServerURL
          );
        } else {
          this.onVideoEnded(
            this.games,
            this.videoPath,
            this.globalService.discordServerURL
          );

          const DIFFERENCE = Date.now() - this.start;
          const MINUTES = Math.floor(DIFFERENCE / 60000);
          const SECONDS = Math.floor((DIFFERENCE % 60000) / 1000);

          console.log(
            `${MINUTES.toString().padStart(
              2,
              "0"
            )}m ${SECONDS.toString().padStart(2, "0")}s`
          );
          this.start = 0;
        }
      }
    }
  }

  /**
   * This function returns the RGB color of a video pixel at a given position.
   * @param video HTML DOM of the video from which to extract the pixel.
   * @param x X coordinate of the pixel on the video.
   * @param y  Y coordinate of the pixel on the video.
   * @returns RGB color of the video pixel.
   */
  private getPixelColor(video: HTMLVideoElement, x: number, y: number): RGB {
    if (video) {
      const CANVAS = document.createElement("canvas");
      CANVAS.width = 1;
      CANVAS.height = 1;
      const CTX = CANVAS.getContext("2d");
      if (CTX) {
        CTX.drawImage(
          video /* Image */,
          x /* Image X */,
          y /* Image Y */,
          1 /* Image width */,
          1 /* Image height */,
          0 /* Canvas X */,
          0 /* Canvas Y */,
          1 /* Canvas width */,
          1 /* Canvas height */
        );
        const FRAME_DATA = CTX.getImageData(0, 0, 1, 1).data;
        return new RGB(FRAME_DATA[0], FRAME_DATA[1], FRAME_DATA[2]);
      }
    }

    return new RGB(0, 0, 0);
  }

  /**
   * This function allows you to define if two colors are similar.
   * @param color1 Couleur 1.
   * @param color2 Couleur 2.
   * @param maxDifference Tolerance.
   * @returns Are the colors similar?
   */
  private colorSimilarity(
    color1: RGB,
    color2: RGB,
    maxDifference: number = 20
  ): boolean {
    return (
      Math.abs(color1.r - color2.r) <= maxDifference &&
      Math.abs(color1.g - color2.g) <= maxDifference &&
      Math.abs(color1.b - color2.b) <= maxDifference
    );
  }

  /**
   * This function returns the map that resembles what the OCR found.
   * @param search Text found by OCR.
   * @returns Name of the map found.
   */
  private getMapByName(search: string): string {
    const MAPS: Map[] = [
      new Map("Artefact", ["artefact"]),
      new Map("Atlantis", ["atlantis"]),
      new Map("Ceres", ["ceres"]),
      new Map("Engine", ["engine"]),
      new Map("Helios Station", ["helios", "station"]),
      new Map("Lunar Outpost", ["lunar", "outpost"]),
      new Map("Outlaw", ["outlaw"]),
      new Map("Polaris", ["polaris"]),
      new Map("Silva", ["silva"]),
      new Map("The Cliff", ["cliff"]),
      new Map("The Rock", ["rock"]),
    ];
    const SPLITTED = search
      .replace(/(\r\n|\n|\r)/gm, "")
      .toLowerCase()
      .split(" ");
    const RESULT = MAPS.find((x) =>
      SPLITTED.some((s) => x.dictionnary.includes(s))
    );
    if (RESULT) {
      return RESULT.name;
    }
    return "";
  }

  /**
   * This function detects the end of a game via the score display.
   * @param video HTML DOM of the video element to be analyzed.
   * @param games List of games already detected.
   * @returns Is the current frame a game score frame?
   */
  private detectGameScoreFrame(video: HTMLVideoElement, games: Game[]): number {
    if (games.length == 0 || games[0].start != -1) {
      if (
        /* Orange logo */
        this.colorSimilarity(
          this.getPixelColor(video, 325, 153),
          new RGB(239, 203, 14)
        ) &&
        /* Blue logo */
        this.colorSimilarity(
          this.getPixelColor(video, 313, 613),
          new RGB(50, 138, 230)
        )
      ) {
        console.log("Detect game score frame (mode 1)");
        return 1;
      }
      if (
        /* Orange logo */
        this.colorSimilarity(
          this.getPixelColor(video, 325, 123),
          new RGB(239, 203, 14)
        ) &&
        /* Blue logo */
        this.colorSimilarity(
          this.getPixelColor(video, 313, 618),
          new RGB(50, 138, 230)
        )
      ) {
        console.log("Detect game score frame (mode 2)");
        return 2;
      }
    }
    return 0;
  }

  /**
   * This function allows you to set the timecode of the video.
   * @param video HTML DOM of the video element to set the timecode to
   * @param time Timecode in seconds to apply.
   * @param games List of games already detected.
   * @param videoPath Path of the video file to analyze.
   * @param discordServerURL EBP Discord server URL.
   */
  private setVideoCurrentTime(
    video: HTMLVideoElement,
    time: number,
    games: Game[],
    videoPath: string,
    discordServerURL: string
  ): void {
    if (video) {
      if (time < video.duration) {
        video.currentTime = time;
      } else {
        this.onVideoEnded(games, videoPath, discordServerURL);
      }
    }
  }

  /**
   * This function is executed when the video scan is complete.
   * @param games List of detected games.
   * @param videoPath Path of the analyzed video file.
   * @param discordServerURL EBP Discord server URL.
   */
  private onVideoEnded(
    games: Game[],
    videoPath: string,
    discordServerURL: string
  ): void {
    this.percent = -1;
    if (games.length == 0) {
      this.toastrService
        .error(
          "No games were found in your video. If you think this is a mistake, please let me know."
        )
        .onTap.subscribe(() => {
          //@ts-ignore
          window.electronAPI.openURL(discordServerURL);
        });
    }
  }

  protected async save(game: Game): Promise<void> {
    //@ts-ignore
    const FILE_PATH = await window.electronAPI.cutVideoFile(
      game,
      this.videoPath
    );
    this.toastrService
      .success("Your video has been cut here: " + FILE_PATH)
      .onTap.subscribe(() => {
        //@ts-ignore
        window.electronAPI.readVideoFile(FILE_PATH);
      });
  }

  protected async saveAll(): Promise<void> {
    //@ts-ignore
    const FILE_PATH = await window.electronAPI.cutVideoFiles(
      this.games,
      this.videoPath
    );

    this.toastrService
      .success("Your videos have been cut here: " + FILE_PATH)
      .onTap.subscribe(() => {
        //@ts-ignore
        window.electronAPI.readVideoFile(FILE_PATH);
      });
  }

  protected copyTimeCodes(): void {
    let result = "";
    this.games.forEach((game) => {
      result += `${game.readableStart} ${game.orangeTeam.name} vs ${game.blueTeam.name} - ${game.map}\n`;
    });
    navigator.clipboard.writeText(result);

    this.toastrService.success("Data has been added to your clipboard.");
  }

  /**
   * This function detects the start of a game via the display of the EVA loader.
   * @param video HTML DOM of the video element to be analyzed.
   * @param games List of games already detected.
   * @returns Is the current frame a game loading frame?
   */
  private detectGameLoadingFrame(
    video: HTMLVideoElement,
    games: Game[]
  ): boolean {
    if (games.length > 0 && games[0].end != -1 && games[0].start == -1) {
      switch (games[0].mode) {
        case 1:
        case 2:
          if (
            /* Logo top */ this.colorSimilarity(
              this.getPixelColor(video, 958, 427),
              new RGB(255, 255, 255)
            ) &&
            /* Logo left */ this.colorSimilarity(
              this.getPixelColor(video, 857, 653),
              new RGB(255, 255, 255)
            ) &&
            /* Logo right */ this.colorSimilarity(
              this.getPixelColor(video, 1060, 653),
              new RGB(255, 255, 255)
            ) &&
            /* Logo middle */ this.colorSimilarity(
              this.getPixelColor(video, 958, 642),
              new RGB(255, 255, 255)
            ) &&
            /* Logo black 1 */ this.colorSimilarity(
              this.getPixelColor(video, 958, 463),
              new RGB(0, 0, 0)
            ) &&
            /* Logo black 2 */ this.colorSimilarity(
              this.getPixelColor(video, 880, 653),
              new RGB(0, 0, 0)
            ) &&
            /* Logo black 3 */ this.colorSimilarity(
              this.getPixelColor(video, 1037, 653),
              new RGB(0, 0, 0)
            ) &&
            /* Logo black 4 */ this.colorSimilarity(
              this.getPixelColor(video, 958, 610),
              new RGB(0, 0, 0)
            )
          ) {
            console.log("Detect game loading frame");
            return true;
          }
          break;
      }
    }
    return false;
  }

  /**
   * This function detects the start of a game via the introduction of the map.
   * @param video HTML DOM of the video element to be analyzed.
   * @param games List of games already detected.
   * @returns Is the current frame a game intro frame?
   */
  private detectGameIntro(video: HTMLVideoElement, games: Game[]): boolean {
    if (games.length > 0 && games[0].end != -1 && games[0].start == -1) {
      // We are trying to detect the "B" of "BATTLE ARENA" in the lower right corner of the image.
      if (
        //#region B1
        (this.colorSimilarity(
          this.getPixelColor(video, 1495, 942),
          new RGB(255, 255, 255),
          30
        ) &&
          this.colorSimilarity(
            this.getPixelColor(video, 1512, 950),
            new RGB(255, 255, 255),
            30
          ) &&
          this.colorSimilarity(
            this.getPixelColor(video, 1495, 962),
            new RGB(255, 255, 255),
            30
          ) &&
          this.colorSimilarity(
            this.getPixelColor(video, 1512, 972),
            new RGB(255, 255, 255),
            30
          ) &&
          this.colorSimilarity(
            this.getPixelColor(video, 1495, 982),
            new RGB(255, 255, 255),
            30
          ) &&
          this.colorSimilarity(
            this.getPixelColor(video, 1503, 951),
            new RGB(0, 0, 0),
            200
          ) &&
          this.colorSimilarity(
            this.getPixelColor(video, 1503, 972),
            new RGB(0, 0, 0),
            200
          )) ||
        //#endregion
        //#region B2
        (this.colorSimilarity(
          this.getPixelColor(video, 1558, 960),
          new RGB(255, 255, 255),
          30
        ) &&
          this.colorSimilarity(
            this.getPixelColor(video, 1572, 968),
            new RGB(255, 255, 255),
            30
          ) &&
          this.colorSimilarity(
            this.getPixelColor(video, 1558, 977),
            new RGB(255, 255, 255),
            30
          ) &&
          this.colorSimilarity(
            this.getPixelColor(video, 1572, 987),
            new RGB(255, 255, 255),
            30
          ) &&
          this.colorSimilarity(
            this.getPixelColor(video, 1558, 995),
            new RGB(255, 255, 255),
            30
          ) &&
          this.colorSimilarity(
            this.getPixelColor(video, 1564, 969),
            new RGB(0, 0, 0),
            200
          ) &&
          this.colorSimilarity(
            this.getPixelColor(video, 1564, 986),
            new RGB(0, 0, 0),
            200
          )) ||
        //#endregion
        //#region B3
        (this.colorSimilarity(
          this.getPixelColor(video, 1556, 957),
          new RGB(255, 255, 255),
          30
        ) &&
          this.colorSimilarity(
            this.getPixelColor(video, 1571, 964),
            new RGB(255, 255, 255),
            30
          ) &&
          this.colorSimilarity(
            this.getPixelColor(video, 1556, 975),
            new RGB(255, 255, 255),
            30
          ) &&
          this.colorSimilarity(
            this.getPixelColor(video, 1571, 984),
            new RGB(255, 255, 255),
            30
          ) &&
          this.colorSimilarity(
            this.getPixelColor(video, 1556, 993),
            new RGB(255, 255, 255),
            30
          ) &&
          this.colorSimilarity(
            this.getPixelColor(video, 1564, 966),
            new RGB(0, 0, 0),
            200
          ) &&
          this.colorSimilarity(
            this.getPixelColor(video, 1564, 984),
            new RGB(0, 0, 0),
            200
          )) ||
        //#endregion
        //#region B4
        (this.colorSimilarity(
          this.getPixelColor(video, 1617, 979),
          new RGB(255, 255, 255),
          30
        ) &&
          this.colorSimilarity(
            this.getPixelColor(video, 1630, 985),
            new RGB(255, 255, 255),
            30
          ) &&
          this.colorSimilarity(
            this.getPixelColor(video, 1617, 995),
            new RGB(255, 255, 255),
            30
          ) &&
          this.colorSimilarity(
            this.getPixelColor(video, 1630, 1004),
            new RGB(255, 255, 255),
            30
          ) &&
          this.colorSimilarity(
            this.getPixelColor(video, 1617, 1011),
            new RGB(255, 255, 255),
            30
          ) &&
          this.colorSimilarity(
            this.getPixelColor(video, 1623, 987),
            new RGB(0, 0, 0),
            200
          ) &&
          this.colorSimilarity(
            this.getPixelColor(video, 1623, 1004),
            new RGB(0, 0, 0),
            200
          )) ||
        //#endregion
        //#region B5
        (this.colorSimilarity(
          this.getPixelColor(video, 1606, 976),
          new RGB(255, 255, 255),
          30
        ) &&
          this.colorSimilarity(
            this.getPixelColor(video, 1619, 982),
            new RGB(255, 255, 255),
            30
          ) &&
          this.colorSimilarity(
            this.getPixelColor(video, 1606, 991),
            new RGB(255, 255, 255),
            30
          ) &&
          this.colorSimilarity(
            this.getPixelColor(video, 1619, 1000),
            new RGB(255, 255, 255),
            30
          ) &&
          this.colorSimilarity(
            this.getPixelColor(video, 1606, 1008),
            new RGB(255, 255, 255),
            30
          ) &&
          this.colorSimilarity(
            this.getPixelColor(video, 1612, 983),
            new RGB(0, 0, 0),
            200
          ) &&
          this.colorSimilarity(
            this.getPixelColor(video, 1612, 1000),
            new RGB(0, 0, 0),
            200
          ))
        //#endregion
      ) {
        console.log("Detect game intro frame");
        return true;
      }
    }
    return false;
  }

  /**
   * This function detects a playing game frame.
   * @param video HTML DOM of the video element to be analyzed.
   * @param games List of games already detected.
   * @returns Is the current frame a playing game frame?
   */
  private detectGamePlaying(video: HTMLVideoElement, games: Game[]): boolean {
    if (games.length > 0 && games[0].start == -1) {
      // Trying to detect the color of all players' life bars.
      const J1_PIXEL = this.getPixelColor(
        video,
        118,
        games[0].mode == 1 ? 742 : 717
      );
      const J2_PIXEL = this.getPixelColor(
        video,
        118,
        games[0].mode == 1 ? 825 : 806
      );
      const J3_PIXEL = this.getPixelColor(
        video,
        118,
        games[0].mode == 1 ? 907 : 896
      );
      const J4_PIXEL = this.getPixelColor(
        video,
        118,
        games[0].mode == 1 ? 991 : 985
      );
      const J5_PIXEL = this.getPixelColor(
        video,
        1801,
        games[0].mode == 1 ? 742 : 717
      );
      const J6_PIXEL = this.getPixelColor(
        video,
        1801,
        games[0].mode == 1 ? 825 : 806
      );
      const J7_PIXEL = this.getPixelColor(
        video,
        1801,
        games[0].mode == 1 ? 907 : 896
      );
      const J8_PIXEL = this.getPixelColor(
        video,
        1801,
        games[0].mode == 1 ? 991 : 985
      );
      if (
        //#region Orange team
        // Player 1
        (this.colorSimilarity(J1_PIXEL, new RGB(231, 123, 9)) ||
          this.colorSimilarity(J1_PIXEL, new RGB(0, 0, 0), 50)) &&
        // Player 2
        (this.colorSimilarity(J2_PIXEL, new RGB(231, 123, 9)) ||
          this.colorSimilarity(J2_PIXEL, new RGB(0, 0, 0), 50)) &&
        // Player 3
        (this.colorSimilarity(J3_PIXEL, new RGB(231, 123, 9)) ||
          this.colorSimilarity(J3_PIXEL, new RGB(0, 0, 0), 50)) &&
        //Joueur 4
        (this.colorSimilarity(J4_PIXEL, new RGB(231, 123, 9)) ||
          this.colorSimilarity(J4_PIXEL, new RGB(0, 0, 0), 50)) &&
        //#endregion
        //#region Blue team
        //Joueur 1
        (this.colorSimilarity(J5_PIXEL, new RGB(30, 126, 242)) ||
          this.colorSimilarity(J5_PIXEL, new RGB(0, 0, 0), 50)) &&
        // Player 2
        (this.colorSimilarity(J6_PIXEL, new RGB(30, 126, 242)) ||
          this.colorSimilarity(J6_PIXEL, new RGB(0, 0, 0), 50)) &&
        // Player 3
        (this.colorSimilarity(J7_PIXEL, new RGB(30, 126, 242)) ||
          this.colorSimilarity(J7_PIXEL, new RGB(0, 0, 0), 50)) &&
        // Player 4
        (this.colorSimilarity(J8_PIXEL, new RGB(30, 126, 242)) ||
          this.colorSimilarity(J8_PIXEL, new RGB(0, 0, 0), 50))
        //#endregion
      ) {
        console.log("Detect game playing frame");
        return true;
      }
      return false;
    }
    return false;
  }

  /**
   * This function attempts to find text present in a canvas at specific coordinates.
   * @param video HTML DOM of the video element to be analyzed.
   * @param tesseractWorker Tesseract instance.
   * @param x1 X position of the top left corner of the rectangle to be analyzed.
   * @param y1 Y position of the top left corner of the rectangle to be analyzed.
   * @param x2 X position of the bottom right corner of the rectangle to be analyzed.
   * @param y2 Y position of the bottom right corner of the rectangle to be analyzed.
   * @param tesseditPagesegMode Page segmentation mode (how Tesseract divides the text to be recognized).
   * @param imageModeIndex // Index of the transformation list to apply to the rectangle to make it more readable by OCR.
   * @param imageModeOrder // Transformation list to apply to the rectangle to make it more readable by OCR.
   * @returns Text found by OCR.
   */
  private async getTextFromImage(
    video: HTMLVideoElement,
    tesseractWorker: Tesseract.Worker,
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    tesseditPagesegMode: number = 3,
    imageModeIndex: number = 0,
    imageModeOrder: number[] = [0, 1, 2]
  ): Promise<string> {
    if (video) {
      const CANVAS = document.createElement("canvas");
      const WIDTH /* number */ = x2 - x1;
      const HEIGHT /* number */ = y2 - y1;
      CANVAS.width = WIDTH;
      CANVAS.height = HEIGHT;
      const CTX = CANVAS.getContext("2d");
      if (CTX) {
        switch (imageModeOrder[imageModeIndex]) {
          case 1:
            CTX.filter = "grayscale(1) contrast(100) brightness(1)";
            break;
          case 2:
            CTX.filter = "grayscale(1) contrast(100) brightness(1) invert(1)";
            break;
        }
        CTX.drawImage(
          video /* Image */,
          x1 /* Image X */,
          y1 /* Image Y */,
          WIDTH /* Image width */,
          HEIGHT /* Image height */,
          0 /* Canvas X */,
          0 /* Canvas Y */,
          WIDTH /* Canvas width */,
          HEIGHT /* Canvas height */
        );
        const IMG = CANVAS.toDataURL("image/png");
        await tesseractWorker.setParameters({
          tessedit_pageseg_mode: tesseditPagesegMode.toString() as PSM,
        });
        const DATA = await tesseractWorker.recognize(IMG);
        if (!DATA.data.text && imageModeIndex < imageModeOrder.length - 1) {
          return this.getTextFromImage(
            video,
            tesseractWorker,
            x1,
            y1,
            x2,
            y2,
            tesseditPagesegMode,
            imageModeIndex + 1,
            imageModeOrder
          );
        }
        return DATA.data.text.replace(/\r?\n|\r/, "");
      }
    }
    return Promise.resolve("");
  }

  //#endregion
}
