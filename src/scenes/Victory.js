export class VictoryScene extends Phaser.Scene {
    constructor() {
        super('Victory');
    }

    init(data) {
        this.finalStats = data || {};
    }

    create() {
        const { width, height } = this.scale;

        this.add.image(width / 2, height / 2, 'background').setTint(0x66ff99).setAlpha(0.7);

        this.add.text(width / 2, height * 0.2, 'victory', {
            fontSize: '72px',
            color: '#ffffff'
        }).setOrigin(0.5);

        const { timeSurvived = 0, enemiesDefeated = 0, maxLevel = 1 } = this.finalStats;

        const lines = [
            `time survived: ${timeSurvived.toFixed(1)}s`,
            `enemies defeated: ${enemiesDefeated}`,
            `highest level reached: ${maxLevel}`
        ];

        this.add.text(width / 2, height * 0.4, lines.join('\n'), {
            fontSize: '28px',
            color: '#ffffff',
            align: 'center'
        }).setOrigin(0.5);

        const restart = this.add.text(width / 2, height * 0.7, '[ back to main menu ]', {
            fontSize: '32px',
            color: '#ffffaa'
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });

        restart.on('pointerup', () => {
            this.scene.start('Menu');
        });
    }
}


