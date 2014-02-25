var Kalendar = {
  shelfmark:null,
  title:null,
  startFolio:null,
  endFolio:null,
  folios: null,
  currFolioIndex: null,
  columnTypes: { month: "Month", day: "Day", goldenNumber: "Golden number", 
    dominicalLetter: "Dominical letter", gregorianDate: "Gregorian date", item: "Item" },

  readCreateMs: function(e, theForm) {
    e.preventDefault();
    var data = $(this).serializeArray();
    _.each(data, function(pair){Kalendar[pair.name] = pair.value; });
    Kalendar.createFolios(Kalendar.startFolio, Kalendar.endFolio);
    var id = $(this).parent('div').attr('id');
    Kalendar.nextFolio($(this).parent('div').attr('id'));
  },

  start: function(div_id) {
    msForm = $('<form id="create-ms">')
      .append("<label>Shelfmark</label> <input type='text' name='shelfmark'/><br/>")
      .append("<label>Title</label> <input type='text' name='title'/><br/>")
      .append("<label>First calendar folio (e.g., 4r)</label> <input type='text' name='startFolio'/><br/>")
      .append("<label>Last calendar folio (e.g., 10v)</label> <input type='text' name='endFolio'/><br/>")
      .append(Kalendar.columnSelects(Object.keys(this.columnTypes).length))
      .append("<input type='submit' value='Submit'/><br/>");
    $(div_id)
      .append('<h1>Add a manuscript</h1>')
      .append(msForm);
    $(div_id + ' input[type="text"]:first').focus();
    $('#create-ms').submit(this.readCreateMs);
    $('#create-ms').validate({
      rules: {
        shelfmark: "required",
        title: "required",
        startFolio: "required",
        endFolio: "required"
      }
    });
  },

  nextFolio: function(div_id) {
    if (null == Kalendar.currFolioIndex) Kalendar.currFolioIndex = 0;
    var currFolio = Kalendar.folios[Kalendar.currFolioIndex];
    var folioForm = $("<form id='folio-lines'>")
      .append('<label>Number of lines</label> <input name="lineCount"/>')
      .append('<br/>')
      .append('<input type="hidden" name="folioIndex" value="' + Kalendar.currFolioIndex + '"/>')
      .append('<input type="submit" value="Submit"/>');
    $('#' + div_id).empty()
      .append("<h1>" + Kalendar['shelfmark'] + ' fol. ' + currFolio + '</h1>')
      .append(folioForm);
    $('#folio-lines').submit(this.transcribeFolio);
    $('#folio-lines').validate({ rules: { lineCount: { required: true, digits: true }}});
    $('#folio-lines input[type="text"]:first').focus();
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
    return '<label>' + title + '</label><input name="' + name + '"/>'
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
    s = "<label>Column "
    s += columnNumber
    s += "</label> "
    s += "<select name='column";
    s += String(columnNumber);
    s += "'>";
    s += this.columnOptions();
    s += "</select>";
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