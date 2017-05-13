/**
* Модуль, отвечающий за перетаскивание карт.
* @class
*/

var CardControl = function(inDebugMode){

	this.inDebugMode = inDebugMode || false;

	this.card = null;
	this.pointer = null;

	this.trail = game.add.emitter(0, 0);
	this.trailDefaultBase = game.add.group();
	this.trail.makeParticles(skinManager.skin.trailName, 0);
	this.trailDefaultBase.name = 'trail';
	this.trailDefaultBase.add(this.trail);
	this.trail.gravity = 0;
	this.trail.lifespan = 600;
	this.trail.interval = 20;	//Свойство используется модулем, а не движком
	this.trail.maxParticles = Math.ceil(this.trail.lifespan / this.trail.interval);
	this.cardShiftDuration = 100;
	this.cardReturnTime = 200;
	this.cardClickMaxDelay = 200;

	this.cardMoveThreshold = 2;
	this.cardMaxMoveAngle = 30;
	this.inertiaHistory = [];
};

//Обрабатывает нажатие на карту
CardControl.prototype.cardClick = function(card, pointer){
	if(pointer.button == 1 || pointer.button == 4)
		console.log(card);

	if(!card.draggable || this.card && this.card != card || !this.card && card.field && card.field.uninteractibleTimer)
		return;

	if(this.inDebugMode)
		console.log('Card control: Clicked', card.id);

	if(this.card){
		this.cardPutDown();
	}
	else{
		this.cardPickup(card, pointer);
	}
};

//Обрабатывает поднятие кнопки после нажатия на карту
CardControl.prototype.cardUnclick = function(card){
	if(!this.card || this.card != card)
		return;

	if(this.inDebugMode)
		console.log('Card control: Unclicked', card.id);

	if(!this.pointer.withinGame){
		this.cardReturn();
	}
	else if(!this._cardPointerInbound() || !this.cardClickTimer || !this.pointer.isMouse || cardManager.physicsEnabled && this.card.sprite.body){
		this.cardPutDown();
	}
};


//Проверка нажатия на базу карты
CardControl.prototype._cardPointerInbound = function(){
	var width = this.card.field ? skinManager.skin.width*(1 + this.card.field.focusedScaleDiff) : skinManager.skin.width,
		height = this.card.field ? skinManager.skin.height*(1 + this.card.field.focusedScaleDiff) : skinManager.skin.height;
	return Phaser.Rectangle.containsRaw(
		this.card.base.x - width / 2,
		this.card.base.y - height / 2,
		width,
		height,
		this.pointer.x,
		this.pointer.y
	);
};

//Проверка корректности позиции карты (возащает false или поля)
CardControl.prototype._cardOnValidField = function(){
	if(!this.card.playable)
		return false;

	var fields = fieldManager.forEachField(function(field, si){
		if(field.highlighted && field.cardIsInside(this.card, false) && field.type != 'dummy'){
			return field;
		}
	}, this);
	if(!fields.length){
		fields = fieldManager.forEachField(function(field, si){
			if(field.highlighted && field.cardIsInside(this.card, false, true) && field.type != 'dummy'){
				return field;
			}
		}, this);
	}
	if(fields.length){
		return fields;
	}
	return false;
};

//CardControlAction
//CardControlCard
//CardControlTrail

//Обновление контроллера
CardControl.prototype.update = function(){
	var shouldUpdateTrail = this._updateCard();
	if(shouldUpdateTrail){
		var curTime = game.time.time;
		this._trailSpawnParticle(curTime);
	}
	this._updateTrail();
};

//Ресет контроллера
CardControl.prototype.reset = function(reason){

	if(this.inDebugMode)
		console.log('Card control: Reset' + (reason ? ': ' + reason : ''));

	this.trailReset(true);
	this.card = null;
	this.pointer = null;
};

//CardControlDebug