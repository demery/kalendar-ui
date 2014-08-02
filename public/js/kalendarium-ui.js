$(document).ready(function(){

  $.kui = {
    'manuscript': {},
  };

  var kuiManuscriptsUrl = 'http://localhost:5000';
  var kuiManifestsUrl = 'http://www.shared-canvas.org/services/anno/calendars/manifest';
  var kuiAnnotationsUrl = 'http://www.shared-canvas.org/services/anno/calendars/annotation';
  var kuiRv = [ null, 'r', 'v' ];


  // genUuid swiped from Mirador, if incorporated into Mirador; need to remove this
  window.kuiGenUUID = function() {
    var t = "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function(t) {
      var e = 0 | 16 * Math.random(), n = "x" == t ? e: 8 | 3 & e;
      return n.toString(16)
    });
    // return "uuid-" + t
    return t;
  };

  window.kuiLookUpManuscript = function(ms_id) {
    theUrl = kuiManuscriptsUrl + '/api/manuscript/' + ms_id;
    return $.ajax({
      url: theUrl,
      dataType: 'json',
      crossDomain: true,
      success: function(data) {
        $.kui.manuscript = data

        // create all the folios as separate elements
        // this will make iteration and finding easier later
        // Folio data comes in this this way:
        //
        // { ..., "folio_end_num": "16", "folio_end_side": "1",
        //    "folio_start_num": "4", "folio_start_side": "2", ...}
        //
        // Convert to:
        // startFolio => [ 4, 2 ]
        // endFolio   => [ 16, 1 ]
        //
        // For this start and end, result will be
        //
        //       [ [4,2], [5,1], [5,2], [6,1], [6,2], ..., [16,1] ]
        //
        var startFolio = _.map([ data['folio_start_num'], data['folio_start_side'] ], Number);
        var endFolio   = _.map([ data['folio_end_num'], data['folio_end_side'] ], Number);
        folios = [ startFolio ];
        // compare [4,2] and [16,1] as 42 < 161, [5,1] and [16,1] as 51 < 161, etc.
        while (Number(_.last(folios).join('')) < Number(endFolio.join(''))) {
          var last = _.last(folios), num = last[0], side = last[1];
          // if side is 2 return [num++, 1]; if side is 1 return [num, 2]
          var next = (side == 2) ? ([num + 1, 1]) : ([num, 2]);
          folios.push(next);
        };
        // create holder for calendar properties
        $.kui.calendar = {};
        $.kui.calendar.folios = folios;
      },
      error: function(data) {
        console.log('problem', data)
      }
    });
  };

  window.kuiCreateManifest = function() {
    var shelfmarkId = $.kui.manuscript.shelfmark.toLowerCase().replace(/\s/g,'');
    var manifest = {
      // Metadata about this Manifest file
      "@context":"http://www.shared-canvas.org/ns/context.json",
      "@type":"sc:Manifest",

      // Metadata about the physical object/intellectual work
      "label": $.kui.manuscript.shelfmark,
      "metadata": [
      { "label":"Title", "value": $.kui.manuscript.name },
      ],
      // Rights Metadata
      "license":"http://www.example.org/license.html", // provide a real license
      "sequences":[{
        "@type": "sc:Sequence",
        "label": "Normal Page Order",
        // some nice information about the sequence
        "viewingDirection":"left-to-right",
        "viewingHint":"paged",
      }],
    };
    var rv = [ null, 'r', 'v' ]
    manifest.sequences[0].canvases = _.map($.kui.calendar.folios, function(fol) {
      var folNum = String(fol[0]) + rv[fol[1]];
      return {
        "@id": ("http://www.shared-canvas.org/services/anno/calendars/canvas/" + kuiGenUUID() + ".json"),
        "@type": "sc:Canvas",
        "label": "fol. " +  folNum,
        "height":1000,
        "width":700, };
      });
    var jstr = JSON.stringify(manifest);

    return jQuery.ajax({
      type:'POST',
      url:kuiManifestsUrl,
      data:jstr,
      dataType:'json',
      crossDomain: true,
      contentType: 'application/json',
      success: function(data) {
        console.log('success', data);
      },
      error: function(data) {
        console.log('problem', data);
      }
    });
  };

  window.kuiStartKalendar = function(ms_id) {
    var lookup = kuiLookUpManuscript(ms_id);
    var mf = lookup.then(kuiCreateManifest);
    mf.done(function(data) {
      var id = data['@id'];
      _.findWhere($.kmw, {'element': 'sc_cal_manifest_id'}).v = id;
      kmwFormUpdate();
      kmwSubmitEdit(ms_id);
    });
  };
});