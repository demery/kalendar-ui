var Kalendar = {
  shelfmark:       null,
  title:           null,
  startFolio:      null,
  endFolio:        null,
  folios:          null,
  currFolioIndex:  null,
  currManifestURL: null,
  columnTypes:     { number: "Golden number", letter: "Dominical letter", day: "Roman day", kni: "Kalends, Nones, Ides", text: "Text" },
  months:          [ 'Ianuarius', 'Februarius', 'Martius', 'Aprilis', 'Maius', 'Iunius', 'Iulius', 'Augustus', 'September', 'October', 'November', 'December' ],

  startPage: function(div_id) {
    $(div_id).append('<h1>Manuscript calendars</h1>')
      .append($('<div/>', {id: 'ms-list'}));
    this.listManuscripts('#ms-list');
    $(div_id).append($('<div/>', { id: 'new-manuscript' }));
    $('#new-manuscript')
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
        items.push (
          '<li class="list-group-item">' + r['label'] + ' <a href="' + r['@id'] +
          '">[view]</a> <a class="delete-ms" id="' + r['@id'] +
          '">[delete]</a></li>');
      });
      $("<ul/>", { class: 'list-group', html: items.join("")}).appendTo("div" + div_id);
      $('.delete-ms').click(function() {
        $(this).parent('li').hide();
        $.ajax({
          url: $(this).attr('id'),
          type: 'DELETE',
        });
      });
    });
  },

  newManuscript: function(div_id) {
    msForm = $('<form id="create-ms" role="form" class="form-horizontal">')
      .append(Kalendar.textInput('Shelfmark', 'shelfmark'))
      .append(Kalendar.textInput('Title', 'title'))
      .append(Kalendar.textInput('First folio (e.g., 4r)', 'startFolio'))
      .append(Kalendar.textInput('Last folio (e.g., 10v)', 'endFolio'))
      .append(Kalendar.columnSelects(Object.keys(this.columnTypes).length))
      .append('<input type="submit" class="btn btn-default" value="Save"/><br/>');
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
    var div_id = $(this).parent('div').attr('id');
    _.each(data, function(pair){Kalendar[pair.name] = pair.value; });
    Kalendar.createFolios(Kalendar.startFolio, Kalendar.endFolio);
    Kalendar.saveManifest().done(function(data){
      var manifestId = data['@id'];
      Kalendar.nextFolio(0, manifestId, div_id);
    });
  },

  nextFolio: function(index, manifestId, div_id) {
    $.getJSON(manifestId, function(data) {
      var canvas = data.sequences[0].canvases[index];
      var currFolio = canvas.label;
      var url = data['@id'];
      var folioForm = $("<form id='folio-lines'>")
      .append(Kalendar.textInput('Number of lines', 'lineCount'))
      .append('<br/>')
      .append('<input type="hidden" name="folioIndex" value="' + index + '"/>')
      .append('<input type="hidden" name="manifestId" value="' + url + '"/>')
      .append('<input type="submit" class="btn btn-default" value="Continue"/>');
      $('#' + div_id).empty()
      .append("<h1>" + Kalendar['shelfmark'] + ' ' + currFolio + '</h1>')
      .append(folioForm);
      $('#folio-lines').submit(function(e,theForm) {
        e.preventDefault();
        var lineCount = _.find($(this).serializeArray(), function(pair) {
          return pair.name == 'lineCount';
        }).value;
        data.sequences[0].canvases[index]['_lineCount'] = parseInt(lineCount);
        Kalendar.updateManifest(url, data).done(Kalendar.transcribeFolio(data, index, div_id));
      });
      $('#folio-lines').validate({ rules: { lineCount: { required: true, digits: true }}});
      $('#folio-lines input[type=text]:first').focus();
    });
    return false;
  },

  updateManifest: function(manifestId, data) {
    var jstr = JSON.stringify(data);

    return jQuery.ajax({
      type:"PUT",
      url:manifestId,
      data:jstr,
      dataType:"json",
      contentType: "application/json",
    });
  },

  transcribeFolio: function(manifest, index, div_id) {
    var shelfmark = manifest.label;
    var canvas = manifest.sequences[0].canvases[index];
    var folio = canvas.label;
    var div = $('#' + div_id)

    div.empty().append('<h1>' + shelfmark + ', ' + folio + '</h1>');
    var yoff = div.find('h1:first').offset().top;
    yoff += (div.find('h1:first').height() + 3);
    div.append(Kalendar.columnHeaders(canvas._columns, 100, yoff));
    yoff = (div.find('span:last').offset().top + div.find('span:last').height() + 3);
    var lines = Kalendar.lineInputs(manifest, index, 100, yoff);
    div.append(lines);
    var lt = div.find('form:last [name=month]:first').offset().top;
    var ll = div.find('form:last [name=month]:first').offset().left;
    var lh = div.find('form:last [name=month]:first').height();
    var lw = div.find('form:last [name=month]:first').width();
    var top = lt + lh + 5;

    var f = $('<div/>');
    f.append('<form id="next-folio"/>');
    f.find('form').append('<input type="submit" class="btn btn-default"  value="Next folio"/>');
    f.find('input').css('position', 'absolute').css('top', top).css('left', ll);

    div.append(f);

    // the first time a month is selected, change all subsequent months on the page
    // to the same value;
    // Possible TODO: may want to limit this to the first month select on the page
    div.find('select[name=month]').one('change', function(){
      var e = $(this)
      e.closest('div.line-input').nextAll('div.line-input').find('select[name=month]').val(e.val());
    });
    div.find('.line-form').submit(Kalendar.transcribeLine);
    var manifestId = manifest['@id'];
    var nextIndex = index + 1;
    $('#next-folio').submit(function() {
      Kalendar.nextFolio(nextIndex,manifestId,div_id);
      return false;
    });
    div.find('select:first').focus();
    return false;
  },

  transcribeLine: function(e,theForm) {
    e.preventDefault();
    // {
    //   "@id": "http://www.shared-canvas.org/services/anno/calendars/annotation/ad9a52804-530b-4243-81d0-b06f41a25377.json",
    //   "@type": "oa:Annotation",
    //   "motivation": "sc:painting",
    //   "resource": {
    //     "@type": [
    //       "cnt:ContentAsText",
    //       "dctypes:Text"
    //     ],
    //     "format": "text/html",
    //     "chars": "<div data-month=\"1\" data-day=\"1 style=\"width:100%\">
    //                                <span data-type=\"number\" style=\"display:inline-block;color:rgb(255, 0, 0);width:11%\">iii</span>
    //                                <span data-type=\"letter\" style=\"display:inline-block;color:rgb(255, 0, 0);width:7%\">A</span>
    //                                <span data-type=\"other\" style=\"display:inline-block;color:rgb(0, 0, 255);width:10%\">X</span>
    //                                <span data-type=\"text\" style=\"display:inline-block;color:rgb(0, 0, 0);width:69%\">Cicumcisio domini ??? jhu xpt</span></div>"
    //   },
    //   "on": "http://www.shared-canvas.org/cals/canvas/c4.json#xywh=414,660,1270,68",
    //   "creator": {
    //     "@id": "mailto:azaroth42@gmail.com"
    //   }
    // }
    var form       = $(this);
    var monthNum   = form.find('select[name=month]').val();
    var monthName  = form.find('select[name=month] option:selected').text();
    var day        = form.find('input[name=day]').val();
    var xywh       = form.find('input[name=xywh]').val();

    var annotation = {};
    annotation['@type']      = 'oa:Annotation';
    annotation['motivation'] = 'sc:painting';
    annotation['resource']   = {
      '@type': [ 'cnt:ContentAsText', 'dctypes:Text' ],
      'format': 'text/html',
    };
    annotation['on']         = form.find('input[name=canvasId]').val() + '#xywh=' + xywh;
    annotation['creator']    = { '@id': 'mailto:emeryr@upenn.edu' }

    var spans = [];

    var colInputs = form.find('select, input[type!=hidden][type!=submit]');
    var colWidth = Math.round(100/_.size(colInputs));

    // spans.push('<span data-type="month" style="width:' + colWidth + '%;">' + monthName + '</span>')
    _.each(colInputs, function(el){
      var fieldType = el.nodeName.toLowerCase();
      if (fieldType == 'select')
        spans.push('<span data-type="' + $(el).attr('name') + '" style="width:' + colWidth + '%;">' + $(el).find('option:selected').text() + '</span>');
      else
        spans.push('<span data-type="' + $(el).attr('name') + '" style="width:' + colWidth + '%;">' + $(el).val() + '</span>');
    });

    annotation['resource']['chars'] = '<div data-month="' + monthNum + '" data-day="' + day + '" style="width:100%">' + spans.join(' ') + '</div>'

    var jstr = JSON.stringify(annotation);
    jQuery.ajax({
      type:"POST",
      url:"http://www.shared-canvas.org/services/anno/calendars/annotation",
      data:jstr,
      dataType:"json",
      contentType: "application/json",
    });

    var repText = [];
    // man, this is waaaaaay more convoluted than it should be
    repText.push(form.find('span.line-number')[0].outerHTML);
    // repText.push('<span data-type="month" style="' + form.find('select[name=month]').attr('style') + '%;">' + monthName + '</span>');
    _.each(colInputs, function(e){
      var je = $(e);
      var fieldType = e.nodeName.toLowerCase();
      if (fieldType == 'select')
        repText.push('<span data-type="' + je.attr('name') + '" style="' + je.attr('style') + '%;">' + je.find('option:selected').text() + '</span>');
      else
        repText.push('<span data-type="' + je.attr('name') + '" style="' + je.attr('style') + '%;">' + je.val() + '</span>');
    });
    var div = form.closest('div');
    div.empty().append(repText.join(''));
    div.nextAll('div').first().find('select:first').focus();

    return false;
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
      contentType: "application/json",
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

  lineInputs: function(manifest,index,width,top) {
    var width        = typeof width !== 'undefined' ? width : 75;
    var top          = typeof top !== 'undefined' ? top : 31;
    var height       = 20;
    var left         = 5;
    var canvas       = manifest.sequences[0].canvases[index];
    var numLines     = canvas._lineCount;
    var h            = Math.round(canvas.height / canvas._lineCount);
    var w            = canvas.width;

    var s = '';
    for(lineIndex = 0; lineIndex < numLines; lineIndex++) {
      var x            = 0;
      var y            = h * lineIndex;
      var xywh         = [ x, y, w, h ].join(',');
      var line = 'line' + lineIndex;
      s += '<div id="' + line + '" class="line-input">'
      s += '<form class="line-form" name="' + line + '">'
      s += '<span class="line-number" style="position:absolute;top:' + top + 'px;left:' + left + 'px;height:' + height + 'px;width: ' + width + 'px;text-align:right">' + (lineIndex + 1) + '</span>'
      s += '<input type="hidden" name="xywh" value="' + xywh + '" />'
      s += '<input type="hidden" name="canvasId" value="' + canvas['@id'] + '" />'
      left += (width + 10);
      s += Kalendar.monthSelect(top, left, height, width);
      left += (width + 10);
      s += Kalendar.dateSelect(top, left, height, width);
      _.each(canvas._columns, function(col) {
        left += (width + 10);
        if (col == 'kni')
          s += Kalendar.kniSelect(top, left, height, width);
        else if (col == 'letter')
          s += Kalendar.letterSelect(top, left, height, width);
        else
          s += '<input type="text" name="' + col + '" style="position:absolute;top:' + top + 'px;left:' + left + 'px;height:' + height + 'px;width: ' + width + 'px;"/>'
      });
      // Add a submit button that's styled right off the screen, so we get submit on enter
      s += '<input type="submit" style="position: absolute; left: -9999px; width: 1px; height: 1px;"/>'
      s += '</form>'
      s += '</div><br/>';
      left = 5;
      top = (top + height + 10);
    }
    return s;
  },

  letterSelect: function(top, left, height, width) {
    var s = '';
    s += '<select name="letter" style="position:absolute;top:' + top + 'px;left:' + left + 'px;height:' + height + 'px;width: ' + width + 'px;">';
    s += '<option/>'
    for(var i = 0; i < 7; i++) {
      var c = String.fromCharCode(97 + i);
      s += '<option value="' + c + '">' + c + '</option>'
    };
    s += '</select>'
    return s;
  },


  kniSelect: function(top, left, height, width) {
    var s = '';
    s += '<select name="kni" style="position:absolute;top:' + top + 'px;left:' + left + 'px;height:' + height + 'px;width: ' + width + 'px;">';
    s += '<option/>'
    _.each(['Kalends', 'Nones', 'Ides' ], function(kni){
      s += '<option value="' + kni + '">' + kni.charAt(0) + '</option>'
    });
    s += '</select>'
    return s;
  },

  dateSelect: function(top, left, height, width) {
    var s = '';
    s += '<select name="date" style="position:absolute;top:' + top + 'px;left:' + left + 'px;height:' + height + 'px;width: ' + width + 'px;">';
    s += '<option/>'
    _.each(_.range(31), function(date){
      s += '<option value="' + (date + 1) + '">' + (date + 1) + '</option>'
    });
    s += '</select>'
    return s;
  },


  monthSelect: function(top, left, height, width) {
    var s = '';
    s += '<select name="month" style="position:absolute;top:' + top + 'px;left:' + left + 'px;height:' + height + 'px;width: ' + width + 'px;">';
    s += '<option/>'
    _.each(Kalendar.months, function(month, index){
      s += '<option value="' + (index + 1) + '">' + month + '</option>'
    });
    s += '</select>'
    return s;
  },

  columnHeaders: function(columnKeys,width,top) {
    var width  = typeof width !== 'undefined' ? width : 75;
    var top    = typeof top !== 'undefined' ? top : 5;
    var height = 20;
    var left   = 5;
    var s      = '';
    s = '<span style="font-weight:bold;position:absolute;top:' + top + 'px;left:' + left + 'px;height:' + height + 'px;width: ' + width + 'px;">Line no.</span>'
    left += (width + 10)
    s += '<span style="font-weight:bold;position:absolute;top:' + top + 'px;left:' + left + 'px;height:' + height + 'px;width: ' + width + 'px;">Month</span>'
    left += (width + 10)
    s += '<span style="font-weight:bold;position:absolute;top:' + top + 'px;left:' + left + 'px;height:' + height + 'px;width: ' + width + 'px;">Day</span>'
    _.each(columnKeys, function(key) {
        left += (width + 10)
         var columnName = Kalendar.columnTypes[key]
        s += '<span style="font-weight:bold;position:absolute;top:' + top + 'px;left:' + left + 'px;height:' + height + 'px;width: ' + width + 'px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' + columnName + '</span>'
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
    s += '<br/>';
    return s;
  },

  columnOptions: function() {
    opts = [];
    opts.push('<option/>')
    $.each(Kalendar.columnTypes, function(k,v) {
      opts.push("<option value='" + k + "'>" + v + "</option>");
    });
    return opts.join();
  },
}