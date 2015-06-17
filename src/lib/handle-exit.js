function handleExit() {
  try {
    phridge.disposeAll().then(function () {
      process.exit(0);
    }).catch(function (err) {
      throw err;
    });
  } catch (e) {
    process.exit(0);
  }
}

module.exports = handleExit;
