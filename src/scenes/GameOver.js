export class GameOverScene extends Phaser.Scene {
    constructor() {
        super('GameOver');
    }

    create() {
        const { width, height } = this.scale;

        this.add.image(width / 2, height / 2, 'background').setTint(0x880000).setAlpha(0.7);

        this.add.text(width / 2, height * 0.25, 'game over', {
            fontSize: '72px',
            color: '#ffffff'
        }).setOrigin(0.5);

        const data = this.registry.get('finalStats') || {};
        const { timeSurvived = 0, enemiesDefeated = 0, maxLevel = 1 } = data;

        const lines = [
            `time survived: ${timeSurvived.toFixed(1)}s`,
            `enemies defeated: ${enemiesDefeated}`,
            `highest level reached: ${maxLevel}`
        ];

        this.add.text(width / 2, height * 0.45, lines.join('\n'), {
            fontSize: '28px',
            color: '#ffffff',
            align: 'center'
        }).setOrigin(0.5);

        const restart = this.add.text(width / 2, height * 0.72, '[ back to main menu ]', {
            fontSize: '32px',
            color: '#ffdddd'
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });

        restart.on('pointerup', () => {
            this.scene.start('Menu');
        });
    }

}
