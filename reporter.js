//FIXME Code cleanup needed
//FIXME two separate modules, one for parsing results and testfile and second for actually generating results
//FIXME Errors in test files can not be detected
//TODO Errors if command names or functions are not present are displayed anyhow,they can be used
//TODO screenshots FTW
const Allure = require("allure-js-commons");
const allureReporter = new Allure();
const Runtime = require("allure-js-commons/runtime");
const runtimeAllure = new Runtime(allureReporter);

function parseIntWithDefault(str, defaultValue) {
  return isNaN(str) ? defaultValue || 0 : parseInt(str, 10);
}
function parseFloatWithDefault (str, defaultValue)  {
  return isNaN(str) ? defaultValue || 0 : parseFloat(str);
}

function parseDate(str) {
  return Date.parse(str);
}
module.exports = {
  write: function(results, options, done) {
    allureReporter.setOptions(` -o ${options.output_folder}` || {});

    Object.entries(results.modules).forEach(([currentModuleName, currentModule]) => {
      const currentTest = {
        failures: parseIntWithDefault(currentModule.failures),
        errors: parseIntWithDefault(currentModule.errors),
        skipped: parseIntWithDefault(currentModule.skipped.length),
        tests: parseIntWithDefault(currentModule.tests),
        isFailure: currentModule.failures > 0 || currentModule.errors > 0,
        isSkipped: currentModule.skipped.length === currentModule.tests,
        suiteName: currentModule.group,
        testName: currentModuleName,
        reportPrefix: currentModule.reportPrefix,
        testSteps: [],
        errorMessage: "",
        startTimestamp: parseDate(currentModule.timestamp),
        endTimestamp:  parseDate(currentModule.timestamp),
        tags: {}
      };

      if (currentTest.suiteName === "") {
        currentTest.suiteName = `(${currentTest.reportPrefix}) ${currentTest.testName}`;
      }
      if (results.hasOwnProperty("environment")) {
        currentTest.suiteName =
          currentTest.suiteName + "-" + results.environment;
      }

      allureReporter.startSuite(
        currentTest.suiteName,
        currentTest.startTimestamp
      );
      allureReporter.startCase(
        currentTest.testName,
        currentTest.startTimestamp
      );
      if (currentTest.tags.hasOwnProperty("testcaseId")) {
        runtimeAllure.addLabel("testId", currentTest.tags["testcaseId"]);
      }
      if (currentTest.tags.hasOwnProperty("description")) {
        runtimeAllure.description(currentTest.tags.description);
      }
      if(currentTest.story) {
        runtimeAllure.story(currentTest.reportPrefix);
        runtimeAllure.addLabel('prefix',currentTest.reportPrefix);
      }

      allureReporter.addAttachment(
        "Reported Result",
        JSON.stringify(results),
        "application/json"
      );

      let previousStepTimestamp = currentTest.startTimestamp;

      for (let completedStep in currentModule.completed) {
        const currentStep = currentModule.completed[completedStep];

        const curCompletedStep = {
          failures: parseIntWithDefault(currentStep.failed),
          errors: parseIntWithDefault(currentStep.errors),
          skipped: parseIntWithDefault(currentStep.skipped),
          passed: parseIntWithDefault(currentStep.passed),
          startTimestamp: previousStepTimestamp,
          endTimestamp:
            previousStepTimestamp + parseFloatWithDefault(currentStep.time) * 1000,
          totalTime: parseFloatWithDefault(currentStep.time) * 1000
        };
        currentTest.endTimestamp =
          currentTest.endTimestamp + curCompletedStep.totalTime;
        previousStepTimestamp = curCompletedStep.endTimestamp;
        allureReporter.startStep(
          completedStep,
          curCompletedStep.startTimestamp
        );

        for (let assertion in currentStep.assertions) {
          allureReporter.startStep(
            currentStep.assertions[assertion].message,
            curCompletedStep.startTimestamp
          );
          allureReporter.endStep("passed", curCompletedStep.endTimestamp);
        }

        if (curCompletedStep.failures > 0 || curCompletedStep.errors > 0) {
          allureReporter.endStep("failed", curCompletedStep.endTimestamp);
          for (let assertion in currentStep.assertions) {
            const currentAssertion = currentStep.assertions[assertion];
            if (currentAssertion.failure != false) {
              const errorMessage = {
                failure: currentAssertion.failure,
                message: currentAssertion.message,
                stacktrace: currentAssertion.stacktrace
              };
              currentTest.errorMessage = {
                message: errorMessage.failure + errorMessage.message,
                stack:
                  errorMessage.message +
                  "\n" +
                  errorMessage.failure +
                  "\n" +
                  errorMessage.stacktrace
              };
            }
          }
        } else {
          allureReporter.endStep("passed", curCompletedStep.endTimestamp);
        }
      }

      for (let skippedStep in currentModule.skipped) {
        allureReporter.startStep(
          currentModule.skipped[skippedStep],
          currentTest.endTimestamp
        );
        allureReporter.endStep("skipped", currentTest.endTimestamp);
      }

      if (currentTest.isFailure) {
        allureReporter.endCase(
          "failed",
          currentTest.errorMessage,
          currentTest.endTimestamp
        );
        allureReporter.endSuite(currentTest.endTimestamp);
      } else {
        if (currentTest.isSkipped) {
          allureReporter.endCase(
              "skipped",
              "No Steps Performed",
              currentTest.endTimestamp
          );
          allureReporter.endSuite(currentTest.endTimestamp);
        } else {
          allureReporter.endCase("passed", "", currentTest.endTimestamp);
          allureReporter.endSuite(currentTest.endTimestamp);
        }
      }
    });
    done();
  }
};
