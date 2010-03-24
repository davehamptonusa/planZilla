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

// Array Remove - By John Resig (MIT Licensed)
Array.prototype.remove = function(from, to) {
  var rest = this.slice((to || from) + 1 || this.length);
  this.length = from < 0 ? this.length + from : from;
  return this.push.apply(this, rest);
};
/*and here's some examples of how it could be used:

// Remove the second item from the array
array.remove(1);
// Remove the second-to-last item from the array
array.remove(-2);
// Remove the second and third items from the array
array.remove(1,2);
// Remove the last and second-to-last items from the array
array.remove(-2,-1);
*/


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
  drawn_instance: {},
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
  find_initial_tickets: function () {
    var self = this;
    self.initial_tickets = [];
    switch(window.location.pathname) {
      case ("/show_bug.cgi"):
        self.initial_tickets.push(window.location.search.replace(/\D/g, ''));
        self.result_field = 'form[name="changeform"]'
        break;
      case ("/buglist.cgi"):
        $('table.bz_buglist td.first-child a').each(function (i) {
          self.initial_tickets.push($(this).text());
        });
        self.result_field = 'table.bz_buglist'
        break;
      default:
        $('table.bz_buglist td.first-child a').each(function (i) {
          self.initial_tickets.push($(this).text());
        });
        self.result_field = 'table.bz_buglist'
    }
    $(self.result_field).replaceWith(self.create_dom.buglist_div());
    $('div.pZ_buglist').append(self.create_dom.loading_ajax());
    self.get_tickets(self.initial_tickets);
    $('div.pZ_buglist').replaceWith(self.create_dom.buglist_div());
    self.draw(self.get_top_level_tickets());
  },
  get_top_level_tickets: function () {
    var self = this,
    release_tickets = [],
    tickets = [];
    //temporary for not displaying release tickets...
    $.each(self.bz_tickets, function (key, ticket) {
        if (ticket.target_milestone === 'PRD Complete') {
          delete self.bz_tickets[key];
          release_tickets.push(key);
        }
    });
    $.each(self.bz_tickets, function (key, ticket) {
      $.each(ticket.blocked, function (i, value) {
        if ($.inArray(value, release_tickets) >= 0) {
          ticket.blocked.remove(i);
        }
      });
    });
    //back to normal code
    $.each(self.bz_tickets, function (key, ticket) {
      if (ticket.blocked.length === 0) {
        tickets.push(key);
      }
    });
    return tickets;
  },
  draw: function (ticket_list) {
    var self = this;
    $.each(ticket_list, function (i, value) {
      self.draw_ticket(self.bz_tickets[value]);
      $.each(self.bz_tickets[value].dependson, function (d_i, d_value) {
        self.draw.call(self, [d_value]);
      });
    });
  },
  draw_ticket: function (bz_ticket) {
    var self = this,
    dom = {};

    dom = self.create_dom.buglist_item.using(bz_ticket);
    $('tr, div', dom).addClass(
      'pZ_severity_' + bz_ticket.bug_severity +
      ' pZ_bugstatus_' + bz_ticket.bug_status
    );
    if (bz_ticket.blocked.length > 0) {
      $.each(bz_ticket.blocked, function (key, value) {
        var selector = $('div.pZ_bugitem > table > tbody > tr > td > a:contains(' + value + ')');
        if ((selector.length > 0) && (! self.drawn_instance['a' + bz_ticket.bug_id + 'b' + value])) {
          self.drawn_instance['a' + bz_ticket.bug_id + 'b' + value] = true;
          $(selector).parents('div:first').append(dom.clone()).fadeIn();
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
    loading_ajax: function () {
      return $('<div/>', {
        'css': {
          textAlign: 'center'
        },
        'html': $('<img/>',  {
          'src': chrome.extension.getURL("images/ajax-loader.gif")
        })
      })
      .append('loading...');
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
      planZilla.find_initial_tickets();
    },
    'class': 'pZ_icon'
  }));
});
