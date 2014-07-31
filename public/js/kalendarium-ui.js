KalendarView = function() {

  this.manuscriptsUrl = "http://localhost:5000";
  this.manifestsUrl   = "http://www.shared-canvas.org/services/manifest";
  this.annotationsUrl = "http://www.shared-canvas.org/services/annotation";
  $.kui = {
    manuscript: {},
  };

};

KalendarView.prototype = {

  lookUpManuscript: function(ms_id) {
    theUrl = this.manuscriptsUrl + '/api/manuscript/' + ms_id;
    console.log('theUrl', theUrl);
    return $.ajax({
      url: theUrl,
      dataType: 'json',
      crossDomain: true,
      success: function(data) {
        $.kui.manuscript = data
        // console.log('this', this);
        // console.log('name', $.kui_manuscript.name);
      },
      error: function(data) {
        console.log('problem', data)
      }
    });
  },

  createManifest: function(ms_id) {
    var kv = this;
    var shelfmarkId = $.kui.manuscript.shelfmark.toLowerCase().replace(/\s/g,'');
    var manifest = {
      // Metadata about this Manifest file
      "@context":"http://www.shared-canvas.org/ns/context.json",
      "@type":"sc:Manifest",

      // Metadata about the physical object/intellectual work
      "label":Kalendar.shelfmark,
      "metadata": [
        {"label":"Title", "value":Kalendar.title},
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
    manifest.sequences[0].canvases =  _.map(Kalendar.folios, function(fol) {
     return {
        "@id": ("http://www.shared-canvas.org/services/anno/calendars/canvas/" + Kalendar.genUUID() + ".json"),
        "@type": "sc:Canvas",
        "label": "fol. " +  fol,
        "_columns": Kalendar.calendarColumns(),
        "height":1000,
        "width":700, };
    });
    var jstr = JSON.stringify(manifest);

    return jQuery.ajax({
      type:"POST",
      url:"http://www.shared-canvas.org/services/anno/calendars/manifest",
      data:jstr,
      dataType:"json",
      crossDomain: true,
      contentType: "application/json",
    });
  },

  startKalendar: function(ms_id) {
    this.lookUpManuscript(ms_id);
  },
};