const test = require('node:test')
const assert = require('node:assert/strict')
const { getDpiSwitches } = require('./dpi.js')

test('returns the Windows DPI switches needed for consistent sizing', () => {
  assert.deepEqual(getDpiSwitches('win32'), [
    ['high-dpi-support', '1'],
    ['force-device-scale-factor', '1'],
  ])
})
