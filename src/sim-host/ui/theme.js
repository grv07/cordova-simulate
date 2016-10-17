// Copyright (c) Microsoft Corporation. All rights reserved.

/* global __dirname */

var fs = require('fs'),
    path = require('path');

module.exports = {
    elementSelectors: {
        'default': 'body, body /deep/ p, body /deep/ .p, body /deep/ input[type^=range]',
        'input': 'cordova-combo /deep/ select, body /deep/ textarea, body /deep/ input[type^=text], body /deep/ input[type^=number], input[type^=number]',
        'button': 'cordova-button /deep/ button',
        'label': 'body /deep/ label',
        'value': 'body /deep/ .cordova-value',
        'panel': 'body /deep/ .cordova-panel-inner',
        'panel-caption': 'body /deep/ .cordova-header'
    },

    // This properties will be used for any element that doesn't have a theme defined
    defaultProperties: {
        'default': {
            '': {
                'font-family': '"Helvetica Neue", "Roboto", "Segoe UI", sans-serif',
                'font-size': '13px',
                'font-weight': 'normal'
            }
        },
        'input': {
            '': {
                'font-family': '"Helvetica Neue", "Roboto", "Segoe UI", sans-serif',
                'font-size': '13px',
                'font-weight': 'normal',
                'color': 'black',
                'background': '#ffffff',
                'border': '1px solid #d3d3d3'
            },
            'hover': {
                'color': '#212121',
                'background': '#ffffff',
                'border': '1px solid #CCCCCC'
            }
        },
        'button': {
            '': {
                'font-family': '"Helvetica Neue", "Roboto", "Segoe UI", sans-serif',
                'font-size': '13px',
                'font-weight': 'normal',
                'color': 'black',
                'background': '#ffffff',
                'border': '1px solid #d3d3d3'
            },
            'active': {
                'color': '#212121',
                'background': '#ffffff',
                'border': '1px solid #CCCCCC'
            }
        },
        'label': {
            '': {
                'font-family': '"Helvetica Neue", "Roboto", "Segoe UI", sans-serif',
                'font-size': '13px',
                'font-weight': 'normal',
                'color': 'rgba(0,0,0,0.95)'
            }
        },
        'value': {
            '': {
                'font-family': '"Helvetica Neue", "Roboto", "Segoe UI", sans-serif',
                'font-size': '13px',
                'font-weight': 'normal',
                'color': 'black'
            }
        },
        'panel': {
            '': {
                'border': '1px solid rgba(0, 0, 0, 0.785)',
                'background': 'rgba(255,255,255,0.97)'
            }
        },
        'panel-caption': {
            '': {
                'background-color': 'black',
                'opacity': '0.7',
                'color': 'rgb(204,204,204)',
                'font-size': '13px',
                'text-transform': 'uppercase',
                'font-weight': 'bold'
            }
        }
    },

    getCustomCss: function (themeObject) {
        // Scale panels and margins to the specified font size

        var defaultFontSize = 13;
        var fontSize = parseFont(themeObject.default['']) || 16;
        var css = fs.readFileSync(path.join(__dirname, 'sim-host-sizes.css'), 'utf8');

        if (fontSize === defaultFontSize) {
            return css;
        }

        var scale = fontSize / defaultFontSize;
        return css.replace(/\b(\d+)px\b/g, function (_, pixels) {
            return Math.round(pixels * scale) + 'px';
        });
    }
};

function parseFont(cssProps) {
    var fontSize = cssProps['font-size'] || cssProps['font'];
    if (!fontSize) {
        return null;
    }

    var match = fontSize.match(/(?:\b(\d+)px\b)|(?:\b(\d+)pt\b)|(?:\b(\d+)em\b)/);
    return (match && (match[1] && parseFloat(match[1])) || (match[2] && parseFloat(match[2]) * 96 / 72) || (match[3] && parseFloat(match[3]) * 16)) || null;
}
