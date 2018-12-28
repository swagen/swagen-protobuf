'use strict';

module.exports = [{
    type: 'input',
    name: 'package',
    message: 'Package name',
    validate: value => !!value
}];
