// Copyright (c) Microsoft Corporation. All rights reserved.

var path = require('path'),
    replaceStream = require('replacestream'),
    send = require('send-transform');

var BROWSER_REPLACE_MAX_MATCH_LENGTH = 1024;
var BROWSER_REPLACE_OPTIONS = {maxMatchLen: BROWSER_REPLACE_MAX_MATCH_LENGTH};

module.exports.attach = function (app, dirs, hostRoot) {
    app.get('/simulator/sim-host.css', function (request, response) {
        var userAgent = request.headers['user-agent'];
        send(request, path.resolve(hostRoot['sim-host'], 'sim-host.css'), {
            transform: getTransform(userAgent)
        }).pipe(response);
    });
};

function getTransform(userAgent) {
    if (isChrome(userAgent)) {
        // If target browser is Chrome, remove any sections marked as not for Chrome.
        return function (stream) {
            stream = stream.pipe(replaceStream(/\/\* BEGIN !CHROME \*\/[\s\S]*\/\* END !CHROME \*\//gm, '', BROWSER_REPLACE_OPTIONS));
            return replaceCssVariables(stream);
        };
    }

    // If target browser is not Chrome, remove shadow dom stuff and any sections marked as for Chrome.
    return function (stream) {
        stream = stream
            .pipe(replaceStream('> ::content >', '>'))
            .pipe(replaceStream(/\^|\/shadow\/|\/shadow-deep\/|::shadow|\/deep\/|::content|>>>/g, ' '))
            .pipe(replaceStream(/\/\* BEGIN CHROME \*\/[\s\S]*\/\* END CHROME \*\//gm, '', BROWSER_REPLACE_OPTIONS));
        return replaceCssVariables(stream);
    };
}

function isChrome(userAgent) {
    return userAgent.indexOf('Chrome') > -1 && userAgent.indexOf('Edge/') === -1;
}

function replaceCssVariables(stream) {
    var time1 = Date.now();
    var customCssVariables = populateCssVariableValues();
    Object.keys(customCssVariables).forEach(function (elementType) {
        var cssStateProperties = customCssVariables[elementType];
        elementStates.forEach(function (elementState) {
            var cssProperties = cssStateProperties[elementState];
            Object.keys(cssProperties).forEach(function (cssPropertyName) {
                var cssPropertyValue = cssProperties[cssPropertyName];
                var variableName = '--' + elementType;
                if (elementState) {
                    variableName += '-' + elementState;
                }
                variableName += '-' + cssPropertyName;
                stream = stream.pipe(replaceStream('var(' + variableName + ')', cssPropertyValue));
                console.log(variableName + ': ' + cssPropertyValue);
            });
        });
    });
    console.log(Date.now() - time1);
    return stream;
}

var elementStates = ['', 'active', 'focus', 'hover'];
var cssVariableValues = {
    'default': {
        '': {
            'font-family': 'segoe ui',
            'font-size': '16px',
            'font-weight': 'normal',
            'color': 'red',
            'background': '',
            'border': ''
        },
        'active': {
        },
        'focus': {
        },
        'hover': {
        }
    },
    'input': {},
    'button': {},
    'label': {},
    'paragraph': {},
    'value': {},
    'caption': {
        '': {
            'font-weight': 'bold',
            'color': 'rgb(204,204,204)',
            'background': 'black'
        }
    },
    'panel': {
        '': {
            'border': 'solid 1px rgba(0,0,0,0.785)',
            'background': 'rgba(255,255,255,0.97)'
        }
    }
};

/**
 * Populates customCssVariables with any undefined values. Order of precedence is:
 * 1. Specific custom value
 * 2. Custom default for the same value
 * 3. If there is a pseudo-class, specific custom value without the pseudo-class
 * 4. Custom default without the pseudo-class
 * 5. Built-in defaults processed in the same order
 */
function populateCssVariableValues(customCssVariables) {
    customCssVariables = customCssVariables || {};

    var customDefaults = customCssVariables['default'] || {};
    var customStatelessDefaults = customDefaults[''] || {};
    var defaultCssVariableValues = cssVariableValues['default'];
    Object.keys(cssVariableValues).forEach(function (elementType) {
        var customValues = customCssVariables[elementType] || (customCssVariables[elementType] = {});
        var customStatelessValues = customValues[''] || {};
        var builtInValues = cssVariableValues[elementType] || {};
        var builtInStatelessValues = builtInValues[''] || {};
        var defaultStatelessValues = defaultCssVariableValues[''] || {};
        elementStates.forEach(function (elementState) {
            var defaultCssProperties = defaultCssVariableValues[elementState] || {};
            var customCssProperties = customValues[elementState] || (customValues[elementState] = {});
            var builtInProperties = builtInValues[elementState] || {};
            var customDefaultCssProperties = customDefaults[elementState] || {};

            Object.keys(defaultStatelessValues).forEach(function (cssPropertyName) {
                var value = customCssProperties[cssPropertyName];
                if (!value) {
                    if (elementType === 'default') {
                        if (elementState) {
                            customCssProperties[cssPropertyName] =
                                customStatelessValues[cssPropertyName] ||       // Custom value without pseudo-class
                                builtInProperties[cssPropertyName] ||           // Built in value for same property
                                builtInStatelessValues[cssPropertyName];        // Built in value without pseudo-class
                        } else {
                            customCssProperties[cssPropertyName] =
                                builtInProperties[cssPropertyName];             // Built in value for same property
                        }
                    } else {
                        if (elementState) {
                            customCssProperties[cssPropertyName] =
                                customStatelessValues[cssPropertyName] ||       // Custom value without pseudo-class
                                customDefaultCssProperties[cssPropertyName] ||  // Custom default for same value
                                customStatelessDefaults[cssPropertyName] ||     // Custom default without pseudo-class
                                builtInProperties[cssPropertyName] ||           // Built in value for same property
                                builtInStatelessValues[cssPropertyName] ||      // Built in value without pseudo-class
                                defaultCssProperties[cssPropertyName] ||        // Default for same property
                                defaultStatelessValues[cssPropertyName];        // Default without pseudo-class
                        } else {
                            customCssProperties[cssPropertyName] =
                                customDefaultCssProperties[cssPropertyName] ||  // Custom default for same value
                                builtInProperties[cssPropertyName] ||           // Built in value for same property
                                defaultCssProperties[cssPropertyName];          // Default for same property
                        }
                    }
                }

                var defaultPropertyValue = defaultCssProperties[cssPropertyName];
            });
        });
    });

    return customCssVariables;
}

function getCssValue(customValue, builtInValue, defaultValue) {
    if (typeof defaultValue === 'string') {
        return customValue || builtInValue || defaultValue;
    }

    customValue = customValue || {};
    builtInValue = builtInValue || {};
    Object.keys(defaultValue).forEach(function (defaultValueItem) {
        customValue[defaultValueItem] = getCssValue(customValue[defaultValueItem], builtInValue[defaultValueItem], defaultValue[defaultValueItem]);
    });
    return customValue;

}

/*function replaceCssVariables(stream) {
    cssVariables.forEach(function (cssVariable) {
        var cssValue = findCssValue(cssVariable);
        console.log(cssVariable + ': ' + cssValue);
    });
}

function findCssValue(cssVariable) {
    var value;

    if (Array.isArray(cssVariable)) {
        value = cssVariableValues;
        cssVariable.every(function (cssVariableComponent) {
            value = value[cssVariableComponent];
            return !!value;
        });
        if (value && typeof value !== 'string') {
            console.log('VALUE FOR ' + cssVariable + ' WASN\'T FULLY RESOLVED: ' + JSON.stringify(value));
            return '';
        }
        return value;
    } else {
        cssVariable = cssVariable.split('_');
        value = findCssValue(cssVariable);
        if (!value && cssVariable[0] !== 'default') {
            cssVariable[0] = 'default';
            value = findCssValue(cssVariable);
        }
        return value;
    }
}*/
