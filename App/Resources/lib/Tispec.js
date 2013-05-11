var _ = require('lib/underscore')._;

var initialized = false;

Ti.include('lib/jasmine.js');

function initializeJasmine(reporter) {
  // [Hack] force a new env.
  // Avoid multiple execution of the same spec if the specs are run
  // multiple times (and thus, included more than once)
  // @see https://github.com/pivotal/jasmine/pull/357
  // @see https://github.com/pivotal/jasmine/blob/master/src/core/base.js
  var env = jasmine.currentEnv_ = new jasmine.Env();

  env.addReporter(reporter);
  env.specFilter = function(spec) {
    return reporter.specFilter(spec);
  };

  return env;
}

exports.initialize = function(host, port) {
  if (initialized) { return; }

  var nowjs = require('/lib/now'),
  now = nowjs.nowInitialize('//' + host + ':' + port, {});

  now.ready(function () {
    var Reporter   = require('lib/TispecReporter').TispecReporter;

    now.execute = function (specs, conf) {
      (function() {
        var reporter   = new Reporter(now),
            jasmineEnv = initializeJasmine(reporter);

        Ti.include('/lib/TispecHelper.js');

        _.each(specs, function(spec) { Ti.include(spec); });

        if (conf.filter) { reporter.setSpecFilter(conf.filter); }
        else        { reporter.removeSpecFilter();    }

        jasmineEnv.execute();
      })();
    };
  });

  initialized = true;
};
