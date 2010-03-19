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
        if (json && json.bug) {
          // json deep parses json as an object if there is only one
          // so we need to nest it in an array
          if (! self.is_array(json.bug)) {
            json.bug = [json.bug];
          }
          $.each(json.bug, function (i, value) {
            var bug_id;
            /*if (! value || ! value.bug_id) {
              return false;
            }*/
            bug_id = value.bug_id;
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
            self.draw(self.bz_tickets[bug_id]);
          });
          //recursively get the other tickets
          self.get_tickets.call(self, found_tickets);
        }
      }
    });

  },
  find_buglist_tickets: function () {
    var self = this,
    dom = {};
    self.initial_tickets = [];
    $('table.bz_buglist td.first-child a').each(function (i) {
      self.initial_tickets.push($(this).text());
    });
    $('table.bz_buglist').replaceWith(self.create_dom.buglist_div());
    self.get_tickets(self.initial_tickets);
  },
  draw: function (bz_ticket) {
    var self = this,
    dom = {},
    padding = 0,
    dom = self.create_dom.buglist_item.using(bz_ticket);

    if (bz_ticket.blocked.length > 0) {
      $.each(bz_ticket.blocked, function (key, value) {
        var selector = $('table.pZ_buglist tr td a:contains(' + value + ')');
        if (selector.length > 0) {
          padding = parseInt($(selector).parent('td').css('paddingLeft')) + 5;
          $('td:first', dom).css('paddingLeft', padding + 'px');
          $(selector, 'table.pZ_buglist').parents('tr').after(dom);
          return false;
        }
      })
    }
    else {
      $('table.pZ_buglist').append(dom);
    }
  },
  create_dom: {
    buglist_div: function () {
      return $('<div/>', {
        'css': {
          background: 'url(' + chrome.extension.getURL("images/planZilla_bkg.png") + ') no-repeat'
        },
        'class': 'pZ_buglist'
      })
      .append($('<table/>', {
        'css': {
          background: 'url(' + chrome.extension.getURL("images/transparent_bkg.png") + ') repeat'
        },
        'class': 'pZ_buglist'
      }));
    },
    buglist_item: function () {
      return $('<tr/>')
      .append($('<td/>', {
        html: ($('<a/>', {
          href: 'https://bugzilla.vclk.net/show_bug.cgi?id=' + this.bug_id,
          text: this.bug_id
        }))
      }))
      .append($('<td/>', {
        title: this.short_desc,
        text: this.short_desc
      }))
      .append($('<td/>', {
        text: this.bug_severity
      }))
      .append($('<td/>', {
        text: this.assigned_to
      }))
      .append($('<td/>', {
        text: this.target_milestone
      }))
      .append($('<td/>', {
        text: this.bug_status
      }))
      .append($('<td/>', {
        text: this.resolution
      }));
    }
  }
};

$(document).ready(function () {
  $('#LeftSideBar').prepend($('<img/>', {
     src: chrome.extension.getURL("images/transparent_icon.png"),
     click: function () {
       planZilla.find_buglist_tickets();
       $('table.bz_buglist').css('background', function () {
         var img = chrome.extension.getURL("images/planZilla_bkg.png");
         return 'url(' + img + ') no-repeat';
       });
     },
     'class': 'pZ_icon'
  }));
});
