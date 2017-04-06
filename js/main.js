PlayState = {};

function Hero(game, x, y){
	Phaser.Sprite.call(this, game, x, y, 'hero');
	this.anchor.set(0.5, 0.5);
	this.game.physics.enable(this);
	this.body.collideWorldBounds = true;
};

Hero.prototype = Object.create(Phaser.Sprite.prototype);
Hero.prototype.constructor = Hero;

Hero.prototype.move = function (direction){
	const SPEED = 200;
	this.body.velocity.x = direction * SPEED;
};

Hero.prototype.jump = function(){
	const JUMP_SPEED = 600;
	let canJump = this.body.touching.down;

	if(canJump){
		this.body.velocity.y = -JUMP_SPEED;
	}

	return canJump;
}

//load game assets here
PlayState.preload = function(){
	//images load
	this.game.load.json('level:1', 'data/level01.json');
	this.game.load.image('background', 'images/background.png');
	this.game.load.image('ground', 'images/ground.png');
	this.game.load.image('grass:8x1', 'images/grass_8x1.png');
	this.game.load.image('grass:6x1', 'images/grass_6x1.png');
	this.game.load.image('grass:4x1', 'images/grass_4x1.png');
	this.game.load.image('grass:2x1', 'images/grass_2x1.png');
	this.game.load.image('grass:1x1', 'images/grass_1x1.png');
	this.game.load.image('hero', 'images/hero_stopped.png');

	//animations load
	this.game.load.spritesheet('coin', 'images/coin_animated.png', 22, 22);

	//audio load
	this.game.load.audio('sfx:jump', 'audio/jump.wav');
	this.game.load.audio('sfx:coin', 'audio/coin.wav');
};

//create game entities and set upt wolrd here
PlayState.create = function(){
	this.sfx = {
		jump: this.game.add.audio('sfx:jump'),
		coin: this.game.add.audio('sfx:coin')
	}
	this.game.add.image(0, 0, 'background');
	this._loadLevel(this.game.cache.getJSON('level:1'));
};

PlayState._loadLevel = function(data){
	const GRAVITY = 1200;
	//create group/layers
	this.platforms = this.game.add.group();
	this.coins = this.game.add.group();
	//spawn all platforms
	data.platforms.forEach(this._spawnPlatform, this);
	//spawn hero and enemies
	this._spawnCharacters({hero: data.hero});
	//spawn important objects
	data.coins.forEach(this._spawnCoin, this);
	this.game.physics.arcade.gravity.y = GRAVITY;
};

PlayState._spawnPlatform = function (platform){
	let sprite = this.platforms.create(
		platform.x, platform.y, platform.image);

	this.game.physics.enable(sprite);
	//immovalble platforms
	sprite.body.allowGravity = false;
	sprite.body.immovable = true;
};

PlayState._spawnCharacters = function (data){
	this.hero = new Hero(this.game, data.hero.x, data.hero.y);
	this.game.add.existing(this.hero);
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

PlayState.init = function (){
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
};

PlayState.update = function(){
	this._handleCollisions();
	this._handleInput();
};

PlayState._handleCollisions = function(){
	this.game.physics.arcade.collide(this.hero, this.platforms);
	this.game.physics.arcade.overlap(this.hero, this.coins, this._onHeroVsCoins, null, this);
};

PlayState._onHeroVsCoins = function (hero, coin){
	coin.kill();
	this.sfx.coin.play();
};

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
	game.state.start('play');
};