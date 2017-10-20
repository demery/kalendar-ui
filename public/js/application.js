$(document).ready(function() {

  $startForm = $('<div style="visibility:hidden; padding-bottom:15px;"><form id="kal-start-form" role="form"><input type="button" id="kal-start" class="btn btn-default" value="Edit calendar"/></form></div>');

  $('#kmw-fields').before($startForm);

  $('#kal-start').on('click', function(event){
    // alert("Clicked!")
    // make sure the data is updated
    console.log("Running kmwDataUpdate()");
    kmwDataUpdate();
    console.log("Finished kmwDataUpdate()");
    $('#kmw-container').hide();
    var mid = $('#kmw-val-mid').val();
    kuiStartKalendar(mid);
  });


  $('#kmw-container').show();

  // list the manuscripts
  // adds a list of manuscripts to '#kui-ms-list'
  kuiListManuscripts();
  // on link click, lookup up the manuscript
  $('#kui-ms-list').on('click', '.kui-ms-link', function() {
    var m_id = $(this).attr('data-mid');
    $('#kmw-browse').remove();
    $('#kui-ms-list').hide();
    kmwSubmitLookup(m_id, null, null);
    $('#kmw-fields').show();
  });

  $('#kmw').on('click', '#kmw-find', function(event) {
    $('#kui-ms-list').hide();
  });

  $('#kmw').on('click', '#kmw-add', function(event) {
    $('#kui-ms-list').hide();
  });

  // poll the kmw to see if we've entered the edit mode and have
  // a m_id
  var pollKmw = function() {
    if ($('#kmw-fields').hasClass('editing') && $('#kmw-val-mid').val()) {
      $startForm.css('visibility', 'visible');
      clearInterval($.kmwWatcherId);
    };
  };

  $.kmwWatcherId = setInterval(pollKmw, 1000);

  $('form').on('submit', function(event) {
    return false;
  });

})
