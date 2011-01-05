(function (planZilla) {
  var
    pvf = {},
    calcSprintValues,
    status = ['Not Started', 'In Progress', 'Completed'],
    plotWithOptions,
    stack = 0, bars = true, lines = false, steps = false,
    loadSprintData,
    determineSprint,
    getData;


  loadSprintData = function (sprint) {
    var data =  {
      'field0-0-0': 'blocked',
      'query_format': 'advanced',
      'type0-0-0': 'equals',
      'value0-0-0':  sprint,
      'ctype': 'xml'
    };
    $.ajax({
      url: 'https://bugzilla.vclk.net/buglist.cgi',
      data: data,
      cache: false,
      traditional: true,
      type: 'GET',
      async: true,
      success: function (xml, textStatus, XMLHttpRequest) {
        var 
          json = $.xml2json(xml),
          data,
          tickets = [];

        if (json && json.issue) {
          tickets = _.pluck(json.issue, 'bug_id');
          //go get the tickets
          data =  {
            id: tickets,
            ctype: 'xml',
            excludefield: 'attachmentdata'
          };
          $.ajax({
            url: 'https://bugzilla.vclk.net/show_bug.cgi',
            data: data,
            cache: false,
            traditional: true,
            type: 'POST',
            async: true,
            success: function (xml, textStatus, XMLHttpRequest) {
              var 
                json = $.xml2json(xml);

              if (json && json.bug) {
                // json deep parses json as an object if there is only one
                // so we need to nest it in an array
                json.bug = planZilla.convert_to_array(json.bug);
                //empty out the hours for the sprint;
                planZilla.o.SPRINTS[sprint].users = {};
                $.each(json.bug, function (i, value) {
                  //mark the bug as belonging to this sprint
                  value.sprint_id = sprint;
                  planZilla.calculateUserTime(value, sprint);
                });
                plotWithOptions(sprint);
              }
            }
          });
        }
      },
      error: function (XMLHttpRequest, textStatus, errorThrown) {
        1;
      }
    });
  }

  getData = function (users, usersLength, graphSpec, sprint) {
    // Puts the data in the right format for flot
    var
      i,
      statusLength = status.length,
      total = {
        label: 'Total',
        data: []
      };

    for (var i = 0; i < statusLength; i += 1) {
      (function () {
         var 
           spec = {},
           hours,
           j,
           total_hours = 0;

         spec.label = status[i];
         spec.data = [];
         total_hours = 0;
         for (var j = 0; j < usersLength; j += 1) {
           hours = planZilla.o.SPRINTS[sprint].users[users[j]][status[i]] || 0;
           spec.data.push([j, hours]);
           total_hours += hours;
         }
         spec.data.push([j, total_hours]);
         graphSpec.push(spec);
      })();
    }
  }; 

  determineSprint = function (sprint) {
    var isThisSprint = (sprint === planZilla.o.issueID ? true: false),
      flotGraph = $("#flotGraph");

    if (!isThisSprint) {
    //Throw up loding banner
    flotGraph.html($('<img/>',  {
      'src': chrome.extension.getURL("images/ajax-loader.gif")
    }))
    .append("Loading...")
    .prepend('</br>');
    $('#facebox>div>h2>span').after().text(planZilla.o.SPRINTS[sprint].short_desc + ' Sprint :: ' + planZilla.o.SPRINTS[sprint].estimated_time + ' hours');
      //load the correct data and populate the user database
      loadSprintData(sprint);
    }
    else {
      plotWithOptions(sprint);
    }
  }

  plotWithOptions =  function (sprint) {
    var
      o,
      flotGraph = $("#flotGraph"),
      users,
      usersLength,
      availTime = planZilla.bz_tickets[planZilla.o.issueID].estimated_time * 1,
      graphSpec = [],
      ticks;
    
    // Update the user string
    users = _(planZilla.o[planZilla.o.issueType][sprint].users).keys(),
    usersLength = users.length;
    //Get data
    getData(users, usersLength, graphSpec, sprint);
    // get the ticks and ;labels for the x -axis
    ticks = (function () {
      var 
        ticksArray = [],
        i;

      for (i = 0; i < usersLength; i += 1) {
        ticksArray.push([(i + .25), users[i]]);
      }
      //add total column
      ticksArray.push([usersLength + .25, 'Total']);
      //add padding column
      ticksArray.push([usersLength + 1.25, '']);
      return ticksArray;
    })();

    flotGraph.empty();
    $.plot(flotGraph, graphSpec, {
      series: {
        stack: stack,
        lines: { show: lines, steps: steps },
        lineWidth: 2,
        bars: { show: bars, barWidth: 0.6 }
      },
      grid: {
        markings: [ { yaxis: { from: availTime, to: availTime } } ],
        hoverable: true,
        autoHighlight: true
      },
      xaxis: {
        ticks: ticks
      }
    });
  }

  pvf.sprintGraph = function () {
    var sprintTicket = planZilla.bz_tickets[planZilla.o.issueID];

    planZilla.create_dom.planZilla_box({
    label: sprintTicket.short_desc + ' Sprint :: ' + sprintTicket.estimated_time + ' hours'
    });
    $('#facebox_content').append('<label for="SPRINT_SELECTOR">Sprint: </label>')
    .append(function () {
      var 
        //temporarily disabled
        domSelect = $('<select id ="SPRINT_SELECTOR"></select>');

      domSelect.change(function() {
        determineSprint($(this).val());
      });
      
      domSelect.append('<option disabled>---</option>');
      
      $.each(planZilla.o.SPRINTS, function(key,value) {
        domSelect.append('<option value = "' + key + '" >' + value.short_desc + '</option>');
      });

      return domSelect;
    });
    $('#facebox_content').append($('<div/>', {
      id: 'flotGraph',
      css: {
        height: (parseInt($('#facebox_content').css('height')) * .9) + 'px'
      }
    }));

    plotWithOptions(planZilla.o.issueID);
  }

  //extend planZilla -- THIS OVERWRIES NOT EXTENDS...
  planZilla.flot = pvf;
})(planZilla)
