$(document).ready(function(){

  var kuiManuscriptsUrl    = 'http://kalendarium-manuscripts.herokuapp.com';
  var kuiSaintsUrl         = 'http://kalendar-saints.herokuapp.com';
  var kuiSCHost            = 'http://sims-dev.library.upenn.edu';
  var kuiSCContext         =  kuiSCHost + '/ns/context.json';
  var kuiCanvasesUrl       =  kuiSCHost + '/services/anno/calendars/canvas';
  var kuiManifestsUrl      =  kuiSCHost + '/services/anno/calendars/manifest';
  var kuiAnnotationsUrl    =  kuiSCHost + '/services/anno/calendars/annotation';
  var kuiSCListUrl         =  kuiSCHost + '/services/anno/calendars/list';
  var kuiRv                = [ null, 'r', 'v' ];
  var kuiColorMap          = {
    'grade_black':  { name:'Black/Brown',  code:'Ni', rgb:'rgb(0, 0, 0)'},
    'grade_blue':   { name:'Blue',         code:'Li', rgb:'rgb(0, 0, 255)'},
    'grade_green':  { name:'Green',        code:'Vi', rgb:'rgb(0, 128, 0)'},
    'grade_pink':   { name:'Pink',         code:'Ro', rgb:'rgb(218, 112, 214)'},
    'grade_red':    { name:'Red',          code:'Ru', rgb:'rgb(255, 0, 0)'},
    'grade_purple': { name:'Purple',       code:'Pu', rgb:'rgb(128, 0, 128)'},
    'grade_gold':   { name:'Gold',         code:'Au', rgb:'rgb(205, 133, 63)'},
  };


  // =============== GENERAL UTILS ============================================
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

  // genUuid swiped from Mirador
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

  // =============== DATA RETRIEVAL ===========================================
  // --------------- MS WIDGET DATA ---
  window.kuiGetGrading = function() {
    var grading = [];
    _.each(_.findWhere($.kmw, { 'element': 'grading'})['group'], function(grade) {
      var weight = grade.v;
      if (weight) {
        grading.push([grade.v, grade.element]);
      }
    });

    switch (grading.length) {
      case 0:
        grading = ['1', 'grade_black'];
        break;
      case 1:
        break;
      default:
        grading.sort(function(a,b){
          return Number(a[0]) - Number(b[0]);
        });
    }

    return grading;
  };

  window.kuiGradingSelect = function() {
    var grading = kuiGetGrading();
    var $select = $('<select name="grade"/>');
    $select.append('<option value="0"></option>');

    _.each(kuiGetGrading(), function(g) {
      var color = kuiColorMap[g[1]];
      $select.append('<option value="' + color.rgb + '">' + color.name + '</option>');
    });

    return $select;
  };

  // =============== DATA RETRIEVAL ===========================================
  // --------------- KALENDAR UI DATA ----
  // get the current folio name
  window.kuiGetCurrFolioName = function() {
    var folioParts = $.kui.calendar.folios[$.kui.calendar.currFolio.folioIndex];
    if (folioParts) {
      return 'fol. ' + String(folioParts[0]) + kuiRv[folioParts[1]];
    } else {
      return '';
    }
  };

  window.kuiGetCanvas = function(folio) {
    if ($.kui.manifest.sequences[0]) {
      return _.findWhere($.kui.manifest.sequences[0].canvases, { 'label': folio });
    }
  };

  window.kuiGetCurrCanvas = function() {
    var folio = kuiGetCurrFolioName();
    if (folio) {
      return kuiGetCanvas(folio);
    }
  };

  window.kuiGetAnnotation = function(anno_id) {
    var anno = _.findWhere($.kui.calendar.currFolio.annotations, { '@id': anno_id });
    if (!anno) {
      var deferred = $.ajax({
        url: anno_id,
        dataType: 'json',
        crossDomain: true,
        success: function(data) {
          if (! $.kui.calendar.currFolio['annotations']) {
            $.kui.calendar.currFolio['annotations'] = [];
          }
          $.kui.calendar.currFolio['annotations'].push(data);
        },
        error: function(data) {
          console.log('problem', data);
        }
      });
      deferred.done(function(){
        return kuiGetAnnotation(anno_id);
      });
    }
    return anno;
  };

  window.kuiGetDate = function(month, day) {
    var date = _.findWhere($.kui.calendar.currFolio.dates, { 'month':Number(month), 'day':Number(day) });
    if (!date) {
      var deferred = $.ajax({
        url: kuiSaintsUrl + '/api/date/' + month + '/' + day,
        dataType: 'json',
        crossDomain: true,
        success: function(data) {
          if (! $.kui.calendar.currFolio['dates']) {
            $.kui.calendar.currFolio['dates'] = [];
          }
          $.kui.calendar.currFolio['dates'].push(data);
        },
        error: function(data) {
          console.log('problem', data);
        }
      });

      deferred.done(function() {
        return kuiGetDate(month, day);
      });
    }
    return date;
  };

  // =============== MANUSCRIPTS & MANIFESTS ==================================
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
      url:'http://165.123.34.221//services/anno/calendars/manifest',
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

  // =============== FOLIOS ===================================================
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

    // add a submit button
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
        kuiPrepAnnotations();
      },
      error: function(data) {
        console.log('problem', data);
      }
    });
  };

  window.kuiPrepAnnotations = function(retries) {
    // we try to get the annotations and
    // create them if they don't exist.
    // if retries is a number, use it; otherwise, use 1
    var n = Number(retries);
    n = (!isNaN(n) && isFinite(n)) ? Math.floor(n) : 1;

    // get/create annotations
    var kfa = kuiFetchAnnotations();
    kfa.done(function() {
      // if we found no annotations and we have retries left,
      // create the annottions and try to get them again
      if ($.kui.calendar.currFolio.annotations.length > 0) {
        kuiEditFolioForm();
      } else if (n > 0) {
        // if we found no annotations and we have retries left,
        // create the annottions and try to get them again
        var annos = kuiBuildAnnotations();
        // get an array of promises for each annotation
        var deferreds = [];
        for(var i = 0; i < annos.length; i++){
          deferreds.push(kuiCreateAnnotation(annos[i]));
        }
        // When all the annotations have been created, reinvoke kuiPrepAnnotations
        // http://stackoverflow.com/questions/14777031/what-does-when-apply-somearray-do
        $.when.apply($, deferreds).done(function() {
          kuiPrepAnnotations(n - 1);
        });
      }
    });
  };

  window.kuiFetchAnnotations = function() {
    var canvas = kuiGetCurrCanvas();
    var canvasId = null;
    if (canvas) {
      canvasId = canvas['@id'].split('/').pop();
      var url = kuiSCListUrl + '/' + canvasId;
      return $.ajax({
        type: 'GET',
        url: url,
        dataType: 'json',
        crossDomain: true,
        contentType: 'application/json',
        success: function(data) {
          $.kui.calendar.currFolio.annotations = data['resources'];
          // ok, now put them in day order
          $.kui.calendar.currFolio.annotations.sort(function(a, b){
            var $a = $(a.resource.chars), $b = $(b.resource.chars);
            // create numbers for each month/day: 1/1 => 101; 1/31 => 131; 10/1 => 1001
            var a_val = (Number($a.attr('data-month')) * 100) + (Number($a.attr('data-day')));
            var b_val = (Number($b.attr('data-month')) * 100) + (Number($b.attr('data-day')));
            // return the difference of a - b
            return a_val - b_val;
          });
        },
        error: function(data) {
          $.kui.calendar.currFolio.annotations = [];
          console.log('error', data);
        }
      });
    }
  };

  window.kuiBuildAnnotations = function() {
    // create array of json string annotations for currFolio
    var annotations = [];
    var dates       = $.kui.calendar.currFolio.dates;
    var folioParts  = $.kui.calendar.folios[$.kui.calendar.currFolio.folioIndex];
    var folio       = 'fol. ' + String(folioParts[0]) + kuiRv[folioParts[1]];
    var columns     = [];
    var colElements = _.findWhere($.kmw, { 'element':'columns' })['group'];
    _.each(colElements, function(ele, index) {
      if (ele.v) { columns.push(ele.v); }
    });
    var canvas        = _.findWhere($.kui.manifest.sequences[0].canvases, { 'label': folio });
    var canvasId      = canvas['@id'];
    var canvasXOffset = Math.round(canvas['width']/10);
    var canvasYOffset = Math.round(canvas['height']/10);
    var lineH         = Math.round((canvas['height'] - (canvasXOffset * 2))/dates.length);
    var lineW         = Math.round(canvas['width'] - canvas['width']/20);
    var itemWidth     = Math.round(100/(columns.length + 2));

    for(var i = 0; i < dates.length; i++) {
      var date     = $.kui.calendar.currFolio.dates[i];
      var month    = String(date['month']);
      var day      = String(date['day']);
      var monthDay = kuiPad(month, 2) + kuiPad(day, 2);
      var x        = canvasXOffset;
      var y        = canvasYOffset + (i*lineH);
      var xywh     = [ x, y, lineW, lineH ].join(',');

      var spans = '<div data-month="' + month + '" data-day="' + day + '" style="width:100%;" class="kalendar-row">';
      _.each(columns, function(col, index) {
        var colWidth = itemWidth;
        if (col == 'text') {
          colWidth = Math.floor(colWidth * 2);
        }
        var element = _.findWhere($.kui.calendar.columnElements, { 'element': col });
        var spanId  = 'val-' + monthDay + '-' + col;
        var v       = '';
        if (element.date_attr) {
          v = kuiGetProp(date, element.date_attr) || '';
        }
        spans += '<span id="'+ spanId + '" data-type="' + col + '" data-value="' + v + '" style="display:inline-block;color:rgb(0,0,0);width:' + colWidth + '%;">' + v + '</span>';
      });
      spans += '</div>';

      var annotation = {
        '@type': 'oa:Annotation',
        'motivation': 'sc:painting',
        'resource': {
          '@type': [
          'cnt:ContentAsText',
          'dctypes:Text'
          ],
          'format':'text/html',
          'chars':spans
        },
        'on':canvasId + '#xywh=' + xywh,
        'creator': {
          '@id': 'mailto:emeryr@upenn.edu'
        }
      };

      annotations.push(JSON.stringify(annotation));
    }
    return annotations;
  };

  window.kuiCreateAnnotation = function(jstr) {
    return $.ajax({
      type:'POST',
      url: kuiAnnotationsUrl,
      data:jstr,
      dataType:'json',
      crossDomain: true,
      contentType:'application/json',
    });
  };

  window.kuiEditRow = function(cntnr) {
    var $cntnr = $(cntnr);
    var $row = $cntnr.find('div:first');
    var date = kuiGetDate($row.attr('data-month'), $row.attr('data-day'));
    _.each($cntnr.find('span'), function(span) {
      var $span = $(span);
      $span.empty();
      var col = $span.attr('data-type');
      var val = $span.attr('data-value');
      var $select = $('<select name="' + col + '"/>');
      $select.append('<option value="0"></option>');
      if (col === 'text') {
        var saints = [];
        if(date.secondary_saints) {
          saints = date.primary_saints.concat(date.secondary_saints);
        } else {
          saints = date.primary_saints;
        }

        _.each(saints, function(saint) {
          var saintName = saint['name'];
          if (saintName.indexOf('|') >= 0) {
            saintName = saintName.slice(0, saintName.indexOf('|')).trim();
          }
          $select.append('<option value="' + saint['@id'] + '">' + saintName + '</option>');
          $select.css('width', '200px');
        });
        $span.append($select);
        $span.append(kuiGradingSelect());
        if ($span.css('color')) {
          $span.find('select[name=grade]').val($span.css('color'));
        }
      } else {
        var ele = _.findWhere($.kui.calendar.columnElements, { 'element': col });
        _.each(ele.options, function(v, k) {
          $select.append('<option value="' + k + '">' + v + '</option>');
        });
        $span.append($select);
      }

      if (val) { $select.val(val); }

      $select.on('change', function(){
        $(this).closest('span').attr('data-value', $(this).val());
      });

    });
    $row.find('input[type=button]').remove();
    $row.append('<input type="button" value="Save" style="width:40px;" class="btn btn-xs">');

    $cntnr.on('change', 'select[name=grade]', function(){
      $(this).closest('span').css('color', $(this).val());
    });

    $cntnr.on('click', '[type=button][value=Save]', function() {
      kuiSaveRow($(this).closest('.row-container'));
    });
  };

  window.kuiSaveRow = function(cntnr) {
    var $cntnr  = $(cntnr);
    var anno_id = $cntnr.attr('id');
    var anno    = null;
    var chars   = null;
    var jstr    = null;

    // change from selects to text in each span
    _.each($cntnr.find('span'), function(spn) {
      var $spn = $(spn);
      var text = $($spn.find('select:first option:selected')).text();
      $spn.empty();
      $spn.append(text);
    });

    // get the new annotation text
    chars = $cntnr.html();
    anno = kuiGetAnnotation(anno_id);
    anno.resource.chars = chars;
    jstr = JSON.stringify(anno);

    // update the annotation online
    $.ajax({
      type:'PUT',
      url:anno_id,
      data:jstr,
      crossDomain:true,
      contentType:'application/json',
    });

    // remove Save button and set up Edit button
    $cntnr.find('input[type=button]').remove();
    $cntnr.find('div:first').append('<input type="button" value="Edit" style="width:40px;" class="btn btn-xs">');
    $cntnr.on('click', '[type=button][value=Edit]', function() {
      kuiEditRow($cntnr);
    });
  };

  window.kuiEditFolioForm = function() {
    $('#kalendar').removeClass('col-sm-3');
    $('#kui').hide();
    var $div = $('<div>');

    // add the plain text data from the annotation
    _.each($.kui.calendar.currFolio.annotations, function(anno) {
      $cntnr = $('<div class="row-container">');
      $cntnr.attr('id', anno['@id']);
      $cntnr.append(anno.resource.chars);
      $div.append($cntnr);
    });

    $('#kalendar').append($div);

    _.each($div.find('.row-container'), function(cntnr, dayIndex) {
      kuiEditRow(cntnr);
    });

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
        'annotations': [],
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
        { 'element':'number', 'date_attr':'goldenNumber.arabic', 'label':'Golden Number', 'fieldtype':'fixed', 'head': 'Number', 'options':{'1':'i', '2':'ii', '3':'iii', '4':'iiii', '5':'v', '6':'vi', '7':'vii', '8':'viii', '9':'ix', '10':'x', '11':'xi', '12':'xii', '13':'xiii', '14':'xiiii', '15':'xv', '16':'xvi', '17':'xvii', '18':'xviii', '19':'xix'} },
        { 'element':'letter', 'date_attr':'dominicalLetter', 'label':'Dominical Letter', 'fieldtype':'fixed', 'head':'Letter', 'options':{'A':'A', 'b':'b', 'c':'c', 'd':'d', 'e':'e', 'f':'f', 'g':'g'} },
        { 'element':'kni', 'date_attr':'romanDay.kni', 'label':'Kalends, Nones, Ides', 'fieldtype':'fixed', 'head':'KNI', 'options':{'kalends': 'Kalends', 'nones':'Nones', 'ides':'Ides' } },
        { 'element':'day', 'date_attr':'romanDay.arabic', 'label':'Roman Day', 'fieldtype':'fixed', 'head':'Day', 'options':{'2':'ii', '3':'iii', '4':'iiii', '5':'v', '6':'vi', '7':'vii', '8':'viii', '9':'ix', '10':'x', '11':'xi', '12':'xii', '13':'xiii', '14':'xiiii', '15':'xv', '16':'xvi', '17':'xvii', '18':'xviii', '19':'xix'} },
        { 'element':'text', 'date_attr':'', 'label':'Text', 'fieldtype':'list', 'head':'Feast', 'options':{} },
      ]
    },
  }

});