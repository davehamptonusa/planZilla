(function (planZilla) {
  var
    pvf = {},
    calcSprintValues,
    status = ['Not Started', 'In Progress', 'Completed'],
    graphSpec,
    getData;


  getData = function (users, usersLength) {
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
           hours = planZilla.o.users[users[j]][status[i]] || 0;
           spec.data.push([j, hours]);
           total_hours += hours;
         }
         spec.data.push([j, total_hours]);
         graphSpec.push(spec);
      })();
    }
  }; 


  var stack = 0, bars = true, lines = false, steps = false;

  var plotWithOptions =  function () {
    var
      o,
      flotGraph = $("#flotGraph"),
      users = _(planZilla.o.users).keys(),
      usersLength,
      availTime = planZilla.bz_tickets[planZilla.o.issueID].estimated_time * 1,
      ticks;

    graphSpec = [];
    // Update the user string
    usersLength = users.length;
    //Get data
      getData(users, usersLength);
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
    planZilla.create_dom.planZilla_box({
      label: planZilla.bz_tickets[planZilla.o.issueID].short_desc + ' Sprint View'
    });
    $('#facebox_content').append($('<div/>', {
      id: 'flotGraph',
      css: {
        height: '500px'
      }
    }));

    plotWithOptions();
  }
  planZilla.flot = pvf;
})(planZilla)
