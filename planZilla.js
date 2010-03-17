Function.prototype.using = Function.call;

Object.spawn =  function (o, spec) {
  var F = function () {}, that = {}, node = {};
  F.prototype = o;
  that = new F();
  for (node in spec) {
    that[node] = spec[node];
  }
  return that;
};

Object.size = function (obj) {
  var size = 0, key;
  for (key in obj) {
    if (obj.hasOwnProperty(key)) {
      size++;
    }
  }
  return size;
};


var planZilla = {
  bz_tickets: {},
   /*
    id
    priority
    assignee
    status
    description
    blocks
    dependsOn
    */
  find_buglist_tickets: function () {
    var self = this,
    get_arguments = {
      ctype: 'xml',
      excludefield: 'attachmentdata',
      id: []
    };

    $('table.bz_buglist td.first-child a').each(function (i) {
      get_arguments.id.push($(this).text());
    });
    $.ajax({
      url: 'https://bugzilla.vclk.net/show_bug.cgi',
      data: get_arguments,
      cache: false,
      traditional: true,
      type: 'POST',
      success: function (xml, textStatus, XMLHttpRequest) {
        var json = $.xml2json(xml);
        $.each(json.bug, function (index, value) {
          self.bz_tickets[value.bug_id] = value;
          delete self.bz_tickets[value.bug_id].bug_id;
        });
      }
    });

      var pretend_ajax_response = {
        id: $(this).text(),
        priority: 'P1',
        assignee: 'sample@sample.com',
        status: 'NOT DONE!',
        description: 'Sample Description'
      },
      new_dom = self.create_dom.dependency_div();
      $(new_dom).css('background-color', $(this).parents('table.bz_buglist tr').css('background-color'));
      $('div', new_dom).append(self.create_dom.dependency_table());
      $('table', new_dom).append(self.create_dom.dependency_item.using(pretend_ajax_response));
      $('th', new_dom).css({
        fontSize: '10px',
        fontWeight: 'bold',
        borderBottom: '1px silver solid'
      });
      $(this).parents('table.bz_buglist tr').after(new_dom);
  },
  create_dom: {
    dependency_div: function () {
      var column_count = $('table.bz_buglist tr[class~=bz_row]:first td');
      return $('<tr/>')
      .append($('<td/>', {
        colspan: 9//column_count.size()
      }))
      .contents().last()
      .append($('<div/>', {
        css: {
          borderLeft: '1px solid silver',
          borderTop: '1px silver solid',
          textAlign: 'left',
          marginLeft: 'auto'
        },
        width: '95%'
      }))
      .end().end();
    },
    dependency_table: function () {
      return $('<table/>', {width: '100%'})
      .append('<tr/>')
      .contents().last()
      .append($('<th/>', {
        text: 'ID'
      }))
      .append($('<th/>', {
        text: 'Pri'
      }))
      .append($('<th/>', {
        text: 'Assignee'
      }))
      .append($('<th/>', {
        text: 'Status'
      }))
      .append($('<th/>', {
        text: 'Description'
      }))
      .end().end();
    },
    dependency_item: function () {
      return $('<tr/>')
      .append($('<td/>', {
        text: this.id
      }))
      .append($('<td/>', {
        text: this.priority
      }))
      .append($('<td/>', {
        text: this.assignee
      }))
      .append($('<td/>', {
        text: this.status
      }))
      .append($('<td/>', {
        text: this.description
      }));
    }
  }
};

$(document).ready(function () {
  planZilla.find_buglist_tickets();
});
