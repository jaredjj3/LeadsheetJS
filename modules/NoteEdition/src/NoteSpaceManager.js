define([
	'modules/Cursor/src/CursorModel',
	'utils/UserLog',
	'modules/Edition/src/ElementManager',
	'jquery',
	'pubsub',
], function(CursorModel, UserLog, ElementManager, $, pubsub) {
	/**
	 * NoteSpaceManager creates and manages an array of notes represented by their positions
	 * @exports NoteEdition/NoteSpaceManager
	 * 
	 * @param {CursorModel} cursor      
	 * @param {LSViewer} viewer      
	 * @param {String} name        name as CanvasLayer listener
	 * @param {String} color       RGB color. e. g.: "#FF0000"
	 * @param {Boolean} interactive if true, can be selected (e.g. cursor to edit notes will be interactive, player cursor will not)
	 * @param {Boolean} enabled     if true, it will be initially enabled (e.g. notes editing cursor), on the other hand, player cursor will be enabled on 'play'
	 */
	function NoteSpaceManager(cursor, viewer, name, color, interactive, enabled) {

		if (!cursor) {
			throw "NoteSpaceManager - missing cursor";
		}
		if (!viewer) {
			throw "NoteSpaceManager - missing viewer";
		}
		this.interactive = interactive === undefined ? true : interactive;
		this.CL_TYPE = this.interactive ? 'CURSOR' : 'NOT_INTERACTIVE'; //TODO: create maybe subclass (or abstract NoteSpaceManager)
		this.CL_NAME = name || 'NotesCursor';
		this.cursor = cursor;
		this.viewer = viewer;
		this.elemMng = new ElementManager();
		this.noteSpace = [];
		this.initSubscribe();
		this.enabled = enabled ? enabled : false;
		this.COLOR = color || "#0099FF";
	}

	/* private functions */
	var _changeCursorPosition = function(newPos, fireEvent) {
		if (newPos && this.cursor.getPos() !== newPos) {
			this.cursor.setPos(newPos);
			//when clicking on a note, if there is an audio player, cursor should be updated
			if (fireEvent !== false) {
				$.publish('NoteSpace-CursorPosChanged', this.cursor.getPos()); // getPos() returns array, of two elements, each element will be one parameter
			}
		}
	}

	/**
	 * Subscribe to view events
	 */
	NoteSpaceManager.prototype.initSubscribe = function() {
		var self = this;

		$.subscribe('LSViewer-drawEnd', function(el, viewer) {
			if (!self.viewer.canvasLayer) {
				throw "NoteSpaceManager needs CanvasLayer";
			}

			self.noteSpace = self.createNoteSpace(self.viewer);
			self.cursor.setListElements(self.noteSpace.length);
			self.viewer.canvasLayer.addElement(self);
			self.viewer.canvasLayer.refresh();

		});
		if (self.CL_TYPE === 'NOT_INTERACTIVE'){
			var _activate = function() {
				self.enable();
				self.playing = true;
			};
			var _unactivate = function(){
				self.playing = false;
			};
			$.subscribe('ToPlayer-playPause', _activate);
			$.subscribe('ToPlayer-play', _activate);
			$.subscribe('ToPlayer-stop', _unactivate);	
			$.subscribe('ToPlayer-pause', _unactivate);
		}
		$.subscribe('ctrl-a', function() {
			if (!self.interactive) return;
			self.enable();
			self.cursor.selectAll();
			self.viewer.canvasLayer.refresh();
		});

	};

	NoteSpaceManager.prototype.createNoteSpace = function(viewer) {
		var noteSpace = [];
		if (viewer.vxfBars === undefined) {
			return;
		}
		noteSpace = viewer.noteViews;
		return noteSpace;
	};

	NoteSpaceManager.prototype.getType = function() {
		return this.CL_TYPE;
	};

	/**
	 * @interface
	 * @param  {Object} coords
	 * @return {Object} e.g: {topY:44, bottomY: 23}
	 */
	NoteSpaceManager.prototype.getYs = function(coords) {
		return this.elemMng.getYs(this.noteSpace, coords);
	};

	/**
	 * @interface
	 * @param  {Object} coords      
	 * @param  {Integer} ini         
	 * @param  {Integer} end         
	 * @param  {Boolean} clicked     
	 * @param  {Boolean} mouseUp     
	 * @param  {Boolean} ctrlPressed 
	 */
	NoteSpaceManager.prototype.onSelected = function(coords, ini, end, clicked, mouseUp, ctrlPressed) {
		if (!this.interactive) return;
		var posCursor;
		var coordsTop, coordsBottom;

		posCursor = this.elemMng.getElemsInPath(this.noteSpace, coords, ini, end, this.getYs(coords));
		if (ctrlPressed){
			posCursor = this.elemMng.getMergedCursors(posCursor, this.cursor.getPos());
		}
		_changeCursorPosition.apply(this, [posCursor, mouseUp]);
	};

	/**
	 * @interface
	 * @param  {Object} coords {x: xval, y: yval}}
	 * @return {Boolean}
	 */
	NoteSpaceManager.prototype.inPath = function(coords) {
		return !!this.elemMng.getElemsInPath(this.noteSpace, coords);
	};

	/**
	 * @interface
	 * @param  {CanvasContext} ctx
	 */
	NoteSpaceManager.prototype.drawCursor = function(ctx) {
		if (this.noteSpace.length === 0 || (this.getType() === 'NOT_INTERACTIVE' && !this.playing)) return;
		var position = this.cursor.getPos(),
			saveFillColor = ctx.fillStyle,
		 	areas = [];

		if (position[0] !== null) {
			ctx.fillStyle = this.COLOR;
			ctx.globalAlpha = 0.2;
			areas = this.elemMng.getElementsAreaFromCursor(this.noteSpace, position);
			for (i = 0; i < areas.length; i++) {
				ctx.fillRect(
					areas[i].x,
					areas[i].y,
					areas[i].w,
					areas[i].h
				);
			}
			ctx.fillStyle = saveFillColor;
			ctx.globalAlpha = 1;
		}
	};

	/**
	 * @interface
	 */
	NoteSpaceManager.prototype.isEnabled = function() {
		return this.enabled;
	};

	/**
	 * @interface
	 */
	NoteSpaceManager.prototype.enable = function() {
		this.enabled = true;
	};

	/**
	 * @interface
	 */
	NoteSpaceManager.prototype.disable = function() {
		if (!this.playing){ 		//if 'NOT_INTERACTIVE' depends if playing
			this.enabled = false;
			_changeCursorPosition.apply(this, [[0,0]]);
		}
	};
	/**
	 * @interface
	 */
	NoteSpaceManager.prototype.setCursorEditable = function(bool) {
		this.cursor.setEditable(bool);
	};

	return NoteSpaceManager;
});