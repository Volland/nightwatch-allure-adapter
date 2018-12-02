//FIXME Code cleanup needed
//FIXME two separate modules, one for parsing results and testfile and second for actually generating results
//FIXME Errors in test files can not be detected
//TODO Errors if command names or functions are not present are displayed anyhow,they can be used
//TODO screenshots FTW
const Allure = require("allure-js-commons");
const allureReporter = new Allure();
const Runtime = require("allure-js-commons/runtime");
const fs = require("fs");
const path = require("path");
const cp = require("comment-parser");
const runtimeAllure = new Runtime(allureReporter);
const find = require("find");

const self = (module.exports = {
  write: function(results, options, done) {
    allureReporter.setOptions(` -o ${options.output_folder}` || {});
    for (let currentModuleName in results.modules) {
      let currentModule = results.modules[currentModuleName];
      const currentTest = {
        failures: self.parse(currentModule.failures),
        errors: self.parse(currentModule.errors),
        skipped: self.parse(currentModule.skipped.length),
        tests: self.parse(currentModule.tests),
        isFailure: currentModule.failures > 0 || currentModule.errors > 0,
        isSkipped: currentModule.skipped.length === currentModule.tests,
        suiteName: currentModule.group,
        testName: currentModuleName,
        testSteps: [],
        errorMessage: "",
        startTimestamp: self.parseDate(currentModule.timestamp),
        endTimestamp: self.parseDate(currentModule.timestamp),
        tags: {}
      };

      if (currentTest.suiteName === "") {
        currentTest.suiteName = currentTest.testName;
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
      //TODO considering good number of properties switch should be used
      if (currentTest.tags.hasOwnProperty("testcaseId")) {
        runtimeAllure.addLabel("testId", currentTest.tags["testcaseId"]);
      }
      if (currentTest.tags.hasOwnProperty("description")) {
        runtimeAllure.description(currentTest.tags.description);
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
          failures: self.parse(currentStep.failed),
          errors: self.parse(currentStep.errors),
          skipped: self.parse(currentStep.skipped),
          passed: self.parse(currentStep.passed),
          startTimestamp: previousStepTimestamp,
          endTimestamp:
            previousStepTimestamp + self.parseFloat(currentStep.time) * 1000,
          totalTime: self.parseFloat(currentStep.time) * 1000
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
      } else if (currentTest.isSkipped) {
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
    done();
  },
  parse: function(str) {
    return isNaN(str) ? 0 : parseInt(str, 10);
  },
  parseFloat: function(str) {
    return isNaN(str) ? 0 : parseFloat(str);
  },
  parseDate: function(str) {
    return Date.parse(str);
  },
  //FIXME file paths are incorrect, hence can not use this
  parseFileForTags: function(testfilePath) {
    // works incorrect
    return {};

    const opts = {
      parsers: [cp.PARSERS.parse_tag, cp.PARSERS.parse_description]
    };

    const file = fs.readFileSync(testfilePath, "utf-8");
    const parsedInformation = cp(file, opts);
    const tcTags = {};
    if (parsedInformation.length > 0) {
      tcTags.description = parsedInformation[0].description;
      const tagsInTest = parsedInformation[0].tags;
      for (let tag in tagsInTest) {
        currentTag = tagsInTest[tag];
        switch (currentTag.tag) {
          case "testcaseid":
            tcTags.testcaseId = currentTag.description;
            break;
          case "type":
            tcTags.type = currentTag.description;
            break;
          case "testtype":
            tcTags.testType = currentTag.description;
            break;
        }
      }
    }
    return tcTags;
  }
});
