$(document).ready(function() {

  $startForm = $('<form id="kal-start-form" role="form"><input type="button" id="kal-start" class="btn btn-default" value="Create calendar"/></form>');

  $('#kalendar').append($startForm);

  $('#kal-start').on('click', function(event){
    // alert("Clicked!")
    // make sure the data is updated
    kmwDataUpdate();
    $('#kmw-container').hide();
    var mid = $('#kmw-val-mid').val();
    $('#kal-start-form').remove();
    kuiStartKalendar(mid);
  });

  $('#kmw-container').show();

  // poll the kmw to see if we've entered the edit mode and have
  // a m_id

  var pollKmw = function() {
    if ($('#kmw-fields').hasClass('editing') && $('#kmw-val-mid').val()) {
      $startForm.css('visibility', 'visible');
      clearInterval($.kmwWatcherId);
    };
  };

  $.kmwWatcherId = setInterval(pollKmw, 3000);


})