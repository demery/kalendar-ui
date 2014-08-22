$(document).ready(function(){

  var kuiManuscriptsUrl    = 'http://kalendarium-manuscripts.herokuapp.com';
  var kuiSaintsUrl         = 'http://kalendar-saints.herokuapp.com';
  var kuiSCHost            = 'http://165.123.34.221';
  var kuiSCContext         =  kuiSCHost + '/ns/context.json';
  var kuiCanvasesUrl       =  kuiSCHost + '/services/anno/calendars/canvas';
  var kuiManifestsUrl      =  kuiSCHost + '/services/anno/calendars/manifest';
  var kuiAnnotationsUrl    =  kuiSCHost + '/services/anno/calendars/annotation';
  var kuiRv                = [ null, 'r', 'v' ];
  var kuiColorMap          = {
    'Black': { color:'Black', code:'Ni'},
    'Brown': { color:'Black', code:'Ni'},
    'Black/Brown': { color:'Black', code:'Ni'},
    'Blue': { color:'Blue', code:'Li'},
    'Green': { color:'Green', code:'Vi'},
    'Pink': { color:'Orchid', code:'Ro'},
    'Red': { color:'Red', code:'Ru'},
    'Purple': { color:'Purple', code:'Pu'},
    'Gold': { color:'Peru', code:'Au'},
  };


  window.kuiPad = function (str, max) {
    str = str.toString();
    return str.length < max ? kuiPad("0" + str, max) : str;
  };

  window.kuiTruncWords = function (str, posn) {
    // Truncate this string but leave whole words
    posn = posn || 50;
    if (str.trim().length < posn) { return str.trim(); }

    var s = str.trim().substring(0,posn);
    var ws = /\s+/
    if (ws.exec(str[posn])) {
      return s.trim() + '...';
    } else {
      return s.split(/\s+/).slice(0, -1).join(' ') + '...';
    }
  };

  window.kuiGetDateElement
  window.kuiGetProp = function(obj, prop) {
    prop = prop.replace(/\[(\w+)\]/g, '.$1'); // convert indexes to properties
    prop = prop.replace(/^\./, '');           // strip a leading dot
    var a = prop.split('.');
    while (a.length) {
        var n = a.shift();
        if (n in obj) {
            obj = obj[n];
        } else {
            return;
        }
    }
    return obj;
  };

  // genUuid swiped from Mirador, if incorporated into Mirador; need to remove this
  window.kuiGenUUID = function() {
    var t = "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function(t) {
      var e = 0 | 16 * Math.random(), n = "x" == t ? e: 8 | 3 & e;
      return n.toString(16)
    });
    // return "uuid-" + t
    return t;
  };

  window.kuiSideToNum = function(val) {
    // return 'r', 'v' or undefined
    var m = (val ? (String(val).toLowerCase().match(/r|v/) || []) : [])[0];
    return (m && m === 'r' ? 1 : 2) || 0;
  };

  window.kuiCreateFolios = function() {
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
    var folio_sides      = _.findWhere($.kmw, { 'element': 'folio_sides'})['group']
    var folio_start_num  = _.findWhere(folio_sides, { 'element': 'folio_start_num'})['v'];
    var folio_start_side = _.findWhere(folio_sides, { 'element': 'folio_start_side'})['v'];
    var folio_end_num    = _.findWhere(folio_sides, { 'element': 'folio_end_num'})['v'];
    var folio_end_side   = _.findWhere(folio_sides, { 'element': 'folio_end_side'})['v'];
    var startFolio       = [ Number(folio_start_num), kuiSideToNum(folio_start_side) ];
    var endFolio         = [ Number(folio_end_num), kuiSideToNum(folio_end_side) ];
    var folios           = [ startFolio ];

    // compare [4,2] and [16,1] as 42 < 161, [5,1] and [16,1] as 51 < 161, etc.
    while (Number(_.last(folios).join('')) < Number(endFolio.join(''))) {
      var last = _.last(folios), num = last[0], side = last[1];
      // if side is 2 return [num++, 1]; if side is 1 return [num, 2]
      var next = (side == 2) ? ([num + 1, 1]) : ([num, 2]);
      folios.push(next);
    }
    $.kui.calendar.folios = folios;
  };

  window.kuiPrepManifest = function () {
    var sc_cal_manifest_id = _.findWhere($.kmw, { 'element': 'sc_cal_manifest_id'})['v'];

    if (sc_cal_manifest_id) {
      console.log('Retrieving manifest:', sc_cal_manifest_id);
      return kuiGetManifest(sc_cal_manifest_id);
    } else {
      console.log('Creating manifest');
      return kuiCreateManifest();
    }
  };

  window.kuiGetManifest = function(manifest_id) {
    return $.ajax({
      type: 'GET',
      url: manifest_id,
      dataType: 'json',
      crossDomain: true,
      contentType: 'application/json',
      success: function(data) {
        $.kui.manifest = data;
      },
      error: function(data) {
        console.log('error', data);
      }
    });
  };

  window.kuiCreateManifest = function() {
    var shelfmark = _.findWhere($.kmw, { 'element': 'shelfmark' })['v'] || 'No shelfmark';
    var ms_name   = _.findWhere($.kmw, { 'element': 'name'})['v'] || 'No name';
    var ms_id     = _.findWhere($.kmw, {'element': 'mid' })['v'];
    var rv        = [ null, 'r', 'v' ];
    var manifest  = {
      // Metadata about this Manifest file
      "@context":kuiSCContext,
      "@type":"sc:Manifest",

      // Metadata about the physical object/intellectual work
      "label": shelfmark,
      "metadata": [
      { "label":"Title", "value": ms_name },
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
    manifest.sequences[0].canvases = _.map($.kui.calendar.folios, function(fol) {
      var folNum = String(fol[0]) + rv[fol[1]];
      return {
        "@id": (kuiCanvasesUrl       + '/' + kuiGenUUID() + ".json"),
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
        var id = data['@id'];
        // add the manifest ID to the kmw manuscript data and push to
        // manuscripts service
        _.findWhere($.kmw, {'element': 'sc_cal_manifest_id'}).v = id;
        kmwFormUpdate();
        kmwSubmitEdit(ms_id);
        kuiGetManifest(id);
        // console.log('success', data);
      },
      error: function(data) {
        console.log('problem', data);
      }
    });
  };

  window.kuiNextFolio = function() {
    // get current folio index
    var folioIndex = $.kui.calendar.currFolio['folioIndex'];
    // get the next index
    folioIndex = folioIndex === null ? 0 : folioIndex + 1;
    if (folioIndex < $.kui.calendar.folios.length) {
      kuiNextFolioForm(folioIndex);
    } else {
      // @todo: last folio behavior ? return to 0?
    };
  };

  window.kuiNextFolioForm = function(folioIndex) {
    // create a human friendly list of folios
    var rv        = [ null, 'r', 'v' ];
    var folioNums = _.map($.kui.calendar.folios, function(fol) {
      return String(fol[0]) + rv[fol[1]];
    });

    // create the form elements
    elements = $.kui.calendar.nextFolioElements;
    _.each(elements, function(ele) {
      // $this = $(this);
      var $formElement = $('<div class="form-group"></div>');

      if (ele.label) {
        var $elementLabel = $('<label class="control-label" for="#nextFol-val-' + ele.element + '">' + ele.label + '</label>');
      };

      if (ele.fieldtype === 'text') {
        var $elementContainer = $('<div class=""><input type="textfield" class="form-control" id="nextFol-val-' + ele.element + '"></div>');

      // Add a hidden field input object
      } else if (ele.fieldtype === 'hidden') {
        var $elementContainer = $('<div class=""><input type="hidden" class="form-control" id="nextFol-val-' + ele.element + '"></div>');

      // Add a select field object
      } else if (ele.fieldtype === 'list') {
        var $elementContainer = $('<div class=""><select class="form-control" id="nextFol-val-' + ele.element + '"></select>');

        var elementOptions = '';

        _.each(ele.options, function(val, key) {
          elementOptions +='<option value= ' + key + '>' + val + '</option>';
        });

        $elementContainer.find('select').append(elementOptions);

      // Groups handle more complex types, including dates, grading, and dimensions
      };

      $formElement.append($elementLabel, $elementContainer);
      $('#kui-fields').append($formElement);
    });

    var folioOptions = '';
    _.each(folioNums, function(fol, index) {
      folioOptions += '<option value="' + index + '">' + fol + '</option>';
    });

    // select the correct folio
    $('#nextFol-val-folioIndex').append(folioOptions);
    $('#nextFol-val-folioIndex').find('option[value="' + folioIndex + '"]').attr('selected', 'selected');

    // add a button
    $('#kui-fields').append('<input type="button" id="nextFol-edit-btn" class="btn btn-default" value="Edit"/>')
    // set the button value to the selected folio
    $('#nextFol-val-folioIndex').find('option[value="' + folioIndex + '"]').attr('selected', 'selected');
    $('#nextFol-edit-btn').val('Edit ' + $('#nextFol-val-folioIndex option[selected]').text());
    // update the edit button to the currently selected folio
    $('#nextFol-val-folioIndex').change(function() {
      // console.log(this);
      $('#nextFol-edit-btn').val('Edit ' + $(this).find('option:selected').text());
    });

    $('#nextFol-edit-btn').on('click', function() {
      kuiUpdateCurrFolio();
      kuiStartFolio();
    });
    $('#kalendar').show();
  };

  window.kuiStartFolio = function() {
    // build the request for calendar data
    var currFolio = $.kui.calendar.currFolio;
    var url       = kuiSaintsUrl + '/api/from/' + currFolio['month'] + '/' + currFolio['startDay'] + '/to/' + currFolio['month'] + '/' + currFolio['endDay'];
    $.ajax({
      url: url,
      dataType: 'json',
      crossDomain: true,
      success: function(data) {
        $.kui.calendar.currFolio['dates'] = data['dates'];
        kuiEditFolioForm();
      },
      error: function(data) {
        console.log('problem', data);
      }
    });
  };

  window.kuiEditFolioForm = function() {
    // get contextual information
    var shelfmark  = _.findWhere($.kmw, { 'element': 'shelfmark' })['v'] || 'No shelfmark';
    var folioParts = $.kui.calendar.folios[$.kui.calendar.currFolio.folioIndex];
    var folio      = 'fol. ' + String(folioParts[0]) + kuiRv[folioParts[1]];
    var folioMonth = _.findWhere($.kui.calendar.nextFolioElements, { 'element': 'month'})['options'][$.kui.calendar.currFolio.month];
    var startDay   = $.kui.calendar.currFolio.startDay + '.' + folioMonth;
    var endDay     = $.kui.calendar.currFolio.endDay + '.' + folioMonth;
    var h1         = '<h1>' + shelfmark + ', ' + folio + ', days ' + startDay + ' - ' + endDay + '</h1>';
    var canvasId   = _.findWhere($.kui.manifest.sequences[0].canvases, { 'label': folio })['@id'];
    // get the user selected columns
    var columns     = [];
    var colElements = _.findWhere($.kmw, { 'element':'columns' })['group'];
    _.each(colElements, function(ele, index) {
      if (ele.v) { columns.push(ele.v); }
    });

    // KALENDAR TABLE
    // var $rows = $('<table id="kal_rows" class="table"><tbody></tbody></table>');
    var $rows = $('<table id="kal_rows" style="border-spacing:10px; border-collapse:separate;"><tbody></tbody></table>');

    // TABLE HEADER
    var $header = $('<tr id="kal_header"></tr>');
    $header.append('<th>Date</th>'); // Gregorian date header
    // create a header for each column
    _.each(columns, function(col) {
      var heading = _.findWhere($.kui.calendar.columnElements, { 'element':col })['head'];
      $header.append('<th>' + heading + '</th>');
    });
    $rows.append($header);

    // TABLE ROW & FORM for each date
    for(var i = 0; i < $.kui.calendar.currFolio.dates.length; i++) {
      var date         = $.kui.calendar.currFolio.dates[i];
      var month        = String(date['month']);
      var day          = String(date['day']);
      // monthDay has format like 0101, 1225
      var monthDay     = kuiPad(day, 2) + kuiPad(month, 2);
      var displayMonth = _.findWhere($.kui.calendar.nextFolioElements, { 'element':'month'})['options'][month];
      // displayDate has format like 1.i, 25.xii
      var displayDate  = day + '.' + displayMonth;

      // each date has a table row and a form
      var $row         = $('<tr id="row_' + monthDay + '"></tr>');

      // this column has the Gregorian day and date
      var $cell = $('<td>' + displayDate + '</td>');
      $row.append($cell);

      // Create the form and add hidden inputs for this day
      var $form = $('<form class="form-inline" id="' + monthDay + '"></form>');
      $form.append('<input type="hidden" id="cal-val-' + monthDay + '-day" value="' + day + '">');
      $form.append('<input type="hidden" id="cal-val-' + monthDay + '-month" value="' + month + '">');
      $form.append('<input type="hidden" id="cal-val-' + monthDay + '-canvas" value="' + canvasId + '">');

      // create a cell and form input for each column
      for(var j = 0; j < columns.length; j++) {
        var column = columns[j];
        var element = _.findWhere($.kui.calendar.columnElements, { 'element': column });

        // create the cell with the Feasts/Saints
        if (column === 'text') {
          // Create the cell
          $cell = $('<td style="vertical-align:middle;"></td>');

          // Add form to this cell
          $cell.append($form);

          // Add the form element
          $form.append('<select style="width:200px;" id="cal-val-' + monthDay + '-' + column + '"></select>');
          // color selections
          var $colorBoxes = $('<label style="vertical-align:middle" for="cal-val-' + monthDay + '-' + column + '"></label>');
          _.each(_.findWhere($.kmw, { 'element':'grading' })['group'], function(ele) {
            if (ele.v) {
              var color = kuiColorMap[ele.label];
              $colorBoxes.append('<span class="kui-colorbox" style="float:left; color:' + color.color + '; font-weight:bold; padding:3px;">' + color.code + '</span>');
            }
          });
          $form.find('select').after($colorBoxes);

          // fill in the saints drop down
          var selectOptions = '<option value="0"></option>';
          _.each(date.primary_saints, function(saint) {
            var saintName = saint['name'];
            if (saintName.indexOf('|') >= 0) {
              saintName = saintName.slice(0, saintName.indexOf('|')).trim();
            }
            selectOptions += '<option value="' + saint['@id'] + '">' + saintName + '</option>';
          });
          $form.find('select').append(selectOptions);

          // Add cell to row
          $row.append($cell);
        } else if(element.fieldtype === 'fixed') {
          // Create the cell
          $cell = $('<td></td>');
          var val = '';
          if (element.date_attr) {
            val = kuiGetProp(date, element.date_attr) || '';
          }
          $cell.text(val);

          // Add the form element
          $form.append('<input type="hidden" id="cal-val-' + monthDay + '-' + column + '" value="' + val + '"></input>');

          // Add cell to row
          $row.append($cell);
        }
      }
      $rows.append($row);
    }

    // Add click event for colorboxes
    $rows.on('click', '.kui-colorbox', function(event) {
      var $this = $(this);
      var $rgb = $this.css('color');
      $this.parent().find('.kui-colorbox').each(function(index, e){
        $(e).text($(e).text().replace('*', ''));
      });
      $this.prepend('*');
    });

    $('#kui').hide();
    $('#kalendar').removeClass('col-sm-3');
    $('#kalendar').append(h1);
    $('#kalendar').append($rows);
  };

  window.kuiSubmitAnnotation = function(element) {
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
    $ele = $(element);
    var $form = $ele.closest('form');

  };

  window.kuiUpdateCurrFolio = function() {
    _.each($('#kui-fields input, #kui-fields select'), function(ele) {
      var name = $(ele).attr('id').substr(12);
      var val = $(ele).val();
      _.each($.kui.calendar.currFolio, function(v,k) {
        if (k === name) { $.kui.calendar.currFolio[k] = val; }
      });
    });
  };

  window.kuiStartKalendar = function(ms_id) {
    kuiCreateFolios();
    var mf = kuiPrepManifest();

    // Set up the form
    $form = $('<form id="kui" role="form"><div id="kui-messages" class="alert"></div><div id="kui-fields"></div></form>');
    $('#kalendar').append($form);

    mf.done(function(data) {
      // make sure we update $.kmw and submit to the manuscript service
      kmwFormUpdate();
      kmwSubmitEdit(ms_id);
      kuiNextFolio();
    });
  };

  $.kui = {
    'calendar': {
      'folios': [],
      'currFolio': {
        'folioIndex': null,
        'month': null,
        'startDay': null,
        'endDay': null,
        'dates': null,
      },
      'nextFolioElements': [
        { 'element':'folioIndex', 'label':'Folio', 'v':'', 'fieldtype':'list', 'options':{} },
        { 'element':'month', 'label':'Month', 'v':'', 'fieldtype':'list', 'options':{
          '0':'', '1':'i', '2':'ii', '3':'iii', '4':'iiii', '5':'v', '6':'vi', '7':'vii', '8':'viii', '9':'ix', '10':'x', '11':'xi', '12':'xii'
          }
        },
        { 'element':'startDay', 'label':'Starting on', 'v':'', 'fieldtype':'list', 'options':{
          '0':'', '1':'1', '2':'2', '3':'3', '4':'4', '5':'5', '6':'6', '7':'7', '8':'8', '9':'9', '10':'10', '11':'11', '12':'12', '13':'13', '14':'14', '15':'15', '16':'16', '17':'17', '18':'18', '19':'19', '20':'20', '21':'21', '22':'22', '23':'23', '24':'24', '25':'25', '26':'26', '27':'27', '28':'28', '29':'29', '30':'30', '31':'31'
          }
        },
        { 'element':'endDay', 'label':'Ending on', 'v':'', 'fieldtype':'list', 'options':{
          '0':'', '1':'1', '2':'2', '3':'3', '4':'4', '5':'5', '6':'6', '7':'7', '8':'8', '9':'9', '10':'10', '11':'11', '12':'12', '13':'13', '14':'14', '15':'15', '16':'16', '17':'17', '18':'18', '19':'19', '20':'20', '21':'21', '22':'22', '23':'23', '24':'24', '25':'25', '26':'26', '27':'27', '28':'28', '29':'29', '30':'30', '31':'31'
          }
        },
      ],
      'columnElements': [
        { 'element':'number', 'date_attr':'goldenNumber.roman', 'label':'Golden Number', 'fieldtype':'fixed', 'head': 'Number', 'options':{} },
        { 'element':'letter', 'date_attr':'dominicalLetter', 'label':'Dominical Letter', 'fieldtype':'fixed', 'head':'Letter', 'options':{} },
        { 'element':'kni', 'date_attr':'romanDay.kni', 'label':'Kalends, Nones, Ides', 'fieldtype':'fixed', 'head':'KNI', 'options':{} },
        { 'element':'day', 'date_attr':'romanDay.roman', 'label':'Roman Day', 'fieldtype':'fixed', 'head':'Day', 'options':{} },
        { 'element':'text', 'date_attr':'', 'label':'Text', 'fieldtype':'list', 'head':'Feast', 'options':{} },
      ]
    },
  }

});