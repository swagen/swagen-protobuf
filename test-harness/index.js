'use strict';

const fs = require('fs');

const modeName = null;

const definition = require('./definition.json');
const profiles = require('./profile.json');
const profile = modeName ? profiles[modeName] : profiles[Object.keys(profiles)[0]];

const selectedMode = require('../lib/' + profile.mode);

if (typeof selectedMode.validateProfile === 'function') {
    selectedMode.validateProfile(profile);
}
const code = selectedMode.generate(definition, profile);
fs.writeFileSync(`./test-harness/output.${selectedMode.extension}`, code, 'utf8');
