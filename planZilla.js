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
  is_array: function (value) {
    return value &&
        typeof value === 'object' &&
        typeof value.length === 'number' &&
        typeof value.splice === 'function' &&
        !(value.propertyIsEnumerable('length'));
  },
  bz_tickets: {},
  get_tickets: function (ticket_list) {
    var self = this,
    get_arguments = {},
    timestamp = Number(new Date());
    ticket_list = $.map(ticket_list, function (value, index) {
      //checks exitence - needs to check timestamp
      return (! self.bz_tickets[value]) ? value : null;
    });
    get_arguments = {
      ctype: 'xml',
      excludefield: 'attachmentdata',
      id: ticket_list
    };

    $.ajax({
      url: 'https://bugzilla.vclk.net/show_bug.cgi',
      data: get_arguments,
      cache: false,
      traditional: true,
      type: 'POST',
      success: function (xml, textStatus, XMLHttpRequest) {
        var json_deep = $.xml2json(xml, true),
        json = $.xml2json(xml),
        timestamp = Number(new Date());
        found_tickets = [],
        array_mods = ['dependson', 'blocked'];
        // json deep parses json as an object if there is only one
        // so we need to nest it in an array
        if (! self.is_array(json.bug)) {
          json.bug = [json.bug];
        }
        $.each(json.bug, function (i, value) {
          var bug_id = value.bug_id;
          $('#MainContentBlock').append('working on ' + bug_id + '<br>');
          self.bz_tickets[bug_id] = value;
          self.bz_tickets[bug_id].dependson = json_deep.bug[i].dependson ? json_deep.bug[i].dependson : [];
          self.bz_tickets[bug_id].blocked = json_deep.bug[i].blocked ? json_deep.bug[i].blocked: [];
          self.bz_tickets[bug_id].timestamp = timestamp;
          //clean out the unnessecary layers
          $.each(array_mods, function (i, key) {
            $.each(self.bz_tickets[bug_id][key], function (i, d_value) {
              self.bz_tickets[bug_id][key][i] = this.text;
              found_tickets.push(this.text);
            });
          });
          $('#MainContentBlock').append('finished ' + self.bz_tickets[bug_id].bug_id + '<br>');
          delete self.bz_tickets[bug_id].bug_id;
        });
        //recursively get the other tickets
        self.get_tickets.call(self, found_tickets);
      }
    });

  },
  find_buglist_tickets: function () {
    var self = this,
    initial_tickets = [];
    $('table.bz_buglist td.first-child a').each(function (i) {
      initial_tickets.push($(this).text());
    });
    self.get_tickets(initial_tickets);
    /*var pretend_ajax_response = {
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
      $(this).parents('table.bz_buglist tr').after(new_dom);*/
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
  $('#LeftSideBar').prepend($('<img/>', {
     src: chrome.extension.getURL("images/transparent_icon.png"),
     click: function () {
       planZilla.find_buglist_tickets();
     },
     'class': 'planZilla_icon'

  }));
});
