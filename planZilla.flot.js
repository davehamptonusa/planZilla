(function (planZilla) {
  var
    pvf = {},
    calcSprintValues,
    status = ['Not Started', 'In Progress', 'Completed'],
    statusLength,
    graphSpec,
    getData;


  statusLength = status.length;
  getData = function (status, usersLength) {
    var
      j,
      spec = {};

    spec.label = status;
    spec.data = [];
    for (var j = 0; j < usersLength; j += 1) {
      spec.data.push([j, parseInt(Math.random() * 30)]);
    }
    graphSpec.push(spec);
  }; 


  var stack = 0, bars = true, lines = false, steps = false;

  var plotWithOptions =  function () {
    var
      o,
      flotGraph = $("#flotGraph"),
      users = _(planZilla.users).keys(),
      usersLength,
      ticks;

    graphSpec = [];
    // Update the user string
    users.push('Total');
    usersLength = users.length;
    //Get fake data
    for (var i = 0; i < statusLength; i += 1) {
      getData(status[i], usersLength);
    }
    // get the ticks and ;labels for the x -axis
    ticks = (function () {
      var 
        ticksArray = [],
        i;

      for (i = 0; i < usersLength; i += 1) {
        ticksArray.push([(i + .25), users[i]]);
      }
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
        markings: [ { xaxis: { from: 40, to: 40 } } ],
        autoHighlight: true
      },
      xaxis: {
        ticks: ticks
      }
    });
  }
  pvf.sprintGraph = function () {
    planZilla.create_dom.planZilla_box();
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
