import {Bullet} from "./bullet.js";

export class Enemy extends Phaser.GameObjects.Sprite {
    constructor(scene, x, y, which, direction, speed, attack_rate, bullet_speed, damage, target, time){
         super(scene, x, y, which);
         scene.add.existing(this);
         scene.physics.add.existing(this);
         this.setDepth(3);
         this.direction = Phaser.Math.DegToRad(direction);
         this.scene = scene;
         this.speed = Math.min(speed * 0.25, 150);
         this.rotation = this.direction;
         this.attack_rate = Math.max(attack_rate*3, 8000);
         this.bullet_speed = Math.min(bullet_speed*0.5, 500);
         this.damage = Math.min(damage, this.scene.wave*5);
         this.target = target;
         this.last_attack = time + Math.random()*this.attack_rate;
         this.dot = scene.add.sprite(0, 0, "dot");
         this.dot.setDepth(6);
         
    }

    preUpdate(time, delta)
    {
        let dt = delta/1000;

        const dx = this.target.x - this.x;
        const dy = this.target.y - this.y;
        const angle = Math.atan2(dy, dx);
        this.rotation = angle+Math.PI;
        if (Math.abs(dx) > 10 || Math.abs(dy) > 10)
        {
            this.x += Math.cos(angle)*this.speed*dt;
            this.y += Math.sin(angle)*this.speed*dt;
        }
        else
        {
            this.rotation = Math.atan2(this.scene.player.y - this.y, this.scene.player.x - this.x) + Math.PI;
        }
        if (this.last_attack + this.attack_rate < time)
        {
            this.last_attack = time;
            let b = new Bullet(this.scene, this.x, this.y, this.angle+180, this.bullet_speed, this.damage);
            b.tint = 0xff0000;
            this.scene.enemy_bullets.add(b);
        }
        let bounds = this.scene.cameras.main.worldView;
        let show_dot = false;
        this.dot.x = this.x;
        this.dot.y = this.y;
        if (this.x < bounds.left)
        {
            this.dot.x = bounds.left + 10;
            show_dot = true;
        }
        if (this.x > bounds.right)
        {
            this.dot.x = bounds.right - 10;
            show_dot = true;
        }
        if (this.y < bounds.top)
        {
            this.dot.y = bounds.top + 10;
            show_dot = true;
        }
        if (this.y > bounds.bottom)
        {
            this.dot.y = bounds.bottom - 10;
            show_dot = true;
        }
        this.dot.visible = show_dot;
    }
}