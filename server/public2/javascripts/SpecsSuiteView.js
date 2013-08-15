var SpecsSuiteView;

SpecsSuiteView = (function() {
  function SpecsSuiteView(socket, id, appName, appVersion, deviceName, deviceModel) {
    var that,
      _this = this;

    this.socket = socket;
    this.id = id;
    this.specsSuite = new SpecsSuite(this.id, appName, appVersion, deviceName, deviceModel);
    that = this;
    $.get("/specs_suites/" + this.id, function(html) {
      $('#specs_suites').append(html);
      return that.initializeView();
    });
    this.specsSuite.onAddSpec(function() {
      return _this.updateAvancement();
    });
    this.specsSuite.onAddSpecResult(function(spec) {
      return spec.showResults();
    });
    this.specsSuite.onAddSuite(function(suite) {
      return suite.showResults();
    });
  }

  SpecsSuiteView.prototype.onAddSpec = function(callback) {
    return this.newSpecsCallbacks.add(callback);
  };

  SpecsSuiteView.prototype.onAddSpecResult = function(callback) {
    return this.newSpecsResultsCallbacks.add(callback);
  };

  SpecsSuiteView.prototype.onAddSuite = function(callback) {
    return this.newSuiteCallbacks.add(callback);
  };

  SpecsSuiteView.prototype.getSpecsSuite = function() {
    return this.specsSuite;
  };

  SpecsSuiteView.prototype.runSpecs = function(form) {
    var filter;

    this.initializeView();
    filter = $(form).find(':input').first().val();
    socket.emit('runSpecs', {
      specsSuiteId: this.id,
      filter: filter
    });
    return false;
  };

  SpecsSuiteView.prototype.initializeView = function() {
    $('#myModal').modal('show');
    $("#specs_results_" + this.id).find("tr:gt(0)").remove();
    $("#specs_suite_avancement_success_" + this.id + " > .bar").css("width", "0%");
    $("#specs_suite_avancement_error_" + this.id + " > .bar").css("width", "0%");
    $("#specs_suite_avancement_" + this.id).val(0).trigger("change");
    $("#specs_suite_title_" + this.id).text("" + this.specsSuite.appName + " (" + this.specsSuite.appVersion + ") / " + this.specsSuite.deviceName);
    $("#specs_suite_avancement_" + this.id).knob({
      width: 60,
      height: 60,
      readOnly: true
    });
  };

  SpecsSuiteView.prototype.confirmManualSpec = function(behavior) {
    var confirmationDiv;

    this.currentSpec = this.specsSuite.getSpec(behavior.specId);
    confirmationDiv = $("#spec_confirmation_" + this.id);
    confirmationDiv.find('.confirmation_expected_message').text(behavior.description);
    confirmationDiv.show();
  };

  SpecsSuiteView.prototype.changeSpecScreenshot = function(specId) {
    var spec;

    spec = this.specsSuite.getSpec(specId);
    $("#modal_error_screenshot_different_" + this.specsSuite.id + "_" + specId).remove();
    $('.modal-backdrop').hide();
    $("#tr_" + this.specsSuite.id + "_" + specId).toggleClass('error').toggleClass('success');
    socket.emit('changeSpecScreenshot', {
      specsSuite: {
        appName: this.specsSuite.appName,
        deviceModel: this.specsSuite.deviceModel
      },
      spec: {
        screenshotError: spec.screenshotError
      }
    });
    return true;
  };

  SpecsSuiteView.prototype.setManualSpecResult = function(valid) {
    if (!valid) {
      this.currentSpec.setManualError();
    }
    $("#spec_confirmation_" + this.id).hide();
    socket.emit('confirmSpecResult', {
      specsSuiteId: this.id,
      valide: valid
    });
  };

  SpecsSuiteView.prototype.end = function() {
    $('.spec_row').each(function() {
      if ($(this).data('content')) {
        return $(this).popover('hide');
      }
    });
  };

  SpecsSuiteView.prototype.updateAvancement = function() {
    var advancement, error, errorPercentage, passed, passedPercentage;

    passed = this.specsSuite.passedCount;
    error = this.specsSuite.errorCount;
    advancement = (passed + error) / this.specsSuite.totalCount * 100;
    passedPercentage = (passed / this.specsSuite.totalCount) * 100;
    errorPercentage = (error / this.specsSuite.totalCount) * 100;
    $("#specs_suite_avancement_success_" + this.specsSuite.id + " > .bar").css("width", "" + passedPercentage + "%");
    $("#specs_suite_avancement_error_" + this.specsSuite.id + " > .bar").css("width", "" + errorPercentage + "%");
    $("#specs_suite_avancement_" + this.specsSuite.id).val(advancement).trigger('change');
  };

  return SpecsSuiteView;

})();

Spec.prototype.showResults = function() {
  switch (this.errorType) {
    case this.ERROR_NORMAL:
      this.formatNormalError();
      break;
    case this.ERROR_SCREENSHOT_UNKNOWN_IMAGE:
      this.formatScreenshotUnknownError();
      break;
    case this.ERROR_SCREENSHOT_DIFFERENT_IMAGE:
      this.formatScreenshotDifferentError();
      break;
    case this.ERROR_MANUAL_VALIDATION:
      this.formatManualValidationError();
      break;
    default:
      this.formatResult();
  }
};

Spec.prototype.formatNormalError = function() {
  var errorMessages, i, subSpec, _i, _len, _ref;

  errorMessages = [];
  _ref = this.subSpecs;
  for (i = _i = 0, _len = _ref.length; _i < _len; i = ++_i) {
    subSpec = _ref[i];
    if (!subSpec.passed_) {
      errorMessages.push('(' + (i + 1) + ') expected <b>' + JSON.stringify(subSpec.actual) + '</b> to be <b>' + JSON.stringify(subSpec.expected) + '</b>');
    }
  }
  if (errorMessages.length > 0) {
    this.formatResult("<ul><li>" + (errorMessages.join('</li><li>')) + "</li></ul>");
  } else {
    this.formatResult();
  }
  return this;
};

Spec.prototype.formatScreenshotDifferentError = function() {
  return this.formatScreenshotError('screenshotsDifferent');
};

Spec.prototype.formatScreenshotUnknownError = function() {
  return this.formatScreenshotError('screenshotsUnknown');
};

Spec.prototype.formatScreenshotError = function(action) {
  var id, modal, modalId, row, url;

  id = "error_screenshot_different_" + this.specsSuite.id + "_" + this.id;
  modalId = "modal_" + id;
  url = "/specs/" + action + "?specId=" + (encodeURIComponent(this.id)) + "&specsSuiteId=" + (encodeURIComponent(this.specsSuite.id)) + "&expectedImage=" + (encodeURIComponent(this.expectedImage)) + "&actualImage=" + (encodeURIComponent(this.actualImage));
  modal = "<div id=\"" + modalId + "\" data-remote=\"" + url + "\" class=\"modal hide fade\" style=\"width: 90%; left: 0; margin-left: 6%; height: 96%; top: 2%;\"><div class=\"modal-header\">  <h3>Spec images</h3></div><div class=\"modal-body\" style=\"max-height: none;\"></div></div>";
  row = "<tr class=\"spec_row error\" id=\"tr_" + this.specsSuite.id + "_" + this.id + "\" onclick=\"$('#" + modalId + "').attr('data-remote', '" + url + "').modal('show');\"><td><div id=\"" + id + "\">" + this.suiteName + " " + this.description + "</div></td><td>" + this.passedCount + "/" + this.totalCount + "</td></tr>";
  $(row).prependTo("#specs_results_" + this.specsSuite.id);
  $('#specs_screenshots_errors').append(modal);
};

Spec.prototype.formatManualValidationError = function() {
  this.formatResult("You have manually rejected this test");
};

Spec.prototype.formatResult = function(errorMessage) {
  var className, error, row,
    _this = this;

  className = errorMessage ? 'error' : 'success';
  error = errorMessage ? " data-title=\"Errors\" data-content=\"" + errorMessage + "\" data-placement=\"top\" data-html=\"true\"" : "";
  row = "<tr class=\"spec_row " + className + "\"" + error + "><td>" + this.suiteName + " " + this.description + "</td><td>" + this.passedCount + "/" + this.totalCount + "</td></tr>";
  setTimeout((function() {
    return $(row).prependTo("#specs_results_" + _this.specsSuite.id);
  }), 300);
};

Suite.prototype.showResults = function() {
  $("#specs_results_" + this.specsSuiteId + " > tbody > tr:first").before("<tr><td>" + this.description + "</td><td colspan=\"2\">" + this.passedCount + "/" + this.totalCount + "</td></tr>");
};