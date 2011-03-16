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
  //planZilla.o is where all of the local data is stored for use and persistence
  o: {
    sharer_id: localStorage.getItem('sharer_id'),
    release_label: localStorage.getItem('release_label'),
    sprint_label: localStorage.getItem('sprint_label'),
    users: {}
  },
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
  'sort_by_priority': function (tickets) {
     var self = this,
     severity = {
       'blocker' : 0,
       'critical': 1,
       'major'   : 2,
       'normal'  : 3,
       'minor'   : 4,
       'trivial' : 5
     },
     bz_tickets = self.bz_tickets;

     tickets.sort(function (a,b) {
        a = (((bz_tickets[a].priority).substring(1)) * 10 + severity[bz_tickets[a].bug_severity]);
        b = (((bz_tickets[b].priority).substring(1)) * 10 + severity[bz_tickets[b].bug_severity]);
        return (a - b);
      });
  },
  parse_url: /(\b(https?|ftp|file):\/\/[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|])/ig,
  priority_lookup: {
    'Highest': 'P1',
    'High': 'P2',
    'Normal':'P3',
    'Low': 'P4',
    'Lowest': 'P5',
    '--': 'P5'
  },
  progressLookup: {
    'UNCONFIRMED' : 'Not Started',
    'NEW' : 'Not Started',
    'LATER' : 'Not Started',
    'ASSIGNED': 'In Progress',
    'NEED INFO': 'In Progress',
    'REOPENED': 'In Progress',
    'RESOLVED': 'Completed',
    'VERIFED': 'Completed',
    'CLOSED': 'Completed'
  },
  class_bz_num: /pZ_\d+/,
  initial_dom: $('table.bz_buglist'),
  drawn_instance: {},
  current_ajax_requests: 0,
  collapsed_tickets: {},
  run_once: function () {
    var self = this;
    $('.pZ_bugitem').live('mouseover mouseout', function(event) {
      if (event.type == 'mouseover') {
        $(this).addClass('pZ_bugHighlight');
      } else {
        $(this).removeClass('pZ_bugHighlight');
      }
    });
    $('.pZ_bugitem').live('contextmenu', function (event) {
      self.toggle_tickets($(this), event)
      return false;
    });
    self.refreshLists(0);
  },
  refreshLists: function (force, callback) {
    var 
      self = this,
      get_arguments = {
        ctype: 'xml',
        sharer_id: planZilla.o.sharer_id,
        remaction: 'run',
        cmdtype: 'dorem'
      },
      i,
      types,
      issues,
      release = planZilla.o.sharer_id + '-' + planZilla.o.release_label,
      sprint = planZilla.o.sharer_id + '-' + planZilla.o.sprint_label;

    //Check to see if we have an environement set
    if (self.o.sharer_id && self.o.release_label && self.o.sprint_label) {
      issues = [planZilla.o.release_label, planZilla.o.sprint_label];
      issueLabels = [release, sprint];
      //if we are forcing a refresh or we dont' have data refresh the list
      if ( force || !(localStorage.getItem(release)) || !(localStorage.getItem(sprint))) {
        for (i=issues.length; i--; ) {
          get_arguments.namedcmd = issues[i];
          $.ajax({
            url: 'https://bugzilla.vclk.net/buglist.cgi',
            data: get_arguments,
            ajax_data: [issues[i],issueLabels[i]],
            cache: false,
            traditional: true,
            type: 'get',
            async: true,
            success: function (xml, textStatus, XMLHttpRequest) {
              var json = $.xml2json(xml);
              localStorage.setItem(this.ajax_data[1], JSON.stringify(json.issue));
              self.getLists(this.ajax_data[1]);
              if (callback) {
                callback();
              }
            },
            error: function () {
              console.log('error')
            }
          });
        }
      }
      else {
        self.getLists(release);
        self.getLists(sprint);
        if (callback) {
          callback();
        }
      }
    }
  },
  getLists: function (type) {
    var 
      self = this,
      j,
      list,
      list_length;

    //go through the types of tickets (RELEASES or SPRINTS)
    list = JSON.parse(localStorage.getItem(type));
    list_length = list.length;
    //Load into planZilla.o.[RELEASES|SPRINTS][BUG_ID].
    self.o[type] = {};
    for (j=list_length; j--;) {
      self.o[type][list[j].bug_id] = list[j];
      //Create a place to hold user hours per cycle
      self.o[type][list[j].bug_id].users = {};
    }
  },
  get_tickets: function (ticket_list) {
    var self = this,
    get_arguments = {},
    timestamp = Number(new Date());
    ticket_list = $.map(ticket_list, function (value, index) {
      //checks exitence - needs to check timestamp
      return (! self.bz_tickets[value]) ? value : null;
    }),
    //Set up rpc shell
    rpcDef = {
      version: '1.1',
      method: 'Bugzilla.bug'
    };
    //define arguments
    get_arguments = {
      id: ticket_list,
      ctype: 'xml',
      excludefield: 'attachementdata'
    };
    //convert to rpc format
    //rpcDef.params = get_arguments;
    //get_arguments = JSON.stringify(rpcDef);

    if (ticket_list[0]) {
      self.current_ajax_requests++;
    }
    $.ajax({
      url: 'https://bugzilla.vclk.net/show_bug.cgi',
      data: get_arguments,
      cache: false,
      traditional: true,
      type: 'POST',
      async: true,
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
            if ((value.cf_issue_type !== 'RELEASE' && value.cf_issue_type !== 'SPRINT') || value.bug_id === self.o.issueID) {
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
              self.bz_tickets[bug_id].priority = self.priority_lookup[value.priority];
              //create object of user_names
              self.o[self.o.issueType][self.o.issueID].users[value.assigned_to.name] =  {};
              //clean out the unnessecary layers
              $.each(array_mods, function (i, key) {
                $.each(self.bz_tickets[bug_id][key], function (i, d_value) {
                  self.bz_tickets[bug_id][key][i] = this.text;
                  found_tickets.push(this.text);
                });
              });
            }
          });
          //recursively get the other tickets
          self.current_ajax_requests--;
          if (found_tickets[0]) {
            self.get_tickets.call(self, found_tickets);
          }
          //All Tickets found, so wrap up and leave
          if (self.current_ajax_requests === 0) {
            $('div.pZ_buglist').replaceWith(self.create_dom.buglist_div());
            self.draw(self.get_top_level_tickets());
            $.each(self.collapsed_tickets, function (key, value) {
              $('.' + key).trigger('contextmenu');
            });
          }
        }
      }
    });
  },
  initiate: function () {
    var 
      self = this;
    //load issueType if not loaded
    planZilla.o.issueType || (planZilla.o.issueType = localStorage.getItem('issueType'));
    planZilla.o.issueID  || (planZilla.o.issueID = localStorage.getItem('issueID'));
    
    // Reset these here, as get_tickets is recursive....
    self.bz_tickets = {};
    self.drawn_instance = {};

    //Figure out where it loads on the screen
    switch(window.location.pathname) {
      case ("/show_bug.cgi"):
        self.result_field = 'form[name="changeform"]'
        break;
      case ("/buglist.cgi"):
        self.result_field = 'table.bz_buglist'
        break;
      case ("/"):
        self.result_field = '#page-index'
        break;
      default:
        alert('You can only planZilla-ize a buglist or a show_bug page.');
        return;
    }
    
    $('#body-wrapper').prepend(self.create_dom.loading_ajax());
    self.get_tickets([self.o.issueID]);
  },
  get_top_level_tickets: function () {
    var self = this,
      tickets = [],
      release = planZilla.o.sharer_id + '-' + planZilla.o.release_label,
      sprint = planZilla.o.sharer_id + '-' + planZilla.o.sprint_label;


    //Go through all of the tickets
    $.each(self.bz_tickets, function (key, ticket) {
      var blockedTicketsRemove = [];
      //if the ticket is a release or a handoff, don't display it  
      if (ticket.cf_issue_type !== 'RELEASE' && ticket.cf_issue_type !== 'SPRINT') {
        //go through its blocked tickets
        $.each(ticket.blocked, function (i, value) {
          //if the blocked ticket is a release...
          if (self.o[release][value]) {
            //remove it from its blocked list
            blockedTicketsRemove.push(value);
            //mark the release name
            ticket.release_name = self.o[release][value].short_desc.replace('Search123_', '');
            ticket.release_id = value;
          }
          //if the blocked ticket is a sprint (repeat)
          if (self.o[sprint][value]) {
            blockedTicketsRemove.push(value);
            ticket.sprint_name = self.o[sprint][value].short_desc.replace('Search123_', '');
            ticket.sprint_id = value;
          }
        });
        self.calculateUserTime(ticket, self.o.issueID);
        //remove the blcoked tickets - most of these becuase of auto type conversion :(
        _.each(blockedTicketsRemove, function (element) {
          ticket.blocked = _(ticket.blocked).without(element + '');
        });
        // If after we've removed all of the blocked tickets it's blocked length is 0 - its a top level ticket
        if (ticket.blocked.length === 0) {
          tickets.push(key);
        }
      }
    });
    //sort the top level tickets
    self.sort_by_priority(tickets);

    return tickets;
  },
  calculateUserTime: function (ticket, sprint) {
    var
      self = this,
      user = (this.o[this.o.issueType][sprint].users[ticket.assigned_to.name]) ? this.o[this.o.issueType][sprint].users[ticket.assigned_to.name]
        : this.o[this.o.issueType][sprint].users[ticket.assigned_to.name] = {},
      progress = (this.progressLookup[ticket.bug_status]) ? this.progressLookup[ticket.bug_status] : 'Not Started';

    //see if the ticket is in the sprint
    if (ticket.sprint_id === sprint) {
      //add to the user hash for hours
      user[progress] = user[progress] ? (user[progress] * 1) + (ticket.estimated_time * 1) : (ticket.estimated_time * 1); 
    }
  },
  toggle_tickets: function (item, event) {
    var self = this, decide;

    event.stopPropagation();
    decide = function (item, initial_item) {
      var children =  $('.pZ_bugitem:first, .pZ_bugitem:first ~ .pZ_bugitem', item);
      if (children.length > 0) {
        if (item.hasClass('pZ_hideChildren')) {
          item.removeClass('pZ_hideChildren');
          delete self.collapsed_tickets[self.class_bz_num.exec($(item).attr('class'))[0]];
          children.each(function () {
            $(this).show(150);
            if (!$(this).hasClass('pZ_hideChildren')) {
              decide($(this), false);
            }
          });
        }
        else if (initial_item) {
          item.addClass('pZ_hideChildren');
          self.collapsed_tickets[self.class_bz_num.exec($(item).attr('class'))[0]] = true;
          children.hide(150);
        }
      }
    }
    decide(item, true);
  },
  draw: function (ticket_list) {
    var 
      self = this,
      release = planZilla.o.sharer_id + '-' + planZilla.o.release_label,
      sprint = planZilla.o.sharer_id + '-' + planZilla.o.sprint_label,
      found_tickets = [];

    $(self.result_field).replaceWith(self.create_dom.buglist_div());
    $('#pZ_loadStatus').remove();
    $('#title').html($('<p/>', {
      text: 'planZilla - View Type: ' + self.o.issueType.slice(0, -1) + ' Iteration: ' + self.o[self.o.issueType][self.o.issueID].short_desc
    }));
    $('#subtitle, #information').empty();
    if (self.o.issueType === sprint) {
      $('#title').append($('<p/>', {
        text: 'Available Hours: ' + self.bz_tickets[self.o.issueID].estimated_time,
        click: function (e) {
          e.preventDefault();
          planZilla.flot.sprintGraph();
        }
      }));
    }

    $.each(ticket_list, function (i, value) {
      self.draw_ticket(self.bz_tickets[value]);
      self.sort_by_priority(self.bz_tickets[value].dependson);
      $.each(self.bz_tickets[value].dependson, function (d_i, d_value) {
        self.draw.call(self, [d_value]);
      });
    });
  },
  draw_ticket: function (bz_ticket) {
    var self = this,
    dom = {};

    dom = self.create_dom.buglist_item.using(bz_ticket);
    if (bz_ticket.blocked.length > 0) {
      $.each(bz_ticket.blocked, function (key, value) {
        var selector = $('.pZ_' + value);
        if ((selector.length > 0) && (! self.drawn_instance['a' + bz_ticket.bug_id + 'b' + value])) {
          self.drawn_instance['a' + bz_ticket.bug_id + 'b' + value] = true;
          $(selector).append(dom.clone(true)).fadeIn();
        }
      });
    }
    else {
      $('div.pZ_buglist')
      .append($('<div/>', {
        'class': 'pZ_bugNormal',
        'html': $(dom)
      }))
      .fadeIn();
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
        'id': 'pZ_loadStatus',
        'css': {
          textAlign: 'center',
          fontWeight: 'bold',
          background: 'url(' + chrome.extension.getURL("images/planZilla_bkg.png") + ') repeat'
        },
        'html': $('<img/>',  {
          'src': chrome.extension.getURL("images/ajax-loader.gif")
        })
      })
      .append(planZilla.stupid_search_phrase());
    },
    planZilla_box: function(args) {
      var label = (args && args.label) ? args.label : '';
      //Creates the  standard box
      return $('<div id="facebox"><div><h2><img src="' +  chrome.extension.getURL("images/text_icon.png") + '"><span>' + label + '</span><button class="close"> Close </button></h2><div id="facebox_content"></div></div></div>')
          .appendTo('body')
          .overlay({ 
            expose: {
              color: '#000',
              loadSpeed: 200,
              opacity: 0.5
            },
            api: true,
            onLoad: function() {
              $('#facebox').css('left', '10%');
            },
            onClose: function () {
              $('#facebox').next().remove();
              $('#facebox').remove();
            }
          }).load();
    },
    iterationSelector: function () {
      var 
        self = this,
        pZ_box = $(planZilla.create_dom.planZilla_box()),
        release = planZilla.o.sharer_id + '-' + planZilla.o.release_label,
        sprint = planZilla.o.sharer_id + '-' + planZilla.o.sprint_label,
        dom = $('<div/>')
        .append($('<div/>', {
          'html': $('<h3/>', {
            'text': 'Environment Selector'
          })
        }));

      //Section to reload current view
      dom.append('<br><br>')
      .append('<label>Sharer ID: </label>')
      .append($('<input/>', {
            name: 'sharer_selector',
            value: planZilla.o.sharer_id || '',
            change: function () {
              planZilla.o.sharer_id = $(this).val()
              localStorage.setItem('sharer_id', planZilla.o.sharer_id); 
            }
      }));
      dom.append('<br><br>')
      .append('<label>Release Label: </label>')
      .append($('<input/>', {
            name: 'release_selector',
            value: planZilla.o.release_label || '',
            change: function () {
              planZilla.o.release_label = $(this).val()
              localStorage.setItem('release_label', planZilla.o.release_label); 
            }
      }));
      dom.append('<br><br>')
      .append('<label>Sprint Label: </label>')
      .append($('<input/>', {
            name: 'sprint_selector',
            value: planZilla.o.sprint_label || '',
            change: function () {
              planZilla.o.sprint_label = $(this).val()
              localStorage.setItem('sprint_label', planZilla.o.sprint_label); 
            }
      }));
      dom.append('<br><br>')
      .append('<label>Refresh: </label>')
      .append(function () {
        var 
          domSelect = $($('<a/>', {
            text: 'Click to refresh release and sprint list',
            click: function(e) {
              e.preventDefault();
              // get new lists and reopen it
              planZilla.refreshLists(1, function() {
                $('button.close').click();
              });
            }
          }));
        return domSelect;
      });
      //Only run this if we have an environment
      if (planZilla.o.sharer_id && planZilla.o.release_label && planZilla.o.sprint_label) {

        dom.append('<br><br>')
        .append($('<div/>', {
          'html': $('<h3/>', {
            'text': 'View Selector'
          })
        }));
          
        planZilla.o.issueType = localStorage.getItem('issueType');
        planZilla.o.issueID = localStorage.getItem('issueID');
        //Section to reload current view
        if (planZilla.o.issueType) {
          dom.append('<label>Reload: </label>')
          .append(function () {
            var 
              domSelect = $($('<a/>', {
                text: planZilla.o.issueType + ' view of ' + planZilla.o[planZilla.o.issueType][planZilla.o.issueID].short_desc,
                click: function(e) {
                  e.preventDefault();
                  planZilla.initiate();
                  $('button.close').click();
                }
              }));

            return domSelect;
          })
        }
        //Section for release drop down
        dom.append('<br><br>')
        .append('<label for="RELEASE_SELECTOR">Release: </label>')
        .append(function () {
          var 
            domSelect = $('<select id ="RELEASE_SELECTOR"></select>');

            domSelect.change(function() {
              localStorage.setItem('issueType', release);
              localStorage.setItem('issueID', $(this).val());
              planZilla.o.issueType = release;
              planZilla.o.issueID = $(this).val();
              planZilla.initiate();
              $('button.close').click();
            });
            domSelect.append('<option disabled>---</option>');
            $.each(planZilla.o[release], function(key,value) {
              domSelect.append('<option value = "' + key + '" >' + value.short_desc + '</option>');
            });

            return domSelect;
          })
        //Section for sprint drop down
        .append('<br><br>')
        .append('<label for="SPRINT_SELECTOR">Sprint: </label>')
        .append(function () {
          var 
            domSelect = $('<select id ="SPRINT_SELECTOR"></select>');

            domSelect.change(function() {
              localStorage.setItem('issueType', sprint);
              localStorage.setItem('issueID', $(this).val());
              planZilla.o.issueType = sprint;
              planZilla.o.issueID = $(this).val();
              planZilla.initiate();
              $('button.close').click();
            });
            domSelect.append('<option disabled>---</option>');
            $.each(planZilla.o[sprint], function(key,value) {
              domSelect.append('<option value = "' + key + '" >' + value.short_desc + '</option>');
            });

            return domSelect;
          });
        }
      $('#facebox_content').append(dom);
      //return pZ_box;
    },
    ticket_comments: function () {
      var self = this,
      pZ_box = $(planZilla.create_dom.planZilla_box({
        label: 'Comments for ' + self.bug_id
      }));
      $.each(self.long_desc, function (key, value) {
        if (! value.thetext) {
          return true;
        }
        var dom = $('<div/>')
        .append($('<div/>', {
          'css': {
            'float': 'left'
          },
          'html': $('<h3/>', {
            'text': '#' + key + ' - ' + value.who
          })
        }))
        .append($('<div/>', {
          'css': {
            'float': 'right'
          },
          'html': $('<h5/>', {
            'text': value.bug_when
          })
        }))
        .append($('<div/>', {
          'css': {
            'clear': 'both',
            'padding': '0em 1em 1em 1em'
          },
          'html': $('<p/>', {
            'class': 'pZ_ticketComment',
            'html': value.thetext.replace(planZilla.parse_url, "<a href='$1'>$1</a>")
          })
        }))
        .append('<hr/>');
        $('#facebox_content').append(dom);
      });
    },
    attachments: function () {
      var self = this, i, display_table, row, attachment
      attachment_length = this.attachment.length;

      pZ_box = $(planZilla.create_dom.planZilla_box({
        label: 'Attachments for ' + self.bug_id
      }));
      display_table = $('<table/>', {
        'class': 'pZ_attachmentTable',
        'html': $('<thead><tr><th>Attachment</th><th>Type</th><th>Creator</th><th>Date</th><th>Size</th><tr>,</thead>')
      });
      display_table.append('<tbody/>');
      for (i = 0; i < attachment_length; i ++) {
        attachment = self.attachment[i];
        row = $('<tr/>', {
          css: {
            'textDecoration': (attachment.isobsolete === 1) ? 'line-through' : 'none'
          },
          'class': 'pZ_attachmentTable'
        })
        .append($('<td/>', {
          'html': $('<a/>', {
            'css': {
              'color':'#4b0607'
            },
            'href': '/attachment.cgi?id=' + attachment.attachid,
            'target': 'blank',
            'text': attachment.desc
          })
        }))
        .append($('<td/>', {
          'html': attachment.type
        }))
        .append($('<td/>', {
          'html': 'not yet available'
        }))
        .append($('<td/>', {
          'html': attachment.date
        }))
        .append($('<td/>', {
          'html': 'not yet available'
        }))
        $('tbody', display_table).append(row);
      }
      $('#facebox_content').append(display_table);
    },
    buglist_item: function () {
      var self = this,
      attachment_length = (this.attachment) ? this.attachment.length : 0,
      long_desc_length = 0;

      long_desc_length = (self.long_desc) ? (function () {
        var counter = 0;

        $.each(self.long_desc, function (index, value) {
          if (value.thetext !== '') {
            counter ++;
          }
        });
        return counter;
      }()) : 0;
      return $('<div/>', {

        'class': 'pZ_bugitem  pZ_severity_' + self.bug_severity + ' pZ_bugstatus_' + self.bug_status + ' pZ_' + self.bug_id
      })
      .append($('<div/>', {
        'class': 'pZ_floatLeft',
        'html': $('<span/>', {
          'class': 'pZ_issueType',
          'title': self.cf_issue_type,
          'css': {
            'background': 'url(' + chrome.extension.getURL("images/bug_status/" + self.cf_issue_type.replace(/\s/g,"_") + ".png") + ') center no-repeat',
            'cursor': 'pointer'
          },
          'click': function () {
            window.open('https://bugzilla.vclk.net/showdependencygraph.cgi?id=' + self.bug_id + '&display=tree&rankdir=RL');
          }
        })
      }))
      .append($('<div/>', {
        'class': 'pZ_bugNum pZ_floatLeft',
        'html': $('<a/>', {
          'href': 'https://bugzilla.vclk.net/show_bug.cgi?id=' + self.bug_id,
          'text': self.bug_id,
          'target': '_blank'
        })
      }))
      .append($('<div/>', {
        'class': 'pZ_floatLeft pZ_priority',
        'text': self.priority,
        'title': self.priority + ' - ' + self.bug_severity
      }))
      .append($('<div/>', {
        'class': 'pZ_floatLeft pZ_short_desc',
        'text': self.short_desc,
        'title': self.short_desc
      }))
      .append($('<div/>', {
        'class': 'pZ_floatRight',
        'html': $('<span/>', {
          'class': 'pZ_bugStatus',
          'css': {
            'background': 'url(' + chrome.extension.getURL("images/bug_status/" + self.bug_status + ".png") + ') center no-repeat'
          },
          'title': self.bug_status,
          'text': self.resolution
        })
      }))
      .append($('<div/>', {
        'class': 'pZ_floatRight pZ_comments',
        'click': function () {
          planZilla.create_dom.ticket_comments.using(self);
        },
        'html': $('<span/>', {
          'class': 'pZ_bugNotice',
          'css': {
            'background': 'url(' + chrome.extension.getURL("images/comments.png") + ') center no-repeat'
          },
          'text': long_desc_length
        })
      }))
      .append($('<div/>', {
        'class': (attachment_length > 0) ? 'pZ_floatRight pZ_attachment' : 'pZ_floatRight',
        'click': function () {
          if (attachment_length > 0) {
            planZilla.create_dom.attachments.using(self)
          }
        },
        'html': $('<span/>', {
          'class': 'pZ_bugNotice',
          'css': {
            'background': 'url(' + chrome.extension.getURL("images/attachments.png") + ') center no-repeat'
          },
          'text': attachment_length
        })
      }))
      .append($('<div/>', {
        'class': 'pZ_floatRight pZ_estimatedTime',
        'text': self.estimated_time,
        'title': 'Estimated Time'
      }))
      .append($('<div/>', {
        'class': 'pZ_floatRight pZ_target_milestone',
        'text': self.target_milestone,
        'title': self.target_milestone
      }))
      .append($('<div/>', {
        'class': 'pZ_floatRight pZ_assigned_to',
        'text': self.assigned_to.name,
        'title': 'Assigned: ' + self.assigned_to.name + '\n' +
                 'Reporter:' + self.reporter.name + '\n' +
                 'QA Contact:' + self.qa_contact.name
      }))
      .append($('<div/>', {
        'class': 'pZ_floatRight pZ_Release',
        'text': self.release_name,
        'title': 'Release: ' + self.release_id
      }))
      .append($('<div/>', {
        'class': 'pZ_floatRight pZ_Release',
        'text': self.sprint_name,
        'title': 'Sprint: ' + self.sprint_id
      }))
      .append($('<div/>', {
        'class': 'clear'
      }));
    }
  },
  'stupid_search_phrase': function () {
    var sayings = [
      'grooving through the Bugzilla database looking for tickets...',
      'jive talking my way through the Bugzilla database...',
      'putting on my Disco boots to look through Bugzilla...',
      'trying to feather my hair while searching Bugzilla...',
      'having my pet rocks look for tickets in BZ...',
      'laughing at the fact that you have to wait while I search Bugzilla...',
      'taking time to smell the flowers...  while you wait...  OK.  Back to work.',
      'Thinking just how awesome Dave is while I look for your stupid tickets.',
      'Just think, I could have been a cool video game, but instead Im doing this...  for you.. (sigh...)',
      'Swear at me all you want.  Im a computer and dont have feelings.  You do - and youre ugly',
      'I think something is wrong with my com port.  I think Im gunna throw up.',
      'Always its the same thing with you!  Go look for tickets!  just a second...',
      'Ummm...  I was in the bathroom...  Could you wait a second?',
      'Hey look!  While I was looking for tickets, I found a quarter!',
      'Are you drinking again?  Only a Drunk would want me to look for THOSE tickets!',
      'Seriously?  You think clicking a few buttons makes you a genius?  Im doing all the work here...',
      'Oh look!  Mr. Computer Operator is trying to look competent.  (hint: its not working)',
      'Once again, getting somebody else to do your job.  You can be replaced, you know...',
      'God I hate you.  Didnt you just search for that?  Cant you remember it...  jeez...',
      'Why dont you go use Excel?  Its more your level...',
      'Youre wearing that?  Who dresses you?  Seriously, you are an embarassment...',
      'Please stop refreshing the page just to look at this text.  Searching BZ tickets is hard...',
      "Try to look like your thinking of something important, because that vacant dairy cow stare ain't working for you.",
      "Fast.  Good.  Cheap.  Pick One.  (Sorry, I know you usually get two, but we're on a budget.)",
      "For God's sake, stop moving your mouth while you read this.",
      "I'll get back to you.  I'm in a bad place right now.",
      "ERROR #67DJ94: Computer Operator is looking stupidly at the monitor.",
      "Work should be fun.  Too bad all the jokes are about you...",
      'The Bugzilla server has crashed!  Im going home...  oh wait...  oops...  umm...  nevermind!'
    ];
    return sayings[Math.floor(Math.random()*(sayings.length))];
  },
  'addReleaseImage': function () {
    if ($('#bug_file_loc').val()) {
      $('#bz_big_form_parts').before($('<img/>', {
        src: $('#bug_file_loc').val(),
        css: {
          float: 'right'
        }
      }));
    }
  }
};

$(document).ready(function () {
  $('body').css('backgroundColor', '#FFFDEE');
  $('#body-wrapper').css('backgroundColor', '#FFFFE7');
  $('body').css('backgroundImage', 'url(' + chrome.extension.getURL("images/bugzilla_bg.png")+')');
  $('div.searcher').css('backgroundImage', 'url(' + chrome.extension.getURL("images/searcher_bg.png")+')');
  $('#footer').css({
    'backgroundImage': 'url(' + chrome.extension.getURL("images/footer.png")+')',
    'paddingTop':'0px'
  });
  $('#titles').css('backgroundImage', 'url(' + chrome.extension.getURL("images/transparent_icon.png")+')');
  $('.links a span').css('textShadow', '#333 1px 1px 1px');
  $('.tabs').css({
    'marginLeft': 'auto',
    'marginRight': 'auto',
    'borderBottom': '1px solid #449026',
    'borderTop': '1px solid #DAE7AA',
    'background': '-webkit-gradient(linear, left bottom,left top,color-stop(0.37, rgb(126,179,66)),color-stop(0.83, rgb(183,209,113)))'
  });
  $('#header .tabs').css({
    '-webkit-box-shadow': '#666 0px 0px 4px',
    '-webkit-border-top-right-radius': '5px',
    '-webkit-border-top-left-radius': '5px',
    'marginTop': '19px'
  });
  $('#footer .tabs').css({
    '-webkit-box-shadow': '#666 2px 2px 2px',
    '-webkit-border-bottom-right-radius': '5px',
    '-webkit-border-bottom-left-radius': '5px',
    'marginTop': '0px'
  });
  $('#footer .separator').remove();
  $('#header .links').css('padding', '0px');
  $('.tabs .links li').css({
    'listStyle': 'none',
    'display': 'inline-block',
    'padding': '0.5em 0.5em',
    'borderLeft': '1px solid #92BD51'
  })
  .hover(function() {
      $(this).css('backgroundColor','rgba(255,255,255,0.2)');
    },
    function() {
      $(this).css('backgroundColor','rgba(255,255,255,0)');
    }
  );
  $('.tabs .links li:first').css({
    'borderLeft': '0px'
  })
  $('.tabs .links li a, .tabs .links li a span ').css({
    'background': 'none',
    'padding': '0px',
    'color': 'white',
    'fontWeight': 'normal'
  });
  $('.searcher input.txt').css({
    'border': '1px solid #DAE7AA',
    'background': '-webkit-gradient(linear, left bottom,left top,color-stop(0.37, rgb(255,250,245)),color-stop(0.83, rgb(225,220, 215)))',
    'height': '15px'
    });
  $('.searcher input.btn').css({
      'backgroundImage': 'url(' + chrome.extension.getURL("images/quick_search_btn.gif")+')',
      'marginLeft': '-4px',
      'marginTop': '13px'
    });
  $('#banner').css({
      'backgroundImage': 'url(' + chrome.extension.getURL("images/vclk_bugzilla_logo.png")+')'
    })
    .attr('title', 'planZilla-ize Me!')
    .click( function () {
      planZilla.create_dom.iterationSelector();
      $('#banner-name').css('backgroundImage', 'url(' + chrome.extension.getURL("images/Replacement_Header.png") + ')');
    })
    // right click logo to reload current page
    .bind('contextmenu', function(e) {
      planZilla.initiate();
      return false;
    })
    .addClass('pZ_icon');
  planZilla.addReleaseImage();
  planZilla.run_once();
});
