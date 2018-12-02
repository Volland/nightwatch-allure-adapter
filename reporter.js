//FIXME Code cleanup needed
//FIXME two separate modules, one for parsing results and testfile and second for actually generating results
//FIXME Errors in test files can not be detected
//TODO Errors if command names or functions are not present are displayed anyhow,they can be used
//TODO screenshots FTW
const Allure = require("allure2-js-commons");
const allureReporter = new Allure();
const Runtime = require("allure2-js-commons/runtime");
const fs = require("fs");
const path = require("path");
const cp = require("comment-parser");
const runtimeAllure = new Runtime(allureReporter);
const find = require("find");

const self = (module.exports = {
  write: function(results, done, directoryPath) {
    allureReporter.setOptions(" -o reports/allure-report" || {});
    for (let currentModule in results.modules) {
      module = results.modules[currentModule];
      const currentTest = {
        failures: self.parse(module.failures),
        errors: self.parse(module.errors),
        skipped: self.parse(module.skipped.length),
        tests: self.parse(module.tests),
        isFailure: false,
        isSkipped: false,
        suiteName: module.group,
        testName: currentModule,
        testSteps: [],
        errorMessage: "",
        startTimestamp: self.parseDate(module.timestamp),
        endTimestamp: self.parseDate(module.timestamp),
        tags: {}
      };

      if (typeof directoryPath !== "undefined") {
        currentTest.tags = self.parseFileForTags(
          directoryPath + "/tests/" + currentModule + ".js"
        );
      }

      if (currentTest.skipped === currentTest.tests) {
        currentTest.isSkipped = true;
      } else if (currentTest.failures > 0 || currentTest.errors > 0) {
        currentTest.isFailure = true;
      }
      const testPath = currentTest.testName.split("/");

      if (currentTest.suiteName === undefined) {
        currentTest.suiteName = testPath[testPath.length - 2];
      }
      if (currentTest.suiteName === "") {
        currentTest.suiteName = "Default Suite";
      }
      if (results.hasOwnProperty("environment")) {
        currentTest.suiteName =
          currentTest.suiteName + "-" + results.environment;
      }
      if (testPath.length > 1) {
        currentTest.testName = testPath[testPath.length - 1];
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

      for (let completedStep in module.completed) {
        const currentStep = module.completed[completedStep];

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

      for (let skippedStep in module.skipped) {
        allureReporter.startStep(
          module.skipped[skippedStep],
          currentTest.endTimestamp
        );
        allureReporter.endStep("skipped", currentTest.endTimestamp);
      }

      if (currentTest.isFailure) {
        if (typeof directoryPath !== "undefined") {
          find.file(
            /\.png$/,
            directoryPath +
              "/screenshots/" +
              results.environment +
              "/" +
              currentModule,
            function(files) {
              files.forEach(function(file) {
                fs.readFile(file, function(err, data) {
                  allureReporter.addAttachment(
                    "screenshots",
                    data,
                    "image/png"
                  );
                  allureReporter.endCase(
                    "failed",
                    currentTest.errorMessage,
                    currentTest.endTimestamp
                  );
                  allureReporter.endSuite(currentTest.endTimestamp);
                });
              });
            }
          );
        } else {
          allureReporter.endCase(
            "failed",
            currentTest.errorMessage,
            currentTest.endTimestamp
          );
          allureReporter.endSuite(currentTest.endTimestamp);
        }
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
