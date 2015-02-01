var Phaser = require('phaser');
var Starship = require('../entities/Starship');

function GameState () {}

GameState.prototype = {
    create: function onCreate (game) {
        console.log(game);

        this.gameConfig = game.cache.getJSON('game-config');

        // game.world.setBounds(-10000, -10000, 10000, 10000);
        this.audio = {
            'retro-rumble1': game.add.audio('retro-rumble1'),
            'retro-rumble2': game.add.audio('retro-rumble2'),
            'retro-rumble3': game.add.audio('retro-rumble3')
        };

        this.background = game.add.tileSprite(-32, -32, game.stage.width + 64, game.stage.width + 64, 'starfield-blue');

        this.screenFlash = game.plugins.juicy.createScreenFlash('steelblue');
        game.add.existing(this.screenFlash);

        this.explosions = game.add.group(game.world, 'explosions');
        this.explosions.createMultiple(10, 'explosions');
        this.explosions.forEach(function (sprite) {
            sprite.anchor.setTo(0.5);
            sprite.scale.setTo(0.5);
            var anim = sprite.animations.add('regular', Phaser.Animation.generateFrameNames('Regular/regularExplosion', 0, 8, '', 2), 30);
            anim.killOnComplete = true;

            anim = sprite.animations.add('burst', ['Particles/burst'], 10);
            anim.killOnComplete = true;
        }, this);

        this.projectiles = game.add.group(game.world, 'projectiles', false, true);
        this.projectiles.createMultiple(50, 'sprites', 'Lasers/laserBlue01');
        this.projectiles.forEach(function (sprite) {
            sprite.anchor.setTo(0.5);
            sprite.rotationOffset = Math.PI * 1.5;
            sprite.checkWorldBounds = true;
            sprite.outOfBoundsKill = true;
        });

        this.player = new Starship(game, game.camera.view.centerX, game.camera.view.centerY, 'sprites', 'playerShip3_red');
        this.player.scale.setTo(0.33);
        this.player.rotationOffset = Math.PI / 2;
        this.player.body.drag.setTo(100);
        this.player.body.maxVelocity.setTo(this.gameConfig.player.maxVelocity);
        this.player.body.collideWorldBounds = true;
        this.player.nextShotAt = game.time.time;

        // game.camera.follow(this.player);

        this.enemies = game.add.group(game.world, 'enemies');
        this.enemies.classType = Starship;
        this.enemies.createMultiple(10, 'sprites', 'Enemies/enemyBlack1');
        this.enemies.forEach(function (enemy) {
            enemy.scale.setTo(0.33);
            enemy.body.setSize(enemy.width, enemy.height);
            enemy.rotationOffset = Math.PI / 2;
            enemy.body.drag.setTo(30);
            enemy.body.maxVelocity.setTo(100);
            enemy.body.collideWorldBounds = true;
            enemy.target = this.player;
        }, this);

        this.controls = {
            up: game.input.keyboard.addKey(Phaser.Keyboard.W),
            down: game.input.keyboard.addKey(Phaser.Keyboard.S),
            left: game.input.keyboard.addKey(Phaser.Keyboard.A),
            right: game.input.keyboard.addKey(Phaser.Keyboard.D),
            strafeLeft: game.input.keyboard.addKey(Phaser.Keyboard.Q),
            strafeRight: game.input.keyboard.addKey(Phaser.Keyboard.E)
        };
    },
    update: function onUpdate (game) {
        game.physics.arcade.collide(this.player, this.enemies);
        game.physics.arcade.collide(this.enemies, this.enemies);
        game.physics.arcade.overlap(this.projectiles, this.enemies, function (projectile, enemy) {
            var explosion = this.explosions.getFirstDead();
            explosion.reset(enemy.x, enemy.y);
            explosion.animations.play('regular');
            enemy.kill();
            projectile.kill();
            this.game.plugins.juicy.shake(16, 20);
            this.screenFlash.flash(0.05, 16);
        }, null, this);

        if (game.input.activePointer.isDown) {
            if (this.player.nextShotAt > game.time.time) { return; }

            var projectile = this.projectiles.getFirstDead();
            var rotation = this.game.math.angleBetween(this.player.x, this.player.y, game.input.activePointer.x, game.input.activePointer.y);
            var sep = new Phaser.Point(this.player.x, this.player.y);
            sep.rotate(sep.x, sep.y, rotation, false, 32);

            projectile.rotation = rotation - projectile.rotationOffset;
            projectile.reset(sep.x, sep.y);
            this.game.physics.arcade.velocityFromRotation(rotation, this.gameConfig.player.projectileSpeed, projectile.body.velocity);
            this.player.nextShotAt = game.time.time + (1000 / this.gameConfig.player.rateOfFire);
        }

        // this.background.tilePosition.x -= this.player.deltaX * 1.5;
        // this.background.tilePosition.y -= this.player.deltaY * 1.5;

        if (this.enemies.countLiving() < 5) {
            for (var i = 0; i < game.rnd.integerInRange(0, 3); i++) {
                var enemy = this.enemies.getFirstDead();
                enemy.reset(game.camera.view.randomX, game.camera.view.randomY);
                var explosion = this.explosions.getFirstDead();
                explosion.reset(enemy.x, enemy.y);
                explosion.animations.play('burst');
            }
        }

        this.player.body.angularVelocity = 0;

        if (this.controls.left.isDown) {
            this.player.body.angularVelocity = -300;
        } else if (this.controls.right.isDown) {
            this.player.body.angularVelocity = 300;
        }

        if (this.controls.up.isDown) {
            game.physics.arcade.accelerationFromRotation(this.player.rotation - this.player.rotationOffset, 500, this.player.body.acceleration);
        } else {
            this.player.body.acceleration.setTo(0);
        }
    },
    render: function onRender (game) {
        // game.debug.cameraInfo(game.camera, 10, 20);
        // game.debug.spriteInfo(this.player, 10, 125);
    }
};

module.exports = GameState;