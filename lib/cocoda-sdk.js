function createInstance(config = {}) {

  function cdk(...args) {
    setConfig(...args)
    return cdk
  }

  // Properties
  cdk.config = config

  // Methods
  function setConfig(config) {
    cdk.config = config
  }
  cdk.setConfig = setConfig
  // Also offer createInstance method
  cdk.createInstance = createInstance

  return cdk
}

module.exports = createInstance
