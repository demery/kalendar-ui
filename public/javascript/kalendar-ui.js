var Kalendar = {
  shelfmark:null,
  title:null,
  startFolio:null,
  endFolio:null,

  readCreateMs: function(e, theForm) {
    e.preventDefault();
    var data = $(this).serializeArray();
    $.each(data, function(){
      Kalendar[this.name] = this.value;
    });
  },

  start: function(div_id) {
    msForm = $('<form id="create-ms">')
      .append("<label>Shelfmark</label><input type='text' name='shelfmark'/><br/>")
      .append("<label>Title</label><input type='text' name='title'/><br/>")
      .append("<label>First calendar folio (e.g., 4r)</label><input type='text' name='startFolio'/><br/>")
      .append("<label>Last calendar folio (e.g., 10v)</label><input type='text' name='endFolio'/><br/>")
      .append("<input type='submit' value='Submit'/>");
    $(div_id).append(msForm);
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

  createFolios: function(startFolio, endFolio) {
    
  },
}