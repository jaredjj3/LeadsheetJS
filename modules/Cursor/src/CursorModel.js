define([
	'pubsub',
], function(pubsub) {

	/**
	 * Cursor consists of a pos array that contain index start and index end of position
	 * @param {Int|Array|Object} listElement allow to get size of a list, must be an int, or an array, or an object, if it's an object then getTotal function will be call to get list length
	 * @param {Array} optCursor gets a cursor as an array of two positions [start,end]
	 */
	function CursorModel(listElement, optCursor, isEditable) {
		this.listElement = listElement;
		optCursor = optCursor || [0, 0];
		if (!(optCursor instanceof Array)) optCursor = [optCursor, optCursor];

		this.sideSelected = 1;
		this.isEditable = (typeof isEditable !== "undefined") ? isEditable: true;
		this.setPos(optCursor);
		// this.color = color || "#0099FF";
	}


	CursorModel.prototype.getPos = function() {
		return this.pos;
	};

	/**
	 * @param {Array} gives the position of the note of the cursor pos can be an array [start,end]
	 * or a single value that will be converted to an array [value, value]
	 */
	CursorModel.prototype.setPos = function(pos) {
		if (!this.isEditable) {
			return;
		}
		if (!(pos instanceof Array)) pos = [pos, pos];
		pos = this._checkPosition(pos);
		this.pos = pos;
		$.publish('CursorModel-setPos', this.pos);
	};

	CursorModel.prototype.getStart = function() {
		return this.pos[0];
	};

	CursorModel.prototype.getEnd = function() {
		return this.pos[1];
	};

	/**
	 * Set only one element of the position eg setIndexPos(0, 3), setIndexPos(1, 4)
	 * @param {int} index must be 0 or 1, 0 mean you want to change start, 1 mean you want to change end
	 * @param {int} pos   cursor position
	 */
	CursorModel.prototype.setIndexPos = function(index, pos) {
		if (!this.isEditable) {
			return;
		}
		if ((index !== 0 && index !== 1) || isNaN(pos)) {
			throw 'CursorModel - setIndexPos, arguments not well defined ' + 'index:' + index + ' - pos:' + pos;
		}
		pos = this._checkPosition(pos)[0];
		this.pos[index] = pos;
		$.publish('CursorModel-setPos', this.pos);
	};

	/**
	 * This function check that a position is valid, it means that it's between 0 and listLength
	 * @param  {Int|Array} position can be a int or an array of two Int
	 * @return {Array}     A new position array clamped
	 */
	CursorModel.prototype._checkPosition = function(position) {
		if (!(position instanceof Array)) position = [position, position];
		var numNotes = this.getListLength();
		for (var i = 0; i < position.length; i++) {
			if (position[i] < 0) position[i] = 0;
			if (position[i] >= numNotes) position[i] = numNotes - 1;
		}
		return position;
	};

	/**
	 * normally after deleting, if cursor points to an unexisting note, it moves to the last one existing
	 */
	CursorModel.prototype.revisePos = function() {
		for (var i in this.pos) {
			if (this.pos[i] >= this.getListLength()) this.setIndexPos(i, this.getListLength() - 1);
		}
	};

	/**
	 * expands (= moves just one side of the cursor)
	 * @param  {int} inc      -1 or 1, expand to left or right
	 */
	CursorModel.prototype.expand = function(inc) {
		if (this.pos[1] === this.pos[0]) {
			this.sideSelected = (inc > 0) ? 1 : 0;
		}
		var newPos = this.pos[this.sideSelected] + inc;
		if (newPos < 0) {
			newPos = 0;
		}
		if (newPos >= this.getListLength()) {
			newPos = this.getListLength() - 1;
		}
		this.setIndexPos(this.sideSelected, newPos);
	};

	CursorModel.prototype.getRelativeCursor = function(index) {
		var newSelected = [this.pos[0] - index, this.pos[1] - index];
		return new CursorModel(newSelected);
	};

	CursorModel.prototype.reset = function() {
		this.setPos([0, 0]);
	};

	CursorModel.prototype.increment = function(inc) {
		inc = inc || 1;
		this.setIndexPos(0, this.pos[0] += inc);
		this.setIndexPos(1, this.pos[1] += inc);
	};

	CursorModel.prototype.getListLength = function() {
		if (typeof this.listElement === 'object') {
			return this.listElement.getTotal();
		}
		if (this.listElement.constructor === Array) {
			return this.listElement.length;
		}
		if (this.listElement.constructor === Number) {
			return this.listElement;
		}
	};

	CursorModel.prototype.setEditable = function(isEditable) {
		this.isEditable = !!isEditable;
	};

	CursorModel.prototype.getEditable = function() {
		return this.isEditable;
	};

	return CursorModel;
});