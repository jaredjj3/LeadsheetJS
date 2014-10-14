define(['modules/converters/MusicCSLJson/ChordModel_CSLJson', 'modules/core/ChordModel'], function(ChordModel_CSLJson, ChordModel) {
	return {
		run: function() {
			test("ChordModel_CSLJson", function(assert) {
				var cm = new ChordModel();
				var CSLJsonConverter = new ChordModel_CSLJson();
				var t = CSLJsonConverter.exportToMusicCSLJSON(cm);
				// testing default export
				assert.deepEqual(t, {'ch':'','p':'',"beat":1});
				
				// testing export
				var chord = new ChordModel({'note':'G', 'chordType':'m7', 'beat':3, 'parenthesis': true, 'barNumber': 4});
				var exp = CSLJsonConverter.exportToMusicCSLJSON(chord);
				assert.deepEqual(exp,{'ch':'m7', 'p':'G', 'beat': 3, 'parenthesis': true} );

				// testing import
				var newChord = new ChordModel();
				CSLJsonConverter.importFromMusicCSLJSON(exp, newChord);
				var exp2 = CSLJsonConverter.exportToMusicCSLJSON(newChord);
				assert.deepEqual(exp2,{'ch':'m7', 'p':'G', 'beat': 3, 'parenthesis': true} );
			});
		}
	}
});