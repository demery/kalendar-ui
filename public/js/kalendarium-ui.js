$(document).ready(function(){

  var kuiManuscriptsUrl = 'http://kalendarium-manuscripts.herokuapp.com';
  var kuiSaintsUrl = 'http://kalendar-saints.herokuapp.com'
  var kuiManifestsUrl = 'http://165.123.34.221/services/anno/calendars/manifest';
  var kuiAnnotationsUrl = 'http://165.123.34.221/services/anno/calendars/annotation';
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

  window.kuiSideToNum = function(val) {
    // return 'r', 'v' or undefined
    var m = (val ? (String(val).toLowerCase().match(/r|v/) || []) : [])[0];
    return (m && m === 'r' ? 1 : 2) || 0;
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
        var startFolio = [ Number(data['folio_start_num']), kuiSideToNum(data['folio_start_side']) ]
        var endFolio   = [ Number(data['folio_end_num']), kuiSideToNum(data['folio_end_side']) ]
        folios = [ startFolio ];
        // compare [4,2] and [16,1] as 42 < 161, [5,1] and [16,1] as 51 < 161, etc.
        while (Number(_.last(folios).join('')) < Number(endFolio.join(''))) {
          var last = _.last(folios), num = last[0], side = last[1];
          // if side is 2 return [num++, 1]; if side is 1 return [num, 2]
          var next = (side == 2) ? ([num + 1, 1]) : ([num, 2]);
          folios.push(next);
        };
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
    var rv = [ null, 'r', 'v' ];
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

  window.kuiNextFolio = function() {
    // get current folio index
    var folioIndex = $.kui.calendar.currFolio['index'];
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
    var rv = [ null, 'r', 'v' ];
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
    $('#nextFol-val-index').append(folioOptions);
    $('#nextFol-val-index').find('option[value="' + folioIndex + '"]').attr('selected', 'selected');

    // add a button
    $('#kui-fields').append('<input type="button" id="nextFol-edit-btn" class="btn btn-default" value="Edit"/>')
    // set the button value to the selected folio
    $('#nextFol-val-index').find('option[value="' + folioIndex + '"]').attr('selected', 'selected');
    $('#nextFol-edit-btn').val('Edit ' + $('#nextFol-val-index option[selected]').text());
    // update the edit button to the currently selected folio
    $('#nextFol-val-index').change(function() {
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
    currFolio = $.kui.calendar.currFolio;
    url = kuiSaintsUrl + '/api/dates/' + currFolio['month'] + '/' + currFolio['startDay'] + '/count/' + currFolio['numOfDays'];
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
    var lookup = kuiLookUpManuscript(ms_id);
    var mf = lookup.done(kuiCreateManifest);

    // Set up the form
    $form = $('<form id="kui" role="form"><div id="kui-messages" class="alert"></div><div id="kui-fields"></div></form>');
    $('#kalendar').append($form);

    mf.done(function(data) {
      var id = data['@id'];
      _.findWhere($.kmw, {'element': 'sc_cal_manifest_id'}).v = id;
      // make sure we update $.kmw and submit to the manuscript service
      kmwFormUpdate();
      kmwSubmitEdit(ms_id);
      kuiNextFolio();
    });
  };

  $.kui = {
    'manuscript': {},
    'calendar': {
      'folios': [],
      'currFolio': {
        'index': null,
        'month': null,
        'startDay': null,
        'numOfDays': null,
        'dates': null,
      },
      'nextFolioElements': [
        { 'element':'index', 'label':'Folio', 'v':'', 'fieldtype':'list', 'options':{} },
        { 'element':'month', 'label':'Month', 'v':'', 'fieldtype':'list', 'options':{
          '0':'', '1':'Jan', '2':'Feb', '3':'Mar', '4':'Apr', '5':'May', '6':'Jun', '7':'Jul', '8':'Aug', '9':'Sep', '10':'Oct', '11':'Nov', '12':'Dec'
        }},
        { 'element':'startDay', 'label':'Starting on', 'v':'', 'fieldtype':'list', 'options':{
          '0':'', '1':'1', '2':'2', '3':'3', '4':'4', '5':'5', '6':'6', '7':'7', '8':'8', '9':'9', '10':'10', '11':'11', '12':'12', '13':'13', '14':'14', '15':'15', '16':'16', '17':'17', '18':'18', '19':'19', '20':'20', '21':'21', '22':'22', '23':'23', '24':'24', '25':'25', '26':'26', '27':'27', '28':'28', '29':'29', '30':'30', '31':'31'
        }},
        { 'element':'numOfDays', 'label':'Number of days', 'v':'', 'fieldtype':'text', 'options':{} },

      ],
    },
  }

});