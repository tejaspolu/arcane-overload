import { Bullet } from '../gameobjects/bullet.js';

export class GameScene extends Phaser.Scene {
    constructor() {
        super('Game');
    }

    init(data) {
        this.arenaType = data?.arena || 'tutorial';
    }

    create() {
        // layout: simple single-screen tutorial arena using the tilemap
        const mapKey = (this.arenaType === 'final') ? 'tilemap_final' : 'tilemap';
        this.map = this.make.tilemap({ key: mapKey });
        const tileset = this.map.addTilesetImage('landscape', 'landscape');

        this.map.createLayer('background', tileset, 0, 0).setDepth(0);
        const obstacles = this.map.createLayer('obstacles', tileset, 0, 0);
        obstacles.setCollisionByExclusion([-1]);
        obstacles.setDepth(1);
        this.obstaclesLayer = obstacles;
        this.map.createLayer('paths', tileset, 0, 0).setDepth(0.5);
        this.map.createLayer('decoration', tileset, 0, 0).setDepth(2);

        this.tileWidth = this.map.tileWidth;
        this.tileHeight = this.map.tileHeight;
        this.buildNavGrid();

        this.waterColliders = this.physics.add.staticGroup();
        for (let y = 0; y < this.map.height; y++) {
            for (let x = 0; x < this.map.width; x++) {
                const tile = this.obstaclesLayer.getTileAt(x, y);
                if (tile && tile.collides) {
                    const wx = this.map.tileToWorldX(x) + this.tileWidth / 2;
                    const wy = this.map.tileToWorldY(y) + this.tileHeight / 2;
                    const blocker = this.physics.add.staticImage(wx, wy);
                    blocker.setVisible(false);
                    blocker.body.setSize(this.tileWidth * 0.7, this.tileHeight * 0.7, true);
                    this.waterColliders.add(blocker);
                }
            }
        }

        // player setup
        const centerX = this.map.widthInPixels / 2;
        const centerY = this.map.heightInPixels / 2;
        this.player = this.physics.add.sprite(centerX, centerY, 'character');
        this.player.setScale(0.7);
        this.player.setDepth(3);
        this.player.setCollideWorldBounds(true);

        // core player stats for upgrades
        this.player.maxHp = 100;
        this.player.hp = 100;
        this.player.moveSpeed = 220;
        this.player.baseMoveSpeed = 220;
        this.player.projectileSpeed = 600;
        this.player.fireCooldown = 280;
        this.player.damage = 10;
        this.player.dashSpeed = 700;
        this.player.dashDuration = 220;
        this.player.dashCooldown = 1200;
        this.player.lastDashTime = -9999;
        this.player.isDashing = false;
        this.player.invulnerableUntil = 0;

        // input
        this.cursors = this.input.keyboard.createCursorKeys();
        this.wasd = this.input.keyboard.addKeys({
            up: Phaser.Input.Keyboard.KeyCodes.W,
            down: Phaser.Input.Keyboard.KeyCodes.S,
            left: Phaser.Input.Keyboard.KeyCodes.A,
            right: Phaser.Input.Keyboard.KeyCodes.D
        });
        this.dashKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
        this.pointer = this.input.activePointer;

        // groups
        this.enemies = this.physics.add.group();
        this.playerBullets = this.physics.add.group();
        this.xpOrbs = this.physics.add.group();

        // collisions
        this.physics.add.collider(this.player, this.waterColliders);
        this.physics.add.collider(this.enemies, this.waterColliders);

        // extra colliders for final arena obstacles
        this.finalRingGroup = this.physics.add.staticGroup();
        this.physics.add.collider(this.player, this.finalRingGroup);
        this.physics.add.collider(this.enemies, this.finalRingGroup);

        this.physics.add.overlap(this.playerBullets, this.enemies, (bullet, enemy) => {
            this.handleEnemyHit(bullet, enemy);
        });

        this.physics.add.overlap(this.player, this.enemies, (player, enemy) => {
            this.handlePlayerHit(8);
        });

        this.physics.add.overlap(this.player, this.xpOrbs, (player, orb) => {
            this.collectXpOrb(orb);
        });

        // camera
        this.cameras.main.startFollow(this.player);
        this.cameras.main.setBounds(0, 0, this.map.widthInPixels, this.map.heightInPixels);

        // background music
        this.sound.stopAll();
        this.sound.play('bg', { loop: true, volume: 0.5 });

        // xp and leveling
        this.player.level = 1;
        this.player.xp = 0;
        this.player.totalXp = 0;
        this.player.nextLevelXp = this.getXpForLevel(2);

        // timer and stats
        this.elapsed = 0;
        this.enemiesDefeated = 0;
        // tutorial uses a visible time limit; final arena uses time only for internal pacing
        this.tutorialDuration = 90 * 1000;
        this.tutorialComplete = false;

        // wave/elite state
        this.wavePhase = 1;
        this.eliteSpawned = false;
        this.eliteDefeated = false;

        // shooting
        this.lastShotTime = 0;

        // upgrade state
        this.isChoosingUpgrade = false;
        this.upgradePanel = null;

        // ui
        this.buildUi();

        // onboarding text
        if (this.arenaType === 'tutorial') {
            this.buildTutorialHints();
        }

        // gentle spawning for tutorial arena
        const spawnDelay = (this.arenaType === 'final') ? 800 : 1200;

        this.spawnTimer = this.time.addEvent({
            delay: spawnDelay,
            loop: true,
            callback: () => this.spawnTutorialEnemy()
        });
    }

    buildUi() {
        const { width, height } = this.scale;

        this.uiGraphics = this.add.graphics().setScrollFactor(0);
        this.uiGraphics.setDepth(10);

        this.healthText = this.add.text(20, 20, '', {
            fontSize: '20px',
            color: '#ffffff'
        }).setScrollFactor(0).setDepth(11);

        this.levelText = this.add.text(width / 2, height - 46, '', {
            fontSize: '20px',
            color: '#ffffff'
        }).setOrigin(0.5, 0).setScrollFactor(0).setDepth(11);

        this.timerText = this.add.text(width - 20, 20, '', {
            fontSize: '20px',
            color: '#ffffff'
        }).setOrigin(1, 0).setScrollFactor(0).setDepth(11);

        this.updateUi(this.time.now || 0);
    }

    buildTutorialHints() {
        const { width } = this.scale;

        const lines = [
            'wasd / arrows to move',
            'aim with the mouse, left click to cast',
            'space to dash through danger (short cooldown)',
            'collect glowing orbs to gain experience and level up'
        ];

        this.hintsText = this.add.text(width / 2, 80, lines.join('\n'), {
            fontSize: '18px',
            color: '#ffffee',
            align: 'center'
        }).setOrigin(0.5).setScrollFactor(0).setDepth(12);

        this.time.delayedCall(12000, () => {
            if (this.hintsText) {
                this.tweens.add({
                    targets: this.hintsText,
                    alpha: 0,
                    duration: 1000,
                    onComplete: () => this.hintsText.destroy()
                });
            }
        });
    }

    getXpForLevel(level) {
        const n = level - 1;
        return (n * (n + 1) * (2 * n + 1)) * 2;
    }

    spawnTutorialEnemy() {
        // don't spawn during upgrade screen or after tutorial
        if (this.isChoosingUpgrade || this.tutorialComplete) {
            return;
        }

        // tutorial arena: always spawn basic enemies (no waves)
        if (this.arenaType !== 'final') {
            this.spawnEnemyOfType('basic');
            return;
        }

        // final arena: vary enemy type based on wave phase
        // wave 1 - mostly basic. wave 2 - some tanks. wave 3 - more tanks!
        let enemyType = 'basic';
        if (this.wavePhase === 2) {
            enemyType = Math.random() < 0.25 ? 'tank' : 'basic';
        } else if (this.wavePhase === 3) {
            enemyType = Math.random() < 0.45 ? 'tank' : 'basic';
        }

        this.spawnEnemyOfType(enemyType);
    }

    spawnEnemyOfType(enemyType) {
        // create enemy at a temporary position; we'll move it once we find a safe spawn point
        const enemy = this.enemies.create(0, 0, 'mean_block');

        let speed = 80;
        let hp = 20;
        let scale = 0.65;

        if (enemyType === 'tank') {
            speed = 50;   // slower
            hp = 80;      // tougher
            scale = 0.8;  // larger
        } else if (enemyType === 'elite') {
            speed = 65;
            hp = 180;
            scale = 1.1;
        }

        enemy.setScale(scale);
        enemy.setDepth(2);
        enemy.setCollideWorldBounds(true);
        enemy.body.setSize(enemy.width * 0.6, enemy.height * 0.6, true);

        enemy.setData('type', enemyType);
        enemy.setData('speed', speed);
        enemy.setData('hp', hp);

        // make elites visually stand out
        if (enemyType === 'elite') {
            enemy.setTint(0xff8888);
        }

        // extra data for tank charge behaviour (used later in updateEnemySteering)
        enemy.setData('chargeState', 'idle');
        enemy.setData('lastChargeTime', 0);

        // find a spawn position that does not overlap any colliding tiles
        const spawnPoint = this.findSafeSpawnPointForEnemy(enemy);
        if (!spawnPoint) {
            // if we can't find a safe place, don't spawn this enemy at all
            enemy.destroy();
            return null;
        }

        enemy.setPosition(spawnPoint.x, spawnPoint.y);
        return enemy;
    }

    findSafeSpawnPointForEnemy(enemy) {
        const margin = 40;
        const width = this.map.widthInPixels;
        const height = this.map.heightInPixels;

        const body = enemy.body;
        const halfW = (body?.width || enemy.width) / 2;
        const halfH = (body?.height || enemy.height) / 2;

        const maxAttempts = 40;

        for (let i = 0; i < maxAttempts; i++) {
            const side = Phaser.Math.Between(0, 3); // 0=top, 1=bottom, 2=left, 3=right
            let x = 0;
            let y = 0;

            if (side === 0) {
                // top edge
                x = Phaser.Math.Between(margin + halfW, width - margin - halfW);
                y = margin + halfH;
            } else if (side === 1) {
                // bottom edge
                x = Phaser.Math.Between(margin + halfW, width - margin - halfW);
                y = height - margin - halfH;
            } else if (side === 2) {
                // left edge
                x = margin + halfW;
                y = Phaser.Math.Between(margin + halfH, height - margin - halfH);
            } else {
                // right edge
                x = width - margin - halfW;
                y = Phaser.Math.Between(margin + halfH, height - margin - halfH);
            }

            if (this.isSpawnRectFreeFromObstacles(x, y, halfW, halfH)) {
                return { x, y };
            }
        }

        return null;
    }

    isSpawnRectFreeFromObstacles(cx, cy, halfW, halfH) {
        // ensure the enemy's body stays fully inside the map bounds
        const width = this.map.widthInPixels;
        const height = this.map.heightInPixels;
        if (
            cx - halfW < 0 ||
            cy - halfH < 0 ||
            cx + halfW > width ||
            cy + halfH > height
        ) {
            return false;
        }

        // sample multiple points across the enemy's bounding box
        const samplePoints = [
            { x: cx, y: cy }, // center
            { x: cx - halfW, y: cy - halfH }, // corners
            { x: cx + halfW, y: cy - halfH },
            { x: cx - halfW, y: cy + halfH },
            { x: cx + halfW, y: cy + halfH },
            { x: cx, y: cy - halfH }, // edge midpoints
            { x: cx, y: cy + halfH },
            { x: cx - halfW, y: cy },
            { x: cx + halfW, y: cy }
        ];

        for (let i = 0; i < samplePoints.length; i++) {
            const p = samplePoints[i];
            const tile = this.obstaclesLayer.getTileAtWorldXY(p.x, p.y, true);
            if (tile && tile.collides) {
                return false;
            }
        }

        return true;
    }

    startEliteWave() {
        if (this.eliteSpawned) {
            return;
        }

        this.eliteSpawned = true;

        // stop regular spawn timer
        if (this.spawnTimer) {
            this.spawnTimer.remove(false);
            this.spawnTimer = null;
        }

        // dramatic slow motion when elite appears
        this.time.timeScale = 0.2;
        this.time.delayedCall(200, () => {
            this.time.timeScale = 1;
        });

        this.sound.play('level_up_synth', { volume: 0.9 });

        // change arena shape: first ring, then a second tighter ring a few seconds later
        this.createFinalArenaRing(72);
        this.time.delayedCall(6000, () => {
            if (!this.tutorialComplete) {
                this.createFinalArenaRing(120);
            }
        });

        // spawn multiple elites plus basic adds to keep pressure up
        const eliteCount = 2;
        for (let i = 0; i < eliteCount; i++) {
            this.spawnEnemyOfType('elite');
        }
        for (let i = 0; i < 4; i++) {
            this.spawnEnemyOfType('basic');
        }
    }

    createFinalArenaRing(ringMargin = 72) {
        // ring of invisible colliders near edges of the arena
        const width = this.map.widthInPixels;
        const height = this.map.heightInPixels;

        const step = this.tileWidth;

        const positions = [];

        // top & bottom
        for (let x = ringMargin; x <= width - ringMargin; x += step) {
            positions.push({ x, y: ringMargin });
            positions.push({ x, y: height - ringMargin });
        }

        // left & right. skip corners we already added
        for (let y = ringMargin + step; y <= height - ringMargin - step; y += step) {
            positions.push({ x: ringMargin, y });
            positions.push({ x: width - ringMargin, y });
        }

        positions.forEach(pos => {
            const block = this.physics.add.staticImage(pos.x, pos.y);
            block.setVisible(false);
            block.body.setSize(this.tileWidth * 0.7, this.tileHeight * 0.7, true);
            this.finalRingGroup.add(block);
        });
    }


    tryDash(direction, time) {
        if (this.player.isDashing) {
            return;
        }
        if (time - this.player.lastDashTime < this.player.dashCooldown) {
            return;
        }
        if (direction.length() === 0) {
            return;
        }

        direction = direction.clone().normalize();
        this.player.lastDashTime = time;
        this.player.isDashing = true;
        this.player.invulnerableUntil = time + this.player.dashDuration + 120;

        this.player.setVelocity(direction.x * this.player.dashSpeed, direction.y * this.player.dashSpeed);
        this.player.setAlpha(0.5);

        this.time.delayedCall(this.player.dashDuration, () => {
            this.player.isDashing = false;
            this.player.setVelocity(0, 0);
            this.player.setAlpha(1);
        });
    }

    tryShoot(time) {
        if (!this.pointer.isDown) {
            return;
        }
        if (time - this.lastShotTime < this.player.fireCooldown) {
            return;
        }

        this.lastShotTime = time;

        const worldPoint = this.pointer.positionToCamera(this.cameras.main);
        const dx = worldPoint.x - this.player.x;
        const dy = worldPoint.y - this.player.y;
        const angleDeg = Phaser.Math.RadToDeg(Math.atan2(dy, dx));

        const bullet = new Bullet(this, this.player.x, this.player.y, angleDeg, this.player.projectileSpeed, this.player.damage);
        this.playerBullets.add(bullet);
    }

    handleEnemyHit(bullet, enemy) {
        bullet.destroy();
        const hp = enemy.getData('hp') - this.player.damage;
        enemy.setData('hp', hp);
        enemy.setTint(0xff6666);
        this.time.delayedCall(80, () => {
            if (enemy.active) {
                enemy.clearTint();
            }
        });

        if (hp <= 0) {
            this.spawnXpOrb(enemy.x, enemy.y);
            enemy.destroy();
            this.enemiesDefeated += 1;
            this.sound.play('explosion1', { volume: 0.5 });
        }
    }

    handlePlayerHit(amount) {
        const now = this.time.now;
        if (now < this.player.invulnerableUntil) {
            return;
        }

        this.player.hp -= amount;
        this.player.invulnerableUntil = now + 400;
        this.cameras.main.shake(120, 0.01);
        this.player.setTint(0xff0000);
        this.time.delayedCall(140, () => this.player.clearTint());
        this.sound.play('hurt1', { volume: 0.6 });

        if (this.player.hp <= 0) {
            this.endRun(false);
        }
    }

    spawnXpOrb(x, y) {
        const orb = this.xpOrbs.create(x, y, 'coin');
        orb.setDepth(2.5);
        orb.setScale(0.6);
        if (orb.body) {
            orb.body.setCircle(10, orb.width * 0.3, orb.height * 0.3);
        }
        orb.setData('value', 5);
        this.tweens.add({
            targets: orb,
            y: y - 6,
            duration: 260,
            yoyo: true,
            repeat: 2
        });
    }

    collectXpOrb(orb) {
        const value = orb.getData('value') || 5;
        this.player.xp += value;
        this.player.totalXp += value;
        orb.destroy();

        if (this.player.xp >= this.player.nextLevelXp) {
            this.levelUp();
        }
    }

    levelUp() {
        this.player.level += 1;
        this.player.xp -= this.player.nextLevelXp;
        this.player.nextLevelXp = this.getXpForLevel(this.player.level + 1);

        this.cameras.main.flash(200, 80, 160, 255);
        this.sound.play('level_up_synth', { volume: 0.7 });
        this.showUpgradeChoices();
    }

    showUpgradeChoices() {
        this.isChoosingUpgrade = true;
        this.physics.world.pause();

        const { width, height } = this.scale;

        const panel = this.add.rectangle(width / 2, height / 2, width * 0.7, height * 0.5, 0x000022, 0.9)
            .setScrollFactor(0)
            .setDepth(20);

        const title = this.add.text(width / 2, height * 0.28, 'choose an upgrade', {
            fontSize: '28px',
            color: '#ffffff'
        }).setOrigin(0.5).setScrollFactor(0).setDepth(21);

        const options = [
            {
                label: 'arcane focus',
                description: 'increase spell damage and projectile speed',
                apply: () => {
                    this.player.damage += 5;
                    this.player.projectileSpeed += 80;
                }
            },
            {
                label: 'quick chant',
                description: 'shorten cast cooldown for faster firing',
                apply: () => {
                    this.player.fireCooldown = Math.max(120, this.player.fireCooldown * 0.7);
                }
            },
            {
                label: 'blinkstep',
                description: 'reduce dash cooldown and extend dash invulnerability',
                apply: () => {
                    this.player.dashCooldown = Math.max(500, this.player.dashCooldown * 0.7);
                    this.player.dashDuration += 40;
                }
            }
        ];

        const buttons = [];
        const startY = height * 0.36;
        const gap = 84;

        options.forEach((opt, index) => {
            const y = startY + index * gap;
            const button = this.add.text(width / 2, y, `[ ${opt.label} ]\n${opt.description}`, {
                fontSize: '20px',
                color: '#aaddff',
                align: 'center'
            }).setOrigin(0.5).setScrollFactor(0).setDepth(21).setInteractive({ useHandCursor: true });

            button.on('pointerover', () => {
                button.setColor('#ffffff');
            });

            button.on('pointerout', () => {
                button.setColor('#aaddff');
            });

            button.on('pointerup', () => {
                opt.apply();
                cleanup();
            });

            buttons.push(button);
        });

        const cleanup = () => {
            panel.destroy();
            title.destroy();
            buttons.forEach(b => b.destroy());
            this.isChoosingUpgrade = false;
            this.physics.world.resume();
        };

        this.upgradePanel = { panel, title, buttons };
    }

    update(time, delta) {
        if (this.tutorialComplete) {
            return;
        }

        if (this.isChoosingUpgrade) {
            this.updateUi(time);
            return;
        }

        this.elapsed += delta;
        this.updateUi(time);

        // wave / elite logic only applies in the final arena
        if (this.arenaType === 'final') {
            // In the final arena, time is used only to pace waves and trigger the elite,
            // not to auto-end the run. Phases:
            //  - 0–25s   : phase 1 (basic only)
            //  - 25–45s  : phase 2 (some tanks)
            //  - 45–60s  : phase 3 (more tanks)
            //  - 60s+    : elite wave
            if (!this.eliteSpawned) {
                if (this.elapsed > 60000) {
                    this.startEliteWave();
                } else if (this.elapsed > 45000) {    // phase 3
                    this.wavePhase = 3;
                } else if (this.elapsed > 25000) {    // phase 2
                    this.wavePhase = 2;
                } else {
                    this.wavePhase = 1;
                }
            }

            // if elite is up + all enemies are gone, end early with win
            if (this.eliteSpawned && !this.eliteDefeated) {
                if (this.enemies.countActive(true) === 0) {
                    this.eliteDefeated = true;
                    this.endRun(true);
                    return;
                }
            }
        }

        // tutorial end condition: survive for the arena's duration
        if (this.arenaType === 'tutorial' && this.elapsed >= this.tutorialDuration) {
            this.endRun(true);
            return;
        }

        const dir = new Phaser.Math.Vector2(0, 0);

        if (this.cursors.left.isDown || this.wasd.left.isDown) {
            dir.x -= 1;
        }
        if (this.cursors.right.isDown || this.wasd.right.isDown) {
            dir.x += 1;
        }
        if (this.cursors.up.isDown || this.wasd.up.isDown) {
            dir.y -= 1;
        }
        if (this.cursors.down.isDown || this.wasd.down.isDown) {
            dir.y += 1;
        }

        if (!this.player.isDashing) {
            if (dir.length() > 0) {
                dir.normalize();
                this.player.setVelocity(dir.x * this.player.moveSpeed, dir.y * this.player.moveSpeed);
            } else {
                this.player.setVelocity(0, 0);
            }
        }

        if (Phaser.Input.Keyboard.JustDown(this.dashKey)) {
            this.tryDash(dir, time);
        }

        this.tryShoot(time);

        this.enemies.children.iterate(enemy => {
            if (!enemy || !enemy.active) {
                return;
            }
            this.updateEnemySteering(enemy, time);
        });
    }


    buildNavGrid() {
        const width = this.map.width;
        const height = this.map.height;
        this.navGrid = [];
        for (let y = 0; y < height; y++) {
            const row = [];
            for (let x = 0; x < width; x++) {
                const tile = this.obstaclesLayer.getTileAt(x, y);
                const walkable = !tile || !tile.collides;
                row.push(walkable ? 0 : 1);
            }
            this.navGrid.push(row);
        }
    }

    worldToTileCoord(x, y) {
        const tx = Phaser.Math.Clamp(this.map.worldToTileX(x), 0, this.map.width - 1);
        const ty = Phaser.Math.Clamp(this.map.worldToTileY(y), 0, this.map.height - 1);
        return { tx, ty };
    }

    isWalkableTile(tx, ty) {
        if (!this.navGrid) return false;
        if (tx < 0 || ty < 0 || tx >= this.map.width || ty >= this.map.height) return false;
        return this.navGrid[ty][tx] === 0;
    }

    findPath(startX, startY, targetX, targetY) {
        const start = this.worldToTileCoord(startX, startY);
        const target = this.worldToTileCoord(targetX, targetY);

        if (!this.isWalkableTile(start.tx, start.ty)) {
            return null;
        }

        const width = this.map.width;
        const height = this.map.height;
        const visited = new Array(height);
        const prev = new Array(height);
        for (let y = 0; y < height; y++) {
            visited[y] = new Array(width).fill(false);
            prev[y] = new Array(width).fill(null);
        }

        const queue = [];
        queue.push({ x: start.tx, y: start.ty });
        visited[start.ty][start.tx] = true;

        const dirs = [
            { x: 1, y: 0 },
            { x: -1, y: 0 },
            { x: 0, y: 1 },
            { x: 0, y: -1 }
        ];

        let best = { x: start.tx, y: start.ty, d: Math.abs(start.tx - target.tx) + Math.abs(start.ty - target.ty) };

        while (queue.length > 0) {
            const current = queue.shift();
            const distToTarget = Math.abs(current.x - target.tx) + Math.abs(current.y - target.ty);
            if (distToTarget < best.d) {
                best = { x: current.x, y: current.y, d: distToTarget };
            }
            for (let i = 0; i < dirs.length; i++) {
                const nx = current.x + dirs[i].x;
                const ny = current.y + dirs[i].y;
                if (nx < 0 || ny < 0 || nx >= width || ny >= height) {
                    continue;
                }
                if (visited[ny][nx]) {
                    continue;
                }
                if (!this.isWalkableTile(nx, ny)) {
                    continue;
                }
                visited[ny][nx] = true;
                prev[ny][nx] = current;
                queue.push({ x: nx, y: ny });
            }
        }

        if (best.x === start.tx && best.y === start.ty && best.d > 0) {
            return null;
        }

        const pathTiles = [];
        let current = { x: best.x, y: best.y };
        while (current) {
            pathTiles.push(current);
            const p = prev[current.y][current.x];
            if (!p) break;
            current = p;
        }
        pathTiles.reverse();

        const pathWorld = pathTiles.map(t => {
            const wx = this.map.tileToWorldX(t.x) + this.tileWidth / 2;
            const wy = this.map.tileToWorldY(t.y) + this.tileHeight / 2;
            return { x: wx, y: wy };
        });

        return pathWorld;
    }

    hasLineOfSight(sx, sy, tx, ty) {
        const dx = tx - sx;
        const dy = ty - sy;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist === 0) return true;
        const steps = Math.ceil(dist / (this.tileWidth / 2));
        for (let i = 1; i < steps; i++) {
            const t = i / steps;
            const x = sx + dx * t;
            const y = sy + dy * t;
            const tile = this.obstaclesLayer.getTileAtWorldXY(x, y, true);
            if (tile && tile.collides) {
                return false;
            }
        }
        return true;
    }

    updateEnemySteering(enemy, time) {
        const speed = enemy.getData('speed') || 80;
        const type = enemy.getData('type') || 'basic';

        // special behaviour for tanks - short yellow telegraph then brief charge
        if (type === 'tank') {
            const dx = this.player.x - enemy.x;
            const dy = this.player.y - enemy.y;
            const distSq = dx * dx + dy * dy;

            const chargeState = enemy.getData('chargeState') || 'idle';
            const lastChargeTime = enemy.getData('lastChargeTime') || 0;
            const telegraphUntil = enemy.getData('telegraphUntil') || 0;
            const chargeUntil = enemy.getData('chargeUntil') || 0;
            const cooldown = 2200; // in ms

            if (chargeState === 'idle') {
                // close enough and off cooldown --> start telegraph
                if (distSq < 200 * 200 && time - lastChargeTime > cooldown) {
                    enemy.setData('chargeState', 'telegraph');
                    enemy.setData('telegraphUntil', time + 280);
                    enemy.setVelocity(0, 0);
                    enemy.setTint(0xffff66); // yellow flash
                    enemy.setData('chargeDirX', dx);
                    enemy.setData('chargeDirY', dy);
                    return;
                }
            } else if (chargeState === 'telegraph') {
                if (time >= telegraphUntil) {
                    const dir = new Phaser.Math.Vector2(
                        enemy.getData('chargeDirX') || dx,
                        enemy.getData('chargeDirY') || dy
                    );
                    if (dir.lengthSq() === 0) {
                        enemy.setData('chargeState', 'idle');
                        enemy.clearTint();
                        return;
                    }
                    dir.normalize().scale(speed * 2.2);
                    enemy.setVelocity(dir.x, dir.y);
                    enemy.setData('chargeState', 'charging');
                    enemy.setData('chargeUntil', time + 260);
                    enemy.setData('lastChargeTime', time);
                    enemy.clearTint();
                }
                return;
            } else if (chargeState === 'charging') {
                if (time >= chargeUntil) {
                    enemy.setData('chargeState', 'idle');
                    enemy.setVelocity(0, 0);
                }
                return;
            }
            // when not in a special state, fall through to normal steering below
        }

        // *** original pathfinding behaviour ***

        if (this.hasLineOfSight(enemy.x, enemy.y, this.player.x, this.player.y)) {
            const direct = new Phaser.Math.Vector2(this.player.x - enemy.x, this.player.y - enemy.y);
            if (direct.lengthSq() < 4 * 4) {
                enemy.setVelocity(0, 0);
                return;
            }
            direct.normalize().scale(speed);
            enemy.setVelocity(direct.x, direct.y);
            enemy.navPath = null;
            return;
        }

        const enemyTile = this.worldToTileCoord(enemy.x, enemy.y);
        const playerTile = this.worldToTileCoord(this.player.x, this.player.y);

        const targetChanged =
            enemy.lastTargetTileX !== playerTile.tx || enemy.lastTargetTileY !== playerTile.ty;
        const needsPath =
            !enemy.navPath ||
            enemy.navPathIndex === undefined ||
            enemy.navPathIndex >= enemy.navPath.length ||
            targetChanged ||
            (enemy.lastPathTime !== undefined && time - enemy.lastPathTime > 800);

        if (needsPath) {
            const path = this.findPath(enemy.x, enemy.y, this.player.x, this.player.y);
            if (!path || path.length < 2) {
                enemy.setVelocity(0, 0);
                enemy.navPath = null;
                return;
            }
            enemy.navPath = path;
            enemy.navPathIndex = 1;
            enemy.lastPathTime = time;
            enemy.lastTargetTileX = playerTile.tx;
            enemy.lastTargetTileY = playerTile.ty;
        }

        const path = enemy.navPath;
        if (!path || enemy.navPathIndex >= path.length) {
            enemy.setVelocity(0, 0);
            return;
        }

        const target = path[enemy.navPathIndex];
        const toTarget = new Phaser.Math.Vector2(target.x - enemy.x, target.y - enemy.y);
        const distSq2 = toTarget.lengthSq();

        if (distSq2 < 8 * 8) {
            enemy.navPathIndex++;
            if (enemy.navPathIndex >= path.length) {
                enemy.setVelocity(0, 0);
                return;
            }
        }

        const dir = new Phaser.Math.Vector2(
            path[enemy.navPathIndex].x - enemy.x,
            path[enemy.navPathIndex].y - enemy.y
        );
        if (dir.lengthSq() === 0) {
            enemy.setVelocity(0, 0);
            return;
        }
        dir.normalize().scale(speed);
        enemy.setVelocity(dir.x, dir.y);
    }


    updateUi(time) {
        const { width, height } = this.scale;
        this.uiGraphics.clear();

        const hpRatio = Phaser.Math.Clamp(this.player.hp / this.player.maxHp, 0, 1);
        const hpWidth = 220;
        const hpHeight = 16;

        this.uiGraphics.fillStyle(0x330000, 0.9);
        this.uiGraphics.fillRect(18, 18, hpWidth, hpHeight);
        this.uiGraphics.fillStyle(0xff4444, 1);
        this.uiGraphics.fillRect(18, 18, hpWidth * hpRatio, hpHeight);

        const dashWidth = 140;
        const dashHeight = 8;
        const dashX = 18;
        const dashY = 40;
        const dashReadyIn = Math.max(0, (this.player.lastDashTime + this.player.dashCooldown) - time);
        const dashRatio = 1 - Phaser.Math.Clamp(dashReadyIn / this.player.dashCooldown, 0, 1);

        this.uiGraphics.fillStyle(0x222233, 0.9);
        this.uiGraphics.fillRect(dashX, dashY, dashWidth, dashHeight);
        this.uiGraphics.fillStyle(dashRatio >= 1 ? 0x88ffcc : 0x44aa88, 1);
        this.uiGraphics.fillRect(dashX, dashY, dashWidth * dashRatio, dashHeight);

        const xpRatio = Phaser.Math.Clamp(this.player.xp / this.player.nextLevelXp, 0, 1);
        const xpWidth = width * 0.6;
        const xpHeight = 12;
        const xpX = (width - xpWidth) / 2;
        const xpY = height - 24;

        this.uiGraphics.fillStyle(0x001133, 0.9);
        this.uiGraphics.fillRect(xpX, xpY, xpWidth, xpHeight);
        this.uiGraphics.fillStyle(0x66aaff, 1);
        this.uiGraphics.fillRect(xpX, xpY, xpWidth * xpRatio, xpHeight);

        this.healthText.setText(`hp: ${Math.max(0, Math.round(this.player.hp))}/${this.player.maxHp}`);
        this.levelText.setText(`level ${this.player.level}  xp ${this.player.xp.toFixed(0)} / ${this.player.nextLevelXp.toFixed(0)}`);

        // Tutorial shows a visible countdown; final arena hides its internal timer.
        if (this.arenaType === 'tutorial') {
            const remainingMs = Math.max(0, this.tutorialDuration - this.elapsed);
            const remaining = remainingMs / 1000;
            this.timerText.setText(`tutorial time left: ${remaining.toFixed(1)}s`);
        } else {
            this.timerText.setText('');
        }
    }

    endRun(completed) {
        if (this.tutorialComplete) {
            return;
        }
        this.tutorialComplete = true;

        const stats = {
            timeSurvived: this.elapsed / 1000,
            enemiesDefeated: this.enemiesDefeated,
            maxLevel: this.player.level
        };

        this.registry.set('finalStats', stats);

        if (completed) {
            this.scene.start('Victory', stats);
        } else {
            this.scene.start('GameOver');
        }
    }
}


