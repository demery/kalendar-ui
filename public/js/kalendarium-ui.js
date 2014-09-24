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
    'grade_gold':   { name:'Gold',         code:'Au', rgb:'rgb(205, 133, 63)'}
  };


  // ==========================================================================
  // GENERAL UTILS
  // ==========================================================================

  // left pad strings with 0s
  window.kuiPad = function (str, max) {
    str = str.toString();
    return str.length < max ? kuiPad("0" + str, max) : str;
  };

  // truncate whole words to `posn`
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

  // get nested properties
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

  // convert 'r' and 'v' to 1 and 2, resp.
  window.kuiSideToNum = function(val) {
    // return 'r', 'v' or undefined
    var m = (val ? (String(val).toLowerCase().match(/r|v/) || []) : [])[0];
    return (m && m === 'r' ? 1 : 2) || 0;
  };

  // =============== DATA RETRIEVAL ===========================================
  // --------------- MS WIDGET DATA ---
  // get and order the grading returning an array like
  //   [ [ '1', 'grade_black' ],
  //     [ '1', 'grade_blue'  ],
  //     [ '2', 'grade_red'   ],
  //     [ '3', 'grade_gold'  ] ]
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

  // return a select with grades in order
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

  // ==========================================================================
  // DATA RETRIEVAL
  // ==========================================================================

  // --------------- KALENDAR UI DATA ----
  window.kuiAllAnnotations = function() {
    return _.reduce($.kui.calendar.folios, function(memo, fol) { return memo.concat(fol.annotations) }, []);
  };

  window.kuiFindAnnotation = function(annoId) {
    return _.findWhere(kuiAllAnnotations(), { '@id' : annoId });
  };

  window.kuiCurrFolio = function() {
    return $.kui.calendar.folios[$.kui.calendar.currFolio];
  };
  // get the folio
  window.kuiGetFolio = function(folioIndex) {
    return $.kui.calendar.folios[folioIndex] || {};
  };

  // get the folio name; it should be s.t. like 'fol. 1r'
  window.kuiGetFolioName = function(folioIndex) {
    var folio = kuiGetFolio(folioIndex);
    return folio.label ? ('fol. ' + folio.label) : '' ;
  };

  // find the canvas by `folio` name; which should be something like 'fol. 1r'
  window.kuiGetCanvas = function(folioIndex) {
    var folioName = kuiGetFolioName(folioIndex);
    console.log("kuiGetCanvas: folioName", folioName);
    if (folioName && $.kui.manifest.sequences[0]) {
      return _.findWhere($.kui.manifest.sequences[0].canvases, { 'label': folioName });
    }
  };

  window.kuiGetColumnElements = function() {
    var allElements  = _.findWhere($.kmw, { 'element':'columns'})['group'];
    var usedElements = _.filter(allElements, function(ele) { return ele.v !== ''; });

    return usedElements;
  };

  window.kuiGetColumnNames = function() {
    var elements = kuiGetColumnElements();
    var names = _.map(elements, function(ele) { return ele.v; });

    return names;
  };

  // Get the annotation for the given @id `anno_id` locally or from the web.
  // Anno_id is a URL like:
  //
  //     http://165.123.34.221/services/anno/calendars/annotation/ab0ec9098-9aaf-4628-b205-69250d77cd44.json
  //
  window.kuiGetAnnotation = function(anno_id) {
    var anno = kuiFindAnnotation(anno_id);
    var currFolio = kuiCurrFolio();
    if (!anno) {
      var deferred = $.ajax({
        url: anno_id,
        dataType: 'json',
        crossDomain: true,
        success: function(data) {
          if (! currFolio['annotations']) {
            currFolio['annotations'] = [];
          }
          currFolio['annotations'].push(data);
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

  // Get the saints server date object for `month` and `day`; locally or from
  // the web.
  window.kuiGetDate = function(month, day) {
    var currFolio = kuiCurrFolio();
    var date =  _.findWhere(currFolio.dates, { 'month': Number(month), 'day': Number(day) } );
    if (!date) {
      var deferred = $.ajax({
        url: kuiSaintsUrl + '/api/date/' + month + '/' + day,
        dataType: 'json',
        crossDomain: true,
        success: function(data) {
          if (! currFolio['dates']) {
            currFolio['dates'] = [];
          }
          currFolio['dates'].push(data);
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

  // ==========================================================================
  // MANUSCRIPTS & MANIFESTS
  // ==========================================================================

  // get the dang manuscripts
  window.kuiListManuscripts = function() {
    var $div = $('<div id="kui-ms-list" style="width: 800px;">');
    var deferred = $.ajax({
      type: 'GET',
      url: kuiManuscriptsUrl + '/',
      dataType: 'json',
      crossDomain: true,
      success: function(data) {
        $.kui.mss = data;
        $.kui.mss.sort(function(a,b) {
          var na = (a['shelfmark'] || '').toLowerCase();
          var nb = (b['shelfmark'] || '').toLowerCase();
          return na >  nb ? 1 : (na < nb ? -1 : 0);
        });
      },
      error: function(data) {
        console.log('problem', data);
      }
    });

    deferred.done(function() {
      var $table = $('<table class="table"><tbody></tbody></table>');
      $div.append($table);
      $table.append('<tr><th>ID</th><th>Shelfmark</th><th>Name</th></tr>');
      _.each($.kui.mss, function(ms) {
        var $tr = $('<tr>');
        var url = kuiManuscriptsUrl + '/api/manuscript/' +  ms.mid;
        _.each([ms.mid, ms.shelfmark, ms.name], function(val) {
          $tr.append('<td><a href="#" title="Go to manuscript: ' + ms.shelfmark + '" data-mid="' + ms.mid + '" class="kui-ms-link">' + val + '</a></td>');
        });
        $table.append($tr);
      });
    });

    $('body').prepend($div);
  };

  // Create all the folios for this calendar using the starting and ending
  // folio numbers.
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
    var folioFields      = { 'month': null, 'startDay': null, 'endDay': null, 'dates': null, 'annotations': [] };
    console.log('kuiCreateFolios; folio_start_num:', folio_start_num, 'folio_start_side:', folio_start_side);
    var fol              = { 'n': startFolio, 'label': (String(folio_start_num) + folio_start_side) };
    _.extend(fol, _.clone(folioFields));
    var folios           = [ fol ];

    // compare [4,2] and [16,1] as 42 < 161, [5,1] and [16,1] as 51 < 161, etc.
    while (Number(_.last(folios)['n'].join('')) < Number(endFolio.join(''))) {
      var last = _.last(folios), num = last['n'][0], side = last['n'][1];
      // if side is 2 return [num++, 1]; if side is 1 return [num, 2]
      var next = (side == 2) ? ([num + 1, 1]) : ([num, 2]);
      fol = { 'n': next, 'label': (String(num) + kuiRv[next[1]]) };
      _.extend(fol, _.clone(folioFields));
      folios.push(fol);
    }
    $.kui.calendar.folios = folios;
  };

  // Call kuiGetManifest for the downloaded manuscript if
  // `sc_cal_manifest_id1` is present or, if it is not, calls
  // kuiCreateManifest to create a  new manifest.
  window.kuiPrepManifest = function () {
    var sc_cal_manifest_id = _.findWhere($.kmw, { 'element': 'sc_cal_manifest_id'})['v'];

    if (sc_cal_manifest_id) {
      if ($.kui.manifest && $.kui.manifest['@id'] === sc_cal_manifest_id) {
        // do nothing
      } else {
        return kuiGetManifest(sc_cal_manifest_id);
      }
    } else {
      console.log('Creating manifest');
      return kuiCreateManifest();
    }
  };

  // Get the manifest for `manifest_id` and store it locally.
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

  // Create a new manifest for the locally stored manuscript.
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
      return {
        "@id": (kuiCanvasesUrl       + '/' + kuiGenUUID() + ".json"),
        "@type": "sc:Canvas",
        "label": "fol. " +  fol.label,
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

  // ==========================================================================
  // FOLIOS
  // ==========================================================================

  // List edited folios
  window.kuiListEditedFolios = function() {
    kuiPrepManifest();
    var canvases = $.kui.manifest.sequences[0].canvases;
    for(var i = 0; i < canvases.length; i++) {
      var cnvsId = canvases[i]['@id'];

    }
  };

  // Cue up the next folio form
  window.kuiNextFolio = function() {
    // get current folio index
    var folioIndex = $.kui.calendar.currFolio;
    // console.log($.kui.calendar.currFolio);
    // get the next index
    $.kui.calendar.currFolio = folioIndex === null ? 0 : folioIndex + 1;
    console.log("$.kui.calendar.currFolio", $.kui.calendar.currFolio);
    if ($.kui.calendar.currFolio < $.kui.calendar.folios.length) {
      kuiNextFolioForm($.kui.calendar.currFolio);
    } else {
      // @todo: last folio behavior ? return to 0?
    };
  };

  // display the next folio form
  window.kuiNextFolioForm = function(folioIndex) {
    // create a human friendly list of folios
    var rv        = [ null, 'r', 'v' ];
    var folioNums = _.map($.kui.calendar.folios, function(fol) {
      return fol.label;
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
      kuiUpdateCurrFolio(folioIndex);
      kuiStartFolio(folioIndex);
    });
    $('#kalendar').show();
  };

  // For the current folio, grab the saints from the saints service and
  // prepare the annotations.
  window.kuiStartFolio = function(folioIndex) {
    // build the request for calendar data
    var currFolio = $.kui.calendar.folios[folioIndex];
    console.log('folioIndex', folioIndex);
    console.log('folios', JSON.stringify($.kui.calendar.folios));
    console.log('currFolio', JSON.stringify(currFolio));
    var url       = kuiSaintsUrl + '/api/from/' + currFolio['month'] + '/' + currFolio['startDay'] + '/to/' + currFolio['month'] + '/' + currFolio['endDay'];
    $.ajax({
      url: url,
      dataType: 'json',
      crossDomain: true,
      success: function(data) {
        currFolio['dates'] = data['dates'];
        var canvas = kuiGetCanvas(folioIndex);
        kuiPrepAnnotations(canvas['@id'], folioIndex);
      },
      error: function(data) {
        console.log('problem', data);
      }
    });
  };

  // Store all the next folio form data locally.
  window.kuiUpdateCurrFolio = function(folioIndex) {
    _.each($('#kui-fields input, #kui-fields select'), function(ele) {
      var name = $(ele).attr('id').substr(12);
      var val = $(ele).val();
      var currFolio = $.kui.calendar.folios[folioIndex];
      _.each(currFolio, function(v,k) {
        if (k === name) { currFolio[k] = val; }
      });
    });
    console.log(JSON.stringify($.kui.calendar.folios[folioIndex]));
  };

  // ==========================================================================
  // ANNOTATIONS
  // ==========================================================================

  // Retrieve the annotiations for the current canvas or make them and then get
  // them.
  window.kuiPrepAnnotations = function(canvasId, folioIndex, retries) {
    // we try to get the annotations and
    // create them if they don't exist.
    // if retries is a number, use it; otherwise, use 1
    var n = Number(retries);
    n = (!isNaN(n) && isFinite(n)) ? Math.floor(n) : 1;

    // get/create annotations
    var kfa = kuiFetchAnnotations(folioIndex, canvasId);
    kfa.done(function() {
      // if the annotations are there, go to the edit folio form
      if ($.kui.calendar.folios[folioIndex].annotations.length > 0) {
        // TODO xxxx change kuiEditFolioForm to use canvasId
        kuiEditFolioForm(folioIndex);
      } else if (n > 0) {
        // if we found no annotations and we have retries left,
        // create the annotations and try to get them again
        // TODO xxxx change kuiBuildAnnotations to use canvasId
        var annos = kuiBuildAnnotations(canvasId);
        // get an array of promises for each annotation
        var deferreds = [];
        for(var i = 0; i < annos.length; i++){
          deferreds.push(kuiCreateAnnotation(annos[i]));
        }
        // When all the annotations have been created, reinvoke kuiPrepAnnotations
        // http://stackoverflow.com/questions/14777031/what-does-when-apply-somearray-do
        $.when.apply($, deferreds).done(function() {
          kuiPrepAnnotations(canvasId, folioIndex, n - 1);
        });
      }
    });
  };

  // Fetch the annotations for the current canvas.
  window.kuiFetchAnnotations = function(folioIndex,canvasId) {
    var url = kuiSCListUrl + '/' + canvasId.split('/').pop();
    return $.ajax({
      type: 'GET',
      url: url,
      dataType: 'json',
      crossDomain: true,
      contentType: 'application/json',
      success: function(data) {
        $.kui.calendar.folios[folioIndex].annotations = data['resources'];
        // ok, now put them in day order
        $.kui.calendar.folios[folioIndex].annotations.sort(function(a, b){
          var $a = $(a.resource.chars), $b = $(b.resource.chars);
          // create numbers for each month/day: 1/1 => 101; 1/31 => 131; 10/1 => 1001
          var a_val = (Number($a.attr('data-month')) * 100) + (Number($a.attr('data-day')));
          var b_val = (Number($b.attr('data-month')) * 100) + (Number($b.attr('data-day')));
          // return the difference of a - b
          return a_val - b_val;
        });
      },
      error: function(data) {
        $.kui.calendar.folios[folioIndex].annotations = [];
        console.log('error', data);
      }
    });
  };

  window.kuiBuildAnnotation = function(canvasId, date, xywh, itemWidth) {
    var annoation = '';
    var month     = String(date['month']);
    var day       = String(date['day']);
    var monthDay  = kuiPad(month, 2) + kuiPad(day, 2);
    var columns  = kuiGetColumnNames();

    var spans     = '<div data-month="' + month + '" data-day="' + day + '" style="width:100%;" class="kalendar-row">';
    _.each(columns, function(col, index) {
      var colWidth = itemWidth;
      if (col === 'text') {
        colWidth = Math.floor(colWidth * 2);
      }
      var element = _.findWhere($.kui.calendar.columnElements, { 'element': col });
      var spanId  = 'val-' + monthDay + '-' + col;
      var v       = '';
      if (element.date_attr) {
        vi = kuiGetProp(date, element.date_attr) || '';
      }
      spans += '<span id="' + spanId + '" data-type="' + col + '" data-value="' + v + '" style="display:inline-block;width:' + colWidth + '%;">' + v + '</span>';
    });
    spans += '</div>';

    annotation = {
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
    return annotation;
  };

  // Build all the annotations for each date on the current canvas.
  window.kuiBuildAnnotations = function(canvasId) {
    // create array of json string annotations for currFolio

    var canvas        = _.findWhere($.kui.manifest.sequences[0].canvases, { '@id': canvasId });
    var folioName     = canvas.label.replace(/^\s*fol.*\s+/i,'');
    var folio         = _.findWhere($.kui.calendar.folios, { 'label': folioName });
    var annotations   = folio.annotations;
    var dates         = folio.dates;

    var columns       = kuiGetColumnNames();

    var canvasXOffset = Math.round(canvas['width']/10);
    var canvasYOffset = Math.round(canvas['height']/10);
    var lineH         = Math.round((canvas['height'] - (canvasXOffset * 2))/folio.dates.length);
    var lineW         = Math.round(canvas['width'] - canvas['width']/20);
    var itemWidth     = Math.round(100/(columns.length + 2));

    for(var i = 0; i < dates.length; i++) {
      var date     = dates[i];
      var x        = canvasXOffset;
      var y        = canvasYOffset + (i*lineH);
      var xywh     = [ x, y, lineW, lineH ].join(',');

      // window.kuiBuildAnnotation = function(date, folioName, xywh, itemWidth)
      annotations.push(kuiBuildAnnotation(canvasId, date, xywh, itemWidth));
    }
    return annotations;
  };

  // POST the annotation in `jstr` to the the kuiAnnotationsUrl.
  window.kuiCreateAnnotation = function(anno) {
    var jstr = (typeof anno === 'object') ? JSON.stringify(anno) : anno;
    return $.ajax({
      type:'POST',
      url: kuiAnnotationsUrl,
      data:jstr,
      dataType:'json',
      crossDomain: true,
      contentType:'application/json',
    });
  };

  // ==========================================================================
  // KALENDAR ROWS
  // ==========================================================================

  // Convert the annotation characters in `cntnr` (a `div` of class
  // `row-container`.
  window.kuiEditRow = function(cntnr) {
    var $cntnr = $(cntnr);
    var $row = $cntnr.find('div:first');
    console.log($row);
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

  // PUT the annotation content in `cntnr` to the server. Replace row form
  // elements with the elements' text values.
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

  // Fill the form with calendar rows.
  window.kuiEditFolioForm = function(folioIndex) {
    $('#kalendar').removeClass('col-sm-3');
    $('#kui').hide();
    var $div = $('<div>');

    // add the plain text data from the annotation
    _.each($.kui.calendar.folios[folioIndex].annotations, function(anno) {
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

  window.kuiClearAnnos = function() {
    var annos = [];
    var findAnnos = $.ajax({
      url: kuiAnnotationsUrl,
      type: 'get',
      dataType: 'json',
      success: function(data) {
        annos = data.resources;
      },
    });
    findAnnos.done(function() {
      _.each(annos, function(anno) {
        $.ajax({
          url: anno['@id'],
          type: 'delete',
        });
      });
    });

  };

  // ==========================================================================
  // BEGIN
  // ==========================================================================

  // Start the kalendar proces; get or create the manifest; update the record
  // on the manuscripts server.
  window.kuiStartKalendar = function(ms_id) {
    kuiCreateFolios();
    var mf = kuiPrepManifest();

    // Set up the form
    $form = $('<form id="kui" role="form"><div id="kui-messages" class="alert"></div><div id="kui-fields"></div></form>');
    $('#kalendar').append($form);

    mf.done(function(data) {
      // make sure we update $.kmw and submit to the manuscript service
      kuiNextFolio();
    });
  };

  // ==========================================================================
  // DATA CONTAINER & CONFIG
  // ==========================================================================

  $.kui = {
    'manifest': {},
    'canvases': {},
    'mss': [],
    'calendar': {
      'folios': [],
      'annotations': {}, // hash of annotations keyed to canvasId
      'currFolio': null,
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
