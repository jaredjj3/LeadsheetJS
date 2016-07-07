define([
	'modules/Unfold/src/PointLabel',
	'modules/Unfold/src/StartLabel',
	'modules/Unfold/src/EndLabel',
	'modules/Unfold/src/CodaToLabel',
	'modules/Unfold/src/StartPoint',
	'modules/Unfold/src/EndPoint',
	'modules/Unfold/src/ToCodaPoint',
	'modules/Unfold/src/SectionEndPoint',
	'modules/Unfold/src/SectionStartPoint',
	'modules/Unfold/src/SectionRepetition',
	'modules/Unfold/src/DaAlRepetition',
	'modules/Unfold/src/SectionRepetitionFactory',
	'modules/Unfold/src/LeadsheetUnfoldConfig',
	'modules/Unfold/src/RepetitionsHolder',
	'modules/Unfold/src/SectionSegment',
], function(PointLabel, StartLabel, EndLabel, CodaToLabel, StartPoint, EndPoint, ToCodaPoint, SectionEndPoint, SectionStartPoint, SectionRepetition, DaAlRepetition, SectionRepetitionFactory, LeadsheetUnfoldConfig, RepetitionsHolder, SectionSegment) {

	var LeadsheetStructure = function(song) {
		var self = this;
		var startLabels = new Map();
		var endLabels = new Map();
		var sectionStartPoints = {};
		var sectionEndPoints = new Map();
		var repetitions = [];

		var lastSectionEndPoint = null;

		this.leadsheet = song;
		this.sections = song.getSections();
		// IIFE init function at the end
		
		function hasStartLabel(label) {
			return startLabels.has(label);
		}
		this.hasEndLabel = function(label){
			return endLabels.has(label);
		};

		var createStartLabel = function(label, sectionNumber, barNumber) {
			if (hasStartLabel(label)) {
				return;
			}
			///TODO: playIndex
			var playIndex = self.sections[sectionNumber].getPlayIndexOfBar(barNumber);
			var startPoint = Object.create(StartPoint);
			startPoint.initValues(self, label, sectionNumber, barNumber, playIndex);
		};

		var createEndLabel = function(label, sectionNumber, barNumber){
			if  (self.hasEndLabel(label)){
				return;
			}
			var playIndex = self.sections[sectionNumber].getPlayIndexOfBar(barNumber);
			var endPoint;
			if (EndLabel.TOCODAS.indexOf(label) !== -1) {
				endPoint = Object.create(ToCodaPoint);
				endPoint.callInitValues(self, label, sectionNumber, barNumber, playIndex);
			}else{
				endPoint = Object.create(EndPoint);
				endPoint.initValues(self, label, sectionNumber, barNumber, playIndex);
			}
			
			
		};

		var addDaAlRepetition = function(sublabel, sectionNumber, barNumber) { 
			var playIndex = self.sections[sectionNumber].getPlayIndexOfBar(barNumber);
			var daAlRepetition = Object.create(DaAlRepetition);
			daAlRepetition.initValues(self, sublabel, sectionNumber, barNumber, playIndex);
			addRepetition(daAlRepetition);
		};
		this.getRepetitions = function() {
			return repetitions;
		};
		this.getSection = function(i) {
			return this.sections[i];
		};

		this.addStartLabel = function(point) {
			startLabels.set(point.getLabel(), point);
		};

		this.addEndLabel = function(point) {
			endLabels.set(point.getLabel(), point);
		};

		this.getStartLabels = function() {
			return startLabels;
		};

		this.getEndLabels = function() {
			return endLabels;
		};

		this.getStartLabel = function(label) {
			if (!startLabels.has(label)) {
				console.warn("missing label " + label );
			}
			return startLabels.get(label);
		};
		
		this.getEndLabel = function(label) {
			if (!endLabels.has(label)) {
				console.warn("missing label " + label );
			}
			return endLabels.get(label);
		};

		this.getSectionStartPoints = function() {
			return sectionStartPoints;
		};
		this.getSectionEndPoints = function() {
			return sectionEndPoints;
		};
		//we make it public for testing purposes (PTP)
		this.getLastSectionEndPoint = function() {
			return lastSectionEndPoint;
		};
		this.getSectionStartPoint = function(iSection) {
			return sectionStartPoints[iSection];
		};
		this.getSectionEndPoint = function(iSection, playIndex) {
			return sectionEndPoints.get(iSection + "-" + playIndex);
		};
		this.getSectionLastEndPoint = function(iSection) {
			var playIndex = this.sections[iSection].getLastPlayIndex();
			return this.getSectionEndPoint(iSection, playIndex);
		};

		var addSectionPlayPoints = function(section, iSection, playIndex) {
			var sectionEndPoint = Object.create(SectionEndPoint);
			sectionEndPoint.callInitValues(self, iSection, playIndex);
			sectionEndPoints.set(iSection + "-" + playIndex, sectionEndPoint);
			lastSectionEndPoint = sectionEndPoint;
		};
		var hasRepetitionUntil = function(point) {
			for (var i = 0; i < repetitions.length; i++) {
				if (repetitions[i].getUntilPoint() === point)
					return true;
			}
			return false;
		};
		var addCoda = function(label, sectionNumber, barNumber){
			if (self.hasEndLabel(label)){
				// Second coda sign
				// Returns false if both coda signs are already found
				// EndPoint toCodaPoint = getEndLabel(label);
				return addCodaTo(ToCodaLabel.getCodaToLabel(label), sectionNumber, barNumber);
			}else{
				createEndLabel(label, sectionNumber, barNumber);
				return true;
			}
		};

		var addCodaTo = function(toLabel, sectionNumber, barNumber){
			var toCodaPoint;
			var toCodaLabel = CodaToLabel.getToCodaLabel(toLabel);
			if (self.hasEndLabel(toCodaLabel)) {
				toCodaPoint = endLabels.get(toCodaLabel);
			} else if (toCodaLabel == EndLabel.TOCODA2){

				if(!self.hasEndLabel(EndLabel.TOCODA)){
					return false;
				}
				//NO ENTIENDO 
				toCoda1Point = EndLabel.get(EndLabel.TOCODA);
				toCodaPoint = createEndLabel(toCodaLabel, toCoda1Point.section, toCoda1Point.bar);
			}
			if (!toCodaPoint) {
				return false;
			}
			createStartLabel(toLabel, sectionNumber, barNumber);
			if (!hasRepetitionUntil(toCodaPoint)) {
				addDaAlRepetition("DC al Coda", sectionNumber, barNumber);
			}
		};

		var addRepetition = function(repetition) {
			repetitions.push(repetition);
		};

		var initSection = function(iSection) {
			var section = self.sections[iSection];

			var sectionStartPoint = Object.create(SectionStartPoint);
			sectionStartPoint.callInitValues(self, iSection);
			sectionStartPoints[iSection] = sectionStartPoint;

			var numPlays = section.hasOpenRepeats() ? 1 : section.getNumTimesToPlay();

			for (var playIndex = 0; playIndex < numPlays; playIndex++) {
				addSectionPlayPoints(section, iSection, playIndex);
			}
			if (section.hasOpenRepeats()) {
				addRepetition(SectionRepetitionFactory.get(self, iSection, 0));
			} else {
				for (playIndex = 0; playIndex < numPlays - 1; playIndex++) {
					addRepetition(SectionRepetitionFactory.get(self, iSection, playIndex));
				}
			}
		};

		this.getUnfoldConfig = function() {
			return new LeadsheetUnfoldConfig(this);
		};
		this.addSegmentsToList = function(list, cursor, toPoint) {
			var fromPoint = cursor.point;
			if (!fromPoint || !toPoint ||  toPoint.isBefore(fromPoint)
				/* || !toPoint.isPositionComplete() || !fromPoint.isPositionComplete() */
				){
				throw "invalid segment ";
			}
			for (var iSection = fromPoint.section; iSection <= toPoint.section; iSection++) {
				var segmentFrom = iSection === fromPoint.section ? fromPoint : this.getSectionStartPoint(iSection);
				var segmentTo = iSection === toPoint.section ? toPoint : this.getSectionLastEndPoint(iSection);
				var playIndex = iSection === fromPoint.section && iSection === toPoint.section ? cursor.playIndex : segmentTo.playIndex;
				list.push(new SectionSegment(this, segmentFrom, segmentTo, playIndex));
			}
			return list;
		};
		this.getSegments = function(unfoldConfig) {
			var segments = [];

			if (this.sections.length === 0){
				return segments;
			}
			var repHolder = Object.create(RepetitionsHolder);
			repHolder.init(this);
			var cursor = {
				point: self.getStartLabel(StartLabel.CAPO),
				playIndex: 0
			};
			var targetsStack = [];

			targetsStack.push({
				point: self.getEndLabel(EndLabel.END)
				//, repetition: null
			});
			var nextTarget, nextRepetition;
			while (targetsStack.length !== 0) {
				nextTarget = targetsStack[targetsStack.length - 1];
				nextRepetition = repHolder.getNextRepetitionIfBefore(cursor, nextTarget);
				if (!!nextRepetition) {
					targetsStack.push({
						point: nextRepetition.getTargetPoint(), 
						repetition: nextRepetition
					});
					continue;
				}
				nextTarget = targetsStack.pop();
				if (nextTarget.repetition != null) {
					
					nextRepetition = nextTarget.repetition;
					this.addSegmentsToList(segments, cursor, nextRepetition.getFromPoint());
					
					cursor = nextRepetition.updateCursor(cursor);
					var repUntilPoint = nextRepetition.getUntilPoint();
					nextTarget = targetsStack[targetsStack.length - 1];

					if (nextTarget && repUntilPoint && repUntilPoint.isBefore(nextTarget.point)) {
						targetsStack.push({
							point: nextRepetition.getUntilPoint()
						});
					}
				}
				else {
					this.addSegmentsToList(segments, cursor, nextTarget.point);
					cursor = nextTarget.point.updateCursor();
					if (!cursor.point)
						break;
				}
			}
			return segments;
		};

		this.getUnfoldedSections = function(unfoldConfig) {
			var sections = [];
			var newUnfoldedSection, prevUnfoldedSection, segment;
			var segments = this.getSegments();
			for (var i = 0; i < segments.length; i++) {
				segment = segments[i];
				newUnfoldedSection = segment.toUnfoldedSection();

			}
		};
		//Init function IIFE
		(function() {
			if (self.sections.length === 0) {
				return;
			}
			createStartLabel(StartLabel.CAPO, 0, 0);
			var section;
			for (var iSection = 0; iSection < self.sections.length; iSection++) {
				section  = self.sections[iSection];
				initSection(iSection);

				//looking for codas
				if (section.isNamedCoda()){
					addCodaTo(StartLabel.CODATO, iSection, 0);
				}else if (section.isNamedCoda2()){
					addCodaTo(StartLabel.CODA2TO, iSection, 0);
				}else{
					var coda;
					var codaLabels = PointLabel.getToCodaLabels();
					for (var i = 0; i < codaLabels.length; i++) { 
						coda = codaLabels[i];
						if(section.hasLabel(coda)){
							addCoda(coda, iSection, section.getLabel(coda));
						}
					}
				}
				//looking for solo labels (segno, segno2 and fine)
				//TODO
				var sublabels = section.getSublabels();
				for (var keySublabel in sublabels){
					addDaAlRepetition(keySublabel, iSection, sublabels[keySublabel]);
				}
			}
			createEndLabel(EndLabel.END, lastSectionEndPoint.section,
				lastSectionEndPoint.bar);
		})();
	};
	return LeadsheetStructure;
});