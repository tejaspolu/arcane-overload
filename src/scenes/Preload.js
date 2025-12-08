export class PreloadScene extends Phaser.Scene {
    constructor() {
        super('Preload');
    }

    preload() {
        // load all core assets before showing the menu or game
        this.load.image('background', 'assets/bg.png');
        this.load.image('character', 'assets/char.png');

        this.load.image('projectile', 'assets/projectile.png');
        this.load.json('spawns', 'data/spawns.json');

        // enemy sprites
        this.load.image('barnacle', 'assets/barnacle.png');
        this.load.image('bee', 'assets/bee.png');
        this.load.image('block', 'assets/block.png');
        this.load.image('blue_fish', 'assets/blue_fish.png');
        this.load.image('blue_worm', 'assets/blue_worm.png');
        this.load.image('mean_block', 'assets/enemy.png');
        this.load.image('fly', 'assets/fly.png');
        this.load.image('frog', 'assets/frog.png');
        this.load.image('ladybug', 'assets/ladybug.png');
        this.load.image('mouse', 'assets/mouse.png');
        this.load.image('saw', 'assets/saw.png');
        this.load.image('slime_block', 'assets/slime_block.png');
        this.load.image('slime_fire', 'assets/slime_fire.png');
        this.load.image('snail', 'assets/spike_slime.png');
        this.load.image('yellow_fish', 'assets/yellow_fish.png');
        this.load.image('yellow_worm', 'assets/yellow_worm.png');
        this.load.image('landscape', 'assets/tilesheet.png');
        this.load.tilemapTiledJSON('tilemap', 'assets/tilemap.tmj');

        this.load.image('dot', 'assets/dot.png');
        this.load.image('coin', 'assets/coin.png');

        // powerups
        this.load.image('heal', 'assets/hp.png');
        this.load.image('speed', 'assets/speed.png');
        this.load.image('shield', 'assets/shield.png');
        this.load.image('attackspeed', 'assets/attack_speed.png');

        // particles
        this.load.image('fire1', 'assets/fire1.png');
        this.load.image('fire2', 'assets/fire2.png');
        this.load.image('star1', 'assets/star1.png');
        this.load.image('star2', 'assets/star2.png');
        this.load.image('star3', 'assets/star3.png');
        this.load.image('star4', 'assets/star4.png');

        // sound effects
        this.load.audio('congratulations_female', 'assets/congratulationsf.ogg');
        this.load.audio('level_up_female', 'assets/level_upf.ogg');
        this.load.audio('target_destroyed_female', 'assets/target_destroyedf.ogg');
        this.load.audio('congratulations_male', 'assets/congratulationsm.ogg');
        this.load.audio('level_up_male', 'assets/level_upm.ogg');
        this.load.audio('target_destroyed_male', 'assets/target_destroyedm.ogg');
        this.load.audio('congratulations_synth', 'assets/congratulationss.ogg');
        this.load.audio('level_up_synth', 'assets/level_ups.ogg');
        this.load.audio('hurt1', 'assets/hurt1.ogg');
        this.load.audio('hurt2', 'assets/hurt2.ogg');
        this.load.audio('hurt3', 'assets/hurt3.ogg');
        this.load.audio('upgrade1', 'assets/upgrade1.ogg');
        this.load.audio('upgrade2', 'assets/upgrade2.ogg');
        this.load.audio('upgrade3', 'assets/upgrade3.ogg');
        this.load.audio('upgrade4', 'assets/upgrade4.ogg');
        this.load.audio('explosion1', 'assets/explosion1.ogg');
        this.load.audio('explosion2', 'assets/explosion2.ogg');
        this.load.audio('explosion3', 'assets/explosion3.ogg');
        this.load.audio('bg', 'assets/bg.ogg');
    }

    create() {
        // move straight to the main menu once assets are loaded
        this.scene.start('Menu');
    }
}


