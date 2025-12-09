export class MenuScene extends Phaser.Scene {
    constructor() {
        super('Menu');
    }

    create() {
        const { width, height } = this.scale;

        this.add.image(width / 2, height / 2, 'background').setAlpha(0.6);

        this.add.text(width / 2, height * 0.2, 'arcane overload', {
            fontSize: '64px',
            color: '#ffffff'
        }).setOrigin(0.5);

        this.add.text(width / 2, height * 0.32, 'choose an arena mode', {
            fontSize: '24px',
            color: '#ccccff'
        }).setOrigin(0.5);

        // tutorial arena button
        const tutorialButton = this.add.text(width / 2, height * 0.5, '[ start tutorial arena ]', {
            fontSize: '32px',
            color: '#aaffaa'
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });

        // final arena button
        const finalButton = this.add.text(width / 2, height * 0.6, '[ start final arena ]', {
            fontSize: '32px',
            color: '#ffaaaa'
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });

        const instructions = [
            'wasd or arrow keys to move',
            'move the mouse to aim, left click to cast spells',
            'space to dash and briefly ignore collisions',
            'collect xp orbs to level up and pick upgrades'
        ];

        this.add.text(width / 2, height * 0.78, instructions.join('\n'), {
            fontSize: '20px',
            color: '#ffffff',
            align: 'center'
        }).setOrigin(0.5);

        tutorialButton.on('pointerup', () => {
            this.scene.start('Game', { arena: 'tutorial' });
        });

        // start GameScene in final mode
        finalButton.on('pointerup', () => {
            this.scene.start('Game', { arena: 'final' });
        });
    }
}


