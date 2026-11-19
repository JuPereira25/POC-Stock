function getDpiSwitches(platform) {
  if (platform !== 'win32') return []
  return [['high-dpi-support', '1'], ['force-device-scale-factor', '1']]
}

module.exports = { getDpiSwitches }
