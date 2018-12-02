# nightwatch-allure2-adapter

This is allure2 reporter adapter for nightwatch tests, which generates xml reports that are consumed by allure2 during generation.

## Installation

```bash
npm i --save-dev nightwatch-allure2-adapter
```

## Usage

```javascript
const allure2 = require("nightwatch-allure2-adapter");

module.exports = {
  reporter: allure2.write
};
```

This will generate xml reports in allure-results directory at root.

You can use [allure generate](https://github.com/allure-framework/allure-core/wiki#generating-a-report) for report generation

## Fork

This package is a fork of https://github.com/sharadJay/nightwatch-allure-adapter
What I have done:

1.  Updated all packages
2.  Fixed all security issues
3.  Removed `lodash` dependency, replaced with vanilla js code
4.  Fixed reporter arguments
5.  Disabled `parseFileForTags`, it doesn't work at all
6.  Disabled attaching screenshots, it doesn't work

## TODO

1.  Tests
2.  Fix attaching screenshots
