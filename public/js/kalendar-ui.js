var Kalendar = {
  shelfmark:       null,
  title:           null,
  startFolio:      null,
  endFolio:        null,
  folios:          null,
  currFolioIndex:  null,
  currManifestURL: null,
  columnTypes:     { month: "Month", day: "Day", goldenNumber: "Golden number",
    dominicalLetter: "Dominical letter", gregorianDate: "Gregorian date", item: "Item" },

  startPage: function(div_id) {
    $(div_id).append('<h1>Transcribe a manuscript calendar</h1>')
      .append($('<div/>', {id: 'ms-list'}));
    this.listManuscripts('#ms-list');
    $(div_id).append($('<div/>', { id: 'new-manuscript' }));
    $('#new-manuscript')
      .append('<h1>... or ... </h1>')
      .append($('<a/>', {
        class: 'btn btn-primary btn-lg',
        id: 'new-manuscript-link',
        href: '#',
        text: 'Add a calendar',
        click: function() {
          Kalendar.newManuscript(div_id);
          return false;
        }}));
  },

  listManuscripts: function(div_id) {
    var url = "http://www.shared-canvas.org/services/anno/calendars/manifest";
    var msJson;
    div = $(div_id)
    $.getJSON(url, function(data) {
      var items = [];
      _.each(data.resources, function(r) {
        items.push ('<li class="list-group-item"><a class="ms-manifest" id="' + r['@id'] + '">' + r['label'] + '</li>');
      });
      $("<ul/>", { class: 'list-group', html: items.join("")}).appendTo("div" + div_id);
    });
  },

  newManuscript: function(div_id) {
    msForm = $('<form id="create-ms" role="form" class="form-horizontal">')
      .append(Kalendar.textInput('Shelfmark', 'shelfmark'))
      .append(Kalendar.textInput('Title', 'title'))
      .append(Kalendar.textInput('First folio (e.g., 4r)', 'startFolio'))
      .append(Kalendar.textInput('Last folio (e.g., 10v)', 'endFolio'))
      .append(Kalendar.columnSelects(Object.keys(this.columnTypes).length))
      .append('<input type="submit" class="btn btn-default" value="Submit"/><br/>');
    $(div_id)
      .empty()
      .append('<h1>Add a manuscript</h1>')
      .append(msForm);
    $('#create-ms').submit(this.readCreateMs);
    $('#create-ms').validate({
      rules: {
        shelfmark: "required",
        title: "required",
        startFolio: "required",
        endFolio: "required"
      }
    });
    $(div_id + ' input[type=text]:first').focus();
  },

  readCreateMs: function(e, theForm) {
    e.preventDefault();
    var data = $(this).serializeArray();
    _.each(data, function(pair){Kalendar[pair.name] = pair.value; });
    Kalendar.createFolios(Kalendar.startFolio, Kalendar.endFolio);
    Kalendar.saveManifest();
    Kalendar.nextFolio($(this).parent('div').attr('id'));
  },

  nextFolio: function(div_id) {
    if (null == Kalendar.currFolioIndex) Kalendar.currFolioIndex = 0;
    var currFolio = Kalendar.folios[Kalendar.currFolioIndex];
    var folioForm = $("<form id='folio-lines'>")
      .append(Kalendar.textInput('Number of lines', 'lineCount'))
      .append('<br/>')
      .append('<input type="hidden" name="folioIndex" value="' + Kalendar.currFolioIndex + '"/>')
      .append('<input type="submit" value="Submit"/>');
    $('#' + div_id).empty()
      .append("<h1>" + Kalendar['shelfmark'] + ' fol. ' + currFolio + '</h1>')
      .append(folioForm);
    $('#folio-lines').submit(this.transcribeFolio);
    $('#folio-lines').validate({ rules: { lineCount: { required: true, digits: true }}});
    $('#folio-lines input[type=text]:first').focus();
  },

  transcribeFolio: function(e, theForm) {
    e.preventDefault();
    var data = $(this).serializeArray();
    $.each(data, function(){ Kalendar[this.name] = this.value; });
    var div_id= '#' + $(this).parent('div').attr('id');
    var columnKeys = Kalendar.calendarColumns();
    $(div_id).empty().append(Kalendar.columnHeaders(columnKeys, 75))
      .append('<br/>');
    var lines = Kalendar.lineInputs(Kalendar['lineCount'], columnKeys, 75);
    $(div_id).append(lines);
    $(div_id + ' input[type=text]:first').focus();
  },

  saveManifest: function() {
    var shelfmarkId = Kalendar.shelfmark.toLowerCase().replace(/\s/g,'');
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
        "height":1000,
        "width":700, };
    });
    var jstr = JSON.stringify(manifest);
    console.log("hi!");
    console.log(jstr);
    jQuery.ajax({
      type:"POST",
      url:"http://www.shared-canvas.org/services/anno/calendars/manifest",
      data:jstr,
      dataType:"json",
      contentType: "application/json",
      success: function(data, status, xhr) {
        console.log(data);
        console.log(status);
        console.log(xhr);
      }
    });
  },

  // genUuid swiped from Mirador, if incorporated into Mirador; need to remove this
  genUUID: function() {
    var t = "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function(t) {
      var e = 0 | 16 * Math.random(), n = "x" == t ? e: 8 | 3 & e;
      return n.toString(16)
    });
    // return "uuid-" + t
    return t;
  },

  folioLessThan: function(first, second) {
    var firstLower = first.toLowerCase();
    var secondLower = second.toLowerCase();
    var patt = /(\d+)([rv])/;
    var firstResult = firstLower.match(patt);
    var secondResult  = secondLower.match(patt);
    var firstNum = Number(firstResult[1]);
    var secondNum = Number(secondResult[1])
    if (firstNum == secondNum) {
      return firstResult[2] < secondResult[2];
    } else {
      return firstNum < secondNum
    }
  },

  textInput: function(title,name) {
    s = ''
    s += '<div class="form-group">'
    s += '<label for="name" class="col-sm-2 control-label">' + title + '</label>'
    s += '<div class="col-sm-10">'
    s += '<input type="text" class="form-control" name="' + name + '"/>'
    s += '</div>'
    return s
  },

  createFolios: function(startFolio, endFolio) {
    startLower = $.trim(startFolio).toLowerCase();
    endLower = $.trim(endFolio).toLowerCase();
    var patt = /(\d+)([rv])/i;
    var folios = [];
    folios.push(startLower)
    while(Kalendar.folioLessThan(folios[folios.length-1], endLower)) {
      var last = folios[folios.length-1];
      var result = last.match(patt);
      var num = result[1];
      var side = result[2];
      var next = '';
      if (side == 'v') {
        next = String(Number(num) + 1) + 'r';
      } else {
        next = String(num) + 'v';
      }
      folios.push(next);
    }
    Kalendar.folios = folios
  },

  columnSelects: function(count) {
    s = '';
    for (i=1; i <= count; i++) {
      s += this.columnSelect(i);
    }
    return s;
  },

  lineInputs: function(numLines,columnKeys,width,top) {
    var width  = typeof width !== 'undefined' ? width : 75;
    var top    = typeof top !== 'undefined' ? top : 31;
    var height = 16;
    var left   = 5;
    var s      = '';
    for(lineIndex = 0; lineIndex < numLines; lineIndex++) {
      s+= '<form name="line' + lineIndex + '"><span style="font-weigth:bold;position:absolute;top:' + top + 'px;left:' + left + 'px;height:' + height + 'px;width: ' + width + 'px;text-align:right">' + (lineIndex + 1) + '</span>'
      _.each(columnKeys, function() {
        left += (width + 10);
        s += '<input type="text" style="font-weigth:bold;position:absolute;top:' + top + 'px;left:' + left + 'px;height:' + height + 'px;width: ' + width + 'px;"/>'
      });
      s+= '</form><br/>';
      left = 5;
      top = (top + height + 10);
    }
    return s;
  },

  columnHeaders: function(columnKeys,width,top) {
    var width  = typeof width !== 'undefined' ? width : 75;
    var top    = typeof top !== 'undefined' ? top : 5;
    var height = 16;
    var left   = 5;
    var s      = '';
    s = '<span style="font-weigth:bold;position:absolute;top:' + top + 'px;left:' + left + 'px;height:' + height + 'px;width: ' + width + 'px;">Line no.</span>'
    _.each(columnKeys, function(key) {
        left += (width + 10)
         var columnName = Kalendar.columnTypes[key]
        s += '<span style="font-weigth:bold;position:absolute;top:' + top + 'px;left:' + left + 'px;height:' + height + 'px;width: ' + width + 'px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' + columnName + '</span>'
    });
    return s;
  },

  calendarColumns: function() {
    var cols = [];
    _.each(_.range(_.size(Kalendar.columnTypes)), function(index) {
      var attr = 'column' + String(index+1);
      var key  = Kalendar[attr];
      if (key) {cols.push(key); }
    });
    return cols;
  },

  columnSelect: function(columnNumber) {
    s = '<div class="form-group">';
    s += '<label class="col-sm-2 control-label for="column' + columnNumber +'">Column ' + columnNumber + '</label> ';
    s += '<div class="col-sm-10">'
    s += '<select name="column' + String(columnNumber) + '" class="form-control">';
    s += this.columnOptions();
    s += "</select>";
    s += '</div>'
    s += '</div>'
    s += "<br/>";
    return s;
  },

  columnOptions: function() {
    opts = [];
    opts.push("<option/>")
    $.each(Kalendar.columnTypes, function(k,v) {
      opts.push("<option value='" + k + "'>" + v + "</option>");
    });
    return opts.join();
  }
}