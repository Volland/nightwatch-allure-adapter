# nightwatch-allure2-adapter

This is allure2 reporter adapter for nightwatch tests,which generates xml reports that are consumed by allure during generation.

## Using Reporter In Nightwatch

In global js file add reporter like this

```javascript
const allure2 = require("nightwatch-allure2-adapter");

module.exports = {
  reporter: allure2.write
};
```

This will generate xml reports in allure-results directory at root.

You can use [allure generate](https://github.com/allure-framework/allure-core/wiki#generating-a-report) for report generation
