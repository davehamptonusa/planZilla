(function (planZilla) {
  var
    pvf = {},
    calcSprintValues,
    status = ['Not Started', 'In Progress', 'Completed'],
    plotWithOptions,
    stack = 0, bars = true, lines = false, steps = false,
    getData;


  getData = function (users, usersLength, graphSpec, sprint) {
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



  plotWithOptions =  function (sprint) {
    var
      o,
      flotGraph = $("#flotGraph"),
      users,
      usersLength,
      availTime = planZilla.bz_tickets[planZilla.o.issueID].estimated_time * 1,
      graphSpec = [],
      isThisSprint = (sprint = planZilla.o.issueID),
      ticks;
    
    if (isThisSprint) {
      // Update the user string
      users = _(planZilla.o[planZilla.o.issueType][planZilla.o.issueID].users).keys(),
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
    }

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
        domSelect = $('<select disabled id ="SPRINT_SELECTOR"></select>');

      domSelect.change(function() {
        plotWithOptions($(this).val());
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
