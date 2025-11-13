// "Every great game begins with a single scene. Let's make this one unforgettable!"
export class GameOver extends Phaser.Scene {
    constructor() {
        super('GameOver');
    }

    preload() {
        this.load.image('background', 'assets/bg.png');
        
    }

    create() {
        this.background = this.add.sprite(640, 320, 'background');
        this.add.text(100, 300, 'GAME OVER MAN.', { fontSize: '128px', fill: '#FFF', align: "center" });
        this.add.text(400, 440, 'GAME OVER', { fontSize: '78px', fill: '#FFF', align: "center" });
    }

}
