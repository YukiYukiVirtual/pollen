(function(){
phina.globalize();

var WIDTH = 1280;
var HEIGHT = WIDTH * 9 / 16;

var SIZE = WIDTH / 10;
var LEVELUP_SCORE = 2000;
var ASSETS = {
	"image": {
		"player": "image/sugi_kafun.png",
		"enemy0": "image/taimatsu_man.png",
		"enemy1": "image/taimatsu_woman.png",
		"enemy2": "image/mahoutsukai_fire.png",
		"enemy3": "image/ginnoono_kinnoono.png",
		"defeat0": "image/allergy_kosuru_me_man_kafun.png",
		"defeat1": "image/allergy_kosuru_me_woman_kafun.png",
		"defeat2": "image/mahoutsukai_fire.png",
		"defeat3": "image/ginnoono_kinnoono.png",
		"ammo-1": "image/taimatsu.png",
		"ammo-2": "image/honoo_hi_fire.png",
		"ammo-3": "image/ono.png",
		"item0": "image/kona2_red.png",
		"item1": "image/kona6_green.png",
		"item2": "image/kona3_yellow.png",
		"life": "image/tree_hinoki.png",
		"bg": "image/bg_natural_mori.jpg",
		"resultbg": "image/kafun_tachimuka_woman_kageki.png",
	},
	"sound": {
		"shinkou": "sound/shinkou.mp3",
		"damage": "sound/hit_s07_b.wav",
		"die": "sound/fire02.wav",
		"pollen": "sound/pi01.wav",
		"axe": "sound/hit_s06_r.wav",
		"fire": "sound/fire01.wav",
		"defeat0": "sound/voice028.wav",
		"defeat1": "sound/voice015.wav",
		"defeat2": "sound/voice020.wav",
		"defeat3": "sound/voice025.wav",
		"summon2": "sound/voice012.wav",
		"summon3": "sound/voice011.wav",
		"power": "sound/power14.wav",
	}
};
SoundManager.setVolumeMusic(0.8);
SoundManager.setVolume(0.3);
phina.define("MainScene", {
	superClass: "DisplayScene",
	init: function() {
		this.superInit({
			width: WIDTH,
			height: HEIGHT,
		});
		this.backgroundColor = "#ffffdd";
		this.bg = new Array(2);
		for(var i = 0; i < this.bg.length; i++)
		{
			this.bg[i] = Sprite("bg")
				.setOrigin(0, 0)
				.setSize(this.gridX.width, this.gridY.width)
				.setPosition(this.gridX.width * i, 0)
				.addChildTo(this)
				.tweener
				.by({
					x: -this.gridX.width,
				}, 6000)
				.set({
					x: this.gridX.width * i,
				})
				.setLoop(true);
		}

		this.score = 0;
		this.level = 1;
		this.endFlag = false;


		this.lifeGroup = DisplayElement().addChildTo(this);
		this.lifeCurrent = TriangleShape({
			fill: "red",
			stroke: "yellow",
			radius: SIZE / 10,
		})
			.setPosition(-100, 0)
			.addChildTo(this);
		
		this.defeatGroup = DisplayElement().addChildTo(this);

		this.pollenGroup = DisplayElement().addChildTo(this);
		this.pollenFreq = 10;

		this.itemGroup = DisplayElement().addChildTo(this);
		this.itemFreq = 10;

		this.enemyGroup = DisplayElement().addChildTo(this);
		this.enemyFreq = 50;
		this.enemyFreqLimit = 20;
		
		this.bossFighting = 0;

		this.player = Player()
			.setSize(SIZE, SIZE)
			.setPosition(this.gridX.span(8), this.gridY.span(8))
			.addChildTo(this);

		var labelCenter = 8
		this.scoreLabel = Label({
			text: this.score,
			fill: "white",
		})
			.setOrigin(0, 0)
			.setPosition(this.gridX.span(labelCenter), 16)
			.addChildTo(this);
			
		this.levelLabel = Label({
			text: this.level,
			fill: "white",
		})
			.setOrigin(1, 0)
			.setPosition(this.gridX.span(labelCenter), 16)
			.addChildTo(this);
			
		this.addLife();
	},
	update: function(app) {
		if(!this.endFlag)
			this.updatePlayerPos(app.pointer, app.deltaTime * 2);

		if(!this.endFlag)
			this.enemyHitsPollen();

		this.enemyUpdate();

		this.pollenGroup.children.each(function(pollen) {
			if (pollen.x - pollen.radius > this.gridX.width) {
				pollen.remove();
			}
		}.bind(this));
		this.itemGroup.children.each(function(item) {
			if (item.x + item.radius < 0) {
				item.remove();
			}
		}.bind(this));

		// 花粉
		if(!this.endFlag)
			this.shotPollen();

		// 雑魚
		if (this.player.frame % (this.enemyFreq + (this.bossFighting > 0? 90:0)) == 0) {
			this.summonEnemy();
		}

		if(!this.endFlag)
			this.hitItem();
		
		this.scoreLabel.text = "Score: {0}".format(this.score.toString().replace(/(\d)(?=(\d{3})+(?!\d))/g, "$1,"));
		this.levelLabel.text = "Level: " + this.level;
		
		if(this.endFlag)
			return;
		
		if (this.playerHitsEnemy()) {
			this.subLife();
			if(!this.player.isAlive())
			{
				this.endFlag = true;
				this.defeat("player", this.player)
					.tweener.call(function(){
						this.exit({
							score: this.score,
						});
					}.bind(this));
				this.player.remove();
				SoundManager.play("die");
			}
			else
			{
				SoundManager.play("damage");
			}
		}
	},
	shotPollen: function() {
		var freq = this.pollenFreq;
		var times = 1;
		if(this.player.pollen == 2)
			freq /= 2;
		if(this.player.pollen == 3)
		{
			times = 3;
			freq *= 1.5;
		}
		freq = parseInt(freq);
		if (this.player.frame % freq == 0) {
			var rads = [
				Math.degToRad(0),
				Math.degToRad(10),
				Math.degToRad(-10),
			];
			for(var i = 0; i < times; i++)
			{
				var pollen = Pollen(this.player.power)
					.setPosition(this.player.x, this.player.y)
					.addChildTo(this.pollenGroup);
				pollen.physical.velocity.fromAngle(rads[i], 20);
			}
			SoundManager.play("pollen");
		}
	},
	summonEnemy: function() {
		var type = Random.randint(0, 1);
		var spanY = Random.randint(0, 16);
		var toSpanY = (8 + spanY) % 16;
		var hp = 3;
		var x = this.gridX.width;
		var y = this.gridY.span(spanY);
		var enemy = Enemy("enemy", type, hp, 50)
			.setSize(SIZE, SIZE)
			.setPosition(x, y)
			.addChildTo(this.enemyGroup);

		if (type == 0) {
			enemy.physical.velocity.fromAngle(
					Math.atan2(
						this.gridY.span(toSpanY) - enemy.y,
						0 - enemy.x
					),
					8
				);
		}
		if (type == 1) {
			enemy.physical.velocity.set(-8, 0);
			var wait = 0;
			enemy.tweener
				.wait(wait)
				.to({
					y: this.gridY.span(toSpanY),
				}, 2000)
				.wait(wait)
				.to({
					y: this.gridY.span(spanY),
				}, 2000)
				.setLoop(true);
		}
	},
	summonBoss: function() {
		var type = 2 + this.level % 2;
		var x = this.gridX.width;
		var y = this.gridY.span(8);
		var hp = 10 * Math.min(10, this.level);
		var speed = 2000;
		var boss = Enemy("enemy", type, hp, 200)
			.setPosition(x, y)
			.setSize(SIZE * 2, SIZE * 2)
			.addChildTo(this.enemyGroup);
		
		boss.tweener
			.to({
				x: this.gridX.span(14),
			}, speed)
			.call(function() {
				boss.tweener
					.clear()
					.to({
						y: this.gridY.span(14),
					}, speed)
					.to({
						y: this.gridY.span(2),
					}, speed)
					.setLoop(true);
			}.bind(this));
		this.bossFighting++;
		SoundManager.play("summon" + type);
	},
	summonItem: function(x, y) {
		var size = SIZE / 2;
		var type = Random.randint(0, 2);
		var item = Item(type)
			.setPosition(x, y)
			.setSize(size, size)
			.addChildTo(this.itemGroup);
		item.physical.velocity.set(-4, 0);
	},
	killEnemy: function(enemy)
	{
		if (enemy.type < 0) {
			
			enemy.remove();
			return;
		}
		switch(enemy.type)
		{
			case 2:
			case 3:
				this.bossFighting--;
			break;
		}
		this.score += enemy.score;

		if (this.score >= this.level * LEVELUP_SCORE) {
			this.levelUp();
		}
		this.defeat("defeat" + enemy.type, enemy);
		if (Random.randint(1, this.itemFreq) == 1) {
			this.summonItem(enemy.x, enemy.y);
		}
		enemy.remove();
	},
	enemyHitsPollen: function() {
		this.pollenGroup.children.each(function(pollen) {
			this.enemyGroup.children.each(function(enemy) {
				if (Collision.testCircleCircle(enemy, pollen)) {
					var power = pollen.power - enemy.hp;
					enemy.hp = enemy.hp - pollen.power;
					pollen.setPower(power);
					if (enemy.hp <= 0) {
						this.killEnemy(enemy);
						return;
					}
				}
			}.bind(this));
		}.bind(this));
	},
	hitItem: function() {
		this.itemGroup.children.each(function(item) {
			if (Collision.testCircleCircle(item, this.player)) {
				var suc = false;
				switch(item.type)
				{
					case 0:
						suc = this.player.powerUp();
					break;
					case 1:
						suc = this.addLife();
					break;
					case 2:
						suc = this.player.pollenUp();
					break;
				}
				item.remove();
				if(!suc)
				{
					this.score += 100;
				}
				SoundManager.play("power");
			}
		}.bind(this));
	},
	levelUp: function() {
		this.level++;
		this.enemyFreq = Math.max(this.enemyFreqLimit, this.enemyFreq - 1);
		this.summonBoss();
	},
	enemyUpdate: function() {
		this.enemyGroup.children.each(function(enemy) {
			var remOffset = 50;
			if (enemy.x + enemy.radius < -remOffset || enemy.type < 0 && enemy.frame >= 300) {
				enemy.remove();
				return;
			}
			switch(enemy.type)
			{
				case 0:
				case 1:
				if (enemy.frame % 60 == 1) {
					var ammo = Enemy("ammo", -1, this.level, 0)
						.setSize(64, 64)
						.setPosition(enemy.x, enemy.y)
						.addChildTo(this.enemyGroup);
					ammo.physical.velocity.fromAngle(
							Math.atan2(
								this.player.y - enemy.y,
								this.player.x - enemy.x
							),
							10
						);
					SoundManager.play("fire");
				}break;
				case 2:
				if(enemy.frame % 10 == 0)
				{
					var ammo = Enemy("ammo", -enemy.type, 1, 0)
						.setSize(64, 64)
						.setPosition(enemy.x, enemy.y)
						.addChildTo(this.enemyGroup);
					ammo.physical.velocity.set(-8, 0);
					SoundManager.play("fire");
				}break;
				case 3:
				if (enemy.frame % 43 == 0 || enemy.frame % 43 == 13) {
					var ammo = Enemy("ammo", -enemy.type, 999, 0)
						.setSize(64, 64)
						.setPosition(enemy.x, enemy.y)
						.addChildTo(this.enemyGroup);
					ammo.physical.velocity.fromAngle(
							Math.atan2(
								this.player.y - enemy.y,
								this.player.x - enemy.x
							),
							10
						);
					SoundManager.play("axe");
				}break;
				case -1:
				case -3:
				{
					enemy.rotation -= 15;
				}break;
				case -2:
				{
					var k = 10.0;
					var r = 8;
					var rx = r * 3 / 4
					enemy.physical.velocity.x = -Math.cos(enemy.frame / k) * r - rx;
					enemy.physical.velocity.y = Math.sin(enemy.frame / k) * r;
				}break;
			}
		}.bind(this));
	},
	playerHitsEnemy: function() {
		var result = false;
		this.enemyGroup.children.forEach(function(enemy) {
			if (Collision.testCircleCircle(enemy, this.player.Collider)) {
				this.killEnemy(enemy);
				result =  true;
			}
		}.bind(this));
		return result;
	},
	updatePlayerPos: function(cursor, dt) {
		this.player.tweener.clear()
		.to({
			x: cursor.x,
			y: cursor.y,
		},dt);
	},
	defeat: function(spriteName, elm) {
		if(elm.type != undefined)
			SoundManager.play(spriteName);
		var sprite = Sprite(spriteName)
			.setSize(elm.radius * 2, elm.radius * 2)
			.setScale(elm.scaleX, elm.scaleY)
			.setPosition(elm.x, elm.y)
			.addChildTo(this.defeatGroup);
		sprite.tweener.clear()
			.to({
				alpha: 0,
			})
			.call(function() {
				sprite.remove();
			});
		return sprite;
	},
	addLife: function() {
		this.player.lifeUp();
		if(this.lifeGroup.children.length == 3)
			return;
		var size = SIZE / 2;
		Sprite("life")
			.setSize(size, size)
			.setPosition(size * this.player.life * 0.9, size * 0.9)
			.addChildTo(this.lifeGroup);
		this.lifeCurrent
			.setPosition(this.lifeGroup.children.last.x,
				this.lifeGroup.children.last.y + this.lifeGroup.children.last.height);
	},
	subLife: function() {
		this.player.lifeDown();
		this.lifeGroup.children.last.remove();
		
		var size = SIZE / 2;
		if(this.lifeGroup.children.length == 0)
		{
			this.lifeCurrent.setPosition(-100, 0);
		}
		else
		{
			this.lifeCurrent
				.setPosition(this.lifeGroup.children.last.x,
					this.lifeGroup.children.last.y + this.lifeGroup.children.last.height);
		}
	},
});
phina.define("Item", {
	superClass: "Sprite",
	init: function(type) {
		this.superInit("item" + type);
		this.type = type;
	},
});
phina.define("Player", {
	superClass: "Sprite",
	init: function() {
		this.superInit("player");
		this.setScale(-1, 1);
		this.frame = 0;
		this.power = 1;
		this.pollen = 1;
		this.life = 0;
		this.Collider = Circle(0, 0, this.radius / 8);
	},
	update: function() {
		this.frame++;
		this.Collider.x = this.x;
		this.Collider.y = this.y;
	},
	powerUp: function() {
		if(this.power == 3)
			return false;
		this.power++;
		return true;
	},
	pollenUp: function() {
		if(this.pollen == 3)
			return false;
		this.pollen++;
		return true;
	},
	lifeUp: function() {
		if(this.life == 3)
			return false;
		this.life++;
		return true;
	},
	lifeDown: function() {
		this.life = Math.max(0, this.life - 1);
		this.power = Math.max(1, this.power - 1);
		this.pollen = Math.max(1, this.pollen - 1);
	},
	isAlive: function() {
		return this.life > 0;
	},
});
phina.define("Pollen", {
	superClass: "CircleShape",
	init: function(power, size) {
		this.superInit({
			stroke: "white",
			radius: 16,
		});
		this.setPower(power);
	},
	setPower: function(power) {
		if(power <= 0)
		{
			this.remove();
			return;
		}
		switch (power) {
			case 1:
				this.fill = "#ffd864";
				break;
			case 2:
				this.fill = "#ea8b4d";
				break;
			case 3:
				this.fill = "#d64437";
				break;
			default:
				this.fill = "white";
				this.radius = 256;
		}
		this.power = power;
	},
});
phina.define("Enemy", {
	superClass: "Sprite",
	init: function(name, type, hp, score) {
		this.superInit(name + type);
		this.type = type;
		this.hp = hp;
		this.score = score;
		this.frame = 0;
	},
	update: function() {
		this.frame++;
	},
});
phina.define("TitleScene", {
	superClass: "DisplayScene",
	init: function() {
		this.superInit({
			width: WIDTH,
			height: HEIGHT,
		});
		if (SoundManager.currentMusic == null) {
			if (phina.isMobile()) {
				this.addEventListener("click", function clickevent() {
					SoundManager.playMusic("shinkou");
					self.removeEventListener("click", clickevent);
				});
			} else {
				SoundManager.playMusic("shinkou");
			}
		}
		
		Sprite("bg")
			.setOrigin(0, 0)
			.setSize(this.gridX.width, this.gridY.width)
			.setPosition(0, 0)
			.addChildTo(this);
		Sprite("resultbg")
			.setOrigin(0, 0)
			.setSize(this.gridX.width, this.gridY.width)
			.setPosition(0, 0)
			.addChildTo(this);
		
		this.stopFlag = false;

		label = Label("\
			SoundEffect ザ・マッチメイカァズ\n\
			Illustration いらすとや\n\
			Music 甘茶の音楽工房\n\
			Programming 結城ゆき\n\
			")
			.setOrigin(0.5, 1)
			.setPosition(this.gridX.center(), this.gridY.span(16))
			.addChildTo(this);
		label.fontSize = 30;

		label = Label("連絡先 Twitter@YukiYukiVirtual")
			.setOrigin(0, 1)
			.setPosition(this.gridX.span(0), this.gridY.span(16))
			.addChildTo(this);
		label.fontSize = 20;

		label = Label("lastModified:" + document.lastModified)
			.setOrigin(1, 1)
			.setPosition(this.gridX.span(16), this.gridY.span(16))
			.addChildTo(this);
		label.fontSize = 20;

		/*
		Button({
			text: "コメント",
			width: 150,
			height: 50,
		})
			.setOrigin(1, 1)
			.setPosition(this.gridX.span(16), this.gridY.span(15))
			.addChildTo(this)
			.onclick = function()
			{
				alert("ゲームを進めていくと世界の時の流れが遅くなる不具合があります。\n\
				操作がままならなくなったらゲームを中断してください。\n\
				何らかの不都合に対する責任は負いません。\n\n\
				それ以外のバグっぽい挙動は多分全部仕様です。".replace(/	/g,""));
			};
*/

		Label({
			text: "Pollen Rebellion I",
			fontSize: 70,
			fontFamily: "'Times New Roman',serif",
		})
			.setPosition(this.gridX.center(), this.gridY.span(7))
			.addChildTo(this)
			.tweener
			.wait(2800)
			.set({
				fill: "red",
			})
			.wait(100)
			.set({
				fill: "black",
			})
			.wait(100)
			.set({
				fill: "red",
			})
			.wait(100)
			.set({
				fill: "black",
			})
			.setLoop(true);
		Sprite("life")
			.setPosition(this.gridX.center() - 30, this.gridY.span(10))
			.setSize(200, 300)
			.addChildTo(this)
			.rotation = 90;
		var startButton = Button({
				text: "Start",
				fontSize: 64,
				width: 200,
				height: 128,
				fill: "transparent",
				fontColor: "black",
			})
			.setPosition(this.gridX.center(), this.gridY.span(10))
			.addChildTo(this);
		var self = this;
		startButton.onclick = function() {
			self.stopFlag = true;
		}
		startButton.onpointover = function() {
			this.fontColor = "red";
		}
		startButton.onpointout = function() {
			this.fontColor = "black";
		}

		this.cursor = CircleShape({
				radius: 16
			})
			.addChildTo(this);
	},
	update: function(app) {
		var cursor = app.pointer;
		this.cursor.setPosition(cursor.x, cursor.y);
		if (this.stopFlag) {
			this.exit();
		}
	},
});

phina.define("ResultScene", {
	superClass: "DisplayScene",
	init: function(param) {
		this.superInit({
			width: WIDTH,
			height: HEIGHT,
		});
		Sprite("bg")
			.setOrigin(0, 0)
			.setSize(this.gridX.width, this.gridY.width)
			.setPosition(0, 0)
			.addChildTo(this);
		Sprite("resultbg")
			.setOrigin(0, 0)
			.setSize(this.gridX.width, this.gridY.width)
			.setPosition(0, 0)
			.addChildTo(this);
			
		for(var i=2; i < 15; i++)
		{
			var fire = Sprite("ammo-2")
				.setSize(SIZE * 2, SIZE * 2)
				.setPosition(this.gridX.span(i), this.gridY.span(3))
				.addChildTo(this);
			fire.tweener
				.by({
					scaleX: 0.1,
					scaleY: 0.1,
				})
				.by({
					scaleX: -0.1,
					scaleY: -0.1,
				})
				.setLoop(true);
		}
		var shareButton = Button({
				text: "シェアする",
				fontSize: 64,
				width: 350,
				height: 80,
			})
			.setPosition(this.gridX.center(), this.gridY.span(14))
			.addChildTo(this);

		var text = "{0}の人間を葬った".format(param.score.toString().replace(/(\d)(?=(\d{3})+(?!\d))/g, "$1,"));
		shareButton.onclick = function() {
			var url = phina.social.Twitter.createURL({
				text: text + (phina.isMobile() ? "(モバイルから)" : ""),
				hashtags: ["Pollen_Rebellion_I", "YukiYukiVirtual"],
			});

			window.open(url, "share window", "width=480, height=320");
		};

		var restartButton = Button({
				text: "もういちど",
				fontSize: 64,
				width: 350,
				height: 80,
				fill: "white",
				fontColor: "black",
			})
			.setPosition(this.gridX.center(), this.gridY.span(12))
			.addChildTo(this);
		var self = this;
		restartButton.onclick = function() {
			self.exit();
		}
		restartButton.onpointover = function() {
			this.fontColor = "red";
		}
		restartButton.onpointout = function() {
			this.fontColor = "black";
		}

		
		var label = Label({
			text: "GAME OVER",
			fontSize: 128,
			fill: "black",
			fontFamily: "'Times New Roman',serif",
		})
			.setPosition(this.gridX.center(), this.gridY.span(3))
			.addChildTo(this);

		label = Label(text)
			.setPosition(this.gridX.center(), this.gridY.span(7))
			.addChildTo(this);
		label.fontSize = 50;

		this.cursor = CircleShape({
				radius: 16
			})
			.addChildTo(this);
	},
	update: function(app) {
		var cursor = app.pointer;
		this.cursor.setPosition(cursor.x, cursor.y);
		if (this.stopFlag) {
			this.exit();
		}
	},
});
phina.define("LoadingScene", {
	superClass: "DisplayScene",
	init: function(options) {
		this.superInit(options);
		this.backgroundColor = "black";
		var loader = AssetLoader();
		this.loaded = false;
		this.ready = false;
		
		var text = "\
		20XX年――\n\
		花粉の散布量は毎年倍増し続けた。\n\
		事態を重く見た日本政府は、国民総動員による\n\
		花粉症ゼロ計画を開始する・・・・・・\n\
		\n\
		その頃、とある森では木々達が戦いの準備を始めていた。\n\
		\n\
		「俺たちを植えたのはお前ら人間じゃないか・・・・・・」\n\
		";
		this.intro = Label({
			text: text,
			fill: "white",
			fontSize: 30,
		})
			.setPosition(this.gridX.center(), this.gridY.center())
			.addChildTo(this)
			.tweener
			.wait(5000)
			.to({
				alpha: 0,
			})
			.call(function()
			{
				var title = Label({
					text: "Pollen Rebellion I",
					fontSize: 70,
					fontFamily: "'Times New Roman',serif",
					fill: "white",
				})
					.setPosition(this.gridX.center(), this.gridY.span(7));
				title.alpha = 0;
				title.tweener
					.to({
						alpha: 1,
					},2000)
					.wait(2000)
					.call(function()
					{
						this.ready = true;
					}.bind(this));
				title.addChildTo(this);
			}.bind(this));
		

		loader.onload = function() {
			this.loaded = true;
		}.bind(this);

		loader.load(options.assets);
	},
	onclick: function()
	{
		this.ready = true;
	},
	update: function()
	{
		if(this.ready && this.loaded)
			this.flare('loaded');
	},
});

phina.main(function() {
	var app = GameApp({
		width: WIDTH,
		height: HEIGHT,
		assets: ASSETS,
	});
	app.run();
});

})();