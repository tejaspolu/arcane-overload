import { PreloadScene } from './scenes/Preload.js';
import { MenuScene } from './scenes/Menu.js';
import { GameScene } from './scenes/Start.js';
import { GameOverScene } from './scenes/GameOver.js';
import { VictoryScene } from './scenes/Victory.js';

const config = {
    type: Phaser.AUTO,
    title: 'Arcane Overload',
    description: 'top-down survival action game',
    parent: 'game-container',
    width: 960,
    height: 960,
    backgroundColor: '#000000',
    pixelArt: true,
    physics: { default: "arcade", arcade: { debug: false } },
    scene: [
        PreloadScene,
        MenuScene,
        GameScene,
        GameOverScene,
        VictoryScene
    ],
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH
    },
}

new Phaser.Game(config);
