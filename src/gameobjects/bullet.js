export class Bullet extends Phaser.GameObjects.Sprite {
    constructor(scene, x, y, direction, speed, damage){
         super(scene, x, y, "dot");
         scene.add.existing(this);
         scene.physics.add.existing(this);
         this.body.setAllowGravity(false);
         this.setScale(0.5);
         if (this.body && this.body.setCircle) {
             this.body.setCircle(2, 2, 2);
         }
         this.direction = Phaser.Math.DegToRad(direction);
         this.setDepth(4);
         this.scene = scene;
         this.last_time = this.scene.time.now;
         this.speed = speed;
         this.damage = damage;
         this.scene.time.delayedCall(10000, () => this.destroy());
    }

    preUpdate(time)
    {
        let dt = (time - this.last_time)/1000;
        this.last_time = time;

        this.x += Math.cos(this.direction)*this.speed*dt;
        this.y += Math.sin(this.direction)*this.speed*dt;
        this.rotation += 15*dt;
    }
}