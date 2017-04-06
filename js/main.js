PlayState = {};
const LEVEL_COUNT = 2;

function Hero(game, x, y){
	Phaser.Sprite.call(this, game, x, y, 'hero');
	this.anchor.set(0.5, 0.5);
	this.game.physics.enable(this);
	this.body.collideWorldBounds = true;
	this.animations.add('stop', [0]);
	this.animations.add('run', [1, 2], 8, true); //8fps, looped
	this.animations.add('jump', [3]);
	this.animations.add('fall', [4]);
};

Hero.prototype = Object.create(Phaser.Sprite.prototype);
Hero.prototype.constructor = Hero;

Hero.prototype.move = function (direction){
	const SPEED = 200;
	this.body.velocity.x = direction * SPEED;
	if(this.body.velocity.x < 0){
		this.scale.x = -1;
	}
	else if (this.body.velocity.x > 0){
		this.scale.x = 1;
	}
};

Hero.prototype.jump = function(){
	const JUMP_SPEED = 600;
	let canJump = this.body.touching.down;

	if(canJump){
		this.body.velocity.y = -JUMP_SPEED;
	}

	return canJump;
};

Hero.prototype.bounce = function(){
	const BOUNCE_SPEED = 200;
	this.body.velocity.y = -BOUNCE_SPEED;
};

Hero.prototype._getAnimationName = function(){
	let name = 'stop'; //default animation

	if(this.body.velocity.y < 0){
		name = 'jump';
	}
	else if(this.body.velocity.y >= 0 && !this.body.touching.down){
		name = 'fall';
	}
	else if(this.body.velocity.x != 0 && this.body.touching.down){
		name = 'run';
	}

	return name;
};

Hero.prototype.update = function(){
	//update sprite animation
	let animationName = this._getAnimationName();
	if(this.animations.name !== animationName){
		this.animations.play(animationName);
	}
};

const SPIDER_SPEED = 100;
function Spider (game, x, y){
	Phaser.Sprite.call(this, game, x, y, 'spider');
	this.anchor.set(0.5);
	this.animations.add('crawl', [0,1,2], 8, true);
	this.animations.add('die', [0,4,0,4,0,4,3,3,3,3,3,3], 12);
	this.animations.play('crawl');

	this.game.physics.enable(this);
	this.body.collideWorldBounds = true;
	this.body.velocity.x = SPIDER_SPEED;
};

Spider.prototype = Object.create(Phaser.Sprite.prototype);
Spider.prototype.constructor = Spider;
Spider.prototype.update = function(){
	// check against walls and reverse direction if necessary
	if(this.body.touching.right || this.body.blocked.right){
		this.body.velocity.x = -SPIDER_SPEED;
	}else if(this.body.touching.left || this.body.blocked.left){
		this.body.velocity.x = SPIDER_SPEED;
	}
}
Spider.prototype.die = function(){
	this.body.enable = false;

	this.animations.play('die').onComplete.addOnce(function(){
		this.kill();
	}, this);
}

//load game assets here
PlayState.preload = function(){
	//level load
	this.game.load.json('level:0', 'data/level00.json');
	this.game.load.json('level:1', 'data/level01.json');

	//images load
	this.game.load.image('background', 'images/background.png');
	this.game.load.image('ground', 'images/ground.png');
	this.game.load.image('grass:8x1', 'images/grass_8x1.png');
	this.game.load.image('grass:6x1', 'images/grass_6x1.png');
	this.game.load.image('grass:4x1', 'images/grass_4x1.png');
	this.game.load.image('grass:2x1', 'images/grass_2x1.png');
	this.game.load.image('grass:1x1', 'images/grass_1x1.png');
	this.game.load.image('invisible_wall', 'images/invisible_wall.png');
	this.game.load.image('icon:coin', 'images/coin_icon.png');
	this.game.load.image('font:numbers', 'images/numbers.png');
	this.game.load.image('key', 'images/key.png');

	//spritesheets load
	this.game.load.spritesheet('coin', 'images/coin_animated.png', 22, 22);
	this.game.load.spritesheet('spider', 'images/spider.png', 42, 32);
	this.game.load.spritesheet('hero', 'images/hero.png', 36, 42);
	this.game.load.spritesheet('door', 'images/door.png', 42, 66);
	this.game.load.spritesheet('icon:key', 'images/key_icon.png', 34, 30);

	//audio load
	this.game.load.audio('sfx:key', 'audio/key.wav');
	this.game.load.audio('sfx:door', 'audio/door.wav');
	this.game.load.audio('sfx:jump', 'audio/jump.wav');
	this.game.load.audio('sfx:coin', 'audio/coin.wav');
	this.game.load.audio('sfx:stomp', 'audio/stomp.wav');
};

//create game entities and set upt wolrd here
PlayState.create = function(){
	this.sfx = {
		key: this.game.add.audio('sfx:key'),
		door: this.game.add.audio('sfx:door'),
		jump: this.game.add.audio('sfx:jump'),
		coin: this.game.add.audio('sfx:coin'),
		stomp: this.game.add.audio('sfx:stomp')
	}
	this.game.add.image(0, 0, 'background');
	this._loadLevel(this.game.cache.getJSON(`level:${this.level}`));
	this._createHud();
};

PlayState._createHud = function(){
	const NUMBERS_STR = '0123456789X';
	this.coinFont = this.game.add.retroFont('font:numbers', 20, 26, NUMBERS_STR, 6);
	this.keyIcon = this.game.make.image(0, 19, 'icon:key');
	let coinIcon = this.game.make.image(this.keyIcon.width + 7, 0, 'icon:coin');
	let coinScoreImg = this.game.make.image(coinIcon.x + coinIcon.width, coinIcon.height / 2, this.coinFont);
	
	coinScoreImg.anchor.set(0, 0.5);
	this.keyIcon.anchor.set(0, 0.5);

	this.hud = this.game.add.group();
	this.hud.add(coinIcon);
	this.hud.add(coinScoreImg);
	this.hud.add(this.keyIcon);
	this.hud.position.set(10, 10);
}

PlayState._loadLevel = function(data){
	const GRAVITY = 1200;
	//create group/layers
	this.bgDecoration = this.game.add.group(); //it has to be the first to be in the lowest layer
	this.platforms = this.game.add.group();
	this.coins = this.game.add.group();
	this.spiders = this.game.add.group();
	this.enemyWalls = this.game.add.group();
	//spawn all platforms
	data.platforms.forEach(this._spawnPlatform, this);
	//spawn hero and enemies
	this._spawnCharacters({hero: data.hero, spiders: data.spiders});
	//spawn important objects
	data.coins.forEach(this._spawnCoin, this);
	this._spawnDoor(data.door.x, data.door.y);
	this._spwanKey(data.key.x, data.key.y);
	//set properties
	this.game.physics.arcade.gravity.y = GRAVITY;
	this.enemyWalls.visible = false;
};

PlayState._spawnPlatform = function (platform){
	let sprite = this.platforms.create(
		platform.x, platform.y, platform.image);

	this.game.physics.enable(sprite);
	//immovalble platforms
	sprite.body.allowGravity = false;
	sprite.body.immovable = true;
	this._spawnEnemyWall(platform.x, platform.y, 'left');
	this._spawnEnemyWall(platform.x + sprite.width, platform.y, 'right');
};

PlayState._spawnEnemyWall = function(x, y, side){
	let sprite = this.enemyWalls.create(x, y, 'invisible_wall');
	//anchor and y desplacement
	sprite.anchor.set(side == 'left' ? 1 : 0, 1);

	//physics
	this.game.physics.enable(sprite);
	sprite.body.immovable = true;
	sprite.body.allowGravity = false;
};

PlayState._spawnCharacters = function (data){
	this.hero = new Hero(this.game, data.hero.x, data.hero.y);
	this.game.add.existing(this.hero);

	data.spiders.forEach(function(spider){
		let sprite = new Spider(this.game, spider.x, spider.y);
		this.spiders.add(sprite);
	}, this);
};

PlayState._spawnCoin = function(coin){
	let sprite = this.coins.create(coin.x, coin.y, 'coin');
	sprite.anchor.set(0.5, 0.5);
	this.game.physics.enable(sprite);
	sprite.body.allowGravity = false;
	//add animations
	sprite.animations.add('rotate', [0, 1, 2, 1], 6, true); //6 fps, loop
	sprite.animations.play('rotate');
};

PlayState._spawnDoor = function (x, y){
	this.door = this.bgDecoration.create(x, y, 'door');
	this.door.anchor.setTo(0.5, 1);
	this.game.physics.enable(this.door);
	this.door.body.allowGravity = false;
};

PlayState._spwanKey = function (x, y){
	this.key = this.bgDecoration.create(x, y, 'key');
	this.key.anchor.set(0.5, 0.5);
	this.game.physics.enable(this.key);
	this.key.body.allowGravity = false;
	//add an up & down animation
	this.key.y -= 3;
	this.game.add.tween(this.key)
		.to({y: this.key.y + 6}, 800, Phaser.Easing.Sinusoidal.InOut)
		.yoyo(true)
		.loop()
		.start();
};


PlayState.init = function (data){
	//fixes blur movement
	this.game.renderer.renderSession.roundPixels = true;

	this.keys = this.game.input.keyboard.addKeys({
		left: Phaser.KeyCode.LEFT,
		right: Phaser.KeyCode.RIGHT,
		up: Phaser.KeyCode.UP
	});

	this.keys.up.onDown.add(function(){
		if(this.hero.jump()){
			this.sfx.jump.play();
		}
	}, this);

	this.coinPickupCount = 0;
	this.hasKey = false;
	this.level = (data.level || 0) % LEVEL_COUNT;

};

PlayState.update = function(){
	this._handleCollisions();
	this._handleInput();
	this.coinFont.text = `x${this.coinPickupCount}`;
	this.keyIcon.frame = this.hasKey ? 1 : 0;
};

PlayState._handleCollisions = function(){
	this.game.physics.arcade.collide(this.hero, this.platforms);
	this.game.physics.arcade.collide(this.spiders, this.platforms);
	this.game.physics.arcade.collide(this.spiders, this.enemyWalls);
	this.game.physics.arcade.overlap(this.hero, this.coins, this._onHeroVsCoins, null, this);
	this.game.physics.arcade.overlap(this.hero, this.spiders, this._onHeroVsEnemy, null, this);
	this.game.physics.arcade.overlap(this.hero, this.key, this._onHeroVsKey, null, this);
	this.game.physics.arcade.overlap(
		this.hero,
		this.door,
		this._onHeroVsDoor,
		function(hero, door){
			return this.hasKey && hero.body.touching.down;
		},
		this);
};

PlayState._onHeroVsCoins = function (hero, coin){
	coin.kill();
	this.sfx.coin.play();
	this.coinPickupCount++;
};

PlayState._onHeroVsEnemy = function (hero, enemy){
	if(hero.body.velocity.y > 0){ //kill enemies when hero is falling
		hero.bounce()
		enemy.die();
		this.sfx.stomp.play();
	}else{ //game over
		this.sfx.stomp.play();
		this.game.state.restart(true, false, {level: this.level});
	}
	
};

PlayState._onHeroVsKey = function(hero, key){
	this.sfx.key.play();
	key.kill();
	this.hasKey = true;
};

PlayState._onHeroVsDoor = function (hero, door){
	this.sfx.door.play();
	this.game.state.restart(true, false, {level: this.level+1});
}

PlayState._handleInput = function(){
	if(this.keys.left.isDown){
		this.hero.move(-1);
	}else if(this.keys.right.isDown){
		this.hero.move(1);
	}else{//stop
		this.hero.move(0);
	}
};

//entry point
window.onload = function(){
	let game = new Phaser.Game(960, 600, Phaser.AUTO, 'game');
	game.state.add('play', PlayState);
	game.state.start('play', true, false, {level: 0}); //keeps cache, wipe current entities 
};