// Copyright (c) Microsoft Corporation. All rights reserved.

var crypto = require('crypto'),
    fs = require('fs'),
    path = require('path'),
    log = require('./utils/log'),
    utils = require('./utils/jsUtils');

module.exports = {
    createTheme: function (simulatorProxy, theme) {
        // Note that we *always* create a theme if the sim-host supports them, to get the default theme if none is
        // specified.

        if (!theme) {
            return createTheme(simulatorProxy);
        }

        if (typeof theme === 'string') {
            return themeFromJson(simulatorProxy, utils.existsSync(theme) ? fs.readFileSync(theme, 'utf8') : theme);
        }

        if (typeof theme === 'object') {
            return createTheme(simulatorProxy, theme);
        }

        log.warning('Specified theme was not a valid filename or JSON data');
        return createTheme(simulatorProxy);
    }
};

function themeFromJson(simulatorProxy, themeData) {
    var themeObject = null;

    try {
        themeObject = JSON.parse(themeData);
    } catch (e) {
        log.warning('Specified theme was not a valid filename or JSON data');
    }

    return createTheme(simulatorProxy, themeObject);
}

function createTheme(simulatorProxy, themeObject) {
    var simHostThemeFile = path.resolve(simulatorProxy.config.simHostOptions.simHostRoot, 'theme.js');
    if (!utils.existsSync(simHostThemeFile)) {
        // The current sim host does not support themes
        return null;
    }

    return new Theme(simulatorProxy, themeObject, simHostThemeFile);
}

/**
 * @constructor
 * @private
 */
function Theme(simulatorProxy, themeObject, simHostThemeFile) {
    this._simulatorProxy = simulatorProxy;
    this._themeObject = themeObject || {};
    this._simHostThemeInfo = require(simHostThemeFile);
    var simHostHash = createThemeHash(simHostThemeFile);
    this.themeCssFileName = path.join(utils.getAppDataPath(), simHostHash + (themeObject ? '-' + createThemeHash(themeObject) : '') + '.css');
    if (!utils.existsSync(this.themeCssFileName)) {
        this._createThemeCssFile();
    }
}

/**
 *
 * @private
 */
Theme.prototype._createThemeCssFile = function () {
    var elementSelectors = this._simHostThemeInfo.elementSelectors;
    var defaultProperties = this._simHostThemeInfo.defaultProperties;
    var themeObject = this._themeObject;
    var css = [];

    var themeDefaultProperties = themeObject.default;
    var defaultDefaultProperties = defaultProperties.default;

    Object.keys(elementSelectors).forEach(function (element) {
        var themeElementData = themeObject[element] || themeDefaultProperties || defaultProperties[element] || defaultDefaultProperties;
        if (!themeElementData) {
            return;
        }

        // Store what we end up using, for when we pass this to sim-host later (to generate additional CSS).
        themeObject[element] = themeElementData;

        var selector = elementSelectors[element];

        // Element 'default' is a special case - we only apply normal state properties - properties defined for other
        // states are only used as defaults for properties that don't specify properties.
        var states = element === 'default' ? [''] : Object.keys(themeElementData);
        states.forEach(function (state) {
            outputSelectorProperties(css, selector, themeElementData[state], state);
        });
    });

    // Sim host can append anything it wants based on values we end up using (for scaling, etc).
    if (this._simHostThemeInfo.getCustomCss) {
        css.push(this._simHostThemeInfo.getCustomCss(themeObject));
    }

    fs.writeFileSync(this.themeCssFileName, css.join('\n'), 'utf8');
};

function outputSelectorProperties(css, selector, properties, state) {
    css.push(formatSelector(selector, state) +  ' {');
    Object.keys(properties).forEach(function (propertyName) {
        css.push('  ' + propertyName + ': ' + properties[propertyName] + ';')
    });
    css.push('}\n');
}

function formatSelector(selector, state) {
    return selector.split(',').map(function (selector) {
        return state ? selector.trim() + ':' + state : selector.trim();
    }).join(',\n');
}

function createThemeHash(themeObject) {
    return crypto.createHash('md5').update(JSON.stringify(themeObject)).digest('hex').substring(0, 8);
}
