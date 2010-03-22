/*jslint white: true, browser: true, onevar: true, undef: true, nomen: true, eqeqeq: true, bitwise: true, regexp: true, newcap: true, immed: true,indent:2 */
/*global $:true, chrome:true, jQuery:true */

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
  convert_to_array: function (item) {
    return (! this.is_array(item)) ? [item] : item;
  },
  initial_dom: $('table.bz_buglist'),
  bz_tickets: {},
  drawn_tickets: [],
  get_tickets: function (ticket_list, callback) {
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
      async: false,
      success: function (xml, textStatus, XMLHttpRequest) {
        var json_deep = $.xml2json(xml, true),
        json = $.xml2json(xml),
        timestamp = Number(new Date()),
        found_tickets = [],
        array_mods = ['dependson', 'blocked'];
        if (json && json.bug) {
          // json deep parses json as an object if there is only one
          // so we need to nest it in an array
          json.bug = self.convert_to_array(json.bug);
          $.each(json.bug, function (i, value) {
            var bug_id;
            /*if (! value || ! value.bug_id) {
              return false;
            }*/
            if (value.long_desc) {
              value.long_desc = self.convert_to_array(value.long_desc);
            }
            if (value.attachment) {
              value.attachment = self.convert_to_array(value.attachment);
            }
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
          });
          //recursively get the other tickets
          self.get_tickets.call(self, found_tickets);
          if (callback) {
            callback();
          }
        }
      }
    });
  },
  find_buglist_tickets: function () {
    var self = this;
    self.initial_tickets = [];
    $('table.bz_buglist td.first-child a').each(function (i) {
      self.initial_tickets.push($(this).text());
    });
    $('table.bz_buglist').replaceWith(self.create_dom.buglist_div());
    self.get_tickets(self.initial_tickets);
    self.draw(self.get_top_level_tickets());
  },
  get_top_level_tickets: function () {
    var self = this,
    tickets = [];
    $.each(self.bz_tickets, function (key, ticket) {
      if (ticket.blocked.length === 0) {
        tickets.push(key);
      }
    });
    return tickets;
  },
  draw: function (ticket_list) {
    var self = this,
    found_tickets = [];
    ticket_list = $.map(ticket_list, function (value, index) {
      return ($.inArray(value, self.drawn_tickets)) ? value : null;
    });
    $.each(ticket_list, function (i, value) {
      self.draw_ticket(self.bz_tickets[value]);
      self.drawn_tickets.push(value);
      $.each(self.bz_tickets[value].dependson, function (d_i, d_value) {
        found_tickets.push(d_value);
      });
    });
    //recursively get the other tickets
    self.draw.call(self, found_tickets);
  },
  draw_ticket: function (bz_ticket) {
    var self = this,
    dom = {};

    dom = self.create_dom.buglist_item.using(bz_ticket);
    $('tr, div', dom).addClass('pZ_severity_' + bz_ticket.bug_severity);
    if (bz_ticket.blocked.length > 0) {
      $.each(bz_ticket.blocked, function (key, value) {
        var selector = $('div.pZ_bugitem > table > tbody > tr > td > a:contains(' + value + ')');
        if (selector.length > 0) {
          $(selector).parents('div:first').append(dom).fadeIn();
          return false;
        }
      });
    }
    else {
      $('table', dom).parent().css({
        'background': 'url(' + chrome.extension.getURL("images/transparent_bkg.png") + ') repeat',
        'borderBottom': '1px solid #4b0607',
        'borderRight': '1px solid #4b0607',
        'marginBottom': '1.1em',
        'padding': '.5em'
      });
      $('div.pZ_buglist').append(dom).fadeIn();
    }
  },
  create_dom: {
    buglist_div: function () {
      return $('<div/>', {
        'css': {
          background: 'url(' + chrome.extension.getURL("images/planZilla_bkg.png") + ') repeat'
        },
        'class': 'pZ_buglist',
        'html': $('<div/>')
      });
    },
    buglist_item: function () {
      var attachment_length = (this.attachment) ? this.attachment.length : 0,
      long_desc_length = (this.long_desc) ? this.long_desc.length : 0;
      return $('<div/>', {
        'class': 'pZ_bugitem',
        'html': $('<table/>', {
          'class': 'pZ_floatLeft',
          'html': $('<tr/>', {
            'class': 'pZ_bugstatus_' + this.bug_status,
            'html': $('<td/>', {
              'html': $('<a/>', {
                'href': 'https://bugzilla.vclk.net/show_bug.cgi?id=' + this.bug_id,
                'text': this.bug_id
              })
            })
          })
          .append($('<td/>', {
            'text': this.priority
          }))
        })
      })
      .append($('<div/>', {
        'class': 'pZ_floatLeft pZ_short_desc',
        'text': this.short_desc,
        'title': this.short_desc
      }))
      .append($('<div/>', {
        'class': 'pZ_floatRight',
        'html': $('<span/>', {
          'class': 'pZ_bugStatus',
          'css': {
            'background': 'url(' + chrome.extension.getURL("images/bug_status/" + this.bug_status + ".png") + ') center no-repeat'
          },
          'title': this.bug_status,
          'text': this.resolution
        })
      }))
      .append($('<div/>', {
        'class': 'pZ_floatRight',
        'html': $('<span/>', {
          'class': 'pZ_bugNotice',
          'css': {
            'background': 'url(' + chrome.extension.getURL("images/comments.png") + ') center no-repeat'
          },
          'text': long_desc_length
        })
      }))
      .append($('<div/>', {
        'class': 'pZ_floatRight',
        'html': $('<span/>', {
          'class': 'pZ_bugNotice',
          'css': {
            'background': 'url(' + chrome.extension.getURL("images/attachments.png") + ') center no-repeat'
          },
          'text': attachment_length
        })
      }))
      .append($('<div/>', {
        'class': 'pZ_floatRight pZ_target_milestone',
        'text': this.target_milestone,
        'title': this.target_milestone
      }))
      .append($('<div/>', {
        'class': 'pZ_floatRight pZ_assigned_to',
        'text': this.assigned_to,
        'title': this.assigned_to
      }))
      .append($('<div/>', {
        'class': 'clear'
      }));
    }
  }
};

$(document).ready(function () {
  $('#LeftSideBar').prepend($('<img/>', {
    'src': chrome.extension.getURL("images/transparent_icon.png"),
    'click': function () {
      planZilla.find_buglist_tickets();
      $('table.bz_buglist').css('background', function () {
        var img = chrome.extension.getURL("images/planZilla_bkg.png");
        return 'url(' + img + ') no-repeat';
      });
    },
    'class': 'pZ_icon'
  }));
});
